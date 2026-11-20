import { inject, Injectable } from '@angular/core';
import { AppConfigService, FormModel, IdentityUserService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { FormCloudService, ServiceTaskListCloudService, StartProcessCloudService, TaskCloudService } from '@alfresco/adf-process-services-cloud';
import { AttachFileDialogData, SelectionMode } from '@hxp/shared-hxp/form-widgets/feature-shell';
import {
    FileModel,
    isPendingDocument,
    PendingDocument,
    SharedAttachFileDialogService,
    SharedUploadMiddlewareService,
    UPLOAD_MIDDLEWARE_SERVICE,
} from '@hxp/shared-hxp/services';
import { HxpUploadService } from '@hxp/workspace-hxp/shared/upload-files/feature-shell';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { filter, firstValueFrom, from, map, merge, Observable, of, Subject, switchMap, take, tap, throwError } from 'rxjs';
import { DashboardDiagnosticsService } from '../../dashboard/services/dashboard-diagnostics.service';
import { resolveDeployedAppName } from '../../dashboard/utils/dashboard-app-config.util';
import {
    AutomateErrorDetail,
    blockingFieldIssues,
    buildProgressDiagnosticTables,
    checkStartFormFields,
    describeAutomateError,
    ExpectedStartField,
    extractStartFormFields,
    maskStartPayload,
    StartFieldCheck,
    StartFormField,
} from './utils/radication-diagnostics.util';
import { annotateReviewRow, PREANALYSIS_RESULT_TABLE_FIELD, reviewTableRows, sameReviewFinding } from './utils/radication-agent-review.util';
import {
    buildIntakeFormValues,
    INTAKE_FORM_FIELDS,
    IntakeDecision,
    parseProviderFindingComments,
    ProviderFindingComments,
    resolveIntakeOutcome,
    sameFindingComments,
} from './utils/radication-intake.util';
import { RADICATION_PROCESS_ROLES, RADICATION_TASK_NAMES, RadicationRuntimeItem, RadicationRuntimeSnapshot, RadicationServiceTask } from './utils/radication-progress.util';
import { describeProcessMapping, activeProcessMappingSource, matchesProcessRole, rootProcessKey } from '../../dashboard/definitions/process-mapping';
import { buildRadicationStartPayload, RADICATION_START_FORM, RadicationStartErrorCode, resolveStartOutcome, selectRadicationDefinition } from './utils/radication-start.util';

/** Reference sent to the form's "Attach file" field: a native pending document or an HxCS document. */
export type RadicationDocument = Document | PendingDocument;

export interface RadicationStartInput {
    radicationNumber: string;
    providerName: string;
    email: string;
    documents: readonly RadicationDocument[];
    /** UI language for the agents (`es`, `en`…). */
    language?: string | null;
}

/** The UI language, only when the deployed start form declares the `language` field. */
export function startLanguage(fields: readonly { id: string }[] | null, language: string | null | undefined): string | null {
    const value = (language ?? '').trim();
    return value && fields?.some((field) => field.id === RADICATION_START_FORM.fields.language) ? value : null;
}

/** Fields the page sends in the start form values. */
export const RADICATION_EXPECTED_FIELDS: readonly ExpectedStartField[] = [
    { id: RADICATION_START_FORM.fields.radicationNumber, kind: 'text' },
    { id: RADICATION_START_FORM.fields.email, kind: 'text' },
    { id: RADICATION_START_FORM.fields.documents, kind: 'upload' },
];

export interface StartFormInspection {
    processDefinitionKey: string;
    formKey: string;
    version: number;
    /** `null` when the form definition could not be read. */
    fields: StartFormField[] | null;
    checks: StartFieldCheck[];
    blocking: StartFieldCheck[];
    outcome: string | null;
}

/** A failed radication with the concrete reason: the fields that do not match, or Automate's own error. */
export class RadicationStartFailure extends Error {
    constructor(
        readonly code: RadicationStartErrorCode,
        readonly detail: AutomateErrorDetail | null = null,
        readonly fieldIssues: StartFieldCheck[] = []
    ) {
        super(code);
        this.name = 'RadicationStartFailure';
    }
}

export type RadicationTraceStep = 'definition' | 'form' | 'fields' | 'upload' | 'payload' | 'start' | 'progress' | 'variables' | 'intake' | 'comments' | 'decision';

export type RadicationStepErrorCode =
    | 'INTAKE_NOT_READY'
    | 'COMMENTS_FIELD_MISSING'
    | 'COMMENTS_NOT_CONFIRMED'
    | 'INTAKE_FAILED'
    | 'REVIEW_TABLE_MISSING'
    | 'REVIEW_ROW_CHANGED';

/** A failed Intake step (comments or decision) with the concrete reason. */
export class RadicationStepFailure extends Error {
    constructor(
        readonly code: RadicationStepErrorCode,
        readonly detail: AutomateErrorDetail | null = null
    ) {
        super(code);
        this.name = 'RadicationStepFailure';
    }
}

/** The open Intake task ("Nueva Cuenta") with its parsed form, as CIC-Fin reads the review task before saving. */
interface IntakeForm {
    taskId: string;
    processInstanceId: string;
    formKey: string;
    appVersion: number;
    model: FormModel;
    commentsFieldPresent: boolean;
}

interface QueryEntry<T> {
    entry?: T;
}
interface QueryList<T> {
    list?: { entries?: Array<QueryEntry<T>> };
}
interface QueryProcess {
    id?: string;
    status?: string;
    name?: string;
    processDefinitionName?: string;
    processDefinitionKey?: string;
    startDate?: string;
}
interface QueryTask {
    id?: string;
    name?: string;
    status?: string;
    processInstanceId?: string;
}
interface QueryVariable {
    name?: string;
    value?: unknown;
}

/**
 * Provider-side radication, with the same native mechanism as CIC-Fin's loan application
 * (`agentic-bank-process.service.ts` › `upload` / `startCustomApplication` and
 * `loan-application.component.ts` › `openRepositoryPicker`):
 * - local files go through `HxpUploadService` into the start form's folder, and the registered
 *   `UPLOAD_MIDDLEWARE_SERVICE` (`UploadFileDocumentCreatorService`) turns each upload into the
 *   pending document or HxCS document the "Attach file" field expects;
 * - the native attach dialog (`SharedAttachFileDialogService`) picks repository documents or
 *   uploads local ones, exactly like the form field;
 * - before starting, the deployed start form is read and its field ids are compared with the
 *   values sent; the process starts with `StartProcessCloudService.startProcessWithForm`.
 * Every step is recorded (masked) in the floating technical view (`DashboardDiagnosticsService`); the
 * progress poll keeps one updating probe per process instance. It never opens the native Automate forms.
 */
@Injectable({ providedIn: 'root' })
export class RadicationProcessService {
    private readonly appConfig = inject(AppConfigService);
    private readonly http = inject(AdfHttpClient);
    private readonly startProcess = inject(StartProcessCloudService);
    private readonly formCloud = inject(FormCloudService);
    private readonly taskCloud = inject(TaskCloudService);
    private readonly identityUser = inject(IdentityUserService);
    private readonly documentService = inject(DocumentService);
    private readonly uploadService = inject(HxpUploadService);
    private readonly documentCreator = inject(UPLOAD_MIDDLEWARE_SERVICE, { optional: true }) as SharedUploadMiddlewareService | null;
    private readonly attachFileDialog = inject(SharedAttachFileDialogService, { optional: true });
    private readonly serviceTaskList = inject(ServiceTaskListCloudService);
    private readonly diagnostics = inject(DashboardDiagnosticsService);

    /** The native attach dialog is registered by the process-form shell; without it the page falls back to the file input. */
    get repositoryPickerAvailable(): boolean {
        return !!this.attachFileDialog;
    }

    /** Opens the native attach dialog (repository + local upload) on the start form's folder. */
    pickDocuments(): Observable<RadicationDocument[]> {
        if (!this.attachFileDialog) {
            return of([]);
        }
        const selectionSubject$ = new Subject<RadicationDocument[]>();
        const dialogData: AttachFileDialogData = {
            selectionMode: SelectionMode.multiple,
            selectionSubject$,
            isLocalUploadAvailable: true,
            isContentUploadAvailable: true,
            defaultDocumentPath$: of(RADICATION_START_FORM.uploadFolderPath),
            contentType: RADICATION_START_FORM.contentType,
        };
        this.attachFileDialog.openDialog(dialogData);
        return selectionSubject$.pipe(
            take(1),
            map((documents) => documents.filter((document) => !!document && !('sys_isFolderish' in document && document.sys_isFolderish))),
            tap((documents) =>
                this.record('upload', 'SharedAttachFileDialogService.openDialog', true, 0, `${documents.length} reference(s) from the attach dialog`, {
                    rows: documents.map((document, index) => ({ name: `#${index + 1}`, detail: describeReference(document) })),
                })
            )
        );
    }

    /** Uploads one local file through the native upload service; emits the form reference or errors. */
    upload(file: File): Observable<RadicationDocument> {
        const started = Date.now();
        const label = `file .${fileExtensionOf(file.name)} · ${Math.round(file.size / 1024)} KB`;
        return from(this.resolveUploadFolderId()).pipe(
            switchMap((parentId) => {
                const model = new FileModel(file, { parentId, contentType: RADICATION_START_FORM.contentType });
                const queued = this.uploadService.addToQueue(model);
                if (!queued.length) {
                    return throwError(() => new Error('radication-upload-failed: rejected by the upload queue'));
                }
                // Correlate by the exact options object, as CIC-Fin does: HxCS may normalize the file name.
                const success$ = this.uploadService.fileUploadSuccess.pipe(
                    filter((result) => result.uploadFileOptions === model.options),
                    take(1),
                    switchMap((result) => {
                        // HxpUploadService already ran the middleware; calling it again would create a second document.
                        if (result.middlewareResults) {
                            return of(result.middlewareResults as RadicationDocument);
                        }
                        if (!this.documentCreator) {
                            throw new Error('radication-upload-failed: no upload middleware registered');
                        }
                        return from(this.documentCreator.onUploadFile(result));
                    }),
                    map((document) => {
                        if (!document || typeof document !== 'object') {
                            throw new Error('radication-upload-failed: the middleware returned no document');
                        }
                        return document;
                    })
                );
                const error$ = this.uploadService.fileUploadError.pipe(
                    filter((event) => event.file === model),
                    take(1),
                    switchMap((event) => throwError(() => event.error ?? new Error('radication-upload-failed')))
                );
                this.uploadService.uploadFilesInTheQueue();
                return merge(success$, error$).pipe(take(1));
            }),
            tap({
                next: (document) =>
                    this.record('upload', `HxpUploadService → ${RADICATION_START_FORM.uploadFolderPath}`, true, Date.now() - started, label, {
                        rows: [{ name: 'reference', detail: describeReference(document) }],
                    }),
                error: (error: unknown) =>
                    this.record('upload', `HxpUploadService → ${RADICATION_START_FORM.uploadFolderPath}`, false, Date.now() - started, label, {
                        error: formatDetail(describeAutomateError(error)),
                    }),
            })
        );
    }

    /**
     * Resolves the process definition and reads the deployed start form, comparing its field ids
     * with the ones the page sends (`MedRecNum`, `Email`, attachments).
     */
    async inspectStartForm(): Promise<StartFormInspection> {
        const appName = this.appName();
        let started = Date.now();
        let definition: { key: string; formKey: string; version: number };
        try {
            definition = await this.resolveDefinition(appName);
            this.record(
                'definition',
                `StartProcessCloudService.getProcessDefinitions · ${appName}`,
                true,
                Date.now() - started,
                `key=${definition.key} · formKey=${definition.formKey} · version=${definition.version}`
            );
        } catch (error) {
            this.record('definition', `StartProcessCloudService.getProcessDefinitions · ${appName}`, false, Date.now() - started, RADICATION_START_FORM.processName, {
                error: error instanceof RadicationStartFailure ? error.code : formatDetail(describeAutomateError(error)),
            });
            throw error instanceof RadicationStartFailure ? error : new RadicationStartFailure('DEFINITION_NOT_FOUND', describeAutomateError(error));
        }

        started = Date.now();
        let form: unknown = null;
        let fields: StartFormField[] | null = null;
        try {
            form = await firstValueFrom(this.formCloud.getForm(appName, definition.formKey));
            fields = extractStartFormFields(form);
            this.record('form', `FormCloudService.getForm · GET form/v1/forms/${definition.formKey}`, true, Date.now() - started, `${fields.length} field(s) in the deployed start form`, {
                rows: fields.map((field) => ({
                    name: field.id,
                    detail: [field.type, field.required ? 'required' : '', field.readOnly ? 'readOnly' : ''].filter(Boolean).join(' · '),
                })),
            });
        } catch (error) {
            this.record('form', `FormCloudService.getForm · GET form/v1/forms/${definition.formKey}`, false, Date.now() - started, 'form definition not read', {
                error: formatDetail(describeAutomateError(error)),
            });
        }

        const checks = fields ? checkStartFormFields(fields, RADICATION_EXPECTED_FIELDS) : [];
        const blocking = blockingFieldIssues(checks, fields?.length ?? 0);
        if (fields) {
            this.record('fields', 'compare sent ids with the deployed form', !blocking.length, 0, blocking.length ? `${blocking.length} field(s) do not match` : 'all sent fields exist', {
                rows: checks.map((check) => ({
                    name: check.id,
                    detail: [check.status, check.actualId && check.actualId !== check.id ? `actual id ${check.actualId}` : '', check.actualType ?? '', check.required ? 'required' : '', check.readOnly ? 'readOnly' : '']
                        .filter(Boolean)
                        .join(' · '),
                })),
            });
        }
        return {
            processDefinitionKey: definition.key,
            formKey: definition.formKey,
            version: definition.version,
            fields,
            checks,
            blocking,
            outcome: resolveStartOutcome(form),
        };
    }

    async start(input: RadicationStartInput): Promise<string> {
        const appName = this.appName();
        const inspection = await this.inspectStartForm();
        if (inspection.blocking.length) {
            throw new RadicationStartFailure('FIELDS_MISSING', null, inspection.blocking);
        }
        const payload = buildRadicationStartPayload({
            processDefinitionKey: inspection.processDefinitionKey,
            radicationNumber: input.radicationNumber,
            providerName: input.providerName,
            email: input.email,
            documents: input.documents,
            outcome: inspection.outcome,
            language: startLanguage(inspection.fields, input.language),
        });
        const request = `${this.startProcess.constructor.name}.startProcessWithForm · POST form/v1/forms/${inspection.formKey}/submit/versions/${inspection.version}`;
        this.record('payload', request, true, 0, `outcome=${payload.outcome ?? '(default)'} · ${input.documents.length} document reference(s)`, {
            rows: maskStartPayload(payload.values).map((field) => ({ name: field.name, detail: field.shape })),
        });

        const started = Date.now();
        try {
            const instance = await firstValueFrom(this.startProcess.startProcessWithForm(appName, inspection.formKey, inspection.version, payload));
            const processInstanceId = (instance as { id?: string })?.id ?? (instance as { processInstanceId?: string })?.processInstanceId;
            if (!processInstanceId) {
                throw new Error('radication-start-no-instance');
            }
            this.record('start', request, true, Date.now() - started, `process instance ${processInstanceId.slice(0, 8)}… · status ${(instance as { status?: string })?.status ?? '?'}`);
            return processInstanceId;
        } catch (error) {
            const detail = describeAutomateError(error);
            this.record('start', request, false, Date.now() - started, 'Automate rejected the start form', { error: formatDetail(detail) });
            const code = detail.code?.includes('form-validation') || detail.status === 400 ? 'FORM_VALIDATION' : 'UNKNOWN';
            throw new RadicationStartFailure(code, detail);
        }
    }

    /**
     * Process status, its called processes and its tasks, read from the query service; while a
     * "Document AI Process" instance runs, also its service tasks (Separate, Classify, Extract…) with
     * the same query as CIC-Fin (`ServiceTaskListCloudService` → `query/admin/v1/service-tasks`). That
     * endpoint may need admin rights: on failure `serviceTasks` is `null` and the page falls back.
     * The technical view keeps one probe per instance, updated in place on every poll.
     */
    async snapshot(processInstanceId: string): Promise<RadicationRuntimeSnapshot> {
        const base = this.queryBaseUrl();
        const id = encodeURIComponent(processInstanceId);
        const started = Date.now();
        const [process, children, tasks] = await Promise.all([
            this.http.get<QueryEntry<QueryProcess>>(`${base}/process-instances/${id}`).catch(() => null),
            this.http.get<QueryList<QueryProcess>>(`${base}/process-instances?parentId=${id}&maxItems=50`).catch(() => null),
            this.http.get<QueryList<QueryTask>>(`${base}/process-instances/${id}/tasks?maxItems=50`).catch(() => null),
        ]);
        const entries = <T>(list: QueryList<T> | null) => (list?.list?.entries ?? []).map((item) => item.entry).filter((item): item is T => !!item);
        const childList = entries<QueryProcess>(children as QueryList<QueryProcess> | null);
        const taskList = entries<QueryTask>(tasks as QueryList<QueryTask> | null);
        const childName = (child: QueryProcess) => child.processDefinitionName ?? child.processDefinitionKey ?? child.name;
        // The newest running IDP instance (a "more documents" round runs Document AI Process again).
        const idp = childList
            .filter(
                (child) =>
                    !!child.id &&
                    matchesProcessRole(child, RADICATION_PROCESS_ROLES.extraction) &&
                    String(child.status).toUpperCase() === 'RUNNING'
            )
            .sort((a, b) => String(b.startDate ?? '').localeCompare(String(a.startDate ?? '')))[0];
        const serviceTasks = idp?.id ? await this.serviceTasks(idp.id) : null;

        const snapshot: RadicationRuntimeSnapshot = {
            processStatus: process?.entry?.status ?? null,
            childProcesses: childList.map((child): RadicationRuntimeItem => ({ id: child.id, name: childName(child), key: child.processDefinitionKey, status: child.status })),
            tasks: taskList.map((task): RadicationRuntimeItem => ({ id: task.id, name: task.name, status: task.status })),
            serviceTasks: serviceTasks?.ok ? serviceTasks.tasks : null,
        };
        const summary = [
            `status ${snapshot.processStatus ?? '?'}`,
            ...snapshot.childProcesses.map((child) => `${child.name ?? '?'} ${child.status ?? '?'}`),
            ...snapshot.tasks.map((task) => `task ${task.name ?? '?'} ${task.status ?? '?'}`),
            ...(snapshot.serviceTasks ?? []).filter((task) => String(task.status).toUpperCase() === 'STARTED').map((task) => `IDP ${task.activityName ?? '?'}`),
        ].join(' · ');
        this.diagnostics.record({
            kind: 'radication',
            key: `radication-progress:${processInstanceId}`,
            label: `progress · GET query/v1/process-instances/${processInstanceId.slice(0, 8)}… (+ children, tasks, IDP service tasks) · ${summary}`,
            durationMs: Date.now() - started,
            rows: snapshot.childProcesses.length + snapshot.tasks.length + (snapshot.serviceTasks?.length ?? 0),
            error: !process ? 'process instance query failed' : serviceTasks && !serviceTasks.ok ? `service tasks: ${serviceTasks.error}` : undefined,
            tables: buildProgressDiagnosticTables({
                processInstanceId,
                process: (process?.entry as Record<string, unknown> | undefined) ?? null,
                children: children ? (childList as Array<Record<string, unknown>>) : null,
                tasks: tasks ? (taskList as Array<Record<string, unknown>>) : null,
                idpProcessInstanceId: idp?.id ?? null,
                serviceTasks: serviceTasks ? { ok: serviceTasks.ok, error: serviceTasks.error, rows: serviceTasks.rows } : null,
            }),
        });
        return snapshot;
    }

    /** Service tasks of one IDP instance, as CIC-Fin's `queryServiceTasks`; never throws. */
    private async serviceTasks(
        processInstanceId: string
    ): Promise<{ ok: boolean; error?: string; tasks: RadicationServiceTask[]; rows: Array<Record<string, unknown>> }> {
        try {
            const response = (await firstValueFrom(
                this.serviceTaskList.getServiceTaskByRequest({ appName: this.appName(), processInstanceId, maxItems: 100, skipCount: 0 })
            )) as QueryList<Record<string, unknown>> | null;
            const rows = (response?.list?.entries ?? [])
                .map((item) => (item?.entry ?? item) as Record<string, unknown> | undefined)
                .filter((row): row is Record<string, unknown> => !!row);
            const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
            const tasks = rows.map(
                (row): RadicationServiceTask => ({
                    activityId: text(row['elementId'] ?? row['activityId']),
                    activityName: text(row['activityName']),
                    status: text(row['status']),
                    processInstanceId: text(row['processInstanceId']),
                })
            );
            return { ok: true, tasks, rows };
        } catch (error) {
            return { ok: false, error: formatDetail(describeAutomateError(error)) || 'request failed', tasks: [], rows: [] };
        }
    }

    /** Process variables by name (`batchState`, `MedRecNum`, `providerFindingComments`…), from the query service. */
    async variables(processInstanceId: string): Promise<Record<string, unknown>> {
        const started = Date.now();
        const request = `GET query/v1/process-instances/${processInstanceId.slice(0, 8)}…/variables`;
        try {
            const response = await this.http.get<QueryList<QueryVariable>>(
                `${this.queryBaseUrl()}/process-instances/${encodeURIComponent(processInstanceId)}/variables?maxItems=200`
            );
            const byName: Record<string, unknown> = {};
            for (const item of response?.list?.entries ?? []) {
                const name = item.entry?.name?.trim();
                if (name) {
                    byName[name] = item.entry?.value;
                }
            }
            this.record('variables', request, true, Date.now() - started, `${Object.keys(byName).length} variable(s)`, {
                rows: Object.entries(byName).map(([name, value]) => ({ name, detail: shapeOf(value) })),
            });
            return byName;
        } catch (error) {
            this.record('variables', request, false, Date.now() - started, 'variables not read', { error: formatDetail(describeAutomateError(error)) });
            throw error;
        }
    }

    /**
     * The agent table as the open Intake task holds it (`DataTable0hznuv`, with the provider's saved
     * `UserComment`/`Attended`). `saveTaskForm` writes task variables only; `preanalysisResult`
     * receives them when the task completes. Read-only (no claim); `undefined` without an open task.
     */
    async intakeReviewTable(processInstanceId: string): Promise<unknown> {
        try {
            const tasks = await this.http.get<QueryList<QueryTask>>(`${this.queryBaseUrl()}/process-instances/${encodeURIComponent(processInstanceId)}/tasks?maxItems=50`);
            const open = (tasks?.list?.entries ?? [])
                .map((item) => item.entry)
                .find((task) => task?.name === RADICATION_TASK_NAMES.intake && ['CREATED', 'ASSIGNED'].includes(String(task.status).toUpperCase()));
            if (!open?.id) {
                return undefined;
            }
            const variables = await firstValueFrom(this.formCloud.getTaskVariables(this.appName(), open.id));
            return variables.find((variable) => variable.name === PREANALYSIS_RESULT_TABLE_FIELD)?.value;
        } catch {
            return undefined;
        }
    }

    /**
     * Saves the provider's comments in the Intake form without completing it, as CIC-Fin's
     * `saveReviewUserComment`: parse the task form, `saveTaskForm`, read the task variables back and
     * confirm. The deployed form needs a `providerFindingComments` field mapped to that process variable.
     */
    async saveFindingComments(processInstanceId: string, comments: ProviderFindingComments): Promise<void> {
        const form = await this.openIntakeForm(processInstanceId);
        const request = `FormCloudService.saveTaskForm · task ${form.taskId.slice(0, 8)}… · ${INTAKE_FORM_FIELDS.comments}`;
        if (!form.commentsFieldPresent) {
            this.record('comments', request, false, 0, `${comments.comments.length} comment(s) not saved`, {
                error: `the Intake form has no ${INTAKE_FORM_FIELDS.comments} field`,
            });
            throw new RadicationStepFailure('COMMENTS_FIELD_MISSING');
        }
        const values = buildIntakeFormValues({ currentValues: form.model.values, comments, decision: null, commentsFieldPresent: true });
        const started = Date.now();
        try {
            await firstValueFrom(this.formCloud.saveTaskForm(this.appName(), form.taskId, form.processInstanceId, form.formKey, values));
            const saved = await firstValueFrom(this.formCloud.getTaskVariables(this.appName(), form.taskId));
            const stored = parseProviderFindingComments(saved.find((variable) => variable.name === INTAKE_FORM_FIELDS.comments)?.value);
            const expected = Object.fromEntries(comments.comments.map((item) => [item.findingId, item.comment]));
            if (!sameFindingComments(stored, expected)) {
                throw new RadicationStepFailure('COMMENTS_NOT_CONFIRMED');
            }
            this.record('comments', request, true, Date.now() - started, `${comments.comments.length} comment(s) saved and read back`, {
                rows: comments.comments.map((item) => ({ name: item.findingId, detail: `${item.kind} · text(${item.comment.length})` })),
            });
        } catch (error) {
            const failure = error instanceof RadicationStepFailure ? error : new RadicationStepFailure('INTAKE_FAILED', describeAutomateError(error));
            this.record('comments', request, false, Date.now() - started, 'comments not saved', {
                error: failure.detail ? formatDetail(failure.detail) : failure.code,
            });
            throw failure;
        }
    }

    /**
     * Annotates one row of the agent's pre-analysis in the Intake form, as CIC-Fin's
     * `saveReviewUserComment`: load the open "Nueva Cuenta" form, find the exact row of
     * `DataTable0hznuv` (ClassName + Comment + Status + sorted DocumentIDs), set `UserComment`
     * and `Attended=true`, `saveTaskForm` without completing, and read it back. Throws
     * `REVIEW_TABLE_MISSING` when the deployed form has no such field (the page then falls back to
     * `providerFindingComments`) and `REVIEW_ROW_CHANGED` when the row is gone or ambiguous.
     */
    async saveAgentReviewComment(processInstanceId: string, target: Record<string, unknown>, comment: string): Promise<Record<string, unknown>> {
        const form = await this.openIntakeForm(processInstanceId);
        const request = `FormCloudService.saveTaskForm · task ${form.taskId.slice(0, 8)}… · ${PREANALYSIS_RESULT_TABLE_FIELD}`;
        const field = form.model.getFieldById(PREANALYSIS_RESULT_TABLE_FIELD);
        if (!field || field.readOnly) {
            this.record('comments', request, false, 0, 'agent pre-analysis comment saved in providerFindingComments instead', {
                error: `the Intake form has no editable ${PREANALYSIS_RESULT_TABLE_FIELD} field`,
            });
            throw new RadicationStepFailure('REVIEW_TABLE_MISSING');
        }
        const started = Date.now();
        try {
            const variables = await firstValueFrom(this.formCloud.getTaskVariables(this.appName(), form.taskId));
            const current = variables.find((variable) => variable.name === PREANALYSIS_RESULT_TABLE_FIELD)?.value ?? form.model.values[PREANALYSIS_RESULT_TABLE_FIELD];
            const annotated = annotateReviewRow(reviewTableRows(current), target, comment);
            if (!annotated) {
                throw new RadicationStepFailure('REVIEW_ROW_CHANGED');
            }
            const value = typeof current === 'string' ? JSON.stringify(annotated.rows) : annotated.rows;
            await firstValueFrom(
                this.formCloud.saveTaskForm(this.appName(), form.taskId, form.processInstanceId, form.formKey, { ...form.model.values, [PREANALYSIS_RESULT_TABLE_FIELD]: value })
            );
            const saved = await firstValueFrom(this.formCloud.getTaskVariables(this.appName(), form.taskId));
            const confirmed = reviewTableRows(saved.find((variable) => variable.name === PREANALYSIS_RESULT_TABLE_FIELD)?.value).find((row) => sameReviewFinding(row, target));
            if (!confirmed || confirmed['UserComment'] !== annotated.row['UserComment'] || confirmed['Attended'] !== true) {
                throw new RadicationStepFailure('COMMENTS_NOT_CONFIRMED');
            }
            this.record('comments', request, true, Date.now() - started, `1 row annotated and read back · text(${String(annotated.row['UserComment']).length})`, {
                rows: [{ name: String(target['ClassName'] ?? '?'), detail: String(target['Status'] ?? '?') }],
            });
            return confirmed;
        } catch (error) {
            const failure =
                error instanceof RadicationStepFailure
                    ? error
                    : error instanceof Error && error.message === 'review-table-unavailable'
                      ? new RadicationStepFailure('REVIEW_ROW_CHANGED')
                      : new RadicationStepFailure('INTAKE_FAILED', describeAutomateError(error));
            this.record('comments', request, false, Date.now() - started, 'agent pre-analysis comment not saved', {
                error: failure.detail ? formatDetail(failure.detail) : failure.code,
            });
            throw failure;
        }
    }

    /**
     * Completes the Intake task with the provider's decision, as CIC-Fin's `completeReview`
     * (`completeTaskForm` with the parsed form values). "more-documents" sends the new references in
     * `supportDocumentUpload`, so the process runs IDP on them and returns to Intake; "continue" clears
     * it and the account moves on to the ARS analysis.
     */
    async completeIntake(
        processInstanceId: string,
        input: { decision: IntakeDecision; comments: ProviderFindingComments | null; newDocuments?: readonly RadicationDocument[] }
    ): Promise<void> {
        const form = await this.openIntakeForm(processInstanceId);
        const values = buildIntakeFormValues({
            currentValues: form.model.values,
            comments: input.comments,
            decision: input.decision,
            newDocuments: input.newDocuments,
            commentsFieldPresent: form.commentsFieldPresent,
        });
        const outcome = resolveIntakeOutcome(form.model.outcomes);
        const request = `FormCloudService.completeTaskForm · task ${form.taskId.slice(0, 8)}… · outcome=${outcome || '(default)'}`;
        const started = Date.now();
        try {
            await firstValueFrom(
                this.formCloud.completeTaskForm(this.appName(), form.taskId, form.processInstanceId, form.formKey, values, outcome, form.appVersion)
            );
            this.record('decision', request, true, Date.now() - started, `${input.decision} · ${input.newDocuments?.length ?? 0} new document(s)`, {
                rows: maskStartPayload(values).map((field) => ({ name: field.name, detail: field.shape })),
            });
        } catch (error) {
            const detail = describeAutomateError(error);
            this.record('decision', request, false, Date.now() - started, input.decision, { error: formatDetail(detail) });
            throw new RadicationStepFailure('INTAKE_FAILED', detail);
        }
    }

    /** Finds the open Intake task, claims it when unassigned and parses its deployed form with the task values. */
    private async openIntakeForm(processInstanceId: string): Promise<IntakeForm> {
        const appName = this.appName();
        const started = Date.now();
        const request = `query tasks "${RADICATION_TASK_NAMES.intake}" · TaskCloudService.getTaskById · FormCloudService.getForm`;
        try {
            const tasks = await this.http.get<QueryList<QueryTask>>(`${this.queryBaseUrl()}/process-instances/${encodeURIComponent(processInstanceId)}/tasks?maxItems=50`);
            const open = (tasks?.list?.entries ?? [])
                .map((item) => item.entry)
                .find((task) => task?.name === RADICATION_TASK_NAMES.intake && ['CREATED', 'ASSIGNED'].includes(String(task.status).toUpperCase()));
            if (!open?.id) {
                throw new RadicationStepFailure('INTAKE_NOT_READY');
            }
            if (String(open.status).toUpperCase() === 'CREATED') {
                const username = this.identityUser.getCurrentUserInfo()?.username;
                if (username) {
                    await firstValueFrom(this.taskCloud.claimTask(appName, open.id, username));
                }
            }
            const details = await firstValueFrom(this.taskCloud.getTaskById(appName, open.id));
            const formKey = details?.formKey;
            const appVersion = Number(details?.appVersion);
            if (!formKey || !appVersion) {
                throw new RadicationStepFailure('INTAKE_FAILED', { status: null, code: 'intake-form-contract', message: 'task without formKey or appVersion', fields: [] });
            }
            const [definition, taskVariables] = await Promise.all([
                firstValueFrom(this.formCloud.getForm(appName, formKey, appVersion)),
                firstValueFrom(this.formCloud.getTaskVariables(appName, open.id)),
            ]);
            const model = this.formCloud.parseForm(definition, taskVariables);
            const commentsFieldPresent = !!model.getFieldById(INTAKE_FORM_FIELDS.comments);
            this.record('intake', request, true, Date.now() - started, `task ${open.id.slice(0, 8)}… · ${String(open.status)} · form ${formKey} v${appVersion}`, {
                rows: [INTAKE_FORM_FIELDS.account, INTAKE_FORM_FIELDS.newDocuments, INTAKE_FORM_FIELDS.comments, PREANALYSIS_RESULT_TABLE_FIELD].map((id) => ({
                    name: id,
                    detail: model.getFieldById(id) ? `present · ${shapeOf(model.values[id])}` : 'missing in the deployed form',
                })),
            });
            return {
                taskId: open.id,
                processInstanceId: details.processInstanceId ?? open.processInstanceId ?? processInstanceId,
                formKey,
                appVersion,
                model,
                commentsFieldPresent,
            };
        } catch (error) {
            const failure = error instanceof RadicationStepFailure ? error : new RadicationStepFailure('INTAKE_FAILED', describeAutomateError(error));
            this.record('intake', request, false, Date.now() - started, 'Intake task not opened', {
                error: failure.detail ? formatDetail(failure.detail) : failure.code,
            });
            throw failure;
        }
    }

    /**
     * Diagnostic for the review viewer: reads the node behind a "View" button (the batchState
     * `contentFileReferences[i].sys_id`) and records whether it exists, its type and whether it has a
     * file, so a failed preview can be told apart (missing node, no access, folder, no blob). Read only.
     */
    async probeDocument(document: { nodeId?: string | null; categoryKey?: string; mimeType?: string | null }): Promise<void> {
        const nodeId = document.nodeId ?? '';
        const label = `${document.categoryKey ?? '?'} · node ${nodeId ? nodeId.slice(0, 8) + '…' : '(none)'}`;
        const request = `DocumentService.getDocumentById · ${nodeId ? nodeId.slice(0, 8) + '…' : '(none)'}`;
        if (!nodeId) {
            this.record('variables', request, false, 0, `viewer probe · ${label}`, { error: 'no sys_id in batchState contentFileReferences for this document' });
            return;
        }
        const started = Date.now();
        try {
            const node = (await firstValueFrom(this.documentService.getDocumentById(nodeId))) as Document & { sysfile_blob?: { mimeType?: string; length?: number } };
            const blob = node?.sysfile_blob;
            this.record('variables', request, !!blob, Date.now() - started, `viewer probe · ${label}`, {
                rows: [
                    { name: 'sys_primaryType', detail: String(node?.sys_primaryType ?? '?') },
                    { name: 'sysfile_blob', detail: blob ? `${blob.mimeType ?? '?'} · ${blob.length ?? '?'} bytes` : 'absent' },
                    { name: 'batchState mimeType', detail: String(document.mimeType ?? '?') },
                ],
                error: blob ? undefined : 'node has no sysfile_blob: the viewer cannot download it',
            });
        } catch (error) {
            this.record('variables', request, false, Date.now() - started, `viewer probe · ${label}`, { error: formatDetail(describeAutomateError(error)) || 'node not readable' });
        }
    }

    private record(
        step: RadicationTraceStep,
        request: string,
        ok: boolean,
        durationMs: number,
        summary: string,
        extra: { rows?: Array<{ name: string; detail: string }>; error?: string } = {}
    ): void {
        this.diagnostics.record({
            kind: 'radication',
            label: `${step} · ${request} · ${summary}`,
            durationMs,
            rows: extra.rows?.length,
            error: ok ? undefined : (extra.error ?? 'failed'),
            fields: extra.rows?.map((row) => ({ name: row.name, types: [row.detail], present: 1 })),
        });
    }

    private folderId: string | null = null;

    private async resolveUploadFolderId(): Promise<string> {
        if (this.folderId) {
            return this.folderId;
        }
        const folder = await firstValueFrom(this.documentService.getDocumentByPath(RADICATION_START_FORM.uploadFolderPath)).catch(() => null);
        if (!folder?.sys_id) {
            throw new Error('upload-folder-not-found');
        }
        this.folderId = folder.sys_id;
        return folder.sys_id;
    }

    private async resolveDefinition(appName: string): Promise<{ key: string; formKey: string; version: number }> {
        const started = Date.now();
        const definitions = await firstValueFrom(this.startProcess.getProcessDefinitions(appName));
        const selection = selectRadicationDefinition(definitions);
        const definition = selection.definition;
        const chosen = selection.candidates.find((candidate) => candidate.verdict === 'CHOSEN');
        // Which definition starts the radication and why; subprocesses sharing the start form are listed as excluded.
        this.record(
            'definition',
            `select root process (key ${rootProcessKey()}, mapping ${activeProcessMappingSource()}) among ${selection.candidates.length} deployed definition(s)`,
            !!chosen,
            Date.now() - started,
            chosen
                ? `chosen ${chosen.name || '?'} · key=${chosen.key} · version=${chosen.version} · matched by ${selection.matchedBy} (key first, name fallback), latest version, subprocesses excluded`
                : `no root definition (mapping keys or names) with a start form: nothing started`,
            {
                rows: [
                    ...selection.candidates.map((candidate) => ({
                        name: `${candidate.name || '?'} · ${candidate.key || '?'} · v${candidate.version}`,
                        detail: `${candidate.verdict}${candidate.formKey ? ` · formKey=${candidate.formKey}` : ' · no start form'}`,
                    })),
                    ...describeProcessMapping().map((line) => ({ name: 'mapping', detail: line })),
                ],
                error: chosen ? undefined : 'DEFINITION_NOT_FOUND',
            }
        );
        if (!definition?.key || !definition.formKey) {
            throw new RadicationStartFailure('DEFINITION_NOT_FOUND');
        }
        return { key: String(definition.key), formKey: String(definition.formKey), version: Number(definition.version) || 0 };
    }

    private appName(): string {
        const appName = resolveDeployedAppName(this.appConfig);
        if (!appName) {
            throw new RadicationStartFailure('DEFINITION_NOT_FOUND');
        }
        return appName;
    }

    private queryBaseUrl(): string {
        const host = String(this.appConfig.get('bpmHost', '')).replace(/\/+$/, '');
        return `${host}/${this.appName()}/query/v1`;
    }
}

function fileExtensionOf(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '?';
}

/** Kind and id of a form reference; never its name or content. */
function describeReference(document: RadicationDocument): string {
    if (isPendingDocument(document)) {
        return `PendingDocument · persisted=${document.persisted} · sys_id=${document.document?.sys_id ?? '?'}`;
    }
    return `Document · sys_id=${document?.sys_id ?? '?'} · keys=${Object.keys(document ?? {}).length}`;
}

/** Type and size of a value; never its content. */
function shapeOf(value: unknown): string {
    if (value === null || value === undefined) {
        return 'empty';
    }
    if (Array.isArray(value)) {
        return `array(${value.length})`;
    }
    if (typeof value === 'string') {
        return `string(${value.length})`;
    }
    return typeof value === 'object' ? `object(${Object.keys(value as object).length} keys)` : typeof value;
}

function formatDetail(detail: AutomateErrorDetail): string {
    return [detail.status ? `HTTP ${detail.status}` : '', detail.code ?? '', detail.message ?? '', detail.fields.length ? `fields: ${detail.fields.join(', ')}` : '']
        .filter(Boolean)
        .join(' · ');
}

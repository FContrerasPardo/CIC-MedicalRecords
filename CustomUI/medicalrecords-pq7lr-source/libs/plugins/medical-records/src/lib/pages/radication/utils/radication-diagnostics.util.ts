/**
 * Pure helpers for the radication technical view and for explaining a rejected start form:
 * read the deployed start form's fields, compare them with what the page sends, describe the
 * payload by structure only (no email, no document content) and extract Automate's error.
 */

export interface StartFormField {
    id: string;
    type: string;
    name: string;
    required: boolean;
    readOnly: boolean;
}

export type ExpectedFieldKind = 'text' | 'upload';

export interface ExpectedStartField {
    id: string;
    kind: ExpectedFieldKind;
}

/** `ok`: present; `missing`: not in the deployed form; `id-mismatch`: same name in another case/format; `type-mismatch`: present with an unexpected type. */
export type StartFieldCheckStatus = 'ok' | 'missing' | 'id-mismatch' | 'type-mismatch';

export interface StartFieldCheck {
    id: string;
    status: StartFieldCheckStatus;
    /** Field found in the deployed form (for mismatches, the actual id). */
    actualId?: string;
    actualType?: string;
    required?: boolean;
    readOnly?: boolean;
}

export interface MaskedPayloadField {
    name: string;
    /** JSON type and, for arrays, length and the keys of the first item (never values). */
    shape: string;
}

export interface AutomateErrorDetail {
    status: number | null;
    code: string | null;
    message: string | null;
    /** Field ids named by the error body, when Automate lists them. */
    fields: string[];
}

const CONTAINER_TYPES = new Set(['container', 'section', 'group', 'tabs', 'tab', 'dynamic-table']);
const UPLOAD_TYPE = /upload|attach|file/i;
const EMAIL_PATTERN = /[^\s@"']+@[^\s@"']+\.[^\s@"']{2,}/g;
const MAX_MESSAGE = 400;

const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const normalizeId = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Leaf fields of a form definition (sections, containers and column maps are walked). */
export function extractStartFormFields(form: unknown): StartFormField[] {
    const definition = findFormDefinition(form, 0);
    if (!definition) {
        return [];
    }
    const found: StartFormField[] = [];
    collectFields(definition['fields'], found, 0);
    const seen = new Set<string>();
    return found.filter((field) => {
        if (seen.has(field.id)) {
            return false;
        }
        seen.add(field.id);
        return true;
    });
}

function findFormDefinition(value: unknown, depth: number): Record<string, unknown> | null {
    const record = asRecord(value);
    if (!record || depth > 6) {
        return null;
    }
    if (Array.isArray(record['fields'])) {
        return record;
    }
    for (const key of ['formRepresentation', 'formDefinition', 'data', 'json']) {
        const nested = findFormDefinition(record[key], depth + 1);
        if (nested) {
            return nested;
        }
    }
    return null;
}

function collectFields(value: unknown, out: StartFormField[], depth: number): void {
    if (depth > 10 || !value) {
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => collectFields(item, out, depth + 1));
        return;
    }
    const record = asRecord(value);
    if (!record) {
        return;
    }
    const type = typeof record['type'] === 'string' ? (record['type'] as string) : '';
    const id = typeof record['id'] === 'string' ? (record['id'] as string) : '';
    const nested = record['fields'] ?? record['columns'];
    if (nested && (Array.isArray(nested) || asRecord(nested))) {
        // Sections keep their children in a column map ({ "1": [...] }) or an array.
        const children = Array.isArray(nested) ? nested : Object.values(nested as Record<string, unknown>);
        collectFields(children, out, depth + 1);
        if (CONTAINER_TYPES.has(type) || !id) {
            return;
        }
    }
    if (id && type && !CONTAINER_TYPES.has(type)) {
        out.push({
            id,
            type,
            name: typeof record['name'] === 'string' ? (record['name'] as string) : id,
            required: record['required'] === true,
            readOnly: record['readOnly'] === true,
        });
    }
}

/** Compares the ids the page sends with the deployed start form. */
export function checkStartFormFields(fields: readonly StartFormField[], expected: readonly ExpectedStartField[]): StartFieldCheck[] {
    return expected.map((wanted): StartFieldCheck => {
        const exact = fields.find((field) => field.id === wanted.id);
        const field =
            exact ??
            fields.find((candidate) => normalizeId(candidate.id) === normalizeId(wanted.id) || normalizeId(candidate.name) === normalizeId(wanted.id));
        if (!field) {
            return { id: wanted.id, status: 'missing' };
        }
        const base = { actualId: field.id, actualType: field.type, required: field.required, readOnly: field.readOnly };
        if (!exact) {
            return { id: wanted.id, status: 'id-mismatch', ...base };
        }
        const isUpload = UPLOAD_TYPE.test(field.type);
        if ((wanted.kind === 'upload') !== isUpload) {
            return { id: wanted.id, status: 'type-mismatch', ...base };
        }
        return { id: wanted.id, status: 'ok', ...base };
    });
}

/** Checks that would make Automate reject the start form; empty when the definition could not be read. */
export function blockingFieldIssues(checks: readonly StartFieldCheck[], formFieldCount: number): StartFieldCheck[] {
    return formFieldCount ? checks.filter((check) => check.status !== 'ok') : [];
}

function shapeOf(value: unknown): string {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (Array.isArray(value)) {
        const first = asRecord(value[0]);
        const keys = first ? `{${Object.keys(first).sort().join(',')}}` : value.length ? typeof value[0] : '';
        return `array(${value.length})${keys ? `<${keys}>` : ''}`;
    }
    if (typeof value === 'string') {
        return `string(${value.length})`;
    }
    return typeof value;
}

/** Field names and shapes of the start-form values; never the values themselves. */
export function maskStartPayload(values: Record<string, unknown>): MaskedPayloadField[] {
    return Object.entries(values).map(([name, value]) => ({ name, shape: shapeOf(value) }));
}

function parseJson(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }
    const text = value.trim();
    if (!text.startsWith('{') && !text.startsWith('[')) {
        return value;
    }
    try {
        return JSON.parse(text);
    } catch {
        return value;
    }
}

const maskText = (text: string) => text.replace(EMAIL_PATTERN, '<email>').slice(0, MAX_MESSAGE);
const firstText = (...values: unknown[]): string | undefined =>
    values.find((value): value is string => typeof value === 'string' && value.trim() !== '');

/**
 * Status, code and message of an Automate error, from an HttpErrorResponse-like object
 * (`status`, `error`), an ADF/axios error (`response.status`, `response.body|data`) or a message
 * carrying the JSON body. Emails in the message are masked.
 */
export function describeAutomateError(error: unknown): AutomateErrorDetail {
    const record = asRecord(error) ?? {};
    const response = asRecord(record['response']) ?? {};
    const status = Number(record['status'] ?? response['status'] ?? record['statusCode']);
    const rawBody = record['error'] ?? response['body'] ?? response['data'] ?? parseJson(record['message']);
    const parsed = parseJson(rawBody);
    const body = asRecord(parsed);
    const inner = asRecord(body?.['error']) ?? asRecord(body?.['entry']);
    const code = firstText(body?.['code'], inner?.['code'], body?.['errorKey'], inner?.['errorKey'], body?.['status']);
    const message = firstText(
        body?.['message'],
        inner?.['message'],
        inner?.['briefSummary'],
        body?.['detail'],
        typeof parsed === 'string' ? parsed : undefined,
        typeof error === 'string' ? error : undefined,
        record['message']
    );
    const fieldSource = body?.['fieldErrors'] ?? body?.['errors'] ?? inner?.['fieldErrors'];
    let fields: string[] = [];
    if (Array.isArray(fieldSource)) {
        fields = fieldSource
            .map((entry) => asRecord(entry)?.['field'] ?? asRecord(entry)?.['id'] ?? entry)
            .filter((entry): entry is string => typeof entry === 'string');
    } else if (asRecord(fieldSource)) {
        fields = Object.keys(fieldSource as Record<string, unknown>);
    }
    return {
        status: Number.isFinite(status) && status > 0 ? status : null,
        code: code ? maskText(code) : null,
        message: message ? maskText(message) : null,
        fields,
    };
}

/** Structured table for the technical view (same shape as `DiagnosticTable` of the dashboard diagnostics). */
export interface ProgressDiagnosticTable {
    title: string;
    request?: string;
    error?: string;
    note?: string;
    columns: string[];
    rows: string[][];
}

/** Rows of the query service read by the radication poll; only technical fields are kept. */
export interface ProgressDiagnosticInput {
    processInstanceId: string;
    /** `entry` of `query/v1/process-instances/{id}`, or `null` when it failed. */
    process: Record<string, unknown> | null;
    children: ReadonlyArray<Record<string, unknown>> | null;
    tasks: ReadonlyArray<Record<string, unknown>> | null;
    /** Instance whose service tasks were requested (the running Document AI Process), if any. */
    idpProcessInstanceId: string | null;
    serviceTasks: { ok: boolean; error?: string; rows: ReadonlyArray<Record<string, unknown>> } | null;
}

/** Technical fields of a process instance; never its name, business key or variables. */
const PROCESS_FIELDS = ['status', 'processDefinitionKey', 'processDefinitionName', 'processDefinitionVersion', 'startDate', 'completedDate', 'lastModified', 'parentId', 'rootProcessInstanceId'];

function cell(value: unknown): string {
    if (value === null || value === undefined || typeof value === 'object') {
        return '';
    }
    return String(value);
}

/**
 * Tables of one progress snapshot, as CIC-Fin's "Processing task query diagnostic (IDP)": process
 * instance fields, called processes, tasks and IDP service tasks. Every table carries the process
 * instance column. Ids, names, statuses and dates only: no variables or business values.
 */
export function buildProgressDiagnosticTables(input: ProgressDiagnosticInput): ProgressDiagnosticTable[] {
    const id = input.processInstanceId;
    const process = input.process;
    const tables: ProgressDiagnosticTable[] = [
        {
            title: 'Process instance',
            request: `GET query/v1/process-instances/${id}`,
            error: process ? undefined : 'process instance query failed',
            columns: ['Field', 'Value', 'Process instance'],
            rows: process ? PROCESS_FIELDS.filter((field) => cell(process[field]) !== '').map((field) => [field, cell(process[field]), id]) : [],
        },
        {
            title: 'Called processes',
            request: `GET query/v1/process-instances?parentId=${id}`,
            error: input.children ? undefined : 'called processes query failed',
            columns: ['Process instance', 'Definition', 'Status', 'Start date', 'Completed date'],
            rows: (input.children ?? []).map((child) => [
                cell(child['id']),
                cell(child['processDefinitionName'] ?? child['processDefinitionKey']),
                cell(child['status']),
                cell(child['startDate']),
                cell(child['completedDate']),
            ]),
        },
        {
            title: 'Tasks',
            request: `GET query/v1/process-instances/${id}/tasks`,
            error: input.tasks ? undefined : 'tasks query failed',
            columns: ['Task id', 'Name', 'Status', 'Process instance'],
            rows: (input.tasks ?? []).map((task) => [cell(task['id']), cell(task['name']), cell(task['status']), cell(task['processInstanceId']) || id]),
        },
    ];
    const serviceTasks = input.serviceTasks;
    tables.push({
        title: 'IDP service tasks (ServiceTaskListCloudService)',
        request: input.idpProcessInstanceId ? `GET query/admin/v1/service-tasks?processInstanceId=${input.idpProcessInstanceId}` : undefined,
        error: serviceTasks && !serviceTasks.ok ? serviceTasks.error || 'service tasks query failed' : undefined,
        note: input.idpProcessInstanceId ? undefined : 'Not requested: no running Document AI Process instance.',
        columns: ['Element id', 'Activity name', 'Status', 'Process instance'],
        rows: (serviceTasks?.rows ?? []).map((task) => [
            cell(task['elementId'] ?? task['activityId']),
            cell(task['activityName']),
            cell(task['status']),
            cell(task['processInstanceId']) || cell(input.idpProcessInstanceId),
        ]),
    });
    return tables;
}

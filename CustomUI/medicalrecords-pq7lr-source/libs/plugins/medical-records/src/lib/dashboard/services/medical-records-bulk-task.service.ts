import { Injectable } from '@angular/core';
import { AppConfigService, FormValues, IdentityUserService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import {
    FormCloudService,
    TaskCloudService,
} from '@alfresco/adf-process-services-cloud';
import { catchError, concatMap, from, last, map, Observable, of, switchMap, toArray, throwError } from 'rxjs';
import { evaluateTaskEligibility, TaskEligibilityResult } from '../eligibility/task-eligibility';
import { ProcessAttentionItem } from '../definitions/process-attention.model';
import { MedicalRecordsTaskQueryService } from './medical-records-task-query.service';

export interface TaskEligibilityEvaluation extends TaskEligibilityResult {
    taskId: string;
    taskName: string;
}

export interface BulkSelectionEvaluation {
    mixedTaskTypes: boolean;
    taskType: TaskEligibilityResult['taskType'];
    items: TaskEligibilityEvaluation[];
    eligibleCount: number;
    ineligibleCount: number;
}

export interface BulkCompleteFailure {
    taskId: string;
    reason: string;
}

export interface BulkCompleteResult {
    succeeded: string[];
    failed: BulkCompleteFailure[];
}

interface CompleteTaskPayload {
    taskId: string;
    payloadType: 'CompleteTaskPayload';
    variables: Record<string, { value: unknown; type: string }>;
}

@Injectable({ providedIn: 'root' })
export class MedicalRecordsBulkTaskService {
    constructor(
        private readonly taskCloudService: TaskCloudService,
        private readonly formCloudService: FormCloudService,
        private readonly identityUserService: IdentityUserService,
        private readonly adfHttpClient: AdfHttpClient,
        private readonly appConfigService: AppConfigService,
        private readonly taskQueryService: MedicalRecordsTaskQueryService
    ) {}

    evaluateSelection(items: ProcessAttentionItem[]): BulkSelectionEvaluation {
        const evaluations = items.map((item) => this.evaluateItem(item));
        const taskTypes = new Set(evaluations.map((entry) => entry.taskType));
        const mixedTaskTypes = taskTypes.size > 1;
        const taskType = evaluations[0]?.taskType ?? 'unknown';

        return {
            mixedTaskTypes,
            taskType,
            items: evaluations,
            eligibleCount: evaluations.filter((entry) => entry.eligible).length,
            ineligibleCount: evaluations.filter((entry) => !entry.eligible).length,
        };
    }

    evaluateSelectionFresh(items: ProcessAttentionItem[]): Observable<BulkSelectionEvaluation> {
        if (!items.length) {
            return of({
                mixedTaskTypes: false,
                taskType: 'unknown' as const,
                items: [],
                eligibleCount: 0,
                ineligibleCount: 0,
            });
        }

        const appName = this.resolveAppName();
        return from(items).pipe(
            concatMap((item) =>
                this.loadTaskVariables(appName, item.id).pipe(
                    map((variables) => this.evaluateItem({ ...item, processVariables: variables }))
                )
            ),
            toArray(),
            map((evaluations) => {
                const taskTypes = new Set(evaluations.map((entry) => entry.taskType));
                return {
                    mixedTaskTypes: taskTypes.size > 1,
                    taskType: evaluations[0]?.taskType ?? 'unknown',
                    items: evaluations,
                    eligibleCount: evaluations.filter((entry) => entry.eligible).length,
                    ineligibleCount: evaluations.filter((entry) => !entry.eligible).length,
                };
            })
        );
    }

    completeEligible(items: ProcessAttentionItem[]): Observable<BulkCompleteResult> {
        if (!items.length) {
            return of({ succeeded: [], failed: [] });
        }

        const appName = this.resolveAppName();
        const result: BulkCompleteResult = { succeeded: [], failed: [] };

        return this.evaluateSelectionFresh(items).pipe(
            switchMap((evaluation) => {
                if (evaluation.mixedTaskTypes) {
                    return throwError(() => new Error('Selected tasks must share the same task type.'));
                }

                const eligibleIds = new Set(
                    evaluation.items.filter((entry) => entry.eligible).map((entry) => entry.taskId)
                );
                const eligibleItems = items.filter((item) => eligibleIds.has(item.id));

                if (!eligibleItems.length) {
                    return of(result);
                }

                return from(eligibleItems).pipe(
                    concatMap((item) =>
                        this.loadTaskVariables(appName, item.id).pipe(
                            switchMap((variables) =>
                                this.completeSingleTask(appName, { ...item, processVariables: variables })
                            ),
                            map(() => {
                                result.succeeded.push(item.id);
                            }),
                            catchError((error: unknown) => {
                                const reason = error instanceof Error ? error.message : 'Unable to complete task';
                                result.failed.push({ taskId: item.id, reason });
                                return of(undefined);
                            })
                        )
                    ),
                    last(null),
                    map(() => result)
                );
            }),
            switchMap((bulkResult) => {
                this.taskQueryService.loadAttentionItems();
                return of(bulkResult);
            })
        );
    }

    private evaluateItem(item: ProcessAttentionItem): TaskEligibilityEvaluation {
        const eligibility = evaluateTaskEligibility(
            item.processVariables,
            item.taskName,
            item.taskDefinitionKey,
            item.taskDefinitionKey
        );

        return {
            ...eligibility,
            taskId: item.id,
            taskName: item.taskName,
        };
    }

    private completeSingleTask(appName: string, item: ProcessAttentionItem): Observable<void> {
        return this.taskCloudService.getTaskById(appName, item.id).pipe(
            switchMap((task) => {
                const claim$ = item.taskStatus === 'CREATED' ? this.claimTask(appName, item.id) : of(undefined);

                return claim$.pipe(
                    switchMap(() => this.loadTaskVariables(appName, item.id)),
                    switchMap((variables) => {
                        const formKey = task.formKey;
                        if (formKey) {
                            return this.formCloudService.getTaskForm(appName, item.id, formKey).pipe(
                                switchMap((form) => {
                                    const formValues = this.toFormValues(variables);
                                    const outcome =
                                        form.outcomes?.find((entry) => entry.isSystem && entry.name === 'Complete')?.id ??
                                        form.outcomes?.[0]?.id ??
                                        'complete';

                                    return this.formCloudService.completeTaskForm(
                                        appName,
                                        item.id,
                                        task.processInstanceId,
                                        formKey,
                                        formValues,
                                        outcome,
                                        form.version
                                    );
                                })
                            );
                        }

                        return from(this.completeTaskWithPayload(appName, item.id, variables));
                    }),
                    map(() => void 0)
                );
            })
        );
    }

    private claimTask(appName: string, taskId: string): Observable<void> {
        const username = this.identityUserService.getCurrentUserInfo()?.username;
        if (!username) {
            return throwError(() => new Error('Current user is not available to claim the task.'));
        }

        return this.taskCloudService.claimTask(appName, taskId, username).pipe(map(() => void 0));
    }

    private loadTaskVariables(appName: string, taskId: string): Observable<Record<string, unknown>> {
        return this.formCloudService.getTaskVariables(appName, taskId).pipe(
            map((variables) =>
                variables.reduce<Record<string, unknown>>((accumulator, variable) => {
                    if (variable.name) {
                        accumulator[variable.name] = variable.value;
                    }
                    return accumulator;
                }, {})
            )
        );
    }

    private completeTaskWithPayload(
        appName: string,
        taskId: string,
        variables: Record<string, unknown>
    ): Promise<unknown> {
        const host = String(this.appConfigService.get('bpmHost', '')).replace(/\/+$/, '');
        const url = `${host}/${appName}/rb/v1/tasks/${encodeURIComponent(taskId)}/complete`;
        const payload: CompleteTaskPayload = {
            taskId,
            payloadType: 'CompleteTaskPayload',
            variables: this.toTypedVariables(variables),
        };

        return this.adfHttpClient.post(url, { bodyParam: payload });
    }

    private toFormValues(variables: Record<string, unknown>): FormValues {
        return { ...variables };
    }

    private toTypedVariables(variables: Record<string, unknown>): Record<string, { value: unknown; type: string }> {
        return Object.entries(variables).reduce<Record<string, { value: unknown; type: string }>>(
            (accumulator, [name, value]) => {
                accumulator[name] = { value, type: inferVariableType(value) };
                return accumulator;
            },
            {}
        );
    }

    private resolveAppName(): string {
        return this.appConfigService.get<Array<{ name: string }>>('alfresco-deployed-apps')?.[0]?.name ?? '';
    }
}

function inferVariableType(value: unknown): string {
    if (typeof value === 'boolean') {
        return 'boolean';
    }

    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'integer' : 'double';
    }

    if (value !== null && typeof value === 'object') {
        return 'json';
    }

    return 'string';
}

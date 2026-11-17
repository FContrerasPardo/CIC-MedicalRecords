import { inject, Injectable } from '@angular/core';

import { AppConfigService, IdentityUserService } from '@alfresco/adf-core';

import {

    ProcessListCloudService,

    ProcessListRequestModel,

    ProcessListRequestSortingModel,

    TaskListCloudService,

    TaskListRequestModel,

    TaskListRequestSortingModel,

} from '@alfresco/adf-process-services-cloud';

import { BehaviorSubject, catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';

import { ProcessAttentionItem, ProcessAttentionListState } from '../definitions/process-attention.model';

import { mapTaskToAttentionItem, matchesMedicalRecordsTask, TaskInstanceEntry } from '../mappers/task-attention.mapper';
import { ProcessVariablesService } from './process-variables.service';
import { DashboardDiagnosticsService } from './dashboard-diagnostics.service';
import { DashboardPeriodService } from './dashboard-period.service';
import { ProcessQueryDataProvider } from '../providers/process-query-data.provider';
import { summarizeDiagnosticRows } from '../utils/dashboard-diagnostics.util';
import { variablesToRow } from '../utils/dashboard-provider-group.util';





interface ProcessInstanceEntry {

    id?: string;

}



@Injectable({ providedIn: 'root' })

export class MedicalRecordsTaskQueryService {

    private readonly stateSubject = new BehaviorSubject<ProcessAttentionListState>({

        items: [],

        loading: false,

    });



    readonly state$ = this.stateSubject.asObservable();



    private readonly processDefinitionKey = 'medical-records';

    private readonly pageSize = 25;



    private readonly processVariablesService = inject(ProcessVariablesService);
    private readonly diagnostics = inject(DashboardDiagnosticsService);
    private readonly processQueryDataProvider = inject(ProcessQueryDataProvider);
    private readonly periodService = inject(DashboardPeriodService);

    constructor(

        private readonly taskListCloudService: TaskListCloudService,

        private readonly processListCloudService: ProcessListCloudService,

        private readonly identityUserService: IdentityUserService,

        private readonly appConfigService: AppConfigService

    ) {}



    /** Several widgets request the open tasks on init; one load in flight serves them all. */
    private loadInFlight = false;

    loadAttentionItems(): void {
        if (this.loadInFlight) {
            return;
        }
        this.loadInFlight = true;
        const started = performance.now();
        this.stateSubject.next({ ...this.stateSubject.value, loading: true, error: undefined });



        this.fetchOpenTasks()

            .pipe(

                switchMap((tasks) => {

                    if (!tasks.length) {

                        return of([] as ProcessAttentionItem[]);

                    }



                    const appName = this.resolveAppName();
                    // Root variables come from the data plan (one inline request for the layout);
                    // only roots outside the plan are fetched per instance.
                    return this.processQueryDataProvider.planVariablesByInstance(this.periodService.dateRange).pipe(
                        switchMap((planVariables) =>
                            forkJoin(
                                tasks.map((task) => {
                                    const variablesProcessId =
                                        stringify(task.rootProcessInstanceId) ?? stringify(task.processInstanceId) ?? '';
                                    const planned = planVariables.get(variablesProcessId);
                                    return (planned ? of(planned) : this.fetchProcessVariables(variablesProcessId)).pipe(
                                        map((variables) => mapTaskToAttentionItem(task, variables, appName))
                                    );
                                })
                            )
                        )
                    );

                }),

                catchError((error: unknown) => {

                    const message = error instanceof Error ? error.message : 'Unable to load open tasks';

                    this.stateSubject.next({ items: [], loading: false, error: message });

                    return of([] as ProcessAttentionItem[]);

                })

            )

            .subscribe((items) => {

                this.loadInFlight = false;
                this.diagnostics.record({
                    kind: 'open-tasks',
                    label: 'CREATED + ASSIGNED (medical-records roots)',
                    durationMs: Math.round(performance.now() - started),
                    rows: items.length,
                    error: this.stateSubject.value.error,
                    fields: this.diagnostics.enabled()
                        ? summarizeDiagnosticRows(items.map((item) => ({ taskType: item.taskType, taskStatus: item.taskStatus, ...variablesToRow(item.processVariables) })))
                        : undefined,
                });

                if (this.stateSubject.value.error) {

                    return;

                }



                this.stateSubject.next({ items, loading: false });

            });

    }



    private fetchOpenTasks(): Observable<TaskInstanceEntry[]> {

        const appName = this.resolveAppName();

        if (!appName) {

            return throwError(() => new Error('Automate application name is not configured'));

        }



        return this.fetchMedicalRecordsRootIds(appName).pipe(

            switchMap((rootIds) => {

                const username = this.identityUserService.getCurrentUserInfo()?.username;

                const sorting = new TaskListRequestSortingModel({

                    orderBy: 'createdDate',

                    direction: 'DESC',

                    isFieldProcessVariable: false,

                });

                const pagination = { maxItems: this.pageSize, skipCount: 0 };

                const baseRequest = {

                    appName,

                    pagination,

                    sorting,

                    processVariableFilters: [],

                };



                const assignedRequest = new TaskListRequestModel({

                    ...baseRequest,

                    status: ['ASSIGNED'],

                    ...(username ? { assignee: [username] } : {}),

                });



                const createdRequest = new TaskListRequestModel({

                    ...baseRequest,

                    status: ['CREATED'],

                });



                return forkJoin([

                    this.taskListCloudService.fetchTaskList(assignedRequest),

                    this.taskListCloudService.fetchTaskList(createdRequest),

                ]).pipe(

                    map(([assigned, created]) => {

                        const merged = [

                            ...this.normalizeTaskEntries(assigned?.list?.entries ?? [], rootIds),

                            ...this.normalizeTaskEntries(created?.list?.entries ?? [], rootIds),

                        ];

                        const byId = new Map<string, TaskInstanceEntry>();

                        for (const task of merged) {

                            if (task.id) {

                                byId.set(task.id, task);

                            }

                        }

                        return [...byId.values()].slice(0, this.pageSize);

                    }),

                    catchError(() => throwError(() => new Error('Unable to query open tasks')))

                );

            })

        );

    }



    private fetchMedicalRecordsRootIds(appName: string): Observable<Set<string>> {

        const sorting = new ProcessListRequestSortingModel({

            orderBy: 'startDate',

            direction: 'DESC',

            isFieldProcessVariable: false,

        });



        const request = new ProcessListRequestModel({

            appName,

            status: ['RUNNING', 'SUSPENDED'],

            processDefinitionName: [this.processDefinitionKey],

            pagination: { maxItems: 100, skipCount: 0 },

            sorting,

            processVariableFilters: [],

        });



        return this.processListCloudService.fetchProcessList(request).pipe(

            map((response) => {

                const ids = new Set<string>();

                for (const entry of response?.list?.entries ?? []) {

                    const record =

                        entry && typeof entry === 'object' && 'entry' in (entry as Record<string, unknown>)

                            ? ((entry as { entry?: ProcessInstanceEntry }).entry ?? {})

                            : ((entry as ProcessInstanceEntry) ?? {});

                    const id = stringify(record.id);

                    if (id) {

                        ids.add(id);

                    }

                }

                return ids;

            }),

            catchError(() => of(new Set<string>()))

        );

    }



    private normalizeTaskEntries(entries: unknown[], rootIds: Set<string>): TaskInstanceEntry[] {

        return entries

            .map((entry) => {

                const record =

                    entry && typeof entry === 'object' && 'entry' in (entry as Record<string, unknown>)

                        ? ((entry as { entry?: TaskInstanceEntry }).entry ?? {})

                        : ((entry as TaskInstanceEntry) ?? {});



                return {

                    ...record,

                    id: stringify(record.id) ?? '',

                };

            })

            .filter((entry) => !!entry.id && matchesMedicalRecordsTask(entry, rootIds));

    }



    /** Shared with the dashboard widgets (short-lived cache), so each instance's batchState downloads once. */
    private fetchProcessVariables(processInstanceId: string): Observable<Record<string, unknown>> {
        return this.processVariablesService.fetchVariables(processInstanceId);
    }



    private resolveAppName(): string {

        return this.appConfigService.get<Array<{ name: string }>>('alfresco-deployed-apps')?.[0]?.name ?? '';

    }

}



function stringify(value: unknown): string | undefined {

    if (value === null || value === undefined) {

        return undefined;

    }



    const normalized = String(value).trim();

    return normalized || undefined;

}


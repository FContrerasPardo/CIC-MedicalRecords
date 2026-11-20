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

import { OpenTasksQueryStats, ProcessAttentionItem, ProcessAttentionListState } from '../definitions/process-attention.model';
import { DashboardProcessListScopeOptions } from '../definitions/dashboard-widget.model';

import {
    classifyMedicalRecordsTask,
    formatTally,
    mapTaskToAttentionItem,
    matchProcessIdentity,
    tallyTaskMatches,
    TaskInstanceEntry,
    TaskMatchResult,
} from '../mappers/task-attention.mapper';
import { ProcessVariablesService } from './process-variables.service';
import { DashboardDiagnosticsService } from './dashboard-diagnostics.service';
import { DashboardPeriodService } from './dashboard-period.service';
import { ProcessQueryDataProvider } from '../providers/process-query-data.provider';
import { summarizeDiagnosticRows } from '../utils/dashboard-diagnostics.util';
import { variablesToRow } from '../utils/dashboard-provider-group.util';
import { mergeProcessVariables } from '../utils/agent-mesh-variables.util';
import { describeTaskQueryScope, resolveTaskQueryScope, TaskQueryScope, taskQueryScopeKey } from '../utils/process-list-scope.util';

interface ProcessInstanceEntry {
    id?: string;
    processDefinitionKey?: string;
    processDefinitionId?: string;
    processDefinitionName?: string;
}

interface RootIdsResult {
    ids: Set<string>;
    byName: Array<{ name: string; count: number }>;
}

interface OpenTasksResult {
    tasks: TaskInstanceEntry[];
    stats: OpenTasksQueryStats;
    /** A few discarded rows (definition and reason only) for the technical view. */
    discarded: string[][];
}

/** Cache key of the lists that follow the process mapping (no widget scope). */
const DEFAULT_SCOPE_KEY = 'default';
const MAX_DISCARDED_SAMPLES = 10;

/**
 * Open tasks (CREATED + ASSIGNED to me) of a process scope: the mapping root and its subprocesses by
 * default, or the root and subprocesses chosen in a process-list widget. Each scope keeps its own
 * shared state; widgets with the same scope share one load.
 */
@Injectable({ providedIn: 'root' })
export class MedicalRecordsTaskQueryService {
    private readonly states = new Map<string, BehaviorSubject<ProcessAttentionListState>>();
    /** Scope options of every key loaded so far (reloaded together after a bulk action). */
    private readonly scopeOptions = new Map<string, DashboardProcessListScopeOptions | null>();
    /** Several widgets request the open tasks on init; one load in flight per scope serves them all. */
    private readonly inFlight = new Set<string>();

    /** State of the default scope (process mapping). */
    readonly state$: Observable<ProcessAttentionListState>;

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
    ) {
        this.state$ = this.subjectFor(DEFAULT_SCOPE_KEY).asObservable();
    }

    /**
     * Cache key of a widget scope: `default` when nothing is configured (follows the mapping, even
     * if a layout overrides it later); otherwise the effective root and subprocesses.
     */
    scopeKey(options?: DashboardProcessListScopeOptions | null): string {
        const scope = resolveTaskQueryScope(options);
        return scope.source === 'widget' ? `widget:${taskQueryScopeKey(scope)}` : DEFAULT_SCOPE_KEY;
    }

    /** Shared state of a scope (the default scope when no options are given). */
    stateFor(options?: DashboardProcessListScopeOptions | null): Observable<ProcessAttentionListState> {
        return this.subjectFor(this.scopeKey(options)).asObservable();
    }

    loadAttentionItems(options?: DashboardProcessListScopeOptions | null): void {
        const key = this.scopeKey(options);
        this.scopeOptions.set(key, options ?? null);
        if (this.inFlight.has(key)) {
            return;
        }
        this.inFlight.add(key);
        const subject = this.subjectFor(key);
        const scope = resolveTaskQueryScope(options);
        const scopeText = describeTaskQueryScope(scope);
        const started = performance.now();
        subject.next({ ...subject.value, loading: true, error: undefined });

        let stats: OpenTasksQueryStats | undefined;
        let discarded: string[][] = [];

        this.fetchOpenTasks(scope)
            .pipe(
                switchMap((result) => {
                    stats = result.stats;
                    discarded = result.discarded;
                    const tasks = result.tasks;
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
                                    const root$ = planned ? of(planned) : this.fetchProcessVariables(variablesProcessId);
                                    // A task of a called process (AgentMesh "Analisys" / "Validate Rules"): its results reach
                                    // the root only when the call activity completes, so the task's own instance fills what
                                    // the root lacks (root wins; one cached request per visible subprocess task).
                                    const taskProcessId = stringify(task.processInstanceId);
                                    const child$ =
                                        taskProcessId && taskProcessId !== variablesProcessId
                                            ? this.fetchProcessVariables(taskProcessId).pipe(catchError(() => of({} as Record<string, unknown>)))
                                            : of(null);
                                    return forkJoin([root$.pipe(catchError(() => of({} as Record<string, unknown>))), child$]).pipe(
                                        map(([root, child]) => mapTaskToAttentionItem(task, child ? mergeProcessVariables(root, child).variables : root, appName))
                                    );
                                })
                            )
                        )
                    );
                }),
                catchError((error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Unable to load open tasks';
                    subject.next({ items: [], loading: false, error: message, stats });
                    return of([] as ProcessAttentionItem[]);
                })
            )
            .subscribe((items) => {
                this.inFlight.delete(key);
                this.recordDiagnostics(key, scopeText, stats, discarded, items, subject.value.error, Math.round(performance.now() - started));

                if (subject.value.error) {
                    return;
                }

                subject.next({ items, loading: false, stats });
            });
    }

    /** Reloads every scope loaded so far (after completing tasks in bulk). */
    reloadAll(): void {
        const scopes = this.scopeOptions.size ? [...this.scopeOptions.values()] : [null];
        for (const options of scopes) {
            this.loadAttentionItems(options);
        }
    }

    private subjectFor(key: string): BehaviorSubject<ProcessAttentionListState> {
        let subject = this.states.get(key);
        if (!subject) {
            subject = new BehaviorSubject<ProcessAttentionListState>({ items: [], loading: false });
            this.states.set(key, subject);
        }
        return subject;
    }

    private recordDiagnostics(
        key: string,
        scopeText: { root: string; subprocesses: string },
        stats: OpenTasksQueryStats | undefined,
        discarded: string[][],
        items: ProcessAttentionItem[],
        error: string | undefined,
        durationMs: number
    ): void {
        if (!this.diagnostics.enabled()) {
            return;
        }
        const summaryRows: string[][] = [
            ['root', scopeText.root],
            ['subprocesses', scopeText.subprocesses],
            ['scope cache key', key],
            ...(stats?.rootIdsByName ?? []).map((entry) => [`root ids · name "${entry.name}"`, String(entry.count)]),
            ['root ids (unique)', String(stats?.rootIds ?? 0)],
            ['tasks from server (unique)', String(stats?.received ?? 0)],
            ['accepted', `${stats?.accepted ?? 0} (${formatTally(stats?.acceptedByRule ?? {})})`],
            ['discarded', `${stats?.rejected ?? 0} (${formatTally(stats?.rejectedByReason ?? {})})`],
            ['items shown', String(items.length)],
        ];
        this.diagnostics.record({
            kind: 'open-tasks',
            key: `open-tasks:${key}`,
            label: `CREATED + ASSIGNED · root ${scopeText.root} · subprocesses ${scopeText.subprocesses}`,
            durationMs,
            totalCount: stats?.received,
            rows: items.length,
            error,
            tables: [
                { title: 'Open tasks query', columns: ['step', 'value'], rows: summaryRows },
                ...(discarded.length
                    ? [
                          {
                              title: `Discarded tasks (first ${MAX_DISCARDED_SAMPLES})`,
                              columns: ['task', 'processDefinitionKey', 'processDefinitionId', 'processDefinitionName', 'reason'],
                              rows: discarded,
                          },
                      ]
                    : []),
            ],
            fields: summarizeDiagnosticRows(
                items.map((item) => ({ taskType: item.taskType, taskStatus: item.taskStatus, ...variablesToRow(item.processVariables) }))
            ),
        });
    }

    private fetchOpenTasks(scope: TaskQueryScope): Observable<OpenTasksResult> {
        const appName = this.resolveAppName();
        if (!appName) {
            return throwError(() => new Error('Automate application name is not configured'));
        }

        return this.fetchMedicalRecordsRootIds(appName, scope).pipe(
            switchMap((roots) => {
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
                        const byId = new Map<string, TaskInstanceEntry>();
                        for (const task of [
                            ...this.normalizeTaskEntries(assigned?.list?.entries ?? []),
                            ...this.normalizeTaskEntries(created?.list?.entries ?? []),
                        ]) {
                            byId.set(task.id ?? '', task);
                        }
                        const received = [...byId.values()];
                        const accepted: TaskInstanceEntry[] = [];
                        const results: TaskMatchResult[] = [];
                        const discarded: string[][] = [];
                        for (const task of received) {
                            const result = classifyMedicalRecordsTask(task, roots.ids, scope);
                            results.push(result);
                            if (result.accepted) {
                                accepted.push(task);
                            } else if (discarded.length < MAX_DISCARDED_SAMPLES) {
                                discarded.push([
                                    stringify(task.name) ?? stringify(task.id) ?? '-',
                                    stringify(task.processDefinitionKey) ?? '-',
                                    stringify(task.processDefinitionId) ?? '-',
                                    stringify(task.processDefinitionName) ?? '-',
                                    result.reason ?? '-',
                                ]);
                            }
                        }
                        const tally = tallyTaskMatches(results);
                        const scopeText = describeTaskQueryScope(scope);
                        return {
                            tasks: accepted.slice(0, this.pageSize),
                            discarded,
                            stats: {
                                root: scopeText.root,
                                subprocesses: scopeText.subprocesses,
                                rootIdsByName: roots.byName,
                                rootIds: roots.ids.size,
                                received: received.length,
                                ...tally,
                            },
                        };
                    }),
                    catchError(() => throwError(() => new Error('Unable to query open tasks')))
                );
            })
        );
    }

    /**
     * Ids of the running roots of the scope. One query per known root name (the Query service filters
     * by one definition name reliably; a failed name never empties the others), merged and checked by key.
     */
    private fetchMedicalRecordsRootIds(appName: string, scope: TaskQueryScope): Observable<RootIdsResult> {
        const names = scope.root.names.length ? scope.root.names : [scope.root.key];
        return forkJoin(names.map((name) => this.fetchRootIdsByName(appName, name, scope))).pipe(
            map((sets) => ({
                ids: new Set(sets.flatMap((set) => [...set])),
                byName: names.map((name, index) => ({ name, count: sets[index].size })),
            }))
        );
    }

    private fetchRootIdsByName(appName: string, definitionName: string, scope: TaskQueryScope): Observable<Set<string>> {
        const sorting = new ProcessListRequestSortingModel({ orderBy: 'startDate', direction: 'DESC', isFieldProcessVariable: false });
        const request = new ProcessListRequestModel({
            appName,
            status: ['RUNNING', 'SUSPENDED'],
            processDefinitionName: [definitionName],
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
                    // The server already filtered by name; the client checks the key (or name) of the scope root.
                    const hasIdentity = !!(record.processDefinitionKey || record.processDefinitionId || record.processDefinitionName);
                    const isRoot = !hasIdentity || !!matchProcessIdentity(record, scope.root);
                    if (id && isRoot) {
                        ids.add(id);
                    }
                }
                return ids;
            }),
            catchError(() => of(new Set<string>()))
        );
    }

    private normalizeTaskEntries(entries: unknown[]): TaskInstanceEntry[] {
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
            .filter((entry) => !!entry.id);
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

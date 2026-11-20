import { inject, Injectable } from '@angular/core';
import { DashboardDiagnosticsService } from '../services/dashboard-diagnostics.service';
import { DashboardDataPlanService, DataPlanDataset } from '../services/dashboard-data-plan.service';
import {
    DataPlan,
    keepRequestedVariables,
    needForWidget,
    planCoversNeed,
    planVariableTargets,
    rowsForNeed,
} from '../utils/dashboard-data-plan.util';
import { summarizeDiagnosticRows } from '../utils/dashboard-diagnostics.util';
import { AppConfigService } from '@alfresco/adf-core';
import {
    ProcessListCloudService,
    ProcessListRequestModel,
    ProcessListRequestSortingModel,
} from '@alfresco/adf-process-services-cloud';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { ProcessDefinitionFilter, resolveProcessDefinitionFilter } from '../definitions/dashboard-process-catalog';
import { activeProcessMappingSource } from '../definitions/process-mapping';
import {
    classifyRowsByProcessDefinitions,
    filterRowsByProcessStatus,
    normalizeProcessStatusFilter,
    shouldClientFilterProcessStatus,
} from '../utils/dashboard-data-source.util';
import {
    PROCESS_VARIABLE_COLUMN_PREFIX,
    PROCESS_VARIABLE_ENRICH_LIMIT,
    ProcessVariablesService,
    stripProcessVariablePrefix,
} from '../services/process-variables.service';
import { TABLE_EXPORT_MAX_ROWS } from '../utils/dashboard-table-export.util';
import { normalizeProcessDateValue, resolveDeployedAppName } from '../utils/dashboard-app-config.util';
import { DashboardDateRange, DashboardProcessQueryResult, DashboardWidgetConfig } from '../definitions/dashboard-widget.model';

interface ProcessInstanceEntry {
    id?: string;
    name?: string;
    status?: string;
    processDefinitionKey?: string;
    processDefinitionName?: string;
    startDate?: string;
    startedDate?: string;
    /** Completion date of the instance (reconciliation time of the reconciliation and audit panel). */
    completedDate?: string;
    endDate?: string;
    businessKey?: string;
    parentId?: string;
    /** Present when the request asked for `processVariableKeys` (array of {name, value} or a map). */
    variables?: Array<{ name?: string; value?: unknown }> | Record<string, unknown>;
}

const PROCESS_FETCH_PAGE_SIZE = 100;

/** Identical process-list page requests are shared for this long (KPIs, charts, trends, filter cards). */
const PROCESS_LIST_CACHE_TTL_MS = 30_000;
const PROCESS_LIST_CACHE_LIMIT = 200;

/** Shape of the Query service process list response used here. */
interface ProcessListResponse {
    list?: {
        pagination?: { totalItems?: number };
        entries?: unknown[];
    };
}

@Injectable({ providedIn: 'root' })
export class ProcessQueryDataProvider {
    private readonly diagnostics = inject(DashboardDiagnosticsService);
    private readonly dataPlan = inject(DashboardDataPlanService);

    constructor(
        private readonly processListCloudService: ProcessListCloudService,
        private readonly appConfigService: AppConfigService,
        private readonly processVariablesService: ProcessVariablesService
    ) {}

    fetch(config: DashboardWidgetConfig): Observable<DashboardProcessQueryResult> {
        return this.fetchRows(config, 1, 0);
    }

    fetchRows(config: DashboardWidgetConfig, pageSize?: number, skipCount = 0): Observable<DashboardProcessQueryResult> {
        const appName = resolveDeployedAppName(this.appConfigService);
        if (!appName) {
            return of({ totalCount: 0, rows: [] });
        }

        const processQuery = config.processQuery ?? {};
        const maxItems = pageSize ?? config.tablePageSize ?? 25;
        const definitionFilter = this.resolveDefinitionFilterForWidget(config);
        const definitionNames = definitionFilter.names;
        const sorting = new ProcessListRequestSortingModel({
            orderBy: 'startDate',
            direction: 'DESC',
            isFieldProcessVariable: false,
        });

        const variableKeys = processQuery.variableKeys?.filter(Boolean) ?? [];
        const request = new ProcessListRequestModel({
            appName,
            status: normalizeProcessStatusFilter(processQuery.status),
            processDefinitionName: definitionNames,
            pagination: { maxItems, skipCount },
            sorting,
            processVariableFilters: [],
            ...(variableKeys.length ? { processVariableKeys: variableKeys } : {}),
        });

        const cacheKey = JSON.stringify({
            appName,
            status: request.status,
            definitionNames,
            definitionKeys: definitionFilter.keys,
            maxItems,
            skipCount,
            variableKeys,
        });

        const started = performance.now();
        const cacheHit = this.isProcessListCached(cacheKey);
        return this.cachedProcessList(cacheKey, request).pipe(
            map((response) => {
                const totalCount = response?.list?.pagination?.totalItems ?? response?.list?.entries?.length ?? 0;
                // The Query service filters by definition NAME only; the rows are then checked by KEY
                // (or name) through the mapping, so instances of a renamed root are never dropped.
                const classified = classifyRowsByProcessDefinitions(this.mapProcessEntries(response?.list?.entries ?? []), definitionFilter.keys);
                const rows = filterRowsByProcessStatus(classified.rows, processQuery.status);
                if (this.diagnostics.enabled()) {
                    this.diagnostics.record({
                        kind: 'process-list',
                        label: `${(request.status ?? []).join('+') || 'ALL'} · names ${definitionNames.join(', ') || '*'} · keys ${definitionFilter.keys.join(', ') || '*'} · mapping ${definitionFilter.source} · accepted by key ${classified.byKey} / by name ${classified.byName}${classified.dropped ? ` / dropped ${classified.dropped}` : ''} · skip ${skipCount} · max ${maxItems}`,
                        durationMs: Math.round(performance.now() - started),
                        cacheHit,
                        totalCount,
                        rows: rows.length,
                        fields: summarizeDiagnosticRows(rows),
                    });
                }

                return {
                    totalCount,
                    rows,
                };
            }),
            switchMap((result) => this.attachProcessVariables(config, result)),
            catchError(() => of({ totalCount: 0, rows: [], error: 'process-query-failed' }))
        );
    }

    // KPIs, gauges, charts, trend comparisons and filter cards issue the same process-list pages at
    // the same time; share each identical page request for a short time.
    private readonly processListCache = new Map<string, { at: number; response$: Observable<ProcessListResponse> }>();

    private isProcessListCached(cacheKey: string): boolean {
        const cached = this.processListCache.get(cacheKey);
        return !!cached && Date.now() - cached.at < PROCESS_LIST_CACHE_TTL_MS;
    }

    private cachedProcessList(cacheKey: string, request: ProcessListRequestModel): Observable<ProcessListResponse> {
        const cached = this.processListCache.get(cacheKey);
        if (cached && Date.now() - cached.at < PROCESS_LIST_CACHE_TTL_MS) {
            return cached.response$;
        }
        const response$ = this.processListCloudService
            .fetchProcessList(request)
            .pipe(shareReplay({ bufferSize: 1, refCount: false })) as Observable<ProcessListResponse>;
        if (this.processListCache.size >= PROCESS_LIST_CACHE_LIMIT) {
            const oldest = this.processListCache.keys().next().value;
            if (oldest !== undefined) {
                this.processListCache.delete(oldest);
            }
        }
        this.processListCache.set(cacheKey, { at: Date.now(), response$ });
        // Failed requests must not be served from the cache.
        response$.subscribe({ error: () => this.processListCache.delete(cacheKey) });
        return response$;
    }

    fetchMatchingCount(config: DashboardWidgetConfig, maxRows = TABLE_EXPORT_MAX_ROWS): Observable<number> {
        const processQuery = config.processQuery ?? {};
        if (!shouldClientFilterProcessStatus(processQuery.status)) {
            return this.fetchRows(config, 1, 0).pipe(
                map((result) => (result.error ? 0 : result.totalCount))
            );
        }

        return this.fetchAllRows(config, maxRows).pipe(
            map((result) => {
                if (result.error) {
                    return 0;
                }
                return filterRowsByProcessStatus(result.rows, processQuery.status).length;
            })
        );
    }

    fetchAllRows(
        config: DashboardWidgetConfig,
        maxRows = TABLE_EXPORT_MAX_ROWS
    ): Observable<DashboardProcessQueryResult> {
        const pageSize = Math.min(Math.max(config.tablePageSize ?? PROCESS_FETCH_PAGE_SIZE, 1), PROCESS_FETCH_PAGE_SIZE);
        return this.fetchRowsPage(config, 0, pageSize, maxRows, []).pipe(
            switchMap((result) => this.attachProcessVariables(config, result))
        );
    }

    /** Paginates newest-first until rows older than range.start are seen (or safety cap). */
    fetchRowsCoveringDateRange(
        config: DashboardWidgetConfig,
        range: DashboardDateRange,
        safetyMaxRows = TABLE_EXPORT_MAX_ROWS
    ): Observable<DashboardProcessQueryResult> {
        // Widgets planned from the layout take their slice of one shared execution.
        const need = needForWidget(config);
        const plan = this.dataPlan.plan;
        if (plan && need && planCoversNeed(plan, need)) {
            return this.executePlan(plan, range).pipe(
                map((dataset) => {
                    if (dataset.error) {
                        return { totalCount: 0, rows: [], error: dataset.error };
                    }
                    const rows = rowsForNeed(dataset.rows, need);
                    return { totalCount: rows.length, rows };
                })
            );
        }
        const pageSize = Math.min(Math.max(config.tablePageSize ?? PROCESS_FETCH_PAGE_SIZE, 1), PROCESS_FETCH_PAGE_SIZE);
        return this.fetchRowsPageUntilDate(config, 0, pageSize, safetyMaxRows, [], range.start.getTime()).pipe(
            switchMap((result) => this.attachProcessVariables(config, result))
        );
    }

    /**
     * Runs the layout's data plan for one date range: one paginated process query (union of the
     * widgets' definitions and statuses), then variables only for the rows a widget reads them from,
     * by name. Variables are first requested inline (`processVariableKeys`); when the Query service
     * does not return them, they are fetched per instance and only the requested names are kept.
     */
    private executePlan(plan: DataPlan, range: DashboardDateRange): Observable<DataPlanDataset> {
        const key = `${plan.signature}|${range.start.getTime()}|${range.end.getTime()}`;
        const existing = this.dataPlan.execution(key);
        if (existing) {
            return existing;
        }
        const started = performance.now();
        const baseConfig = this.planQueryConfig(plan.queryNames, plan.statuses, undefined, plan.definitions);
        const dataset$ = this.fetchRowsPageUntilDate(
            baseConfig,
            0,
            PROCESS_FETCH_PAGE_SIZE,
            TABLE_EXPORT_MAX_ROWS,
            [],
            range.start.getTime()
        ).pipe(
            switchMap((result) => {
                if (result.error) {
                    return of<DataPlanDataset>({ rows: [], totalCount: 0, error: result.error, strategy: 'none', enriched: 0 });
                }
                return this.attachPlanVariables(plan, result.rows, range).pipe(
                    map((enrichment): DataPlanDataset => ({ ...enrichment, totalCount: result.totalCount }))
                );
            }),
            map((dataset) => {
                this.diagnostics.record({
                    kind: 'data-plan',
                    label: `run · ${plan.needs.length} widgets · ${plan.statuses?.join('+') ?? 'ALL'} · variables: ${dataset.strategy}`,
                    durationMs: Math.round(performance.now() - started),
                    rows: dataset.rows.length,
                    totalCount: dataset.totalCount,
                    enriched: dataset.enriched,
                    error: dataset.error,
                    fields: this.diagnostics.enabled() ? summarizeDiagnosticRows(dataset.rows) : undefined,
                });
                return dataset;
            }),
            catchError(() =>
                of<DataPlanDataset>({ rows: [], totalCount: 0, error: 'process-query-failed', strategy: 'none', enriched: 0 })
            ),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        this.dataPlan.storeExecution(key, dataset$);
        return dataset$;
    }

    /**
     * Variables of the instances enriched by the layout's plan (by instance id, without the `var_`
     * prefix). Lets the open-tasks list reuse the plan's single inline request instead of downloading
     * every variable of every task. Empty when there is no plan.
     */
    planVariablesByInstance(range: DashboardDateRange): Observable<Map<string, Record<string, unknown>>> {
        const plan = this.dataPlan.plan;
        if (!plan || !plan.needs.some((need) => need.variables.length || need.allVariables)) {
            return of(new Map());
        }
        return this.executePlan(plan, range).pipe(
            map((dataset) => {
                const byId = new Map<string, Record<string, unknown>>();
                for (const row of dataset.rows) {
                    const variables: Record<string, unknown> = {};
                    for (const [column, value] of Object.entries(row)) {
                        if (column.startsWith(PROCESS_VARIABLE_COLUMN_PREFIX)) {
                            variables[column.slice(PROCESS_VARIABLE_COLUMN_PREFIX.length)] = value;
                        }
                    }
                    if (Object.keys(variables).length) {
                        byId.set(String(row['id'] ?? ''), variables);
                    }
                }
                return byId;
            }),
            catchError(() => of(new Map<string, Record<string, unknown>>()))
        );
    }

    private planQueryConfig(definitions: string[], statuses: string[] | null, variableKeys?: string[], definitionKeys?: string[]): DashboardWidgetConfig {
        return {
            id: '__data-plan__',
            type: 'table',
            section: 'insights',
            title: '',
            dataSource: 'process',
            processQuery: {
                definitionNames: definitions,
                ...(definitionKeys?.length ? { definitionKeys } : {}),
                ...(statuses ? { status: statuses } : {}),
                ...(variableKeys?.length ? { variableKeys } : {}),
                includeProcessVariables: false,
            },
        };
    }

    private attachPlanVariables(
        plan: DataPlan,
        rows: Array<Record<string, unknown>>,
        range: DashboardDateRange
    ): Observable<Omit<DataPlanDataset, 'totalCount'>> {
        const targets = planVariableTargets(rows, plan, PROCESS_VARIABLE_ENRICH_LIMIT);
        if (!targets.size) {
            return of({ rows, strategy: 'none' as const, enriched: 0 });
        }
        const merge = (variablesById: Map<string, Record<string, unknown>>) =>
            rows.map((row) => {
                const id = String(row['id'] ?? '');
                const target = targets.get(id);
                const variables = variablesById.get(id);
                return target && variables ? keepRequestedVariables({ ...row, ...variables }, target) : row;
            });

        const perInstance$ = (): Observable<Omit<DataPlanDataset, 'totalCount'>> =>
            forkJoin(
                [...targets.keys()].map((id) =>
                    this.processVariablesService.fetchVariables(id).pipe(
                        map((variables) => [id, this.processVariablesService.flattenVariablesToColumns(variables)] as const),
                        catchError(() => of([id, {}] as const))
                    )
                )
            ).pipe(
                map((entries) => ({
                    rows: merge(new Map(entries.map(([id, columns]) => [id, columns as Record<string, unknown>]))),
                    strategy: 'per-instance' as const,
                    enriched: entries.length,
                }))
            );

        const needsAll = [...targets.values()].some((target) => target.all);
        const names = [...new Set([...targets.values()].flatMap((target) => target.names))];
        if (needsAll || !names.length || this.dataPlan.inlineVariablesSupported === false) {
            return perInstance$();
        }

        // Inline attempt: the same target rows, asking the process list only for the variables needed.
        const targetRows = rows.filter((row) => targets.has(String(row['id'] ?? '')));
        const unique = (field: string, upper = false) =>
            [...new Set(targetRows.map((row) => String(row[field] ?? '')).filter(Boolean))].map((value) =>
                upper ? value.toUpperCase() : value
            );
        const variableKeys = unique('processDefinitionKey').flatMap((definitionKey) => names.map((name) => `${definitionKey}/${name}`));
        const inlineConfig = this.planQueryConfig(unique('processDefinitionName'), unique('status', true), variableKeys);

        return this.fetchRowsPageUntilDate(inlineConfig, 0, PROCESS_FETCH_PAGE_SIZE, TABLE_EXPORT_MAX_ROWS, [], range.start.getTime()).pipe(
            switchMap((result) => {
                const variablesById = new Map<string, Record<string, unknown>>();
                for (const row of result.rows) {
                    const id = String(row['id'] ?? '');
                    const columns = Object.fromEntries(
                        Object.entries(row).filter(([column]) => column.startsWith(PROCESS_VARIABLE_COLUMN_PREFIX))
                    );
                    if (id && targets.has(id) && Object.keys(columns).length) {
                        variablesById.set(id, columns);
                        this.diagnostics.captureVariables(
                            id,
                            Object.fromEntries(Object.entries(columns).map(([column, value]) => [stripProcessVariablePrefix(column), value])),
                            'inline'
                        );
                    }
                }
                if (!variablesById.size) {
                    this.dataPlan.inlineVariablesSupported = false;
                    return perInstance$();
                }
                this.dataPlan.inlineVariablesSupported = true;
                return of({ rows: merge(variablesById), strategy: 'inline' as const, enriched: variablesById.size });
            }),
            catchError(() => {
                this.dataPlan.inlineVariablesSupported = false;
                return perInstance$();
            })
        );
    }

    /**
     * Names sent to the Query service and keys checked on the returned rows: from processQuery
     * (metricScope, subprocess selection) through the central mapping, or the planner's explicit union.
     */
    private resolveDefinitionFilterForWidget(config: DashboardWidgetConfig): ProcessDefinitionFilter {
        const explicit = config.processQuery?.definitionNames?.filter(Boolean);
        if (explicit?.length) {
            return { names: explicit, keys: config.processQuery?.definitionKeys?.filter(Boolean) ?? [], source: activeProcessMappingSource() };
        }
        return resolveProcessDefinitionFilter(config.processQuery ?? {});
    }

    /** Variables returned inline by the process list, as `var_<name>` columns. */
    private inlineVariableColumns(variables: ProcessInstanceEntry['variables']): Record<string, unknown> {
        if (!variables) {
            return {};
        }
        const entries = Array.isArray(variables)
            ? variables.filter((variable) => !!variable?.name).map((variable) => [String(variable.name), variable.value] as const)
            : Object.entries(variables);
        return Object.fromEntries(entries.map(([name, value]) => [`${PROCESS_VARIABLE_COLUMN_PREFIX}${name}`, value]));
    }

    private fetchRowsPage(
        config: DashboardWidgetConfig,
        skipCount: number,
        pageSize: number,
        maxRows: number,
        accumulated: Array<Record<string, unknown>>
    ): Observable<DashboardProcessQueryResult> {
        const processQuery = config.processQuery ?? {};
        const includeVariables = !!processQuery.includeProcessVariables;
        const configWithoutVariableFetch: DashboardWidgetConfig = includeVariables
            ? { ...config, processQuery: { ...processQuery, includeProcessVariables: false } }
            : config;

        return this.fetchRows(configWithoutVariableFetch, pageSize, skipCount).pipe(
            switchMap((result) => {
                if (result.error) {
                    return of({ totalCount: 0, rows: [], error: result.error });
                }

                const merged = [...accumulated, ...result.rows];
                const totalCount = result.totalCount || merged.length;
                const nextSkip = skipCount + result.rows.length;
                const reachedEnd =
                    result.rows.length === 0 || nextSkip >= totalCount || merged.length >= maxRows;

                if (reachedEnd) {
                    return of({
                        totalCount,
                        rows: merged.slice(0, maxRows),
                    });
                }

                return this.fetchRowsPage(config, nextSkip, pageSize, maxRows, merged);
            })
        );
    }

    private fetchRowsPageUntilDate(
        config: DashboardWidgetConfig,
        skipCount: number,
        pageSize: number,
        safetyMaxRows: number,
        accumulated: Array<Record<string, unknown>>,
        rangeStartMs: number
    ): Observable<DashboardProcessQueryResult> {
        const processQuery = config.processQuery ?? {};
        const includeVariables = !!processQuery.includeProcessVariables;
        const configWithoutVariableFetch: DashboardWidgetConfig = includeVariables
            ? { ...config, processQuery: { ...processQuery, includeProcessVariables: false } }
            : config;

        return this.fetchRows(configWithoutVariableFetch, pageSize, skipCount).pipe(
            switchMap((result) => {
                if (result.error) {
                    return of({ totalCount: 0, rows: [], error: result.error });
                }

                const merged = [...accumulated, ...result.rows];
                const totalCount = result.totalCount || merged.length;
                const nextSkip = skipCount + result.rows.length;
                const oldestStartMs = this.oldestRowStartMs(result.rows);
                const reachedEnd =
                    result.rows.length === 0 || nextSkip >= totalCount || merged.length >= safetyMaxRows;
                const crossedRangeStart = oldestStartMs !== null && oldestStartMs < rangeStartMs;

                if (reachedEnd || crossedRangeStart) {
                    return of({
                        totalCount,
                        rows: merged.slice(0, safetyMaxRows),
                    });
                }

                return this.fetchRowsPageUntilDate(
                    config,
                    nextSkip,
                    pageSize,
                    safetyMaxRows,
                    merged,
                    rangeStartMs
                );
            })
        );
    }

    private oldestRowStartMs(rows: Array<Record<string, unknown>>): number | null {
        let oldest: number | null = null;
        for (const row of rows) {
            const parsed = Date.parse(String(row['startDate'] ?? ''));
            if (!Number.isFinite(parsed)) {
                continue;
            }
            if (oldest === null || parsed < oldest) {
                oldest = parsed;
            }
        }
        return oldest;
    }

    private attachProcessVariables(
        config: DashboardWidgetConfig,
        result: DashboardProcessQueryResult
    ): Observable<DashboardProcessQueryResult> {
        if (!config.processQuery?.includeProcessVariables || !result.rows.length) {
            return of(result);
        }

        const rowsToEnrich = result.rows.slice(0, PROCESS_VARIABLE_ENRICH_LIMIT);
        const remainder = result.rows.slice(PROCESS_VARIABLE_ENRICH_LIMIT);
        const started = performance.now();

        return forkJoin(
            rowsToEnrich.map((row) =>
                this.processVariablesService.fetchVariables(String(row['id'] ?? '')).pipe(
                    map((variables) => ({
                        ...row,
                        ...this.processVariablesService.flattenVariablesToColumns(variables),
                    })),
                    catchError(() => of(row))
                )
            )
        ).pipe(
            map((enriched) => {
                if (this.diagnostics.enabled()) {
                    this.diagnostics.record({
                        kind: 'process-variables',
                        label: `${rowsToEnrich.length} instances (limit ${PROCESS_VARIABLE_ENRICH_LIMIT})`,
                        durationMs: Math.round(performance.now() - started),
                        enriched: rowsToEnrich.length,
                        rows: result.rows.length,
                        fields: summarizeDiagnosticRows(
                            enriched.map((row) =>
                                Object.fromEntries(Object.entries(row).filter(([key]) => key.startsWith(PROCESS_VARIABLE_COLUMN_PREFIX)))
                            )
                        ),
                    });
                }
                return { ...result, rows: [...enriched, ...remainder] };
            }),
            catchError(() => of(result))
        );
    }

    private mapProcessEntries(entries: unknown[]): Array<Record<string, unknown>> {
        return entries.map((entry) => {
            const record =
                entry && typeof entry === 'object' && 'entry' in (entry as Record<string, unknown>)
                    ? ((entry as { entry?: ProcessInstanceEntry }).entry ?? {})
                    : ((entry as ProcessInstanceEntry) ?? {});

            return {
                id: record.id ?? '',
                name: record.name ?? '',
                status: record.status ?? '',
                processDefinitionKey: record.processDefinitionKey ?? '',
                processDefinitionName: record.processDefinitionName ?? '',
                startDate: normalizeProcessDateValue(record.startDate ?? record.startedDate),
                completedDate: normalizeProcessDateValue(record.completedDate ?? record.endDate),
                businessKey: record.businessKey ?? '',
                parentId: record.parentId ?? '',
                ...this.inlineVariableColumns(record.variables),
            };
        });
    }
}

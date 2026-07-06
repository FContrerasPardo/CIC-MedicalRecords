import { Injectable } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import {
    ProcessListCloudService,
    ProcessListRequestModel,
    ProcessListRequestSortingModel,
} from '@alfresco/adf-process-services-cloud';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { resolveProcessDefinitionKeys } from '../definitions/dashboard-process-catalog';
import {
    filterRowsByProcessStatus,
    normalizeProcessStatusFilter,
    shouldClientFilterProcessStatus,
} from '../utils/dashboard-data-source.util';
import {
    PROCESS_VARIABLE_ENRICH_LIMIT,
    ProcessVariablesService,
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
    businessKey?: string;
    parentId?: string;
}

const PROCESS_FETCH_PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class ProcessQueryDataProvider {
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
        const definitionNames = this.resolveDefinitionNamesForWidget(config);
        const sorting = new ProcessListRequestSortingModel({
            orderBy: 'startDate',
            direction: 'DESC',
            isFieldProcessVariable: false,
        });

        const request = new ProcessListRequestModel({
            appName,
            status: normalizeProcessStatusFilter(processQuery.status),
            processDefinitionName: definitionNames,
            pagination: { maxItems, skipCount },
            sorting,
            processVariableFilters: [],
        });

        return this.processListCloudService.fetchProcessList(request).pipe(
            map((response) => {
                const totalCount = response?.list?.pagination?.totalItems ?? response?.list?.entries?.length ?? 0;
                const rows = filterRowsByProcessStatus(
                    this.mapProcessEntries(response?.list?.entries ?? []),
                    processQuery.status
                );

                return {
                    totalCount,
                    rows,
                };
            }),
            switchMap((result) => this.attachProcessVariables(config, result)),
            catchError(() => of({ totalCount: 0, rows: [], error: 'process-query-failed' }))
        );
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
        const pageSize = Math.min(Math.max(config.tablePageSize ?? PROCESS_FETCH_PAGE_SIZE, 1), PROCESS_FETCH_PAGE_SIZE);
        return this.fetchRowsPageUntilDate(config, 0, pageSize, safetyMaxRows, [], range.start.getTime()).pipe(
            switchMap((result) => this.attachProcessVariables(config, result))
        );
    }

    /** Uses processQuery config (metricScope, subprocess selection, status). */
    private resolveDefinitionNamesForWidget(config: DashboardWidgetConfig): string[] {
        return resolveProcessDefinitionKeys(config.processQuery ?? {});
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
            map((enriched) => ({ ...result, rows: [...enriched, ...remainder] })),
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
                businessKey: record.businessKey ?? '',
                parentId: record.parentId ?? '',
            };
        });
    }
}

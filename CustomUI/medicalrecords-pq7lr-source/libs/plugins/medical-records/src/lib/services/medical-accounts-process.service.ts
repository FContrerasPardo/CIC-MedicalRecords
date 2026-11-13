import { Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { DashboardDateRange, DashboardWidgetConfig } from '../dashboard/definitions/dashboard-widget.model';
import { flattenTableRow } from '../dashboard/mappers/dashboard-table.mapper';
import { ProcessQueryDataProvider } from '../dashboard/providers/process-query-data.provider';
import { DashboardPeriodService } from '../dashboard/services/dashboard-period.service';
import { PROCESS_VARIABLE_ENRICH_LIMIT } from '../dashboard/services/process-variables.service';
import { DEFAULT_PROCESS_STATUSES } from '../dashboard/utils/dashboard-data-source.util';
import { filterRowsToDateRange } from '../dashboard/utils/dashboard-date-range.util';
import {
    groupInstancesByProvider,
    isProviderDataPartial,
    ProviderGroup,
} from '../dashboard/utils/dashboard-provider-group.util';

export interface MedicalAccountsProviderSnapshot {
    groups: ProviderGroup[];
    /** Medical-account process instances found in the date range. */
    instanceCount: number;
    /** True when there are more instances than process variables were read for. */
    partial: boolean;
    enrichLimit: number;
}

/** Emitted when a provider is picked in the control center. */
export interface ProviderSelection {
    key: string;
    /** Display name; null for the unidentified group. */
    name: string | null;
}

/**
 * Reads medical-account process instances (definition `medical-records`) with their variables and
 * groups them by the provider found in `batchState`. Reuses the dashboard process provider, so no
 * extra HTTP calls are introduced.
 */
@Injectable({ providedIn: 'root' })
export class MedicalAccountsProcessService {
    constructor(
        private readonly processQueryDataProvider: ProcessQueryDataProvider,
        private readonly periodService: DashboardPeriodService
    ) {}

    /** Emits whenever the dashboard date range changes. */
    get dateRange$(): Observable<DashboardDateRange> {
        return this.periodService.dateRange$;
    }

    /** Errors when the process query fails, so callers can show an error state instead of empty data. */
    loadProviders(): Observable<MedicalAccountsProviderSnapshot> {
        const range = this.periodService.dateRange;
        const query: DashboardWidgetConfig = {
            id: 'medical-accounts-providers',
            type: 'metric',
            dataSource: 'process',
            processQuery: {
                processDefinitionKey: 'medical-records',
                includeSubprocesses: false,
                metricScope: 'root',
                status: [...DEFAULT_PROCESS_STATUSES],
                includeProcessVariables: true,
            },
        };

        return this.processQueryDataProvider.fetchRowsCoveringDateRange(query, range).pipe(
            map((result) => {
                if (result.error) {
                    throw new Error(result.error);
                }
                const rows = filterRowsToDateRange(
                    result.rows.map((row) => flattenTableRow(row)),
                    'startDate',
                    range
                );
                return {
                    groups: groupInstancesByProvider(
                        rows.map((row) => ({ status: row['status'], batchState: row['var_batchState'] }))
                    ),
                    instanceCount: rows.length,
                    partial: isProviderDataPartial(rows.length, PROCESS_VARIABLE_ENRICH_LIMIT),
                    enrichLimit: PROCESS_VARIABLE_ENRICH_LIMIT,
                };
            })
        );
    }
}

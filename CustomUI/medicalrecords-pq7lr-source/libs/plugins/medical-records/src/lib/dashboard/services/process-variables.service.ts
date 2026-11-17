import { inject, Injectable } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { catchError, from, map, Observable, of, shareReplay } from 'rxjs';
import { resolveDeployedAppName } from '../utils/dashboard-app-config.util';
import { DashboardDiagnosticsService } from './dashboard-diagnostics.service';

export const PROCESS_VARIABLE_COLUMN_PREFIX = 'var_';
export const PROCESS_VARIABLE_ENRICH_LIMIT = 100;

/** Variables fetched for an instance are reused by other widgets for this long. */
const VARIABLES_CACHE_TTL_MS = 30_000;
const VARIABLES_CACHE_LIMIT = 400;

interface ProcessVariablesResponse {
    list?: {
        entries?: Array<{ entry?: { name?: string; value?: unknown } }>;
    };
}

@Injectable({ providedIn: 'root' })
export class ProcessVariablesService {
    private readonly diagnostics = inject(DashboardDiagnosticsService);

    constructor(
        private readonly adfHttpClient: AdfHttpClient,
        private readonly appConfigService: AppConfigService
    ) {}

    fetchVariables(processInstanceId: string): Observable<Record<string, unknown>> {
        const appName = resolveDeployedAppName(this.appConfigService);
        if (!appName || !processInstanceId) {
            return of({});
        }

        // Several widgets enrich the same instances at once (filter cards, KPIs, field discovery):
        // share one request per instance for a short time instead of downloading the batchState repeatedly.
        const cacheKey = `${appName}|${processInstanceId}`;
        const cached = this.variablesCache.get(cacheKey);
        if (cached && Date.now() - cached.at < VARIABLES_CACHE_TTL_MS) {
            return cached.value$;
        }
        const value$ = this.requestVariables(appName, processInstanceId).pipe(shareReplay({ bufferSize: 1, refCount: false }));
        if (this.variablesCache.size >= VARIABLES_CACHE_LIMIT) {
            const oldest = this.variablesCache.keys().next().value;
            if (oldest !== undefined) {
                this.variablesCache.delete(oldest);
            }
        }
        this.variablesCache.set(cacheKey, { at: Date.now(), value$ });
        return value$;
    }

    private readonly variablesCache = new Map<string, { at: number; value$: Observable<Record<string, unknown>> }>();

    private requestVariables(appName: string, processInstanceId: string): Observable<Record<string, unknown>> {
        const url = `${this.getQueryBaseUrl(appName)}/process-instances/${encodeURIComponent(processInstanceId)}/variables`;

        return from(this.adfHttpClient.get<ProcessVariablesResponse>(url)).pipe(
            map((response) => {
                const variables = response?.list?.entries?.map((entry) => entry.entry) ?? [];
                const byName = variables.reduce<Record<string, unknown>>((accumulator, variable) => {
                    const name = variable?.name?.trim();
                    if (name) {
                        accumulator[name] = variable.value;
                    }
                    return accumulator;
                }, {});
                this.diagnostics.captureVariables(processInstanceId, byName, 'instance');
                return byName;
            }),
            catchError(() => of({}))
        );
    }

    flattenVariablesToColumns(variables: Record<string, unknown>): Record<string, unknown> {
        const columns: Record<string, unknown> = {};
        for (const [name, value] of Object.entries(variables)) {
            columns[`${PROCESS_VARIABLE_COLUMN_PREFIX}${name}`] = serializeProcessVariableValue(value);
        }
        return columns;
    }

    private getQueryBaseUrl(appName: string): string {
        const host = String(this.appConfigService.get('bpmHost', '')).replace(/\/+$/, '');
        return `${host}/${appName}/query/v1`;
    }
}

export function serializeProcessVariableValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

export function stripProcessVariablePrefix(columnKey: string): string {
    return columnKey.startsWith(PROCESS_VARIABLE_COLUMN_PREFIX)
        ? columnKey.slice(PROCESS_VARIABLE_COLUMN_PREFIX.length)
        : columnKey;
}

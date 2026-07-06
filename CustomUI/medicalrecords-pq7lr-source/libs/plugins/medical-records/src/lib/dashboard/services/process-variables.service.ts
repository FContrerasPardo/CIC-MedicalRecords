import { Injectable } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { catchError, from, map, Observable, of } from 'rxjs';
import { resolveDeployedAppName } from '../utils/dashboard-app-config.util';

export const PROCESS_VARIABLE_COLUMN_PREFIX = 'var_';
export const PROCESS_VARIABLE_ENRICH_LIMIT = 100;

interface ProcessVariablesResponse {
    list?: {
        entries?: Array<{ entry?: { name?: string; value?: unknown } }>;
    };
}

@Injectable({ providedIn: 'root' })
export class ProcessVariablesService {
    constructor(
        private readonly adfHttpClient: AdfHttpClient,
        private readonly appConfigService: AppConfigService
    ) {}

    fetchVariables(processInstanceId: string): Observable<Record<string, unknown>> {
        const appName = resolveDeployedAppName(this.appConfigService);
        if (!appName || !processInstanceId) {
            return of({});
        }

        const url = `${this.getQueryBaseUrl(appName)}/process-instances/${encodeURIComponent(processInstanceId)}/variables`;

        return from(this.adfHttpClient.get<ProcessVariablesResponse>(url)).pipe(
            map((response) => {
                const variables = response?.list?.entries?.map((entry) => entry.entry) ?? [];
                return variables.reduce<Record<string, unknown>>((accumulator, variable) => {
                    const name = variable?.name?.trim();
                    if (name) {
                        accumulator[name] = variable.value;
                    }
                    return accumulator;
                }, {});
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

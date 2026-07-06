import { DashboardDataSource, DashboardWidgetConfig } from '../definitions/dashboard-widget.model';

export const DEFAULT_PROCESS_STATUSES = ['RUNNING', 'COMPLETED', 'SUSPENDED', 'CANCELLED'] as const;

/** Previous default omitted CANCELLED — expand when widgets still use the legacy trio. */
export const LEGACY_DEFAULT_PROCESS_STATUSES = ['RUNNING', 'COMPLETED', 'SUSPENDED'] as const;

function isLegacyAllStatusesFilter(status: string[]): boolean {
    const allowed = new Set(status.map((value) => value.toUpperCase()));
    return (
        allowed.size === LEGACY_DEFAULT_PROCESS_STATUSES.length &&
        LEGACY_DEFAULT_PROCESS_STATUSES.every((value) => allowed.has(value)) &&
        !allowed.has('CANCELLED')
    );
}

const CONTENT_FIELD_PATTERN = /^(sys_|cmis:|bd_|lreq_)/i;

export function resolveWidgetDataSource(config: DashboardWidgetConfig): DashboardDataSource {
    if (config.dataSource) {
        return config.dataSource;
    }

    if (config.processQuery) {
        return 'process';
    }

    if (config.contentQuery?.trim()) {
        return 'content';
    }

    return 'demo';
}

/** Normalizes status values for the Process Cloud query API. */
export function normalizeProcessStatusFilter(status?: string[]): string[] {
    if (!status?.length) {
        return [...DEFAULT_PROCESS_STATUSES];
    }

    const normalized = [...new Set(status.map((value) => value.trim().toUpperCase()).filter(Boolean))];
    if (isLegacyAllStatusesFilter(normalized)) {
        return [...DEFAULT_PROCESS_STATUSES];
    }
    return normalized.length ? normalized : [...DEFAULT_PROCESS_STATUSES];
}

export function shouldClientFilterProcessStatus(status?: string[]): boolean {
    const normalized = normalizeProcessStatusFilter(status);
    return normalized.length > 0 && normalized.length < DEFAULT_PROCESS_STATUSES.length;
}

export function filterRowsByProcessStatus(
    rows: Array<Record<string, unknown>>,
    status?: string[]
): Array<Record<string, unknown>> {
    if (!shouldClientFilterProcessStatus(status)) {
        return rows;
    }

    const allowed = new Set(normalizeProcessStatusFilter(status));
    return rows.filter((row) => allowed.has(String(row['status'] ?? '').toUpperCase()));
}

export function filterRowsByProcessDefinitions(
    rows: Array<Record<string, unknown>>,
    definitionKeys?: string[]
): Array<Record<string, unknown>> {
    if (!definitionKeys?.length) {
        return rows;
    }

    const allowed = new Set(definitionKeys);
    return rows.filter((row) => {
        const key = String(row['processDefinitionKey'] ?? '').trim();
        const name = String(row['processDefinitionName'] ?? '').trim();
        return allowed.has(key) || allowed.has(name);
    });
}

export function isLikelyContentFieldKey(key?: string): boolean {
    return !!key && CONTENT_FIELD_PATTERN.test(key);
}

/** Fingerprint for field discovery — excludes column/chart bindings so toggling columns does not re-fetch. */
export function buildFieldsDiscoveryFingerprint(config: DashboardWidgetConfig, dateRangeKey?: string): string {
    const processQuery = config.processQuery;
    return JSON.stringify({
        dataSource: resolveWidgetDataSource(config),
        contentQuery: config.contentQuery ?? '',
        processDefinitionKey: processQuery?.processDefinitionKey ?? processQuery?.processDefinitionName ?? '',
        includeSubprocesses: processQuery?.includeSubprocesses ?? true,
        metricScope: processQuery?.metricScope ?? 'root',
        includedSubprocessDefinitionKeys: processQuery?.includedSubprocessDefinitionKeys ?? [],
        processStatus: normalizeProcessStatusFilter(processQuery?.status),
        includeProcessVariables: processQuery?.includeProcessVariables ?? false,
        argumentField: config.bindings?.argumentField ?? '',
        argumentFieldPath: config.bindings?.argumentFieldPath ?? '',
        valueField: config.bindings?.valueField ?? '',
        valueFieldPath: config.bindings?.valueFieldPath ?? '',
        seriesField: config.bindings?.seriesField ?? '',
        seriesFieldPath: config.bindings?.seriesFieldPath ?? '',
        dateRange: dateRangeKey ?? 'default',
    });
}

/** Fingerprint for table data fetch — query + page size only. */
export function buildTableDataFingerprint(config: DashboardWidgetConfig): string {
    const processQuery = config.processQuery;
    return JSON.stringify({
        dataSource: resolveWidgetDataSource(config),
        contentQuery: config.contentQuery ?? '',
        processDefinitionKey: processQuery?.processDefinitionKey ?? processQuery?.processDefinitionName ?? '',
        includeSubprocesses: processQuery?.includeSubprocesses ?? true,
        metricScope: processQuery?.metricScope ?? 'root',
        includedSubprocessDefinitionKeys: processQuery?.includedSubprocessDefinitionKeys ?? [],
        processStatus: normalizeProcessStatusFilter(processQuery?.status),
        includeProcessVariables: processQuery?.includeProcessVariables ?? false,
        tablePageSize: config.tablePageSize ?? 25,
    });
}

export function buildTableColumnFingerprint(config: DashboardWidgetConfig): string {
    return JSON.stringify({
        columnFieldsConfigured: config.bindings?.columnFields !== undefined,
        columnFields: config.bindings?.columnFields ?? [],
        tableColumnKeys: config.tableColumnKeys ?? '',
        groupByFields: config.tableOptions?.groupByFields ?? [],
    });
}

export function buildProcessQueryFingerprint(config: DashboardWidgetConfig, dateRangeKey?: string): string {
    return JSON.stringify({
        ...JSON.parse(buildTableDataFingerprint(config)),
        ...JSON.parse(buildTableColumnFingerprint(config)),
        argumentField: config.bindings?.argumentField ?? '',
        argumentFieldPath: config.bindings?.argumentFieldPath ?? '',
        valueField: config.bindings?.valueField ?? '',
        valueFieldPath: config.bindings?.valueFieldPath ?? '',
        seriesField: config.bindings?.seriesField ?? '',
        seriesFieldPath: config.bindings?.seriesFieldPath ?? '',
        dateRange: dateRangeKey ?? 'default',
    });
}

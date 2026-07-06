export interface DashboardProcessCatalogEntry {
    /** processDefinitionKey stored in widget config */
    key: string;
    labelKey: string;
    descriptionKey: string;
    /** Known subprocess definition keys invoked from this root BPMN */
    subprocessDefinitionKeys: string[];
    defaultStatus: string[];
    defaultIncludeSubprocesses: boolean;
    /** root = count only root instances (intakes); tree = all instances in the family */
    defaultMetricScope: 'root' | 'tree';
}

export const DASHBOARD_PROCESS_CATALOG: DashboardProcessCatalogEntry[] = [
    {
        key: 'medical-records',
        labelKey: 'MEDICAL_RECORDS.PROCESS_CATALOG.MEDICAL_RECORDS',
        descriptionKey: 'MEDICAL_RECORDS.PROCESS_CATALOG.MEDICAL_RECORDS_DESC',
        subprocessDefinitionKeys: ['AgentMesh', 'Document AI Process', 'initialize-batch'],
        defaultStatus: ['RUNNING', 'COMPLETED', 'SUSPENDED', 'CANCELLED'],
        defaultIncludeSubprocesses: true,
        defaultMetricScope: 'root',
    },
];

export function findProcessCatalogEntry(key?: string): DashboardProcessCatalogEntry | undefined {
    if (!key) {
        return undefined;
    }
    return DASHBOARD_PROCESS_CATALOG.find((entry) => entry.key === key);
}

export function resolveProcessDefinitionKeys(config: {
    processDefinitionKey?: string;
    processDefinitionName?: string;
    includeSubprocesses?: boolean;
    metricScope?: 'root' | 'tree';
    includedSubprocessDefinitionKeys?: string[];
}): string[] {
    const selectedKey = config.processDefinitionKey ?? config.processDefinitionName ?? 'medical-records';
    const entry = findProcessCatalogEntry(selectedKey);
    const rootKey = entry?.key ?? selectedKey;
    const metricScope = config.metricScope ?? entry?.defaultMetricScope ?? 'root';

    if (metricScope === 'root') {
        return [rootKey];
    }

    if (config.includedSubprocessDefinitionKeys !== undefined) {
        const selected = config.includedSubprocessDefinitionKeys.filter(Boolean);
        return selected.length ? [rootKey, ...selected] : [rootKey];
    }

    const includeSubprocesses = config.includeSubprocesses ?? entry?.defaultIncludeSubprocesses ?? false;
    if (!includeSubprocesses || !entry?.subprocessDefinitionKeys.length) {
        return [rootKey];
    }

    return [rootKey, ...entry.subprocessDefinitionKeys];
}

export function resolveProcessRootKey(config: {
    processDefinitionKey?: string;
    processDefinitionName?: string;
}): string {
    return config.processDefinitionKey ?? config.processDefinitionName ?? 'medical-records';
}

export function defaultIncludedSubprocessKeys(processDefinitionKey?: string): string[] {
    const entry = findProcessCatalogEntry(processDefinitionKey);
    return entry?.subprocessDefinitionKeys ? [...entry.subprocessDefinitionKeys] : [];
}

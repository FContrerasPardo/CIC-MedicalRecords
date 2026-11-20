import {
    activeProcessMapping,
    activeProcessMappingSource,
    canonicalProcessKey,
    DEFAULT_PROCESS_MAPPING,
    ProcessMapping,
    ProcessMappingSource,
    processRoleKey,
    ProcessRole,
    resolveProcessRole,
    rootProcessKey,
} from './process-mapping';

export interface DashboardProcessCatalogEntry {
    /** Canonical root key (default mapping); configs store the key, legacy names resolve via the mapping. */
    key: string;
    role: ProcessRole;
    labelKey: string;
    descriptionKey: string;
    /** Subprocess roles invoked from this root BPMN, offered in the widget panel. */
    subprocessRoles: ProcessRole[];
    /** Subprocess roles included by default when the metric scope is the whole tree. */
    defaultSubprocessRoles: ProcessRole[];
    defaultStatus: string[];
    defaultIncludeSubprocesses: boolean;
    /** root = count only root instances (intakes); tree = all instances in the family */
    defaultMetricScope: 'root' | 'tree';
}

export const DASHBOARD_PROCESS_CATALOG: DashboardProcessCatalogEntry[] = [
    {
        key: DEFAULT_PROCESS_MAPPING.root.keys[0],
        role: 'root',
        labelKey: 'MEDICAL_RECORDS.PROCESS_CATALOG.MEDICAL_RECORDS',
        descriptionKey: 'MEDICAL_RECORDS.PROCESS_CATALOG.MEDICAL_RECORDS_DESC',
        subprocessRoles: ['agentMesh', 'documentAi', 'initializeBatch', 'preanalysis'],
        defaultSubprocessRoles: ['agentMesh', 'documentAi', 'initializeBatch'],
        defaultStatus: ['RUNNING', 'COMPLETED', 'SUSPENDED', 'CANCELLED'],
        defaultIncludeSubprocesses: true,
        defaultMetricScope: 'root',
    },
];

/** Catalog entry of a configured identifier (key or legacy name), resolved through the mapping. */
export function findProcessCatalogEntry(identifier?: string, mapping: ProcessMapping = activeProcessMapping()): DashboardProcessCatalogEntry | undefined {
    const role = resolveProcessRole(identifier, mapping);
    return role ? DASHBOARD_PROCESS_CATALOG.find((entry) => entry.role === role) : undefined;
}

/** Canonical keys of the subprocesses an entry offers. */
export function catalogSubprocessKeys(entry: DashboardProcessCatalogEntry | undefined, mapping: ProcessMapping = activeProcessMapping()): string[] {
    return (entry?.subprocessRoles ?? []).map((role) => processRoleKey(role, mapping));
}

/** Canonical root key of a widget config; legacy names (`medical-records`) resolve to the real key. */
export function resolveProcessRootKey(
    config: { processDefinitionKey?: string; processDefinitionName?: string },
    mapping: ProcessMapping = activeProcessMapping()
): string {
    const configured = config.processDefinitionKey?.trim() || config.processDefinitionName?.trim();
    return configured ? canonicalProcessKey(configured, mapping) : rootProcessKey(mapping);
}

export interface ProcessQueryScopeConfig {
    processDefinitionKey?: string;
    processDefinitionName?: string;
    includeSubprocesses?: boolean;
    metricScope?: 'root' | 'tree';
    includedSubprocessDefinitionKeys?: string[];
}

/** Canonical definition keys a widget reads (root, plus the selected subprocesses in tree scope). */
export function resolveProcessDefinitionKeys(config: ProcessQueryScopeConfig, mapping: ProcessMapping = activeProcessMapping()): string[] {
    const rootKey = resolveProcessRootKey(config, mapping);
    const entry = findProcessCatalogEntry(rootKey, mapping);
    const metricScope = config.metricScope ?? entry?.defaultMetricScope ?? 'root';

    if (metricScope === 'root') {
        return [rootKey];
    }

    let subprocesses: string[];
    if (config.includedSubprocessDefinitionKeys !== undefined) {
        subprocesses = config.includedSubprocessDefinitionKeys.filter(Boolean).map((key) => canonicalProcessKey(key, mapping));
    } else {
        const includeSubprocesses = config.includeSubprocesses ?? entry?.defaultIncludeSubprocesses ?? false;
        subprocesses = includeSubprocesses ? defaultIncludedSubprocessKeys(rootKey, mapping) : [];
    }
    return [...new Set([rootKey, ...subprocesses].filter(Boolean))];
}

export interface ProcessDefinitionFilter {
    /** Canonical keys: client-side filter of the returned rows. */
    keys: string[];
    /** Names sent to the Query service (`processDefinitionName`, the only definition filter it takes). */
    names: string[];
    /** `widget` when the widget chose an unmapped definition; otherwise where the mapping comes from. */
    source: ProcessMappingSource;
}

/**
 * Query filter of a widget: canonical keys plus every name the mapping knows for them (current and
 * past, e.g. `medical-records` and `Radicación`). Unmapped keys use the stored definition name.
 */
export function resolveProcessDefinitionFilter(config: ProcessQueryScopeConfig, mapping: ProcessMapping = activeProcessMapping()): ProcessDefinitionFilter {
    const keys = resolveProcessDefinitionKeys(config, mapping);
    const names: string[] = [];
    let unmapped = false;
    for (const key of keys) {
        const role = resolveProcessRole(key, mapping);
        if (role) {
            names.push(...mapping[role].names);
            continue;
        }
        unmapped = true;
        const storedName = config.processDefinitionName?.trim();
        names.push(storedName && key === config.processDefinitionKey?.trim() ? storedName : key);
    }
    return {
        keys,
        names: [...new Set(names.filter(Boolean))],
        source: unmapped ? 'widget' : mapping === activeProcessMapping() ? activeProcessMappingSource() : 'default',
    };
}

export function defaultIncludedSubprocessKeys(processDefinitionKey?: string, mapping: ProcessMapping = activeProcessMapping()): string[] {
    const entry = findProcessCatalogEntry(processDefinitionKey, mapping);
    return (entry?.defaultSubprocessRoles ?? []).map((role) => processRoleKey(role, mapping));
}

import { DashboardProcessListScopeOptions } from '../definitions/dashboard-widget.model';
import { catalogSubprocessKeys, findProcessCatalogEntry } from '../definitions/dashboard-process-catalog';
import {
    activeProcessMapping,
    activeProcessMappingSource,
    canonicalProcessKey,
    normalizeProcessIdentifier,
    ProcessMapping,
    ProcessMappingSource,
    resolveProcessRole,
    rootProcessKey,
} from '../definitions/process-mapping';

/** Keys and names that identify one process definition (a mapping role, or an unmapped key). */
export interface ProcessIdentitySet {
    /** Canonical key (stored in configs). */
    key: string;
    /** Every key of the role (current first), used to recognise rows and `processDefinitionId` prefixes. */
    keys: string[];
    /** Names sent to the Query service and accepted as fallback. */
    names: string[];
}

/** Effective process scope of an open-tasks list (pure; resolved from the widget or the mapping). */
export interface TaskQueryScope {
    root: ProcessIdentitySet;
    includeSubprocesses: boolean;
    /** Included subprocesses (empty when `includeSubprocesses` is off). */
    subprocesses: ProcessIdentitySet[];
    /** `widget` when the widget chose the root or the subprocesses; otherwise where the mapping comes from. */
    source: ProcessMappingSource;
}

function identityOf(identifier: string, mapping: ProcessMapping, storedName?: string): ProcessIdentitySet {
    const key = canonicalProcessKey(identifier, mapping);
    const role = resolveProcessRole(key, mapping);
    if (role) {
        return { key, keys: [...mapping[role].keys], names: [...mapping[role].names] };
    }
    const name = storedName?.trim();
    return { key, keys: [key], names: [name || key] };
}

/** Default subprocess keys of a root: every subprocess role the catalog offers for it. */
export function defaultTaskSubprocessKeys(rootKey: string, mapping: ProcessMapping = activeProcessMapping()): string[] {
    return catalogSubprocessKeys(findProcessCatalogEntry(rootKey, mapping), mapping);
}

/**
 * Scope of an open-tasks list. Without configuration: the mapping root and every subprocess the
 * catalog offers for it (AgentMesh, Document AI, initialize-batch, Preanalysis).
 */
export function resolveTaskQueryScope(
    options: DashboardProcessListScopeOptions | null | undefined,
    mapping: ProcessMapping = activeProcessMapping()
): TaskQueryScope {
    const configuredRoot = options?.rootProcessKey?.trim();
    const root = identityOf(configuredRoot || rootProcessKey(mapping), mapping, configuredRoot ? options?.rootProcessName : undefined);
    const includeSubprocesses = options?.includeSubprocessTasks !== false;
    const subprocessKeys = includeSubprocesses
        ? options?.includedSubprocessKeys !== undefined
            ? options.includedSubprocessKeys.map((key) => String(key ?? '').trim()).filter(Boolean)
            : defaultTaskSubprocessKeys(root.key, mapping)
        : [];
    const seen = new Set<string>([normalizeProcessIdentifier(root.key)]);
    const subprocesses: ProcessIdentitySet[] = [];
    for (const key of subprocessKeys) {
        const identity = identityOf(key, mapping);
        const normalized = normalizeProcessIdentifier(identity.key);
        if (!seen.has(normalized)) {
            seen.add(normalized);
            subprocesses.push(identity);
        }
    }
    const customised =
        !!configuredRoot || options?.includeSubprocessTasks !== undefined || options?.includedSubprocessKeys !== undefined;
    const source: ProcessMappingSource = customised
        ? 'widget'
        : mapping === activeProcessMapping()
          ? activeProcessMappingSource()
          : 'default';
    return { root, includeSubprocesses, subprocesses, source };
}

/** Stable cache key of a scope: two widgets with the same effective scope share one load. */
export function taskQueryScopeKey(scope: TaskQueryScope): string {
    const part = (identity: ProcessIdentitySet) =>
        `${normalizeProcessIdentifier(identity.key)}[${identity.names.map(normalizeProcessIdentifier).sort().join(',')}]`;
    const subprocesses = scope.subprocesses.map(part).sort().join('+');
    return `${part(scope.root)}|${scope.includeSubprocesses ? 'sub' : 'root'}|${subprocesses}`;
}

/** One line for the technical view and the builder preview. */
export function describeTaskQueryScope(scope: TaskQueryScope): { root: string; subprocesses: string } {
    return {
        root: `${scope.root.key} (${scope.root.names.join(', ') || '-'})`,
        subprocesses: scope.includeSubprocesses
            ? scope.subprocesses.map((identity) => `${identity.key} (${identity.names.join(', ') || '-'})`).join('; ') || '-'
            : 'off',
    };
}

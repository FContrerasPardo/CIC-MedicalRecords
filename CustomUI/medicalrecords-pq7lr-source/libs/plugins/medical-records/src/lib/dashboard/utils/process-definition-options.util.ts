import {
    activeProcessMapping,
    normalizeProcessIdentifier,
    ProcessMapping,
    processRoleOf,
    resolveProcessRole,
} from '../definitions/process-mapping';

/** A deployed process definition as offered in the widget panel (latest version per key). */
export interface DeployedProcessDefinition {
    key: string;
    name: string;
    version: number;
}

/** Latest version per key, sorted by name then key. Rows without key are ignored. */
export function latestDeployedDefinitions(
    definitions: ReadonlyArray<{ key?: string | null; name?: string | null; version?: number | string | null } | null | undefined>
): DeployedProcessDefinition[] {
    const byKey = new Map<string, DeployedProcessDefinition>();
    for (const definition of definitions) {
        const key = String(definition?.key ?? '').trim();
        if (!key) {
            continue;
        }
        const parsed = Number(definition?.version);
        const version = Number.isFinite(parsed) ? parsed : 0;
        const current = byKey.get(key);
        if (!current || version > current.version) {
            byKey.set(key, { key, name: String(definition?.name ?? '').trim(), version });
        }
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}

export function formatDeployedDefinition(definition: DeployedProcessDefinition): string {
    return `${definition.name || '?'} · ${definition.key} · v${definition.version}`;
}

export interface ConfiguredProcessCheck {
    /** The configured identifier is a deployed key. */
    storedByKey: boolean;
    /** Deployed definition equivalent to a configured name (or unknown key), resolved via the mapping. */
    equivalent: DeployedProcessDefinition | null;
}

/**
 * Checks what a widget stored against the deployed definitions. Legacy layouts store names
 * (`medical-records`, `AgentMesh`...): the equivalent definition is the deployed one of the same
 * mapping role (by key first), or a definition with exactly that name.
 */
export function checkConfiguredProcess(
    identifier: string | null | undefined,
    definitions: readonly DeployedProcessDefinition[],
    mapping: ProcessMapping = activeProcessMapping()
): ConfiguredProcessCheck {
    const wanted = normalizeProcessIdentifier(identifier);
    if (!wanted) {
        return { storedByKey: false, equivalent: null };
    }
    if (definitions.some((definition) => normalizeProcessIdentifier(definition.key) === wanted)) {
        return { storedByKey: true, equivalent: null };
    }
    const role = resolveProcessRole(identifier, mapping);
    const sameRole = role ? definitions.filter((definition) => processRoleOf(definition, mapping)?.role === role) : [];
    const equivalent =
        sameRole.find((definition) => processRoleOf(definition, mapping)?.matchedBy === 'key') ??
        sameRole[0] ??
        definitions.find((definition) => normalizeProcessIdentifier(definition.name) === wanted) ??
        null;
    return { storedByKey: false, equivalent };
}

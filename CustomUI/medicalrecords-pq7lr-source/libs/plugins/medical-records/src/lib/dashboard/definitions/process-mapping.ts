/**
 * Single source of truth for the Automate processes the plugin reads and starts.
 *
 * The UI identifies each process by its stable definition KEY (the BPMN process id, e.g.
 * `Process_1777481415500`). Display names can change in Automate (the root was shown as
 * «Radicación» for a few versions after a pool was added), so names are only a fallback and the
 * filter sent to the Query service (which filters by `processDefinitionName` only, see
 * `docs/automate/process-mapping.md`).
 *
 * The defaults below come from the Automate export (BPMN process ids and names). A layout saved in
 * the repository may override them with `processMapping` (see `ProcessMappingService`).
 */

export type ProcessRole = 'root' | 'documentAi' | 'agentMesh' | 'initializeBatch' | 'preanalysis';

export const PROCESS_SUBPROCESS_ROLES: readonly ProcessRole[] = ['agentMesh', 'documentAi', 'initializeBatch', 'preanalysis'];
export const PROCESS_ROLES: readonly ProcessRole[] = ['root', ...PROCESS_SUBPROCESS_ROLES];

export interface ProcessRoleIdentity {
    /** Definition keys (BPMN process ids). The first one is the canonical key stored in configs. */
    keys: string[];
    /** Definition names the Query service may report, current and past. */
    names: string[];
}

export type ProcessMapping = Record<ProcessRole, ProcessRoleIdentity>;

/** Partial mapping as stored in a layout: arrays given for a role replace the defaults of that role. */
export type ProcessMappingOverride = Partial<Record<ProcessRole, Partial<ProcessRoleIdentity>>>;

/** Where the effective mapping (or a widget's selection) comes from, for the technical view. */
export type ProcessMappingSource = 'default' | 'layout' | 'widget';

export const DEFAULT_PROCESS_MAPPING: ProcessMapping = {
    root: { keys: ['Process_1777481415500'], names: ['medical-records', 'Radicación'] },
    documentAi: { keys: ['Process_1767797409502'], names: ['Document AI Process'] },
    agentMesh: { keys: ['Process_1777579089863', 'agentmesh-hk5kb'], names: ['AgentMesh'] },
    initializeBatch: { keys: ['Process_1753464285348'], names: ['initialize-batch'] },
    preanalysis: { keys: ['Process_1794866470316'], names: ['Preanalysis'] },
};

/** Row shapes accepted: Query service rows (`processDefinitionKey/Name`) and definitions (`key/name`). */
export interface ProcessIdentityLike {
    processDefinitionKey?: string | null;
    processDefinitionName?: string | null;
    key?: string | null;
    name?: string | null;
}

export type ProcessMatchKind = 'key' | 'name';

export interface ProcessRoleMatch {
    role: ProcessRole;
    matchedBy: ProcessMatchKind;
}

/** Case-, whitespace- and accent-composition-insensitive comparison form. */
export function normalizeProcessIdentifier(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).normalize('NFC').replace(/\s+/g, '').toLowerCase();
}

function cleanList(values: unknown): string[] {
    if (!Array.isArray(values)) {
        return [];
    }
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
        const text = typeof value === 'string' ? value.trim() : '';
        const normalized = normalizeProcessIdentifier(text);
        if (text && !seen.has(normalized)) {
            seen.add(normalized);
            result.push(text);
        }
    }
    return result;
}

/** Defaults with the override applied; invalid or empty entries keep the default of that role. */
export function mergeProcessMapping(base: ProcessMapping, override: ProcessMappingOverride | null | undefined): ProcessMapping {
    const result = {} as ProcessMapping;
    for (const role of PROCESS_ROLES) {
        const entry = override && typeof override === 'object' ? override[role] : undefined;
        const keys = cleanList(entry?.keys);
        const names = cleanList(entry?.names);
        result[role] = {
            keys: keys.length ? keys : [...base[role].keys],
            names: names.length ? names : [...base[role].names],
        };
    }
    return result;
}

let active: { mapping: ProcessMapping; source: ProcessMappingSource } = { mapping: DEFAULT_PROCESS_MAPPING, source: 'default' };

/** Effective mapping used by the pure helpers when no mapping is passed. */
export function activeProcessMapping(): ProcessMapping {
    return active.mapping;
}

export function activeProcessMappingSource(): ProcessMappingSource {
    return active.source;
}

/** Replaces the effective mapping (layout override) or resets it to the defaults. */
export function setActiveProcessMapping(override: ProcessMappingOverride | null | undefined): ProcessMapping {
    const hasOverride = !!override && PROCESS_ROLES.some((role) => !!override[role]);
    active = hasOverride
        ? { mapping: mergeProcessMapping(DEFAULT_PROCESS_MAPPING, override), source: 'layout' }
        : { mapping: DEFAULT_PROCESS_MAPPING, source: 'default' };
    return active.mapping;
}

function rowKey(row: ProcessIdentityLike | null | undefined): string {
    return normalizeProcessIdentifier(row?.processDefinitionKey ?? row?.key);
}

function rowName(row: ProcessIdentityLike | null | undefined): string {
    return normalizeProcessIdentifier(row?.processDefinitionName ?? row?.name);
}

function roleIdentifiers(mapping: ProcessMapping, role: ProcessRole): Set<string> {
    const identity = mapping[role];
    return new Set([...identity.keys, ...identity.names].map(normalizeProcessIdentifier).filter(Boolean));
}

/**
 * Role of a row or definition: its KEY is tried first against every role, then its NAME. A key
 * equal to a mapped name (legacy configs that stored `medical-records` as key) counts as a key match.
 */
export function processRoleOf(row: ProcessIdentityLike | null | undefined, mapping: ProcessMapping = activeProcessMapping()): ProcessRoleMatch | null {
    const key = rowKey(row);
    const name = rowName(row);
    if (key) {
        for (const role of PROCESS_ROLES) {
            if (roleIdentifiers(mapping, role).has(key)) {
                return { role, matchedBy: 'key' };
            }
        }
    }
    if (name) {
        for (const role of PROCESS_ROLES) {
            if (roleIdentifiers(mapping, role).has(name)) {
                return { role, matchedBy: 'name' };
            }
        }
    }
    return null;
}

/** True when the row belongs to the role, by key or by name (case and spaces ignored). */
export function matchesProcessRole(
    row: ProcessIdentityLike | null | undefined,
    role: ProcessRole,
    mapping: ProcessMapping = activeProcessMapping()
): boolean {
    return processRoleOf(row, mapping)?.role === role;
}

/** Role of a configured identifier (a key or a name), or null when it is not mapped. */
export function resolveProcessRole(identifier: string | null | undefined, mapping: ProcessMapping = activeProcessMapping()): ProcessRole | null {
    const normalized = normalizeProcessIdentifier(identifier);
    if (!normalized) {
        return null;
    }
    return PROCESS_ROLES.find((role) => roleIdentifiers(mapping, role).has(normalized)) ?? null;
}

/** Canonical key of a role (first key; first name when the role has no key). */
export function processRoleKey(role: ProcessRole, mapping: ProcessMapping = activeProcessMapping()): string {
    return mapping[role].keys[0] ?? mapping[role].names[0] ?? '';
}

/** Canonical root key. */
export function rootProcessKey(mapping: ProcessMapping = activeProcessMapping()): string {
    return processRoleKey('root', mapping);
}

/**
 * Canonical key for a configured identifier: legacy layouts store names (`medical-records`,
 * `AgentMesh`...), resolved here to the real key. Unmapped identifiers are returned trimmed.
 */
export function canonicalProcessKey(identifier: string | null | undefined, mapping: ProcessMapping = activeProcessMapping()): string {
    const role = resolveProcessRole(identifier, mapping);
    return role ? processRoleKey(role, mapping) : String(identifier ?? '').trim();
}

/** Names to send to the Query service for a role (it filters by `processDefinitionName` only). */
export function processRoleQueryNames(role: ProcessRole, mapping: ProcessMapping = activeProcessMapping()): string[] {
    return [...mapping[role].names];
}

/**
 * Whether a row belongs to one of the wanted definitions (keys, or legacy names). A row of a
 * mapped role is accepted when the role is wanted by any of its keys or names; so a root row is
 * never dropped because its display name changed. Unmapped rows match by raw key, then raw name.
 */
export function matchProcessDefinitions(
    row: ProcessIdentityLike | null | undefined,
    definitions: readonly string[],
    mapping: ProcessMapping = activeProcessMapping()
): ProcessMatchKind | null {
    const wanted = new Set(definitions.map(normalizeProcessIdentifier).filter(Boolean));
    if (!wanted.size) {
        return null;
    }
    const identity = processRoleOf(row, mapping);
    if (identity) {
        return [...roleIdentifiers(mapping, identity.role)].some((id) => wanted.has(id)) ? identity.matchedBy : null;
    }
    const key = rowKey(row);
    if (key && wanted.has(key)) {
        return 'key';
    }
    const name = rowName(row);
    return name && wanted.has(name) ? 'name' : null;
}

/** One line for the technical view: role → keys | names. */
export function describeProcessMapping(mapping: ProcessMapping = activeProcessMapping()): string[] {
    return PROCESS_ROLES.map((role) => `${role}: keys=${mapping[role].keys.join(', ') || '-'} · names=${mapping[role].names.join(', ') || '-'}`);
}

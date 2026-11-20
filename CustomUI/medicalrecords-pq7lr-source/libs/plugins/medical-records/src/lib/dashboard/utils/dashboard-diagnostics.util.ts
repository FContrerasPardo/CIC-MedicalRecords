/**
 * Masked runtime diagnostics (same idea as CIC-Fin's factory diagnostic): what the UI received is
 * described by structure only - field names, JSON types and how many rows carry a value. Values are
 * kept only for a short allow-list of technical fields (dates, status, definition keys), so the
 * download can be shared without patient data. Process variables (`var_*`) never expose values.
 */

export interface DiagnosticFieldSummary {
    name: string;
    /** Observed JSON types across the rows. */
    types: string[];
    /** Rows where the field has a non-empty value. */
    present: number;
    /** Distinct values (max 3), only for allow-listed technical fields. */
    samples?: string[];
}

export type DiagnosticProbeKind = 'process-list' | 'process-variables' | 'open-tasks' | 'data-plan' | 'radication' | 'agreements';

/**
 * Structured detail of a probe, shown as a table when the probe is expanded (as CIC-Fin's
 * "Processing task query diagnostic"). Only technical cells: ids, names, statuses and dates.
 */
export interface DiagnosticTable {
    title: string;
    /** Request that produced the rows (method and path). */
    request?: string;
    /** Why the rows could not be read. */
    error?: string;
    /** Informational note, e.g. why the request was not sent. */
    note?: string;
    columns: string[];
    /** One cell per column in every row. */
    rows: string[][];
}

export interface DiagnosticProbe {
    id: number;
    at: string;
    kind: DiagnosticProbeKind;
    /** Probes with the same key replace each other in place (latest snapshot of a poll). */
    key?: string;
    tables?: DiagnosticTable[];
    /** Short technical description (statuses, page, definitions). No patient data. */
    label: string;
    durationMs: number;
    cacheHit?: boolean;
    totalCount?: number;
    rows?: number;
    /** Instances whose variables were requested. */
    enriched?: number;
    error?: string;
    fields?: DiagnosticFieldSummary[];
}

/**
 * Adds a probe at the top, or, when it has a key already recorded, replaces that probe in place
 * (keeping its id, so an expanded row stays open). Keeps at most `max` probes.
 */
export function upsertDiagnosticProbe(probes: readonly DiagnosticProbe[], probe: DiagnosticProbe, max: number): DiagnosticProbe[] {
    const index = probe.key ? probes.findIndex((current) => current.key === probe.key) : -1;
    if (index >= 0) {
        const next = [...probes];
        next[index] = { ...probe, id: probes[index].id };
        return next;
    }
    return [probe, ...probes].slice(0, max);
}

const SAMPLE_FIELDS =/(Date|At)$|^(status|processDefinitionKey|processDefinitionName|appName|taskType|taskStatus)$/;
const MAX_SAMPLES = 3;

function typeOf(value: unknown): string {
    if (value === null || value === undefined) {
        return 'null';
    }
    return Array.isArray(value) ? 'array' : typeof value;
}

function isPresent(value: unknown): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim() !== '';
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    return true;
}

/** Structure of the rows, masked: names, types, presence counts and allow-listed samples only. */
export function summarizeDiagnosticRows(rows: ReadonlyArray<Record<string, unknown>>): DiagnosticFieldSummary[] {
    const fields = new Map<string, { types: Set<string>; present: number; samples: Set<string> }>();
    for (const row of rows) {
        for (const [name, value] of Object.entries(row ?? {})) {
            let field = fields.get(name);
            if (!field) {
                field = { types: new Set(), present: 0, samples: new Set() };
                fields.set(name, field);
            }
            field.types.add(typeOf(value));
            if (isPresent(value)) {
                field.present += 1;
                if (!name.startsWith('var_') && SAMPLE_FIELDS.test(name) && field.samples.size < MAX_SAMPLES) {
                    field.samples.add(String(value).slice(0, 40));
                }
            }
        }
    }
    return [...fields.entries()]
        .map(([name, field]) => ({
            name,
            types: [...field.types].sort(),
            present: field.present,
            ...(field.samples.size ? { samples: [...field.samples] } : {}),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** Process variables of one instance as the screen read them (technical view only). */
export interface CapturedProcessVariables {
    processInstanceId: string;
    /** `instance`: full variables endpoint; `inline`: only the variables the data plan asked for. */
    source: 'instance' | 'inline';
    at: string;
    variables: Record<string, unknown>;
}

/** Merges a new read into the previous one of the same instance; values of a full read win. */
export function mergeCapturedVariables(
    previous: CapturedProcessVariables | undefined,
    next: CapturedProcessVariables
): CapturedProcessVariables {
    if (!previous) {
        return next;
    }
    if (next.source === 'instance') {
        return { ...next, variables: { ...previous.variables, ...next.variables } };
    }
    if (previous.source === 'instance') {
        return { ...previous, at: next.at, variables: { ...next.variables, ...previous.variables } };
    }
    return { ...next, variables: { ...previous.variables, ...next.variables } };
}

/** Distinct variable names across the captures, sorted. */
export function capturedVariableNames(captures: readonly CapturedProcessVariables[]): string[] {
    return [...new Set(captures.flatMap((capture) => Object.keys(capture.variables)))].sort((a, b) => a.localeCompare(b));
}

/** JSON variables (batchState, accountSummary) often arrive as strings: parse them for reading. */
export function expandJsonValue(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }
    const trimmed = value.trim();
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
        return value;
    }
    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

/**
 * Download of the process variables read on screen, WITH values: it can contain patient data.
 * It is only built on demand from the browser's memory and never sent anywhere.
 */
export function buildVariablesDownload(
    captures: readonly CapturedProcessVariables[],
    generatedAt = new Date(),
    /** Only these variables (by name); omitted = all of them. */
    names?: readonly string[]
): string {
    const wanted = names ? new Set(names) : null;
    const selected = captures
        .map((capture) => ({
            ...capture,
            variables: wanted
                ? Object.fromEntries(Object.entries(capture.variables).filter(([name]) => wanted.has(name)))
                : capture.variables,
        }))
        .filter((capture) => Object.keys(capture.variables).length > 0);
    return JSON.stringify(
        {
            kind: 'medical-records.dashboard.process-variables',
            generatedAt: generatedAt.toISOString(),
            note: 'Contains process variable VALUES (may include patient data). Do not share or commit.',
            variables: names ? [...names].sort() : 'all',
            instances: selected.length,
            processes: selected.map((capture) => ({
                processInstanceId: capture.processInstanceId,
                source: capture.source,
                readAt: capture.at,
                variableNames: Object.keys(capture.variables).sort(),
                variables: Object.fromEntries(Object.entries(capture.variables).map(([name, value]) => [name, expandJsonValue(value)])),
            })),
        },
        null,
        2
    );
}

/** Download payload: probes plus a short header. Only masked content is ever included. */
export function buildDiagnosticDownload(probes: readonly DiagnosticProbe[], generatedAt = new Date()): string {
    return JSON.stringify(
        {
            kind: 'medical-records.dashboard.diagnostics',
            generatedAt: generatedAt.toISOString(),
            note: 'Masked: field names, types and counts only; values only for technical fields.',
            probes,
        },
        null,
        2
    );
}

import {
    BILLING_FIELDS,
    normalizeIdentifier,
    normalizeKey,
    PLACEHOLDER_FIELD_TOKENS,
} from '../../form-widgets/intake-account-widget/batch-state-billing-fields';

/** Pure helpers to read the provider (prestador) out of a batchState and group process instances by it. */

export const UNIDENTIFIED_PROVIDER_KEY = '__unidentified__';

export interface BatchBillingIdentity {
    providerName: string | null;
    invoiceNumber: string | null;
    /** True when any document in the batch still needs human review. */
    reviewRequired: boolean;
}

interface LooseField {
    id?: unknown;
    name?: unknown;
    value?: unknown;
}

interface LooseBatchState {
    fields?: LooseField[];
    documents?: Array<{
        fields?: LooseField[];
        extractionReviewStatus?: unknown;
        classificationReviewStatus?: unknown;
        separationReviewStatus?: unknown;
    }>;
}

function parseBatchState(raw: unknown): LooseBatchState | null {
    if (!raw) {
        return null;
    }
    if (typeof raw === 'string') {
        try {
            const parsed: unknown = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? (parsed as LooseBatchState) : null;
        } catch {
            return null;
        }
    }
    return typeof raw === 'object' ? (raw as LooseBatchState) : null;
}

function readField(fields: LooseField[], aliases: readonly string[]): string | null {
    const wanted = aliases.map(normalizeKey);
    for (const field of fields) {
        if (!wanted.includes(normalizeKey(field.name ?? field.id))) {
            continue;
        }
        const value = field.value;
        if (value === null || value === undefined || typeof value === 'object') {
            continue;
        }
        const text = String(value).trim();
        if (text && !PLACEHOLDER_FIELD_TOKENS.has(normalizeIdentifier(text))) {
            return text;
        }
    }
    return null;
}

/** Reads provider, invoice number and review flag from a batchState (object or JSON string). */
export function extractBatchBillingIdentity(raw: unknown): BatchBillingIdentity {
    const batch = parseBatchState(raw);
    if (!batch) {
        return { providerName: null, invoiceNumber: null, reviewRequired: false };
    }
    const documents = Array.isArray(batch.documents) ? batch.documents : [];
    const fields: LooseField[] = [
        ...(Array.isArray(batch.fields) ? batch.fields : []),
        ...documents.flatMap((document) => (Array.isArray(document?.fields) ? document.fields : [])),
    ];
    return {
        providerName: readField(fields, BILLING_FIELDS.provider),
        invoiceNumber: readField(fields, BILLING_FIELDS.invoiceNumber),
        reviewRequired: documents.some(
            (document) =>
                document?.extractionReviewStatus === 'ReviewRequired' ||
                document?.classificationReviewStatus === 'ReviewRequired' ||
                document?.separationReviewStatus === 'ReviewRequired'
        ),
    };
}

/** Grouping key: case, accent and spacing insensitive. Empty names fall into the unidentified group. */
export function providerGroupKey(name: string | null | undefined): string {
    const key = normalizeKey(name);
    return key || UNIDENTIFIED_PROVIDER_KEY;
}

export interface ProviderInstanceInput {
    status?: string | null;
    batchState?: unknown;
}

export interface ProviderGroup {
    key: string;
    /** Display name (first spelling seen, trimmed); null for the unidentified group. */
    name: string | null;
    total: number;
    running: number;
    completed: number;
    cancelled: number;
    suspended: number;
    reviewRequired: number;
}

function emptyGroup(key: string, name: string | null): ProviderGroup {
    return { key, name, total: 0, running: 0, completed: 0, cancelled: 0, suspended: 0, reviewRequired: 0 };
}

/** Groups instances by provider, largest first, with the unidentified group always last. */
export function groupInstancesByProvider(rows: ProviderInstanceInput[]): ProviderGroup[] {
    const groups = new Map<string, ProviderGroup>();
    for (const row of rows) {
        const identity = extractBatchBillingIdentity(row.batchState);
        const key = providerGroupKey(identity.providerName);
        let group = groups.get(key);
        if (!group) {
            group = emptyGroup(key, key === UNIDENTIFIED_PROVIDER_KEY ? null : identity.providerName);
            groups.set(key, group);
        }
        group.total += 1;
        switch (String(row.status ?? '').toUpperCase()) {
            case 'RUNNING':
                group.running += 1;
                break;
            case 'COMPLETED':
                group.completed += 1;
                break;
            case 'CANCELLED':
                group.cancelled += 1;
                break;
            case 'SUSPENDED':
                group.suspended += 1;
                break;
            default:
                break;
        }
        if (identity.reviewRequired) {
            group.reviewRequired += 1;
        }
    }
    return [...groups.values()].sort((a, b) => {
        if (a.key === UNIDENTIFIED_PROVIDER_KEY) {
            return 1;
        }
        if (b.key === UNIDENTIFIED_PROVIDER_KEY) {
            return -1;
        }
        return b.total - a.total || String(a.name).localeCompare(String(b.name));
    });
}

export type ProviderKpiKey = 'running' | 'completed' | 'cancelled' | 'total' | 'reviewRequired';

export const PROVIDER_KPI_KEYS: readonly ProviderKpiKey[] = ['running', 'completed', 'cancelled', 'total', 'reviewRequired'];

export const DEFAULT_PROVIDER_KPI_KEYS: readonly ProviderKpiKey[] = ['running', 'completed', 'cancelled', 'total'];

/** Keeps the configured order, drops unknown/duplicate keys; empty or missing config falls back to the defaults. */
export function resolveProviderKpiKeys(selected?: readonly string[] | null): ProviderKpiKey[] {
    const valid = (selected ?? []).filter(
        (key, index, all): key is ProviderKpiKey =>
            (PROVIDER_KPI_KEYS as readonly string[]).includes(key) && all.indexOf(key) === index
    );
    return valid.length ? valid : [...DEFAULT_PROVIDER_KPI_KEYS];
}

/** Adds or removes a KPI; the last remaining KPI cannot be removed. */
export function toggleProviderKpi(current: readonly ProviderKpiKey[], key: ProviderKpiKey): ProviderKpiKey[] {
    if (current.includes(key)) {
        return current.length > 1 ? current.filter((entry) => entry !== key) : [...current];
    }
    return [...current, key];
}

/** Moves a KPI one position (delta -1 up, +1 down) inside the configured order. */
export function moveProviderKpi(current: readonly ProviderKpiKey[], key: ProviderKpiKey, delta: -1 | 1): ProviderKpiKey[] {
    const from = current.indexOf(key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= current.length) {
        return [...current];
    }
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, key);
    return next;
}

/** Only the first `enrichLimit` instances get their process variables, so a larger set has partial provider data. */
export function isProviderDataPartial(instanceCount: number, enrichLimit: number): boolean {
    return instanceCount > enrichLimit;
}

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

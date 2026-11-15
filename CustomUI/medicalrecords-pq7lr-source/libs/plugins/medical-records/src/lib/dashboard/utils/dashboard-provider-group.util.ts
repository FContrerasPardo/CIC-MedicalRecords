import {
    BILLING_FIELDS,
    normalizeIdentifier,
    normalizeKey,
    PLACEHOLDER_FIELD_TOKENS,
} from '../../form-widgets/intake-account-widget/batch-state-billing-fields';
import { InvoiceKey, PatientKey, TotalKey } from '../../idp/idp-account-mapping.util';

/** Pure helpers to read the provider (prestador) out of a batchState and group process instances by it. */

export const UNIDENTIFIED_PROVIDER_KEY = '__unidentified__';

/** Filter cards load only active instances by default: their variables are the expensive part. */
export const ACTIVE_PROCESS_STATUSES: readonly string[] = ['RUNNING', 'SUSPENDED'];

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

// batchState strings are large (hundreds of KB) and the same instance is read many times
// (grouping, each metric, list filtering), so parsed results and flattened fields are cached.
const PARSED_BATCH_CACHE_LIMIT = 500;
const parsedBatchCache = new Map<string, LooseBatchState | null>();
const batchFieldsCache = new WeakMap<LooseBatchState, LooseField[]>();

function parseBatchState(raw: unknown): LooseBatchState | null {
    if (!raw) {
        return null;
    }
    if (typeof raw === 'string') {
        const cached = parsedBatchCache.get(raw);
        if (cached !== undefined) {
            return cached;
        }
        let parsed: LooseBatchState | null = null;
        try {
            const value: unknown = JSON.parse(raw);
            parsed = value && typeof value === 'object' ? (value as LooseBatchState) : null;
        } catch {
            parsed = null;
        }
        if (parsedBatchCache.size >= PARSED_BATCH_CACHE_LIMIT) {
            const oldest = parsedBatchCache.keys().next().value;
            if (oldest !== undefined) {
                parsedBatchCache.delete(oldest);
            }
        }
        parsedBatchCache.set(raw, parsed);
        return parsed;
    }
    return typeof raw === 'object' ? (raw as LooseBatchState) : null;
}

/** All IDP fields of a batch (batch-level and per document), flattened once per batch. */
function batchFields(batch: LooseBatchState): LooseField[] {
    let fields = batchFieldsCache.get(batch);
    if (!fields) {
        const documents = Array.isArray(batch.documents) ? batch.documents : [];
        fields = [
            ...(Array.isArray(batch.fields) ? batch.fields : []),
            ...documents.flatMap((document) => (Array.isArray(document?.fields) ? document.fields : [])),
        ];
        batchFieldsCache.set(batch, fields);
    }
    return fields;
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
    const fields = batchFields(batch);
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
    /** When defined, groups by this value instead of the provider read from the batchState. */
    groupName?: string | null;
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
        const name = row.groupName !== undefined ? row.groupName : identity.providerName;
        const key = providerGroupKey(name);
        let group = groups.get(key);
        if (!group) {
            group = emptyGroup(key, key === UNIDENTIFIED_PROVIDER_KEY ? null : (name ?? null));
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

/** Only the first `enrichLimit` instances get their process variables, so a larger set has partial provider data. */
export function isProviderDataPartial(instanceCount: number, enrichLimit: number): boolean {
    return instanceCount > enrichLimit;
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


/** Reads one named field (accent/case-insensitive) from a batchState, or null. */
export function readBatchFieldValue(raw: unknown, fieldName: string): string | null {
    const batch = parseBatchState(raw);
    if (!batch || !fieldName.trim()) {
        return null;
    }
    return readField(batchFields(batch), [fieldName]);
}

// ---------------------------------------------------------------------------------------------
// Variables are configured per widget, never hard-coded: the IDP output variable (a batchState-
// like JSON) and an optional light summary variable written by Automate.
// ---------------------------------------------------------------------------------------------

/** Used only when a widget does not configure its IDP variable. */
export const DEFAULT_IDP_VARIABLE = 'batchState';

export interface ProviderVariableContext {
    /** Process variable holding the IDP output (documents with fields). */
    idpVariable: string;
    /** Optional process variable with a light summary (provider, invoice, review flag, fields). */
    summaryVariable?: string | null;
}

export const DEFAULT_PROVIDER_CONTEXT: ProviderVariableContext = { idpVariable: DEFAULT_IDP_VARIABLE, summaryVariable: null };

/** Variable context of a filter-cards widget from its options. */
export function resolveProviderContext(
    options: { idpVariable?: string | null; summaryVariable?: string | null } | null | undefined
): ProviderVariableContext {
    return {
        idpVariable: options?.idpVariable?.trim() || DEFAULT_IDP_VARIABLE,
        summaryVariable: options?.summaryVariable?.trim() || null,
    };
}

export interface ProviderGroupBy {
    source: 'batch-field' | 'process-variable';
    name?: string;
    /** batch-field only: variable holding the IDP output. Default: the widget's IDP variable. */
    variable?: string;
}

/**
 * Light summary written by Automate (see docs/automate). When configured and present, provider,
 * invoice and review state are read from it instead of parsing the full IDP output.
 */
export interface AccountSummary {
    provider?: string | null;
    invoiceNumber?: string | null;
    payer?: string | null;
    reviewRequired?: boolean;
    /** Account-level billing fields by IDP field name (first value found). */
    fields?: Record<string, string | null>;
    /** v3: account totals and one entry per customer invoice / patient of the account. */
    version?: number;
    providerTaxId?: string | null;
    invoiceCount?: number;
    patientCount?: number;
    totalBilled?: number;
    currency?: string | null;
    documentCount?: number;
    unassignedDocumentIds?: string[];
    progress?: Partial<Record<AccountValidationStep, { done: number; total: number; blocking: number }>>;
    patients?: AccountSummaryPatient[];
}

export type AccountValidationStep = 'documents' | 'rules' | 'analysis';
export type AccountValidationState = 'pending' | 'ok' | 'attention' | 'blocking';

/**
 * v3 entry of one customer invoice (see docs/automate/account-summary.script.js). Keys follow
 * `idp/idp-account-mapping.util.ts`; demographics feed the patient view.
 */
export interface AccountSummaryPatient {
    key: string;
    invoice: Partial<Record<InvoiceKey, string | null>>;
    totals: Partial<Record<TotalKey, number | null>>;
    currency?: string | null;
    serviceLines?: number;
    servicesTotal?: number;
    patient: Partial<Record<PatientKey, string | null>>;
    documentIds: string[];
    documentCount: number;
    documentClasses?: Record<string, number>;
    reviewRequired: boolean;
    rejected?: boolean;
    validations: Partial<Record<AccountValidationStep, AccountValidationState>>;
}

const summaryCache = new Map<string, AccountSummary | null>();

/** Parses the configured summary variable of a row (object or JSON string), cached. */
export function rowAccountSummary(row: Record<string, unknown>, ctx: ProviderVariableContext = DEFAULT_PROVIDER_CONTEXT): AccountSummary | null {
    const raw = ctx.summaryVariable ? row[`var_${ctx.summaryVariable}`] : null;
    if (!raw) {
        return null;
    }
    if (typeof raw === 'object') {
        return raw as AccountSummary;
    }
    const text = String(raw);
    const cached = summaryCache.get(text);
    if (cached !== undefined) {
        return cached;
    }
    let summary: AccountSummary | null = null;
    try {
        const value: unknown = JSON.parse(text);
        summary = value && typeof value === 'object' ? (value as AccountSummary) : null;
    } catch {
        summary = null;
    }
    if (summaryCache.size >= PARSED_BATCH_CACHE_LIMIT) {
        const oldest = summaryCache.keys().next().value;
        if (oldest !== undefined) {
            summaryCache.delete(oldest);
        }
    }
    summaryCache.set(text, summary);
    return summary;
}

/** Provider, invoice and review state of a row: from the summary when available, else the IDP variable. */
export function rowIdentity(row: Record<string, unknown>, ctx: ProviderVariableContext = DEFAULT_PROVIDER_CONTEXT): BatchBillingIdentity {
    const summary = rowAccountSummary(row, ctx);
    if (summary) {
        return {
            providerName: summary.provider?.trim() || null,
            invoiceNumber: summary.invoiceNumber?.trim() || null,
            reviewRequired: !!summary.reviewRequired,
        };
    }
    return extractBatchBillingIdentity(row[`var_${ctx.idpVariable}`]);
}

/**
 * Group name for one flattened process row (`var_<name>` columns). `undefined` means "use the
 * provider of the row" (summary or IDP aliases); null means the row has no value (unidentified).
 */
export function resolveGroupName(
    row: Record<string, unknown>,
    groupBy?: ProviderGroupBy | null,
    ctx: ProviderVariableContext = DEFAULT_PROVIDER_CONTEXT
): string | null | undefined {
    const name = groupBy?.name?.trim();
    if (!groupBy || (groupBy.source === 'batch-field' && !name)) {
        return undefined;
    }
    if (!name) {
        return null;
    }
    if (groupBy.source === 'process-variable') {
        const value = row[`var_${name}`];
        if (value === null || value === undefined || typeof value === 'object') {
            return null;
        }
        const text = String(value).trim();
        return text || null;
    }
    const variable = groupBy.variable?.trim() || ctx.idpVariable;
    const summaryFields = variable === ctx.idpVariable ? rowAccountSummary(row, ctx)?.fields : undefined;
    if (summaryFields) {
        const wanted = normalizeKey(name);
        const match = Object.entries(summaryFields).find(([field]) => normalizeKey(field) === wanted);
        if (match) {
            return match[1]?.trim() || null;
        }
    }
    return readBatchFieldValue(row[`var_${variable}`], name);
}

export interface ProviderCardMetric {
    id: string;
    label: string;
    kind: 'count' | 'status' | 'field-equals' | 'review-required' | 'sum';
    status?: string;
    field?: ProviderGroupBy;
    equals?: string;
}

export interface ProviderCard {
    key: string;
    /** Display name; null for the unidentified group. */
    name: string | null;
    total: number;
    /** Metric id -> value. */
    values: Record<string, number>;
}

const LEGACY_KPI_METRICS: Record<ProviderKpiKey, Omit<ProviderCardMetric, 'label'>> = {
    running: { id: 'running', kind: 'status', status: 'RUNNING' },
    completed: { id: 'completed', kind: 'status', status: 'COMPLETED' },
    cancelled: { id: 'cancelled', kind: 'status', status: 'CANCELLED' },
    total: { id: 'total', kind: 'count' },
    reviewRequired: { id: 'reviewRequired', kind: 'review-required' },
};

/** Configured metrics, or the legacy KPI keys converted to metrics (labels via `legacyLabel`). */
export function resolveProviderMetrics(
    options: { metrics?: readonly ProviderCardMetric[] | null; kpis?: readonly string[] | null } | null | undefined,
    legacyLabel: (key: ProviderKpiKey) => string = (key) => key
): ProviderCardMetric[] {
    const metrics = (options?.metrics ?? []).filter((metric) => !!metric?.id && !!metric.kind);
    if (metrics.length) {
        return metrics.map((metric) => ({ ...metric }));
    }
    return resolveProviderKpiKeys(options?.kpis).map((key) => ({ ...LEGACY_KPI_METRICS[key], label: legacyLabel(key) }));
}

/** Group name of a flattened row: the configured field, or the provider (summary or IDP variable). */
export function rowGroupName(
    row: Record<string, unknown>,
    groupBy?: ProviderGroupBy | null,
    ctx: ProviderVariableContext = DEFAULT_PROVIDER_CONTEXT
): string | null {
    const resolved = resolveGroupName(row, groupBy, ctx);
    return resolved === undefined ? rowIdentity(row, ctx).providerName : resolved;
}

function sameText(left: unknown, right: unknown): boolean {
    const key = normalizeKey(left);
    return key !== '' && key === normalizeKey(right);
}

/** Value of one metric for one row (counts return 0/1). */
export function metricRowValue(
    row: Record<string, unknown>,
    metric: ProviderCardMetric,
    ctx: ProviderVariableContext = DEFAULT_PROVIDER_CONTEXT
): number {
    switch (metric.kind) {
        case 'count':
            return 1;
        case 'status':
            return sameText(row['status'], metric.status) ? 1 : 0;
        case 'review-required':
            return rowIdentity(row, ctx).reviewRequired ? 1 : 0;
        case 'field-equals': {
            const value = metric.field ? resolveGroupName(row, metric.field, ctx) : null;
            return sameText(value, metric.equals) ? 1 : 0;
        }
        case 'sum': {
            const value = metric.field ? resolveGroupName(row, metric.field, ctx) : null;
            if (value === undefined || value === null) {
                return 0;
            }
            const number = Number(String(value).replace(/[^0-9.-]/g, ''));
            return Number.isFinite(number) ? number : 0;
        }
        default:
            return 0;
    }
}

/** One card per group value (largest first, unidentified last) with every metric computed. */
export function buildProviderCards(
    rows: ReadonlyArray<Record<string, unknown>>,
    groupBy: ProviderGroupBy | null | undefined,
    metrics: readonly ProviderCardMetric[],
    ctx: ProviderVariableContext = DEFAULT_PROVIDER_CONTEXT
): ProviderCard[] {
    const cards = new Map<string, ProviderCard>();
    for (const row of rows) {
        const name = rowGroupName(row, groupBy, ctx);
        const key = providerGroupKey(name);
        let card = cards.get(key);
        if (!card) {
            card = { key, name: key === UNIDENTIFIED_PROVIDER_KEY ? null : name, total: 0, values: {} };
            for (const metric of metrics) {
                card.values[metric.id] = 0;
            }
            cards.set(key, card);
        }
        card.total += 1;
        for (const metric of metrics) {
            card.values[metric.id] += metricRowValue(row, metric, ctx);
        }
    }
    return [...cards.values()].sort((a, b) => {
        if (a.key === UNIDENTIFIED_PROVIDER_KEY) {
            return 1;
        }
        if (b.key === UNIDENTIFIED_PROVIDER_KEY) {
            return -1;
        }
        return b.total - a.total || String(a.name).localeCompare(String(b.name));
    });
}

/** Process variables (task/process) as a flattened row usable by the grouping helpers. */
export function variablesToRow(
    variables: Record<string, unknown> | null | undefined,
    status?: string | null
): Record<string, unknown> {
    const row: Record<string, unknown> = { status: status ?? null };
    for (const [name, value] of Object.entries(variables ?? {})) {
        row[`var_${name}`] = value;
    }
    return row;
}

/** True when the row belongs to the selected card. */
export function rowMatchesCard(
    row: Record<string, unknown>,
    groupBy: ProviderGroupBy | null | undefined,
    key: string,
    ctx: ProviderVariableContext = DEFAULT_PROVIDER_CONTEXT
): boolean {
    return providerGroupKey(rowGroupName(row, groupBy, ctx)) === key;
}

/**
 * Process variables a filter-cards widget reads, derived from its configuration (grouping, metrics,
 * IDP and summary variables). The data planner requests exactly these names.
 */
export function providerRequiredVariables(
    options:
        | {
              groupBy?: ProviderGroupBy | null;
              metrics?: readonly ProviderCardMetric[] | null;
              kpis?: readonly string[] | null;
              idpVariable?: string | null;
              summaryVariable?: string | null;
          }
        | null
        | undefined
): string[] {
    const ctx = resolveProviderContext(options);
    const names = new Set<string>();
    const addField = (field?: ProviderGroupBy | null) => {
        const name = field?.name?.trim();
        if (field?.source === 'process-variable') {
            if (name) {
                names.add(name);
            }
            return;
        }
        names.add(field?.variable?.trim() || ctx.idpVariable);
    };
    const groupBy = options?.groupBy;
    if (groupBy?.source === 'process-variable' && groupBy.name?.trim()) {
        names.add(groupBy.name.trim());
    } else {
        addField(groupBy ?? { source: 'batch-field' });
    }
    for (const metric of resolveProviderMetrics(options)) {
        if (metric.kind === 'review-required') {
            names.add(ctx.idpVariable);
        } else if (metric.kind === 'field-equals' || metric.kind === 'sum') {
            addField(metric.field);
        }
    }
    if (ctx.summaryVariable) {
        names.add(ctx.summaryVariable);
    }
    return [...names].sort();
}

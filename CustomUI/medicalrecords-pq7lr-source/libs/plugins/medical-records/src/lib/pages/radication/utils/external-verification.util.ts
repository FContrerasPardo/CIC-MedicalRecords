/**
 * Simulated interoperability (`docs/propuesta-preanalisis-interoperabilidad.md` §2): the checks a
 * provider or the ARS would run against external systems while the pre-analysis runs. Concept of
 * CIC-Fin's bureau checks (`components/external-checks/external-checks-animation.component.ts`),
 * generalized: several systems, per-channel visibility and a result per invoice.
 *
 * v1 has no real integration: the mock adapters answer every invoice as verified, and each system
 * shows the validation types it runs while it queries. The demo never shows a failed external check:
 * the provider would have nothing to fix. Pure logic only.
 */

export type ExternalVerificationKey = 'affiliation' | 'authorization' | 'contract' | 'priorClaims' | 'providerHis';
export type ExternalVerificationChannel = 'provider' | 'ars';
export type ExternalVerificationMode = 'simulated' | 'real';
/** `no_response` only when a system has no adapter or its adapter failed. */
export type ExternalVerificationStatus = 'ok' | 'no_response';
export type ExternalCheckRowState = 'querying' | ExternalVerificationStatus;
/** One validation type of a system while its row runs: waiting, being checked, or verified. */
export type ExternalValidationState = 'pending' | 'checking' | 'ok';

export interface InvoiceRef {
    invoiceNumber: string;
    /** Synthetic, non-identifying patient reference (never the patient's name or id). */
    patientRef: string;
}

export interface ExternalVerificationQuery {
    providerId: string;
    invoices: InvoiceRef[];
}

export interface ExternalVerificationItem {
    invoiceNumber: string;
    patientRef: string;
    status: ExternalVerificationStatus;
    detailKey: string;
    data?: Record<string, unknown>;
}

export interface ExternalVerificationResult {
    key: ExternalVerificationKey;
    mode: ExternalVerificationMode;
    status: ExternalVerificationStatus;
    items: ExternalVerificationItem[];
    checkedAt: string;
}

export interface ExternalCheckDefinition {
    key: ExternalVerificationKey;
    icon: string;
    labelKey: string;
    mode: ExternalVerificationMode;
    /** Time the visual query takes before the row can show its result. */
    durationMs: number;
    /** i18n keys of the validation types the system runs, in the order the animation checks them. */
    validationKeys: readonly string[];
}

interface SystemSpec {
    icon: string;
    labelKey: string;
    durationMs: number;
    channels: { provider: boolean; ars: boolean };
    okKey: string;
    validationKeys: readonly string[];
}

const KEY = 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS';

/** Systems and channels, as the design table: prior claims only for the ARS, HIS only when authorized. */
const SYSTEMS: Record<ExternalVerificationKey, SystemSpec> = {
    affiliation: {
        icon: 'verified_user',
        labelKey: `${KEY}.SYSTEMS.AFFILIATION`,
        durationMs: 2600,
        channels: { provider: true, ars: true },
        okKey: `${KEY}.DETAIL.AFFILIATION_OK`,
        validationKeys: [`${KEY}.VALIDATIONS.AFFILIATION_ACTIVE`, `${KEY}.VALIDATIONS.AFFILIATION_PLAN`, `${KEY}.VALIDATIONS.AFFILIATION_COPAY`],
    },
    authorization: {
        icon: 'approval',
        labelKey: `${KEY}.SYSTEMS.AUTHORIZATION`,
        durationMs: 3800,
        channels: { provider: true, ars: true },
        okKey: `${KEY}.DETAIL.AUTHORIZATION_OK`,
        validationKeys: [`${KEY}.VALIDATIONS.AUTHORIZATION_PRIOR`, `${KEY}.VALIDATIONS.AUTHORIZATION_VALIDITY`, `${KEY}.VALIDATIONS.AUTHORIZATION_MATCH`],
    },
    contract: {
        icon: 'request_quote',
        labelKey: `${KEY}.SYSTEMS.CONTRACT`,
        durationMs: 5000,
        channels: { provider: true, ars: true },
        okKey: `${KEY}.DETAIL.CONTRACT_OK`,
        validationKeys: [`${KEY}.VALIDATIONS.CONTRACT_TARIFF`, `${KEY}.VALIDATIONS.CONTRACT_VARIATION`, `${KEY}.VALIDATIONS.CONTRACT_SERVICES`],
    },
    // ARS channel only (not shown on the provider's radication).
    priorClaims: {
        icon: 'content_copy',
        labelKey: `${KEY}.SYSTEMS.PRIOR_CLAIMS`,
        durationMs: 6000,
        channels: { provider: false, ars: true },
        okKey: `${KEY}.DETAIL.PRIOR_CLAIMS_OK`,
        validationKeys: [],
    },
    providerHis: {
        icon: 'local_hospital',
        labelKey: `${KEY}.SYSTEMS.PROVIDER_HIS`,
        durationMs: 6800,
        channels: { provider: false, ars: true },
        okKey: `${KEY}.DETAIL.PROVIDER_HIS_OK`,
        validationKeys: [],
    },
};

export const EXTERNAL_VERIFICATION_KEYS: readonly ExternalVerificationKey[] = ['affiliation', 'authorization', 'contract', 'priorClaims', 'providerHis'];

/** Detail shown when a system did not return items (no invoices or no adapter). */
export const EXTERNAL_CHECKS_NO_DATA_KEY = `${KEY}.DETAIL.NO_DATA`;

export interface ExternalChecksOptions {
    /** The provider's HIS can be queried (explicit, authorized access). Off by default. */
    hisAuthorized?: boolean;
}

/** Checks visible on a channel, in display order. All simulated in v1. */
export function externalChecksFor(channel: ExternalVerificationChannel, options: ExternalChecksOptions = {}): ExternalCheckDefinition[] {
    return EXTERNAL_VERIFICATION_KEYS.filter((key) => {
        if (key === 'providerHis') {
            return !!options.hisAuthorized && SYSTEMS[key].channels[channel];
        }
        return SYSTEMS[key].channels[channel];
    }).map((key) => {
        const spec = SYSTEMS[key];
        return { key, icon: spec.icon, labelKey: spec.labelKey, mode: 'simulated', durationMs: spec.durationMs, validationKeys: spec.validationKeys };
    });
}

/** No items (nothing to answer) or an item without answer → `no_response`; otherwise `ok`. */
export function aggregateVerificationStatus(items: readonly { status: ExternalVerificationStatus }[]): ExternalVerificationStatus {
    return !items.length || items.some((item) => item.status === 'no_response') ? 'no_response' : 'ok';
}

/** Result of the mock adapter of a system: one verified item per invoice. */
export function buildSimulatedVerification(key: ExternalVerificationKey, query: ExternalVerificationQuery, checkedAt: string): ExternalVerificationResult {
    const items = query.invoices.map(
        (invoice): ExternalVerificationItem => ({ invoiceNumber: invoice.invoiceNumber, patientRef: invoice.patientRef, status: 'ok', detailKey: SYSTEMS[key].okKey })
    );
    return { key, mode: 'simulated', status: aggregateVerificationStatus(items), items, checkedAt };
}

/**
 * Invoices to query: the account's invoices when `batchState` was read, else synthetic references
 * from a count (or one) so the simulation still has something to show.
 */
export function externalVerificationInvoices(
    invoices: readonly { invoiceNumber: string | null }[] | null | undefined,
    fallbackCount = 0,
    seed = 'ACCOUNT'
): InvoiceRef[] {
    const known = (invoices ?? []).map((invoice) => (invoice.invoiceNumber ?? '').trim()).filter(Boolean);
    if (known.length) {
        return known.map((invoiceNumber, index) => ({ invoiceNumber, patientRef: `P-${index + 1}` }));
    }
    const count = Math.max(1, Math.floor(fallbackCount));
    return Array.from({ length: count }, (_, index) => ({ invoiceNumber: `${seed}-${index + 1}`, patientRef: `P-${index + 1}` }));
}

export interface ExternalCheckRow {
    definition: ExternalCheckDefinition;
    state: ExternalCheckRowState;
    result: ExternalVerificationResult | null;
}

export interface ExternalCheckClock {
    /** Time since the checks started. */
    elapsedMs: number;
    results: Partial<Record<ExternalVerificationKey, ExternalVerificationResult>>;
    /** False holds the last row in "querying" (the pre-analysis has not finished yet). */
    released: boolean;
}

/**
 * Row state machine: a row stays `querying` until its animation time passed and its adapter answered;
 * the last row also waits for `released`. Then it shows the result's status.
 */
export function deriveExternalCheckRows(definitions: readonly ExternalCheckDefinition[], clock: ExternalCheckClock): ExternalCheckRow[] {
    return definitions.map((definition, index) => {
        const result = clock.results[definition.key] ?? null;
        const isLast = index === definitions.length - 1;
        const resolved = !!result && clock.elapsedMs >= definition.durationMs && (!isLast || clock.released);
        return { definition, state: resolved && result ? result.status : 'querying', result: resolved ? result : null };
    });
}

/**
 * Validation types of a row as the animation advances: verified one by one over the row's time;
 * while the row is querying its last type stays `checking` (it waits for the result and, on the last
 * row, for the pre-analysis). Once the row shows its result, every type is verified.
 */
export function deriveValidationStates(row: ExternalCheckRow, elapsedMs: number): ExternalValidationState[] {
    const keys = row.definition.validationKeys;
    if (row.state !== 'querying') {
        return keys.map(() => 'ok');
    }
    const step = row.definition.durationMs / Math.max(1, keys.length);
    const done = keys.map((_, index) => index < keys.length - 1 && elapsedMs >= step * (index + 1));
    const checking = done.indexOf(false);
    return keys.map((_, index) => (done[index] ? 'ok' : index === checking ? 'checking' : 'pending'));
}

/** Every row shows its result: the timer can stop. */
export function externalChecksSettled(rows: readonly ExternalCheckRow[]): boolean {
    return rows.every((row) => row.state !== 'querying');
}

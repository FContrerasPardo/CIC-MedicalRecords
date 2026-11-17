/**
 * Simulated interoperability (`docs/propuesta-preanalisis-interoperabilidad.md` §2): the checks a
 * provider or the ARS would run against external systems while the pre-analysis runs. Concept of
 * CIC-Fin's bureau checks (`components/external-checks/external-checks-animation.component.ts`),
 * generalized: several systems, per-channel visibility and a result per invoice.
 *
 * v1 has no real integration: the mock adapters derive a deterministic, synthetic result from a hash
 * of the invoice number, so the same invoice always shows the same outcome. Pure logic only.
 */

export type ExternalVerificationKey = 'affiliation' | 'authorization' | 'contract' | 'priorClaims' | 'providerHis';
export type ExternalVerificationChannel = 'provider' | 'ars';
export type ExternalVerificationMode = 'simulated' | 'real';
export type ExternalVerificationStatus = 'ok' | 'alert' | 'inconsistency' | 'no_response';
export type ExternalCheckRowState = 'querying' | ExternalVerificationStatus;

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
}

interface SystemSpec {
    icon: string;
    labelKey: string;
    durationMs: number;
    channels: { provider: boolean; ars: boolean };
    /** Status of a non-ok synthetic result for this system. */
    issue: Exclude<ExternalVerificationStatus, 'ok'>;
    okKey: string;
    issueKey: string;
}

/** Systems and channels, as the design table: prior claims only for the ARS, HIS only when authorized. */
const SYSTEMS: Record<ExternalVerificationKey, SystemSpec> = {
    affiliation: {
        icon: 'verified_user',
        labelKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.SYSTEMS.AFFILIATION',
        durationMs: 2600,
        channels: { provider: true, ars: true },
        issue: 'alert',
        okKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.AFFILIATION_OK',
        issueKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.AFFILIATION_ALERT',
    },
    authorization: {
        icon: 'approval',
        labelKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.SYSTEMS.AUTHORIZATION',
        durationMs: 3800,
        channels: { provider: true, ars: true },
        issue: 'alert',
        okKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.AUTHORIZATION_OK',
        issueKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.AUTHORIZATION_ALERT',
    },
    contract: {
        icon: 'request_quote',
        labelKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.SYSTEMS.CONTRACT',
        durationMs: 5000,
        channels: { provider: true, ars: true },
        issue: 'inconsistency',
        okKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.CONTRACT_OK',
        issueKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.CONTRACT_INCONSISTENCY',
    },
    priorClaims: {
        icon: 'content_copy',
        labelKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.SYSTEMS.PRIOR_CLAIMS',
        durationMs: 6000,
        channels: { provider: false, ars: true },
        issue: 'alert',
        okKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.PRIOR_CLAIMS_OK',
        issueKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.PRIOR_CLAIMS_ALERT',
    },
    providerHis: {
        icon: 'local_hospital',
        labelKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.SYSTEMS.PROVIDER_HIS',
        durationMs: 6800,
        channels: { provider: false, ars: true },
        issue: 'no_response',
        okKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.PROVIDER_HIS_OK',
        issueKey: 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.PROVIDER_HIS_NO_RESPONSE',
    },
};

export const EXTERNAL_VERIFICATION_KEYS: readonly ExternalVerificationKey[] = ['affiliation', 'authorization', 'contract', 'priorClaims', 'providerHis'];

/** Detail shown when a system did not return items (no invoices or no adapter). */
export const EXTERNAL_CHECKS_NO_DATA_KEY = 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.NO_DATA';

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
    }).map((key) => ({ key, icon: SYSTEMS[key].icon, labelKey: SYSTEMS[key].labelKey, mode: 'simulated', durationMs: SYSTEMS[key].durationMs }));
}

/** FNV-1a 32-bit hash: stable across runs and browsers. */
export function hashText(text: string): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}

/** Deterministic synthetic outcome of one system for one invoice: about 7 in 10 come back ok. */
export function simulatedItemStatus(key: ExternalVerificationKey, invoiceNumber: string): ExternalVerificationStatus {
    return hashText(`${key}:${invoiceNumber.trim().toUpperCase()}`) % 10 < 7 ? 'ok' : SYSTEMS[key].issue;
}

const SEVERITY: Record<ExternalVerificationStatus, number> = { ok: 0, no_response: 1, alert: 2, inconsistency: 3 };

/** Worst status of the items; no items means the system had nothing to answer. */
export function aggregateVerificationStatus(items: readonly { status: ExternalVerificationStatus }[]): ExternalVerificationStatus {
    if (!items.length) {
        return 'no_response';
    }
    return items.reduce<ExternalVerificationStatus>((worst, item) => (SEVERITY[item.status] > SEVERITY[worst] ? item.status : worst), 'ok');
}

/** Result of the mock adapter of a system: one item per invoice, derived from its number. */
export function buildSimulatedVerification(key: ExternalVerificationKey, query: ExternalVerificationQuery, checkedAt: string): ExternalVerificationResult {
    const items = query.invoices.map((invoice): ExternalVerificationItem => {
        const status = simulatedItemStatus(key, invoice.invoiceNumber);
        return {
            invoiceNumber: invoice.invoiceNumber,
            patientRef: invoice.patientRef,
            status,
            detailKey: status === 'ok' ? SYSTEMS[key].okKey : SYSTEMS[key].issueKey,
        };
    });
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

/** Every row shows its result: the timer can stop. */
export function externalChecksSettled(rows: readonly ExternalCheckRow[]): boolean {
    return rows.every((row) => row.state !== 'querying');
}

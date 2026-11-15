import { IdpDocument, mapIdpAccount, MappedAccount, PatientKey } from '../../../idp/idp-account-mapping.util';

/**
 * A medical account can bring one or many customer invoices, one per patient. The IDP account
 * mapping (`idp/idp-account-mapping.util.ts`) groups the batchState: each invoice document is one
 * patient and the supporting documents join it. Pure module: no Angular imports.
 */
export interface CaseInvoiceOption {
    key: string;
    patientName: string | null;
    invoiceNumber: string | null;
    /** The invoice document plus its supporting documents. */
    documentIds: string[];
    documentCount: number;
    totalBilled: number | null;
    currency: string | null;
    /** Some document of the invoice is pending IDP review. */
    needsReview: boolean;
    /** Patient demographics read from the invoice and its supporting documents. */
    patient: Record<PatientKey, string | null>;
}

/** Account identifier shown above the invoices: who bills, who pays, how many invoices and how much. */
export interface CaseAccountSummary {
    provider: string | null;
    providerTaxId: string | null;
    payer: string | null;
    invoiceCount: number;
    documentCount: number;
    totalBilled: number | null;
    currency: string | null;
    reviewRequired: boolean;
    /** Supporting documents not tied to any patient of a multi-invoice account. */
    unassignedCount: number;
}

/** `none`: no invoice found; `direct`: a single invoice, opened without asking; `select`: the user picks one. */
export type CaseInvoiceMode = 'none' | 'direct' | 'select';

export interface CaseInvoiceSelection {
    mode: CaseInvoiceMode;
    options: CaseInvoiceOption[];
    selected: CaseInvoiceOption | null;
}

export interface CaseAccountView {
    account: CaseAccountSummary;
    invoices: CaseInvoiceOption[];
}

type BatchStateLike = { documents?: unknown[] } | null;

function toAccountView(mapped: MappedAccount, documentCount: number): CaseAccountView {
    const invoices = mapped.invoices.map((entry) => {
        const docs = [entry.invoice, ...entry.supporting];
        return {
            key: entry.key,
            patientName: entry.patient.name,
            invoiceNumber: entry.invoice.invoice.invoiceNumber,
            documentIds: docs.map((doc) => doc.id).filter(Boolean),
            documentCount: docs.length,
            totalBilled: entry.invoice.totals.billed,
            currency: entry.invoice.currency,
            needsReview: docs.some((doc) => doc.reviewRequired),
            patient: entry.patient,
        };
    });
    const first = (pick: (index: number) => string | null) => {
        for (let index = 0; index < mapped.invoices.length; index += 1) {
            const value = pick(index);
            if (value) {
                return value;
            }
        }
        return null;
    };
    const totals = invoices.map((invoice) => invoice.totalBilled).filter((value): value is number => value !== null);
    return {
        account: {
            provider: first((index) => mapped.invoices[index].invoice.invoice.provider),
            providerTaxId: first((index) => mapped.invoices[index].invoice.invoice.providerTaxId),
            payer: first((index) => mapped.invoices[index].invoice.invoice.payer),
            invoiceCount: invoices.length,
            documentCount,
            totalBilled: totals.length ? Math.round(totals.reduce((sum, value) => sum + value, 0) * 100) / 100 : null,
            currency: invoices.find((invoice) => invoice.currency)?.currency ?? null,
            reviewRequired: invoices.some((invoice) => invoice.needsReview) || mapped.unassigned.some((doc) => doc.reviewRequired),
            unassignedCount: mapped.unassigned.length,
        },
        invoices,
    };
}

/** Account identifier and its customer invoices, from the IDP batchState. */
export function buildCaseAccountView(batchState: BatchStateLike): CaseAccountView {
    const documents = (batchState?.documents ?? []) as IdpDocument[];
    return toAccountView(mapIdpAccount({ documents }), documents.filter(Boolean).length);
}

export function listCaseInvoices(batchState: BatchStateLike): CaseInvoiceOption[] {
    return batchState ? buildCaseAccountView(batchState).invoices : [];
}

/**
 * One invoice opens directly; with several, the requested one (from the URL) is shown and,
 * if none is requested or it no longer exists, the selector is shown first.
 */
export function resolveInvoiceSelection(options: CaseInvoiceOption[], requestedKey: string | null | undefined): CaseInvoiceSelection {
    if (options.length === 0) {
        return { mode: 'none', options, selected: null };
    }
    if (options.length === 1) {
        return { mode: 'direct', options, selected: options[0] };
    }
    return { mode: 'select', options, selected: options.find((option) => option.key === requestedKey) ?? null };
}

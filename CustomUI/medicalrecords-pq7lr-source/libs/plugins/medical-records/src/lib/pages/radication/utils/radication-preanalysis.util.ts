import { normalizeKey } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';
import { IdpDocument, mapIdpAccount } from '../../../idp/idp-account-mapping.util';
import { ChecklistRisk, DocumentationChecklist, evaluateChecklist } from '../../agreements/checklist/documentation-checklist.util';
import { MULTI_INVOICE_PROFILE, SINGLE_INVOICE_PROFILE } from './radication-policy.util';

/**
 * Pre-analysis of documentary consistency for the provider's pre-radication: the agreement's
 * documentary checklist (`evaluateChecklist`) against the document classes extracted by IDP
 * (`batchState`, grouped with `mapIdpAccount`). Documentary consistency only: no line-by-line review
 * of the invoice. There is no dedicated agent yet, so the result is labelled as a pre-analysis.
 * Pure module: no Angular imports.
 */

export type PreanalysisFindingKind = 'MISSING_DOCUMENTS' | 'NO_INVOICE' | 'REVIEW_REQUIRED' | 'REJECTED' | 'UNASSIGNED';
export type PreanalysisStatus = 'complete' | 'inconsistent' | 'missing';

export interface PreanalysisFinding {
    /** Stable id, also the key of the provider's comment. */
    id: string;
    kind: PreanalysisFindingKind;
    risk: ChecklistRisk;
    ruleId: string | null;
    /** Rule description or document class, shown as the finding's subject. */
    subject: string;
    /** Missing document classes (MISSING_DOCUMENTS) or affected document classes. */
    documents: string[];
    /** batchState ids of the affected documents (to preview them); empty for missing documents. */
    documentIds: string[];
    /** Invoice group (`CaseInvoiceOption.key`) of the affected documents, when there is one. */
    invoiceKey: string | null;
}

export interface PreanalysisRuleView {
    ruleId: string;
    description: string;
    risk: ChecklistRisk;
    present: string[];
    missing: string[];
    status: 'ok' | 'missing';
}

export interface RadicationPreanalysis {
    status: PreanalysisStatus;
    invoiceCount: number;
    patientCount: number;
    documentCount: number;
    /** Extracted document classes with how many documents each. */
    documentClasses: Array<{ className: string; count: number }>;
    rules: PreanalysisRuleView[];
    findings: PreanalysisFinding[];
}

type BatchStateLike = { documents?: unknown[] } | null | undefined;

const RISK_ORDER: Record<ChecklistRisk, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function distinct(values: Array<string | null | undefined>): string[] {
    const seen = new Map<string, string>();
    for (const value of values) {
        const text = value?.trim();
        if (text && !seen.has(normalizeKey(text))) {
            seen.set(normalizeKey(text), text);
        }
    }
    return [...seen.values()];
}

export function buildRadicationPreanalysis(checklist: DocumentationChecklist, batchState: BatchStateLike): RadicationPreanalysis {
    const raw = ((batchState?.documents ?? []) as IdpDocument[]).filter(Boolean);
    const account = mapIdpAccount({ documents: raw });
    const documents = [...account.invoices.flatMap((invoice) => [invoice.invoice, ...invoice.supporting]), ...account.unassigned];

    const counts = new Map<string, { className: string; count: number }>();
    for (const document of documents) {
        const className = document.className.trim() || '—';
        const entry = counts.get(normalizeKey(className)) ?? { className, count: 0 };
        entry.count++;
        counts.set(normalizeKey(className), entry);
    }
    const lines = documents.flatMap((document) => document.services);
    const evaluations = evaluateChecklist(checklist, {
        procedureCodes: distinct(lines.map((line) => line.code)),
        serviceCategories: distinct(lines.map((line) => line.service)),
        documentClasses: distinct(documents.map((document) => document.className)),
        // Same profile the policy picks: rules of the other profile (e.g. MIO-* for one invoice) are skipped.
        profile: account.invoices.length >= 2 ? MULTI_INVOICE_PROFILE : account.invoices.length === 1 ? SINGLE_INVOICE_PROFILE : null,
    });
    const descriptions = new Map(checklist.rules.map((rule) => [rule.ruleId, rule.description]));
    const rules: PreanalysisRuleView[] = evaluations.map((evaluation) => ({ ...evaluation, description: descriptions.get(evaluation.ruleId) ?? evaluation.ruleId }));

    const invoiceOf = new Map(account.invoices.flatMap((invoice) => [invoice.invoice, ...invoice.supporting].map((document) => [document, invoice.key] as const)));
    const findings: PreanalysisFinding[] = [];
    if (!account.invoices.length) {
        findings.push({ id: 'account:no-invoice', kind: 'NO_INVOICE', risk: 'HIGH', ruleId: null, subject: '', documents: [], documentIds: [], invoiceKey: null });
    }
    for (const rule of rules.filter((item) => item.status === 'missing')) {
        findings.push({
            id: `rule:${rule.ruleId}`,
            kind: 'MISSING_DOCUMENTS',
            risk: rule.risk,
            ruleId: rule.ruleId,
            subject: rule.description,
            documents: rule.missing,
            documentIds: [],
            invoiceKey: null,
        });
    }
    for (const document of documents) {
        const affected = { subject: document.className, documents: [document.className], documentIds: document.id ? [document.id] : [], invoiceKey: invoiceOf.get(document) ?? null };
        if (document.rejected) {
            findings.push({ id: `document:${document.id}:rejected`, kind: 'REJECTED', risk: 'HIGH', ruleId: null, ...affected });
        } else if (document.reviewRequired) {
            findings.push({ id: `document:${document.id}:review`, kind: 'REVIEW_REQUIRED', risk: 'MEDIUM', ruleId: null, ...affected });
        }
    }
    if (account.unassigned.length) {
        findings.push({
            id: 'account:unassigned',
            kind: 'UNASSIGNED',
            risk: 'LOW',
            ruleId: null,
            subject: '',
            documents: distinct(account.unassigned.map((document) => document.className)),
            documentIds: account.unassigned.map((document) => document.id).filter(Boolean),
            invoiceKey: null,
        });
    }
    findings.sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]);

    const missing = findings.some((finding) => finding.kind === 'MISSING_DOCUMENTS' || finding.kind === 'NO_INVOICE');
    return {
        status: missing ? 'missing' : findings.length ? 'inconsistent' : 'complete',
        invoiceCount: account.invoices.length,
        patientCount: distinct(account.invoices.map((invoice) => invoice.patient.identification ?? invoice.patient.name ?? invoice.key)).length,
        documentCount: documents.length,
        documentClasses: [...counts.values()].sort((a, b) => b.count - a.count || a.className.localeCompare(b.className)),
        rules,
        findings,
    };
}

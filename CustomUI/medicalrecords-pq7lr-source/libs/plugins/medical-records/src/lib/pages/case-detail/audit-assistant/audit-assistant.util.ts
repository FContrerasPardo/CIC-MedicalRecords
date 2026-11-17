/**
 * Pure logic for the auditor's Knowledge Discovery (KD) assistant (#148).
 *
 * Ported from CIC-Fin (`agentic-bank/services/shared-app-config.ts`): KD is reached through a
 * URL stored in the shared Appdata `config.json` (`knowledgeDiscovery.url`, https only). The
 * plugin never calls a KD API nor fabricates answers: it prepares the question with the
 * account context and hands it to the KD agent, where the answer is produced.
 */

export const KD_I18N = 'MEDICAL_RECORDS.AUDIT_ASSISTANT';

/** Same shape as CIC-Fin's shared config; unknown keys are kept untouched. */
export interface SharedAppConfig extends Record<string, unknown> {
    schemaVersion?: number;
    knowledgeDiscovery?: Record<string, unknown> & { url?: string };
}

export type KnowledgeDiscoveryState =
    | { status: 'configured'; url: string }
    /** No config file or no `knowledgeDiscovery.url`: KD is not set up in this environment. */
    | { status: 'not-configured' }
    /** The file exists but is not valid JSON, has an unknown schema or a non-https URL. */
    | { status: 'invalid' };

export interface AuditFinding {
    /** Stable id, used for tracking only. */
    id?: string | null;
    /** Glosa / finding code, e.g. `FAC-03`. */
    code?: string | null;
    title: string;
    /** Agent that raised it (Coding Integrity, Compliance Alert, Financial Variance…). */
    source?: string | null;
    amount?: number | null;
}

/** Context the host (Audit & glosas tab) passes in. Synthetic references only, never PHI. */
export interface AuditAssistantContext {
    radicationId?: string | null;
    invoiceNumber?: string | null;
    /** Patient reference (record number), not the patient's name. */
    patientRef?: string | null;
    providerName?: string | null;
    agreementName?: string | null;
    findings?: readonly AuditFinding[] | null;
    providerComments?: readonly string[] | string | null;
}

export interface SuggestedQuestion {
    id: string;
    /** Translation key under `MEDICAL_RECORDS.AUDIT_ASSISTANT.QUESTIONS`. */
    key: string;
    params: Record<string, string>;
}

/** Labels (already translated) used to render the context block sent to KD. */
export interface PromptLabels {
    context: string;
    radication: string;
    invoice: string;
    patient: string;
    provider: string;
    agreement: string;
    findings: string;
    providerComments: string;
    question: string;
}

/** Validates a KD URL like CIC-Fin's `discoveryUrl`: https, host present, no credentials. */
export function knowledgeDiscoveryUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) {
        return null;
    }
    try {
        const url = new URL(value.trim());
        if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
            return null;
        }
        return value.trim();
    } catch {
        return null;
    }
}

/** Reads the Appdata `config.json` text (null = file missing) into a KD state. */
export function parseKnowledgeDiscoveryConfig(text: string | null | undefined): KnowledgeDiscoveryState {
    if (text === null || text === undefined || !text.trim()) {
        return { status: 'not-configured' };
    }
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        return { status: 'invalid' };
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { status: 'invalid' };
    }
    const config = value as SharedAppConfig;
    if (config.schemaVersion !== undefined && config.schemaVersion !== 1) {
        return { status: 'invalid' };
    }
    const discovery = config.knowledgeDiscovery;
    if (discovery === undefined || discovery === null) {
        return { status: 'not-configured' };
    }
    if (typeof discovery !== 'object' || Array.isArray(discovery)) {
        return { status: 'invalid' };
    }
    if (discovery.url === undefined || (typeof discovery.url === 'string' && !discovery.url.trim())) {
        return { status: 'not-configured' };
    }
    const url = knowledgeDiscoveryUrl(discovery.url);
    return url ? { status: 'configured', url } : { status: 'invalid' };
}

function clean(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function providerCommentList(comments: AuditAssistantContext['providerComments']): string[] {
    if (!comments) {
        return [];
    }
    const list = typeof comments === 'string' ? [comments] : [...comments];
    return list.map((comment) => clean(comment)).filter((comment) => comment.length > 0);
}

function findingLabel(finding: AuditFinding): string {
    const code = clean(finding.code);
    const title = clean(finding.title);
    return code && title ? `${code} · ${title}` : code || title;
}

export function usableFindings(findings: AuditAssistantContext['findings']): AuditFinding[] {
    return (findings ?? []).filter((finding) => !!finding && findingLabel(finding).length > 0);
}

export function hasAuditContext(context: AuditAssistantContext | null | undefined): boolean {
    if (!context) {
        return false;
    }
    return (
        !!clean(context.radicationId) ||
        !!clean(context.invoiceNumber) ||
        !!clean(context.patientRef) ||
        usableFindings(context.findings).length > 0 ||
        providerCommentList(context.providerComments).length > 0
    );
}

/** Max findings that get their own suggested questions, to keep the list short. */
export const MAX_FINDING_QUESTIONS = 2;

/**
 * Suggested questions for answering provider appeals and for justifying or lifting glosas.
 * Finding-specific questions come first, then appeal and agreement questions.
 */
export function suggestedQuestions(context: AuditAssistantContext | null | undefined): SuggestedQuestion[] {
    const ctx = context ?? {};
    const invoice = clean(ctx.invoiceNumber);
    const questions: SuggestedQuestion[] = [];
    const findings = usableFindings(ctx.findings).slice(0, MAX_FINDING_QUESTIONS);
    const hasComments = providerCommentList(ctx.providerComments).length > 0;

    for (const finding of findings) {
        const label = findingLabel(finding);
        const key = clean(finding.id) || clean(finding.code) || label;
        questions.push({ id: `justify:${key}`, key: 'JUSTIFY_FINDING', params: { finding: label } });
        if (hasComments) {
            questions.push({ id: `lift:${key}`, key: 'LIFT_FINDING', params: { finding: label } });
        }
    }
    if (hasComments) {
        questions.push({ id: 'appeal-response', key: 'APPEAL_RESPONSE', params: {} });
    }
    questions.push(
        invoice
            ? { id: 'agreement-terms', key: 'AGREEMENT_TERMS_INVOICE', params: { invoice } }
            : { id: 'agreement-terms', key: 'AGREEMENT_TERMS', params: {} }
    );
    questions.push({ id: 'required-evidence', key: 'REQUIRED_EVIDENCE', params: {} });
    if (findings.length > 0) {
        questions.push({ id: 'precedents', key: 'PRECEDENTS', params: {} });
    }
    return questions;
}

function formatAmount(amount: number | null | undefined): string {
    return typeof amount === 'number' && Number.isFinite(amount) ? ` (${amount.toFixed(2)})` : '';
}

/**
 * Builds the text handed to KD: the auditor's question plus a plain-text context block.
 * Empty fields are omitted so KD is not told about data that does not exist.
 */
export function composeKnowledgeDiscoveryPrompt(
    question: string,
    context: AuditAssistantContext | null | undefined,
    labels: PromptLabels
): string {
    const ctx = context ?? {};
    const lines: string[] = [];
    const add = (label: string, value: string | null | undefined) => {
        const text = clean(value);
        if (text) {
            lines.push(`- ${label}: ${text}`);
        }
    };
    add(labels.radication, ctx.radicationId);
    add(labels.invoice, ctx.invoiceNumber);
    add(labels.patient, ctx.patientRef);
    add(labels.provider, ctx.providerName);
    add(labels.agreement, ctx.agreementName);

    const findings = usableFindings(ctx.findings);
    if (findings.length > 0) {
        lines.push(`- ${labels.findings}:`);
        for (const finding of findings) {
            const source = clean(finding.source);
            lines.push(`  - ${findingLabel(finding)}${source ? ` [${source}]` : ''}${formatAmount(finding.amount)}`);
        }
    }
    const comments = providerCommentList(ctx.providerComments);
    if (comments.length > 0) {
        lines.push(`- ${labels.providerComments}:`);
        for (const comment of comments) {
            lines.push(`  - ${comment}`);
        }
    }

    const body = `${labels.question}: ${clean(question)}`;
    return lines.length > 0 ? `${body}\n\n${labels.context}:\n${lines.join('\n')}` : body;
}

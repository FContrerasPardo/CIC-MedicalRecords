import { PreanalysisFinding } from './radication-preanalysis.util';

/**
 * Provider comments on the pre-analysis findings and the values that complete the Intake task
 * ("Nueva Cuenta"). The comments are saved in the process variable `providerFindingComments` so the
 * ARS sees them in audit (#147). Pure module: no Angular imports.
 *
 * Intake form (`intake-account`, export): `intakeaccountwidget04v3pb` ↔ `batchState` and
 * `supportDocumentUpload` → `newContents`. With `newContents` set, the gateway "New Content" runs
 * "Document IA New Docs" and returns to Intake; without it the account goes to the ARS analysis.
 */

export const PROVIDER_FINDING_COMMENTS_VARIABLE = 'providerFindingComments';
export const INTAKE_FORM_FIELDS = {
    account: 'intakeaccountwidget04v3pb',
    newDocuments: 'supportDocumentUpload',
    comments: PROVIDER_FINDING_COMMENTS_VARIABLE,
} as const;

export const MAX_COMMENT_LENGTH = 1000;

/**
 * Shape read by the invoice workspace's Audit tab (#147, `audit-findings.util.ts › parseProviderComments`):
 * `{ comments: [{ id?, comment, date?, … }] }`; without `invoiceKey`/`invoiceNumber` a comment applies to the whole account.
 */
export interface ProviderFindingComment {
    /** Same as `findingId`, the key the Audit tab reads. */
    id: string;
    findingId: string;
    date: string;
    kind: PreanalysisFinding['kind'];
    ruleId: string | null;
    comment: string;
}

export interface ProviderFindingComments {
    schemaVersion: 1;
    source: 'provider-preradication';
    radicationNumber: string;
    updatedAt: string;
    comments: ProviderFindingComment[];
}

/** Only non-empty comments of findings that still exist, trimmed and capped. */
export function buildProviderFindingComments(input: {
    radicationNumber: string;
    findings: ReadonlyArray<PreanalysisFinding>;
    comments: Readonly<Record<string, string | null | undefined>>;
    at: Date;
}): ProviderFindingComments {
    return {
        schemaVersion: 1,
        source: 'provider-preradication',
        radicationNumber: input.radicationNumber,
        updatedAt: input.at.toISOString(),
        comments: input.findings
            .map((finding) => ({ finding, text: (input.comments[finding.id] ?? '').trim().slice(0, MAX_COMMENT_LENGTH) }))
            .filter(({ text }) => !!text)
            .map(({ finding, text }) => ({
                id: finding.id,
                findingId: finding.id,
                date: input.at.toISOString(),
                kind: finding.kind,
                ruleId: finding.ruleId,
                comment: text,
            })),
    };
}

/** findingId → comment, from the variable as stored (JSON object or string); empty when unreadable. */
export function parseProviderFindingComments(value: unknown): Record<string, string> {
    let data = value;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return {};
        }
    }
    const comments = (data as { comments?: unknown } | null)?.comments;
    if (!Array.isArray(comments)) {
        return {};
    }
    return Object.fromEntries(
        comments
            .filter((item): item is { findingId: string; comment: string } => typeof item?.findingId === 'string' && typeof item?.comment === 'string')
            .map((item) => [item.findingId, item.comment])
    );
}

/** Same comments (ignoring timestamps): used to confirm what Automate saved, as CIC-Fin does after `saveTaskForm`. */
export function sameFindingComments(a: Record<string, string>, b: Record<string, string>): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => (a[key] ?? '') === (b[key] ?? ''));
}

export type IntakeDecision = 'continue' | 'more-documents';

/**
 * Values to save or complete the Intake form: the current form values, the comments and, only when
 * the provider loads more documents, the new references. Continuing clears `supportDocumentUpload`
 * so the gateway does not loop back to the IDP.
 */
export function buildIntakeFormValues(input: {
    currentValues: Readonly<Record<string, unknown>>;
    comments: ProviderFindingComments | null;
    decision: IntakeDecision | null;
    newDocuments?: readonly unknown[];
    commentsFieldPresent: boolean;
}): Record<string, unknown> {
    const values: Record<string, unknown> = { ...input.currentValues };
    if (input.comments && input.commentsFieldPresent) {
        values[INTAKE_FORM_FIELDS.comments] = JSON.stringify(input.comments);
    }
    if (input.decision === 'more-documents') {
        values[INTAKE_FORM_FIELDS.newDocuments] = [...(input.newDocuments ?? [])];
    } else if (input.decision === 'continue') {
        values[INTAKE_FORM_FIELDS.newDocuments] = null;
    }
    return values;
}

/**
 * Outcome of the Intake form, by name as CIC-Fin's `resolveReviewOutcome`: the first declared
 * (non-system) outcome; empty for the default completion (the exported form declares none).
 */
export function resolveIntakeOutcome(outcomes: ReadonlyArray<{ name?: string | null; isSystem?: boolean }> | null | undefined): string {
    return (outcomes ?? []).find((outcome) => !outcome.isSystem && outcome.name)?.name ?? '';
}

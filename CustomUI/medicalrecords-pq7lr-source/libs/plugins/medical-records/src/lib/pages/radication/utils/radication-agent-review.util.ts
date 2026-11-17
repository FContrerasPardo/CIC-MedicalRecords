import { normalizeKey } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';
import { ChecklistRisk } from '../../agreements/checklist/documentation-checklist.util';
import { PreanalysisFinding, PreanalysisStatus } from './radication-preanalysis.util';

/**
 * Result of the "Preanalisis Documental Agent" (`docs/automate/preanalisis-agente.md`), read from the
 * process variable `preanalysisResult` and edited through the Intake form field
 * `DataTable0hznuv`, as CIC-Fin's review table (`review-user-comment.ts`,
 * `loan-application.component.ts › findReviewArray`). Pure module: no Angular imports.
 *
 * Item: `{ ClassName, Status, Comment, DocumentIDs, InvoiceNumber, RuleId, Risk, UserComment, Attended }`.
 */

export const PREANALYSIS_RESULT_VARIABLE = 'preanalysisResult';
/** Data table of the Intake form ("Nueva Cuenta"), mapped in and out to `preanalysisResult` (V93: `DataTable0hznuv`). */
export const PREANALYSIS_RESULT_TABLE_FIELD = 'DataTable0hznuv';

export type AgentReviewStatus = 'missing' | 'attention' | 'pass';

export interface FindingSection {
    kind: 'general' | 'verified' | 'pending' | 'action';
    text: string;
}

export interface AgentReviewRow {
    /** Local id (also the key of the provider's comment on the page). */
    id: string;
    className: string;
    status: AgentReviewStatus;
    comment: string;
    /** Comment split into Verified / Pending / Action; `null` when it has no markers. */
    sections: FindingSection[] | null;
    documentIds: string[];
    invoiceNumber: string;
    ruleId: string | null;
    risk: ChecklistRisk;
    userComment: string;
    attended: boolean;
    /** The row exactly as the agent wrote it: identity for saving the annotation. */
    raw: Record<string, unknown>;
    /** Added by the page: an extracted document class the agent did not list (not in the agent table). */
    received?: boolean;
}

const CONTAINERS = new Set(['results', 'rows', 'items', 'documents', 'findings', 'warnings', 'reviewfindings', 'result', 'output', 'value', 'response', 'data', 'preanalysisresult']);
const ROW_KEYS = ['classname', 'documentid', 'documentids', 'status', 'comment'];

function isReviewRow(value: Record<string, unknown>): boolean {
    return Object.keys(value).some((key) => ROW_KEYS.includes(key.toLowerCase()));
}

/** The review array inside a value: JSON string (with or without ```json fences), wrapper object or array. */
export function findReviewArray(value: unknown, depth = 0): Array<Record<string, unknown>> | undefined {
    if (depth > 5 || value === undefined || value === null) {
        return undefined;
    }
    let parsed = value;
    if (typeof parsed === 'string') {
        const normalized = parsed
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
        if (!normalized) {
            return undefined;
        }
        try {
            parsed = JSON.parse(normalized);
        } catch {
            return undefined;
        }
    }
    if (Array.isArray(parsed)) {
        return parsed.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row));
    }
    if (typeof parsed === 'object') {
        const object = parsed as Record<string, unknown>;
        if (isReviewRow(object)) {
            return [object];
        }
        for (const [key, child] of Object.entries(object)) {
            if (CONTAINERS.has(key.toLowerCase())) {
                const nested = findReviewArray(child, depth + 1);
                if (nested) {
                    return nested;
                }
            }
        }
        for (const child of Object.values(object)) {
            const nested = findReviewArray(child, depth + 1);
            if (nested) {
                return nested;
            }
        }
    }
    return undefined;
}

/** Display-only segmentation (CIC-Fin's `segmentFindingComment`), keeping all wording. */
export function segmentFindingComment(text: string | null | undefined): FindingSection[] | null {
    if (!text) {
        return null;
    }
    const markers = [...text.matchAll(/(^|[\s.;,])(verificado|verified|pendiente|pending|acci[oó]n|action)\s*:/gi)];
    if (!markers.length) {
        return null;
    }
    const sections: FindingSection[] = [];
    const append = (kind: FindingSection['kind'], value: string): void => {
        if (value.trim()) {
            sections.push({ kind, text: value.trim() });
        }
    };
    append('general', text.slice(0, (markers[0].index ?? 0) + markers[0][1].length));
    markers.forEach((marker, index) => {
        const word = marker[2].toLowerCase();
        const kind = word.startsWith('verif') ? 'verified' : word.startsWith('pend') ? 'pending' : 'action';
        const next = markers[index + 1];
        append(kind, text.slice((marker.index ?? 0) + marker[0].length, next ? (next.index ?? 0) + next[1].length : text.length));
    });
    return sections.length ? sections : null;
}

/** Exact evaluation identity (CIC-Fin's `sameReviewFinding`): an annotation never moves to another finding. */
export function sameReviewFinding(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    const ids = (row: Record<string, unknown>): string =>
        JSON.stringify(Array.isArray(row['DocumentIDs']) ? [...row['DocumentIDs']].map(String).sort() : (row['DocumentID'] ?? null));
    return left['ClassName'] === right['ClassName'] && left['Comment'] === right['Comment'] && left['Status'] === right['Status'] && ids(left) === ids(right);
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

export function parseAgentStatus(value: unknown): AgentReviewStatus {
    const status = text(value).toLowerCase();
    if (status.includes('❌') || status.includes('missing') || status.includes('falta')) {
        return 'missing';
    }
    if (status.includes('✅') || status.includes('pass') || status.includes('cumple')) {
        return 'pass';
    }
    return 'attention';
}

function parseRisk(value: unknown, status: AgentReviewStatus): ChecklistRisk {
    const risk = text(value).toUpperCase();
    if (risk === 'HIGH' || risk === 'MEDIUM' || risk === 'LOW') {
        return risk;
    }
    return status === 'missing' ? 'HIGH' : status === 'attention' ? 'MEDIUM' : 'LOW';
}

const STATUS_ORDER: Record<AgentReviewStatus, number> = { missing: 0, attention: 1, pass: 2 };

/**
 * Rows of `preanalysisResult`, ordered by invoice (as listed in `invoiceNumbers`, account-level last)
 * and then by status; `null` when the variable is absent or not a review array.
 */
export function parseAgentReview(value: unknown, invoiceNumbers: readonly (string | null)[] = []): AgentReviewRow[] | null {
    const rows = findReviewArray(value);
    if (!rows?.length) {
        return null;
    }
    const order = invoiceNumbers.map((number) => normalizeKey(number));
    const groupIndex = (invoiceNumber: string) => {
        if (!invoiceNumber) {
            return Number.MAX_SAFE_INTEGER;
        }
        const index = order.indexOf(normalizeKey(invoiceNumber));
        return index >= 0 ? index : order.length;
    };
    return rows
        .map((raw, index): AgentReviewRow => {
            const status = parseAgentStatus(raw['Status']);
            const comment = text(raw['Comment']);
            const invoiceNumber = text(raw['InvoiceNumber']);
            const className = text(raw['ClassName']);
            const documentIds = (Array.isArray(raw['DocumentIDs']) ? raw['DocumentIDs'] : raw['DocumentID'] ? [raw['DocumentID']] : []).map(String).filter(Boolean);
            return {
                id: `agent:${index}:${normalizeKey(invoiceNumber)}:${normalizeKey(className)}`,
                className,
                status,
                comment,
                sections: segmentFindingComment(comment),
                documentIds,
                invoiceNumber,
                ruleId: text(raw['RuleId']) || null,
                risk: parseRisk(raw['Risk'], status),
                userComment: text(raw['UserComment']),
                attended: raw['Attended'] === true,
                raw,
            };
        })
        .sort((a, b) => groupIndex(a.invoiceNumber) - groupIndex(b.invoiceNumber) || STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

/** Overall status of the agent result, in the deterministic pre-analysis' terms. */
export function agentReviewStatus(rows: readonly AgentReviewRow[]): PreanalysisStatus {
    if (rows.some((row) => row.status === 'missing')) {
        return 'missing';
    }
    return rows.some((row) => row.status === 'attention') ? 'inconsistent' : 'complete';
}

/** Invoice group key (`CaseInvoiceOption.key`) whose number matches the row's `InvoiceNumber`. */
export function matchInvoiceKey(invoiceNumber: string, invoices: ReadonlyArray<{ key: string; invoiceNumber: string | null }>): string | null {
    const wanted = normalizeKey(invoiceNumber);
    return wanted ? (invoices.find((invoice) => normalizeKey(invoice.invoiceNumber) === wanted)?.key ?? null) : null;
}

/**
 * Agent rows as findings, so the provider's comments keep the `providerFindingComments` shape
 * (compatibility while the Intake form migrates to `DataTable0hznuv`).
 */
export function agentRowsAsFindings(rows: readonly AgentReviewRow[], invoices: ReadonlyArray<{ key: string; invoiceNumber: string | null }>): PreanalysisFinding[] {
    return rows.map((row) => ({
        id: row.id,
        kind: row.status === 'missing' ? 'MISSING_DOCUMENTS' : 'REVIEW_REQUIRED',
        risk: row.risk,
        ruleId: row.ruleId,
        subject: row.className,
        documents: [row.className],
        documentIds: row.documentIds,
        invoiceKey: matchInvoiceKey(row.invoiceNumber, invoices),
    }));
}

/** Rows of the Intake table (`DataTable0hznuv`), from the array or its JSON string. */
export function reviewTableRows(value: unknown): Array<Record<string, unknown>> {
    const parsed = findReviewArray(value);
    if (!parsed) {
        throw new Error('review-table-unavailable');
    }
    return parsed;
}

/**
 * Sets `UserComment` and `Attended=true` on the one row that matches the target exactly; `null`
 * when no row or more than one matches (the finding changed: the page must reload).
 */
export function annotateReviewRow(
    rows: ReadonlyArray<Record<string, unknown>>,
    target: Record<string, unknown>,
    comment: string
): { rows: Array<Record<string, unknown>>; row: Record<string, unknown> } | null {
    const matches = rows.filter((row) => sameReviewFinding(row, target));
    if (matches.length !== 1) {
        return null;
    }
    const row = { ...matches[0], UserComment: comment.trim(), Attended: true };
    return { rows: rows.map((current) => (current === matches[0] ? row : { ...current })), row };
}

/** RuleId the agent gives to a delivered class no requirement asks for (policy "allDocumentsCoverage"). */
export const DELIVERED_RULE_ID = 'DELIVERED';

/**
 * A delivered document with no requirement: a "received" row added by the page, or an agent row with
 * RuleId `DELIVERED`. Displayed alike; only page rows lack an agent-table entry for comments.
 */
export function isDeliveredRow(row: Pick<AgentReviewRow, 'received' | 'ruleId'>): boolean {
    return !!row.received || (row.ruleId ?? '').trim().toUpperCase() === DELIVERED_RULE_ID;
}

/** An extracted document (batchState) with the invoice it belongs to (`''` when account-level). */
export interface ExtractedDocumentRef {
    id: string;
    className: string;
    invoiceNumber: string;
}

/**
 * Extracted documents the agent did not cite, as "received" rows (one per invoice and class), so
 * every uploaded document appears in the review with its viewer, as in CIC-Fin. Agent rows win:
 * a class already listed for the same invoice, or a document already cited, is not repeated.
 */
export function receivedDocumentRows(rows: readonly AgentReviewRow[], documents: readonly ExtractedDocumentRef[]): AgentReviewRow[] {
    const cited = new Set(rows.flatMap((row) => row.documentIds));
    const listed = new Set(rows.map((row) => `${normalizeKey(row.invoiceNumber)}|${normalizeKey(row.className)}`));
    const groups = new Map<string, AgentReviewRow>();
    for (const document of documents) {
        const className = document.className.trim();
        const key = `${normalizeKey(document.invoiceNumber)}|${normalizeKey(className)}`;
        if (!document.id || !className || cited.has(document.id) || listed.has(key)) {
            continue;
        }
        const group = groups.get(key);
        if (group) {
            group.documentIds.push(document.id);
            continue;
        }
        groups.set(key, {
            id: `received:${key}`,
            className,
            status: 'pass',
            comment: '',
            sections: null,
            documentIds: [document.id],
            invoiceNumber: document.invoiceNumber,
            ruleId: null,
            risk: 'LOW',
            userComment: '',
            attended: false,
            raw: {},
            received: true,
        });
    }
    return [...groups.values()];
}

const RISK_ORDER: Record<ChecklistRisk, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

/**
 * Checklist rules as the agent applied them (grouped by `RuleId`): the agent reads service lines
 * semantically ("Sala de Cirugía" → surgery), where the literal rule match finds nothing.
 */
export function agentRuleViews(
    rows: readonly AgentReviewRow[],
    descriptions: ReadonlyMap<string, string>
): Array<{ ruleId: string; description: string; risk: ChecklistRisk; present: string[]; missing: string[]; status: 'ok' | 'missing' }> {
    const byRule = new Map<string, { ruleId: string; description: string; risk: ChecklistRisk; present: string[]; missing: string[]; status: 'ok' | 'missing' }>();
    for (const row of rows) {
        if (!row.ruleId || isDeliveredRow(row)) {
            continue;
        }
        const view = byRule.get(row.ruleId) ?? { ruleId: row.ruleId, description: descriptions.get(row.ruleId) ?? row.ruleId, risk: row.risk, present: [], missing: [], status: 'ok' };
        const list = row.status === 'missing' ? view.missing : view.present;
        if (!list.includes(row.className)) {
            list.push(row.className);
        }
        if (RISK_ORDER[row.risk] > RISK_ORDER[view.risk]) {
            view.risk = row.risk;
        }
        view.status = view.missing.length ? 'missing' : 'ok';
        byRule.set(row.ruleId, view);
    }
    return [...byRule.values()];
}

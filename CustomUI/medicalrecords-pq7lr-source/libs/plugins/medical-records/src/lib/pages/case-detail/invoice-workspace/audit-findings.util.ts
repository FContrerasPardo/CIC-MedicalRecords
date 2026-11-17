/**
 * Invoice audit workspace model (#147). Pure module: no Angular imports.
 *
 * Distinctions kept on purpose (docs/ARS_DEMO_REORIENTACION.md §6): an agent alert or an intake
 * inconsistency is not a finding until the analyst registers it; a finding is not a glosa until
 * the auditor proposes one; a proposed glosa is only formal once the communication is notified.
 */

export type FindingOrigin = 'intake' | 'codingIntegrity' | 'complianceAlert' | 'financialVariance' | 'provider';
export type FindingStatus = 'open' | 'accepted' | 'review' | 'dismissed' | 'glosa';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CommunicationStatus = 'draft' | 'reviewed' | 'notified';

export const FINDING_ORIGINS: FindingOrigin[] = ['intake', 'codingIntegrity', 'complianceAlert', 'financialVariance', 'provider'];
const SEVERITIES: FindingSeverity[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: FindingStatus[] = ['open', 'accepted', 'review', 'dismissed', 'glosa'];

export interface AuditFinding {
    id: string;
    origin: FindingOrigin;
    /** Other sources that reported the same observation (merged by the deduplication). */
    alsoReportedBy: FindingOrigin[];
    invoiceKey: string;
    serviceCode: string | null;
    document: string | null;
    description: string;
    evidence: string | null;
    /** Only when the source provides it; never inferred. */
    severity: FindingSeverity | null;
    status: FindingStatus;
    comment: string | null;
    /** Billed amount of the affected service when the source reports it. */
    amount: number | null;
    /** Identifier in the source (agent findingId, intake service id, provider comment id). */
    sourceRef: string | null;
}

export interface ProposedGlosa {
    findingId: string;
    invoiceKey: string;
    reason: string;
    serviceCode: string | null;
    objectedAmount: number;
    comment: string | null;
}

export interface InvoiceAuditRecord {
    findings: AuditFinding[];
    glosas: ProposedGlosa[];
    communication: CommunicationStatus;
}

/** Persisted shape (process variable `invoiceAuditState`). */
export interface InvoiceAuditState {
    version: 1;
    invoices: Record<string, InvoiceAuditRecord>;
}

export interface FinancialSummary {
    billed: number | null;
    observed: number;
    glosado: number;
    notObjected: number | null;
}

export type GlosaError = 'REASON_REQUIRED' | 'AMOUNT_INVALID' | 'EXCEEDS_SERVICE' | 'EXCEEDS_INVOICE' | 'FINDING_DISMISSED';

export interface GlosaResult {
    ok: boolean;
    /** Updated record when `ok`; otherwise null. */
    record: InvoiceAuditRecord | null;
    error: GlosaError | null;
    /** Amount still objectable for the finding (null when unknown). */
    available: number | null;
}

const fail = (error: GlosaError, available: number | null): GlosaResult => ({ ok: false, record: null, error, available });

export function emptyAuditState(): InvoiceAuditState {
    return { version: 1, invoices: {} };
}

export function emptyAuditRecord(): InvoiceAuditRecord {
    return { findings: [], glosas: [], communication: 'draft' };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

function text(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
}

function num(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

export function normalizeSeverity(value: unknown): FindingSeverity | null {
    const token = text(value)?.toLowerCase();
    return token && (SEVERITIES as string[]).includes(token) ? (token as FindingSeverity) : null;
}

function normalizeText(value: string | null): string {
    return (value ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** Same invoice, same service (or document) and same description: one observation. */
export function findingFingerprint(finding: Pick<AuditFinding, 'invoiceKey' | 'serviceCode' | 'document' | 'description'>): string {
    const anchor = normalizeText(finding.serviceCode) || normalizeText(finding.document);
    return [finding.invoiceKey, anchor, normalizeText(finding.description)].join('|');
}

export interface AddFindingResult {
    record: InvoiceAuditRecord;
    added: boolean;
    /** Id of the finding that already covered the candidate. */
    existingId: string | null;
}

/**
 * Adds a finding unless an equivalent one exists: same source reference from the same origin, or
 * the same fingerprint. A duplicate from another origin is recorded in `alsoReportedBy`.
 */
export function addFinding(record: InvoiceAuditRecord, candidate: AuditFinding): AddFindingResult {
    const fingerprint = findingFingerprint(candidate);
    const existing = record.findings.find(
        (finding) =>
            (candidate.sourceRef !== null && finding.origin === candidate.origin && finding.sourceRef === candidate.sourceRef) ||
            findingFingerprint(finding) === fingerprint
    );
    if (!existing) {
        return { record: { ...record, findings: [...record.findings, candidate] }, added: true, existingId: null };
    }
    const merged = existing.origin === candidate.origin || existing.alsoReportedBy.includes(candidate.origin)
        ? existing
        : { ...existing, alsoReportedBy: [...existing.alsoReportedBy, candidate.origin] };
    return {
        record: { ...record, findings: record.findings.map((finding) => (finding === existing ? merged : finding)) },
        added: false,
        existingId: existing.id,
    };
}

/** Id stable per source, so re-adding the same item is recognised. */
export function buildFindingId(origin: FindingOrigin, invoiceKey: string, ref: string): string {
    return `${origin}:${invoiceKey}:${ref}`;
}

export interface AgentFindingLike {
    findingId?: string;
    title?: string;
    type?: string;
    riskLevel?: string;
    severity?: string;
    description?: string;
    reason?: string;
    serviceCode?: string | null;
    procedureCode?: string | null;
    requiredDocumentType?: string | null;
    sourceDocument?: string | null;
    sourceField?: string | null;
    billedAmount?: number | null;
}

/** Agent observation → candidate finding. Severity comes from the agent's own risk level only. */
export function fromAgentFinding(origin: FindingOrigin, invoiceKey: string, finding: AgentFindingLike, index: number): AuditFinding {
    const ref = text(finding.findingId) ?? `#${index + 1}`;
    const description = text(finding.description) ?? text(finding.title) ?? text(finding.reason) ?? text(finding.type) ?? ref;
    const evidenceParts = [text(finding.reason), text(finding.sourceDocument), text(finding.sourceField)].filter(
        (part): part is string => !!part && part !== description
    );
    return {
        id: buildFindingId(origin, invoiceKey, ref),
        origin,
        alsoReportedBy: [],
        invoiceKey,
        serviceCode: text(finding.serviceCode) ?? text(finding.procedureCode),
        document: text(finding.requiredDocumentType) ?? text(finding.sourceDocument),
        description,
        evidence: evidenceParts.length ? evidenceParts.join(' · ') : null,
        severity: normalizeSeverity(finding.riskLevel ?? finding.severity),
        status: 'open',
        comment: null,
        amount: num(finding.billedAmount),
        sourceRef: ref,
    };
}

export interface IntakeServiceLike {
    id: string;
    serviceCode: string | null;
    cup?: string | null;
    description: string | null;
    total: string | null;
    supportStatus: string;
    missingDocuments: string[];
    alerts: string[];
}

/** Intake item that needs attention → preliminary finding registered by the analyst. */
export function fromIntakeService(invoiceKey: string, service: IntakeServiceLike, comment: string | null = null): AuditFinding {
    const missing = service.missingDocuments.filter(Boolean);
    const evidence = [missing.length ? missing.join(', ') : null, ...service.alerts].filter(Boolean).join(' · ');
    return {
        id: buildFindingId('intake', invoiceKey, service.id),
        origin: 'intake',
        alsoReportedBy: [],
        invoiceKey,
        serviceCode: text(service.serviceCode) ?? text(service.cup),
        document: missing[0] ?? null,
        description: [text(service.description), service.supportStatus].filter(Boolean).join(' — '),
        evidence: evidence || null,
        severity: null,
        status: 'open',
        comment: text(comment),
        amount: num(service.total),
        sourceRef: service.id,
    };
}

export interface ProviderComment {
    id: string;
    invoiceKey: string | null;
    invoiceNumber: string | null;
    serviceCode: string | null;
    text: string;
    author: string | null;
    date: string | null;
}

/**
 * Reads `providerFindingComments` (written by the provider pre-filing, #146). Accepted shapes:
 * an array of comments, `{ comments: [...] }`, or a JSON string of either. Each comment:
 * `{ id?, invoiceKey?, invoiceNumber?, serviceCode?, comment | text, author?, date? }`.
 */
export function parseProviderComments(raw: unknown): ProviderComment[] {
    let value = raw;
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            return [];
        }
    }
    const list = Array.isArray(value) ? value : Array.isArray((value as { comments?: unknown })?.comments) ? (value as { comments: unknown[] }).comments : [];
    return list
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
        .map((entry, index) => ({
            id: text(entry['id']) ?? `pc-${index + 1}`,
            invoiceKey: text(entry['invoiceKey']),
            invoiceNumber: text(entry['invoiceNumber']),
            serviceCode: text(entry['serviceCode']),
            text: text(entry['comment']) ?? text(entry['text']) ?? '',
            author: text(entry['author']),
            date: text(entry['date']),
        }))
        .filter((entry) => !!entry.text);
}

/** Comments of the active invoice; comments without invoice reference apply to the whole account. */
export function commentsForInvoice(comments: ProviderComment[], invoiceKey: string, invoiceNumber: string | null): ProviderComment[] {
    return comments.filter(
        (comment) =>
            (!comment.invoiceKey && !comment.invoiceNumber) ||
            comment.invoiceKey === invoiceKey ||
            (!!invoiceNumber && comment.invoiceNumber === invoiceNumber)
    );
}

export function fromProviderComment(invoiceKey: string, comment: ProviderComment): AuditFinding {
    return {
        id: buildFindingId('provider', invoiceKey, comment.id),
        origin: 'provider',
        alsoReportedBy: [],
        invoiceKey,
        serviceCode: comment.serviceCode,
        document: null,
        description: comment.text,
        evidence: [comment.author, comment.date].filter(Boolean).join(' · ') || null,
        severity: null,
        status: 'open',
        comment: null,
        amount: null,
        sourceRef: comment.id,
    };
}

export function setFindingStatus(record: InvoiceAuditRecord, findingId: string, status: FindingStatus, comment?: string | null): InvoiceAuditRecord {
    return {
        ...record,
        // Leaving the glosa status drops its proposed glosa so the totals stay consistent.
        glosas: status === 'glosa' ? record.glosas : record.glosas.filter((glosa) => glosa.findingId !== findingId),
        findings: record.findings.map((finding) =>
            finding.id === findingId ? { ...finding, status, comment: comment === undefined ? finding.comment : text(comment) } : finding
        ),
    };
}

export interface GlosaInput {
    reason: string;
    objectedAmount: number | string;
    comment?: string | null;
}

/**
 * Amount that can still be objected for a finding: the service's billed amount (or the invoice
 * total when the service amount is unknown) minus what other glosas already object there.
 */
export function availableToObject(record: InvoiceAuditRecord, finding: AuditFinding, invoiceBilled: number | null): number | null {
    const others = record.glosas.filter((glosa) => glosa.findingId !== finding.id);
    const invoiceLeft = invoiceBilled === null ? null : invoiceBilled - others.reduce((sum, glosa) => sum + glosa.objectedAmount, 0);
    if (finding.amount !== null) {
        const sameService = finding.serviceCode
            ? others.filter((glosa) => glosa.serviceCode === finding.serviceCode).reduce((sum, glosa) => sum + glosa.objectedAmount, 0)
            : 0;
        const serviceLeft = finding.amount - sameService;
        return round2(Math.max(0, invoiceLeft === null ? serviceLeft : Math.min(serviceLeft, invoiceLeft)));
    }
    return invoiceLeft === null ? null : round2(Math.max(0, invoiceLeft));
}

/** Proposes (or replaces) the glosa of a finding, validated against the billed amounts. */
export function proposeGlosa(record: InvoiceAuditRecord, findingId: string, input: GlosaInput, invoiceBilled: number | null): GlosaResult {
    const finding = record.findings.find((item) => item.id === findingId);
    if (!finding || finding.status === 'dismissed') {
        return fail('FINDING_DISMISSED', null);
    }
    const reason = text(input.reason);
    if (!reason) {
        return fail('REASON_REQUIRED', null);
    }
    const amount = num(input.objectedAmount);
    const available = availableToObject(record, finding, invoiceBilled);
    if (amount === null || amount <= 0) {
        return fail('AMOUNT_INVALID', available);
    }
    if (available !== null && round2(amount) > available) {
        return fail(finding.amount !== null ? 'EXCEEDS_SERVICE' : 'EXCEEDS_INVOICE', available);
    }
    const glosa: ProposedGlosa = {
        findingId,
        invoiceKey: finding.invoiceKey,
        reason,
        serviceCode: finding.serviceCode,
        objectedAmount: round2(amount),
        comment: text(input.comment),
    };
    const updated = setFindingStatus(record, findingId, 'glosa');
    return {
        ok: true,
        record: { ...updated, glosas: [...updated.glosas.filter((item) => item.findingId !== findingId), glosa], communication: 'draft' },
        error: null,
        available,
    };
}

/**
 * Billed, observed (amounts under active findings, one per service so a service flagged by several
 * sources counts once), glosado (proposed glosas) and not objected (billed − glosado). All capped at
 * the billed total. "Not objected" is not "paid": nothing is disbursed at this stage.
 */
export function summarizeFinancials(record: InvoiceAuditRecord, invoiceBilled: number | null): FinancialSummary {
    const byService = new Map<string, number>();
    record.findings
        .filter((finding) => finding.status !== 'dismissed' && finding.amount !== null)
        .forEach((finding) => {
            const key = finding.serviceCode ? `s:${normalizeText(finding.serviceCode)}` : `f:${finding.id}`;
            byService.set(key, Math.max(byService.get(key) ?? 0, finding.amount as number));
        });
    const cap = (value: number) => round2(invoiceBilled === null ? value : Math.min(value, invoiceBilled));
    const observed = cap([...byService.values()].reduce((sum, value) => sum + value, 0));
    const glosado = cap(record.glosas.reduce((sum, glosa) => sum + glosa.objectedAmount, 0));
    return {
        billed: invoiceBilled,
        observed,
        glosado,
        notObjected: invoiceBilled === null ? null : round2(invoiceBilled - glosado),
    };
}

const NEXT_COMMUNICATION: Record<CommunicationStatus, CommunicationStatus | null> = { draft: 'reviewed', reviewed: 'notified', notified: null };

/** draft → reviewed → notified. Notifying needs at least one proposed glosa. */
export function advanceCommunication(record: InvoiceAuditRecord): InvoiceAuditRecord {
    const next = NEXT_COMMUNICATION[record.communication];
    if (!next || (next === 'notified' && !record.glosas.length)) {
        return record;
    }
    return { ...record, communication: next };
}

export function countActiveFindings(record: InvoiceAuditRecord): number {
    return record.findings.filter((finding) => finding.status !== 'dismissed').length;
}

function parseFinding(raw: unknown): AuditFinding | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const entry = raw as Record<string, unknown>;
    const id = text(entry['id']);
    const origin = text(entry['origin']) as FindingOrigin | null;
    const invoiceKey = text(entry['invoiceKey']);
    const description = text(entry['description']);
    if (!id || !origin || !FINDING_ORIGINS.includes(origin) || !invoiceKey || !description) {
        return null;
    }
    const status = text(entry['status']) as FindingStatus | null;
    return {
        id,
        origin,
        alsoReportedBy: Array.isArray(entry['alsoReportedBy'])
            ? (entry['alsoReportedBy'] as unknown[]).filter((item): item is FindingOrigin => FINDING_ORIGINS.includes(item as FindingOrigin))
            : [],
        invoiceKey,
        serviceCode: text(entry['serviceCode']),
        document: text(entry['document']),
        description,
        evidence: text(entry['evidence']),
        severity: normalizeSeverity(entry['severity']),
        status: status && STATUSES.includes(status) ? status : 'open',
        comment: text(entry['comment']),
        amount: num(entry['amount']),
        sourceRef: text(entry['sourceRef']),
    };
}

function parseGlosa(raw: unknown): ProposedGlosa | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const entry = raw as Record<string, unknown>;
    const findingId = text(entry['findingId']);
    const invoiceKey = text(entry['invoiceKey']);
    const reason = text(entry['reason']);
    const objectedAmount = num(entry['objectedAmount']);
    if (!findingId || !invoiceKey || !reason || objectedAmount === null) {
        return null;
    }
    return { findingId, invoiceKey, reason, serviceCode: text(entry['serviceCode']), objectedAmount, comment: text(entry['comment']) };
}

/** Tolerant reader of the persisted state (object or JSON string); unknown data is dropped. */
export function parseAuditState(raw: unknown): InvoiceAuditState {
    let value = raw;
    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            return emptyAuditState();
        }
    }
    const invoices = (value as { invoices?: unknown })?.invoices;
    if (!invoices || typeof invoices !== 'object') {
        return emptyAuditState();
    }
    const state = emptyAuditState();
    for (const [key, rawRecord] of Object.entries(invoices as Record<string, unknown>)) {
        const recordValue = (rawRecord ?? {}) as Record<string, unknown>;
        const communication = text(recordValue['communication']) as CommunicationStatus | null;
        state.invoices[key] = {
            findings: (Array.isArray(recordValue['findings']) ? recordValue['findings'] : []).map(parseFinding).filter((item): item is AuditFinding => !!item),
            glosas: (Array.isArray(recordValue['glosas']) ? recordValue['glosas'] : []).map(parseGlosa).filter((item): item is ProposedGlosa => !!item),
            communication: communication && communication in NEXT_COMMUNICATION ? communication : 'draft',
        };
    }
    return state;
}

export function withRecord(state: InvoiceAuditState, invoiceKey: string, record: InvoiceAuditRecord): InvoiceAuditState {
    return { ...state, invoices: { ...state.invoices, [invoiceKey]: record } };
}

/**
 * Provider responses that answer one finding (communication ARS ↔ provider): the comment the
 * finding was created from, or any comment on the same service code. Account-level comments
 * (no service code) only answer account-level findings.
 */
export function responsesForFinding(finding: Pick<AuditFinding, 'origin' | 'serviceCode' | 'sourceRef'>, comments: ProviderComment[]): ProviderComment[] {
    const service = normalizeText(finding.serviceCode);
    return comments.filter((comment) => {
        if (finding.origin === 'provider' && finding.sourceRef === comment.id) {
            return true;
        }
        const commentService = normalizeText(comment.serviceCode);
        return service ? commentService === service : !commentService;
    });
}

/** Decision stage of a finding, for the audit queue: pending decision, in review with the provider, or decided. */
export type FindingStage = 'pending' | 'review' | 'decided';

export function findingStage(status: FindingStatus): FindingStage {
    if (status === 'open') {
        return 'pending';
    }
    return status === 'review' ? 'review' : 'decided';
}

/** Audit queue order: pending first, then in review, then decided; by severity inside each stage. */
export function sortAuditQueue(findings: AuditFinding[]): AuditFinding[] {
    const stageRank: Record<FindingStage, number> = { pending: 0, review: 1, decided: 2 };
    const severityRank = (severity: FindingSeverity | null): number => (severity ? 3 - SEVERITIES.indexOf(severity) : 4);
    return findings
        .map((finding, index) => ({ finding, index }))
        .sort(
            (a, b) =>
                stageRank[findingStage(a.finding.status)] - stageRank[findingStage(b.finding.status)] ||
                severityRank(a.finding.severity) - severityRank(b.finding.severity) ||
                a.index - b.index
        )
        .map((entry) => entry.finding);
}

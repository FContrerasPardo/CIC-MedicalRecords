import { DashboardFieldDescriptor, DashboardWidgetConfig } from '../definitions/dashboard-widget.model';
import { DocumentationChecklist, evaluateChecklist } from '../../pages/agreements/checklist/documentation-checklist.util';
import { IdpDocument, mapIdpAccount } from '../../idp/idp-account-mapping.util';
import { DEFAULT_PROVIDER_CONTEXT, ProviderVariableContext, rowAccountSummary, rowIdentity } from './dashboard-provider-group.util';

/**
 * Derived per-account fields for the reconciliation and audit indicators (issue #145), pure. Process rows only carry
 * raw variables (IDP output, account summary, agent results); these `calc_*` columns turn them into
 * plain values that the EXISTING metric / chart / table widgets can bind like any other field
 * (argument, value, columns). Equivalences confirmed by the user on 2026-11-15 (issue #145):
 * - reconciliation time: process start → completion of COMPLETED instances, in hours;
 * - audit finding: an agent asks for manual review or reports high/critical risk, or an invoice was rejected;
 * - reasons: documentation, coding, tariff / financial variance, compliance (coverage has no source);
 * - missing documents: documentary checklist (Appdata) evaluated per customer invoice.
 */

export const DERIVED_FIELD_PREFIX = 'calc_';

export const AUDIT_AGENT_VARIABLES = ['codingIntegrityResult', 'complianceAlertResult', 'financialVarianceResult'] as const;

/** Variables read by the derived fields (same names as the ARS process and the provider cards). */
export const AUDIT_DEFAULT_CONTEXT: ProviderVariableContext = { idpVariable: DEFAULT_PROVIDER_CONTEXT.idpVariable, summaryVariable: 'accountSummary' };

export type AuditReason = 'documentation' | 'coding' | 'tariff' | 'compliance';

export const AUDIT_REASONS: readonly AuditReason[] = ['documentation', 'coding', 'tariff', 'compliance'];

/** Reasons are stored as translation keys so widgets can show them in the user's language. */
export function auditReasonLabelKey(reason: AuditReason): string {
    return `MEDICAL_RECORDS.DASHBOARD.AUDIT_REASON.${reason.toUpperCase()}`;
}

interface DerivedFieldSpec {
    kind: DashboardFieldDescriptor['kind'];
    variables: readonly string[];
    checklist: boolean;
}

const AGENTS_AND_SUMMARY = [...AUDIT_AGENT_VARIABLES, 'accountSummary'];

export const DERIVED_FIELDS: Readonly<Record<string, DerivedFieldSpec>> = {
    calc_reconciliationHours: { kind: 'number', variables: [], checklist: false },
    calc_provider: { kind: 'category', variables: ['accountSummary', 'batchState'], checklist: false },
    calc_payer: { kind: 'category', variables: ['accountSummary'], checklist: false },
    calc_auditFinding: { kind: 'number', variables: AGENTS_AND_SUMMARY, checklist: false },
    calc_auditVarianceAmount: { kind: 'number', variables: AGENTS_AND_SUMMARY, checklist: false },
    calc_billedAmount: { kind: 'number', variables: [...AGENTS_AND_SUMMARY, 'batchState'], checklist: false },
    calc_inAuditAmount: { kind: 'number', variables: ['accountSummary', 'batchState', 'financialVarianceResult'], checklist: false },
    calc_observedAmount: { kind: 'number', variables: [...AGENTS_AND_SUMMARY, 'batchState'], checklist: false },
    calc_stage: { kind: 'category', variables: [...AUDIT_AGENT_VARIABLES, 'accountSummary', 'batchState'], checklist: false },
    calc_agentSignals: { kind: 'json', variables: [...AUDIT_AGENT_VARIABLES], checklist: false },
    calc_auditReasons: { kind: 'json', variables: [...AGENTS_AND_SUMMARY, 'batchState'], checklist: true },
    calc_missingDocuments: { kind: 'json', variables: ['accountSummary', 'batchState'], checklist: true },
};

export function isDerivedField(field: string | undefined | null): boolean {
    return !!field && Object.prototype.hasOwnProperty.call(DERIVED_FIELDS, field);
}

/** Derived fields a widget binds (argument, value, series, columns). */
export function widgetDerivedFields(config: DashboardWidgetConfig): string[] {
    const bindings = config.bindings ?? {};
    const fields = [
        bindings.argumentField,
        bindings.valueField,
        bindings.seriesField,
        ...(bindings.columnFields ?? []),
        config.chart?.xField,
        config.chart?.yField,
        ...(config.tableColumnKeys ?? '').split(','),
    ].map((field) => String(field ?? '').trim());
    return [...new Set(fields.filter(isDerivedField))].sort();
}

/** Process variables the derived fields of a widget read (declared to the data plan). */
export function derivedFieldVariables(fields: readonly string[]): string[] {
    return [...new Set(fields.flatMap((field) => DERIVED_FIELDS[field]?.variables ?? []))].sort();
}

export function derivedFieldsNeedChecklist(fields: readonly string[]): boolean {
    return fields.some((field) => DERIVED_FIELDS[field]?.checklist);
}

/** Descriptors offered in the builder field list. */
export function derivedFieldDescriptors(): DashboardFieldDescriptor[] {
    return Object.entries(DERIVED_FIELDS).map(([key, spec]) => ({ key, kind: spec.kind }));
}

type JsonObject = Record<string, unknown>;

const jsonCache = new Map<string, JsonObject | null>();
const JSON_CACHE_LIMIT = 300;

/** Object or JSON string → object (cached); anything else → null. */
export function parseJsonObject(value: unknown): JsonObject | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as JsonObject;
    }
    if (typeof value !== 'string' || !value.trim().startsWith('{')) {
        return null;
    }
    const cached = jsonCache.get(value);
    if (cached !== undefined) {
        return cached;
    }
    let parsed: JsonObject | null = null;
    try {
        const result: unknown = JSON.parse(value);
        parsed = result && typeof result === 'object' && !Array.isArray(result) ? (result as JsonObject) : null;
    } catch {
        parsed = null;
    }
    if (jsonCache.size >= JSON_CACHE_LIMIT) {
        const oldest = jsonCache.keys().next().value;
        if (oldest !== undefined) {
            jsonCache.delete(oldest);
        }
    }
    jsonCache.set(value, parsed);
    return parsed;
}

function list(value: unknown): JsonObject[] {
    return Array.isArray(value) ? value.filter((item): item is JsonObject => !!item && typeof item === 'object') : [];
}

function numberOf(value: unknown): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function child(source: JsonObject | null, key: string): JsonObject | null {
    const value = source?.[key];
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;
}

const HIGH_RISKS = new Set(['HIGH', 'CRITICAL', 'ALTO', 'CRITICO']);

function isDocumentFinding(finding: JsonObject): boolean {
    return !!finding['requiredDocumentType'] || /DOCUMENT/i.test(String(finding['type'] ?? ''));
}

/** Hours from process start to completion; null unless the instance is COMPLETED with valid dates. */
export function reconciliationHours(row: Record<string, unknown>): number | null {
    if (String(row['status'] ?? '').toUpperCase() !== 'COMPLETED') {
        return null;
    }
    const start = Date.parse(String(row['startDate'] ?? ''));
    const end = Date.parse(String(row['completedDate'] ?? ''));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return null;
    }
    return (end - start) / 3_600_000;
}

/** Missing required documents per customer invoice, from the documentary checklist. */
export function accountMissingDocuments(
    row: Record<string, unknown>,
    checklist: DocumentationChecklist | null,
    ctx: ProviderVariableContext = AUDIT_DEFAULT_CONTEXT
): string[][] {
    if (!checklist) {
        return [];
    }
    const missingFor = (procedureCodes: string[], documentClasses: string[]): string[] =>
        [...new Set(evaluateChecklist(checklist, { procedureCodes, serviceCategories: [], documentClasses }).flatMap((rule) => rule.missing))];
    const batch = parseJsonObject(row[`var_${ctx.idpVariable}`]);
    const documents = batch && Array.isArray(batch['documents']) ? (batch['documents'] as IdpDocument[]) : null;
    if (documents?.length) {
        const account = mapIdpAccount({ documents });
        // Without an invoice, the whole account is evaluated as one set of documents.
        const sets = account.invoices.length ? account.invoices.map((invoice) => [invoice.invoice, ...invoice.supporting]) : [account.unassigned];
        return sets.map((docs) => {
            const codes = docs.flatMap((doc) => doc.services.map((line) => line.code ?? '')).filter(Boolean);
            return missingFor(codes, docs.map((doc) => doc.className).filter(Boolean));
        });
    }
    const patients = rowAccountSummary(row, ctx)?.patients ?? [];
    return patients.map((patient) => missingFor([], Object.keys(patient.documentClasses ?? {})));
}

export interface AccountAuditSignals {
    withFinding: boolean;
    reasons: AuditReason[];
    varianceAmount: number;
    billed: number;
}

/** Audit signals of one account from the agent results, the account summary and the checklist. */
export function accountAuditSignals(
    row: Record<string, unknown>,
    checklist: DocumentationChecklist | null,
    ctx: ProviderVariableContext = AUDIT_DEFAULT_CONTEXT
): AccountAuditSignals {
    const coding = parseJsonObject(row['var_codingIntegrityResult']);
    const compliance = parseJsonObject(row['var_complianceAlertResult']);
    const financial = parseJsonObject(row['var_financialVarianceResult']);
    const summary = rowAccountSummary(row, ctx);
    const agents = [coding, compliance, financial].filter((agent): agent is JsonObject => !!agent);

    const withFinding =
        agents.some((agent) => agent['requiresManualReview'] === true || HIGH_RISKS.has(String(agent['overallRiskLevel'] ?? '').toUpperCase())) ||
        !!summary?.patients?.some((patient) => patient.rejected === true);

    const reasons: AuditReason[] = [];
    const complianceSummary = child(compliance, 'complianceSummary');
    const documentation =
        list(compliance?.['missingDocuments']).length > 0 ||
        numberOf(complianceSummary?.['missingRequiredDocuments']) > 0 ||
        accountMissingDocuments(row, checklist, ctx).some((missing) => missing.length > 0);
    if (documentation) {
        reasons.push('documentation');
    }
    const codingSummary = child(coding, 'codingSummary');
    const codingIssues =
        numberOf(codingSummary?.['incompatibilitiesDetected']) + numberOf(codingSummary?.['duplicatesDetected']) + numberOf(codingSummary?.['missingDiagnosisSupport']);
    if (list(coding?.['findings']).length > 0 || codingIssues > 0) {
        reasons.push('coding');
    }
    const totals = child(financial, 'analyzedTotals');
    const tariff = child(financial, 'tariffSummary');
    if (list(financial?.['findings']).length > 0 || totals?.['totalsMatch'] === false || numberOf(tariff?.['tariffDeviations']) > 0) {
        reasons.push('tariff');
    }
    if (list(compliance?.['findings']).some((finding) => !isDocumentFinding(finding))) {
        reasons.push('compliance');
    }

    return { withFinding, reasons, varianceAmount: Math.abs(numberOf(totals?.['varianceAmount'])), billed: accountBilledAmount(row, ctx) };
}

/**
 * Billed amount of ONE account, counted once (no double counting across invoices or sources), in
 * this order: sum of `accountSummary.patients[].totals.billed` (v3), `accountSummary.totalBilled`,
 * sum of the invoices' billed totals in the IDP output, the financial agent's invoice total.
 */
export function accountBilledAmount(row: Record<string, unknown>, ctx: ProviderVariableContext = AUDIT_DEFAULT_CONTEXT): number {
    const summary = rowAccountSummary(row, ctx);
    const patientTotals = (summary?.patients ?? []).map((patient) => numberOf(patient.totals?.billed));
    if (patientTotals.some((value) => value > 0)) {
        return patientTotals.reduce((sum, value) => sum + value, 0);
    }
    if (numberOf(summary?.totalBilled) > 0) {
        return numberOf(summary?.totalBilled);
    }
    const batch = parseJsonObject(row[`var_${ctx.idpVariable}`]);
    if (batch && Array.isArray(batch['documents'])) {
        const invoices = mapIdpAccount({ documents: batch['documents'] as IdpDocument[] }).invoices;
        const idpTotal = invoices.reduce((sum, invoice) => sum + numberOf(invoice.invoice.totals.billed), 0);
        if (idpTotal > 0) {
            return idpTotal;
        }
    }
    return numberOf(child(parseJsonObject(row['var_financialVarianceResult']), 'analyzedTotals')?.['invoiceTotal']);
}

/**
 * Stages of the ARS flow, in order; stored as translation keys with the order in the key. The ids
 * keep their original numbers (no `3`) so translation keys, saved `case-progress.json` files and
 * dashboard buckets stay stable after the rules stage was removed (2026-11-17): the agreement
 * rules are reviewed in the agreements viewer, not as an account stage.
 */
export const ACCOUNT_STAGES = ['1_RECEIVED', '2_INTAKE', '4_AGENTS', '5_AUDIT', '6_CLOSED'] as const;
export type AccountStage = (typeof ACCOUNT_STAGES)[number];

/**
 * Stages that no longer exist and where they show now. `3_RULES` (IDP output reviewed, agents not
 * answered yet) sat between intake and agents: the intake is already passed, so the account shows
 * in the next valid stage, agent analysis, which waits for the agents.
 */
export const LEGACY_ACCOUNT_STAGES: Readonly<Record<string, AccountStage>> = { '3_RULES': '4_AGENTS' };

/** A stored stage id (current or legacy) as a current stage; null when unknown. */
export function normalizeAccountStage(value: unknown): AccountStage | null {
    const id = String(value ?? '');
    if ((ACCOUNT_STAGES as readonly string[]).includes(id)) {
        return id as AccountStage;
    }
    return Object.prototype.hasOwnProperty.call(LEGACY_ACCOUNT_STAGES, id) ? LEGACY_ACCOUNT_STAGES[id] : null;
}

export function accountStageLabelKey(stage: AccountStage): string {
    return `MEDICAL_RECORDS.DASHBOARD.ACCOUNT_STAGE.STAGE_${stage}`;
}

/**
 * Stage of an account INFERRED from its process status and variables (the open task is not part of
 * the process rows): completed → closed; all three agent results → audit; some → agents;
 * IDP output needing review → intake; IDP output already reviewed → agents (former rules stage,
 * see LEGACY_ACCOUNT_STAGES); nothing yet → received.
 */
export function accountStage(row: Record<string, unknown>, ctx: ProviderVariableContext = AUDIT_DEFAULT_CONTEXT): AccountStage | null {
    const status = String(row['status'] ?? '').toUpperCase();
    if (status === 'CANCELLED') {
        return null;
    }
    if (status === 'COMPLETED') {
        return '6_CLOSED';
    }
    const agents = AUDIT_AGENT_VARIABLES.filter((name) => !!parseJsonObject(row[`var_${name}`])).length;
    if (agents === AUDIT_AGENT_VARIABLES.length) {
        return '5_AUDIT';
    }
    if (agents > 0) {
        return '4_AGENTS';
    }
    const batch = parseJsonObject(row[`var_${ctx.idpVariable}`]);
    if (!batch) {
        return '1_RECEIVED';
    }
    return rowIdentity(row, ctx).reviewRequired ? '2_INTAKE' : '4_AGENTS';
}

const AGENT_KEYS: Record<(typeof AUDIT_AGENT_VARIABLES)[number], string> = {
    codingIntegrityResult: 'CODING_INTEGRITY',
    complianceAlertResult: 'COMPLIANCE_ALERT',
    financialVarianceResult: 'FINANCIAL_VARIANCE',
};

/**
 * Agents that raised a risk signal for the account: at least one finding, manual review requested
 * or high/critical risk. Only what the agent result says; no score is invented.
 */
export function accountAgentSignals(row: Record<string, unknown>): string[] {
    return AUDIT_AGENT_VARIABLES.filter((name) => {
        const result = parseJsonObject(row[`var_${name}`]);
        return (
            !!result &&
            (list(result['findings']).length > 0 ||
                result['requiresManualReview'] === true ||
                HIGH_RISKS.has(String(result['overallRiskLevel'] ?? '').toUpperCase()))
        );
    }).map((name) => `MEDICAL_RECORDS.DASHBOARD.AUDIT_AGENT.${AGENT_KEYS[name]}`);
}

const OPEN_STATUSES = new Set(['RUNNING', 'SUSPENDED']);

/**
 * Adds the requested `calc_*` columns to a flattened process row (string values, like every other
 * column). Lists are JSON arrays, so charts can count them with `argumentMultiValue`.
 */
export function addDerivedFields(
    row: Record<string, string>,
    fields: readonly string[],
    checklist: DocumentationChecklist | null,
    ctx: ProviderVariableContext = AUDIT_DEFAULT_CONTEXT
): Record<string, string> {
    if (!fields.length) {
        return row;
    }
    const out: Record<string, string> = { ...row };
    let signals: AccountAuditSignals | null = null;
    const audit = (): AccountAuditSignals => (signals ??= accountAuditSignals(row, checklist, ctx));
    for (const field of fields) {
        switch (field) {
            case 'calc_reconciliationHours': {
                const hours = reconciliationHours(row);
                out[field] = hours === null ? '' : String(Math.round(hours * 10) / 10);
                break;
            }
            case 'calc_provider':
                out[field] = rowIdentity(row, ctx).providerName ?? '';
                break;
            case 'calc_payer':
                out[field] = rowAccountSummary(row, ctx)?.payer?.trim() ?? '';
                break;
            case 'calc_auditFinding':
                out[field] = audit().withFinding ? '1' : '0';
                break;
            case 'calc_auditVarianceAmount':
                out[field] = String(audit().varianceAmount);
                break;
            case 'calc_billedAmount':
                out[field] = String(audit().billed);
                break;
            case 'calc_inAuditAmount':
                out[field] = OPEN_STATUSES.has(String(row['status'] ?? '').toUpperCase()) ? String(accountBilledAmount(row, ctx)) : '0';
                break;
            case 'calc_observedAmount':
                out[field] = audit().withFinding ? String(audit().billed) : '0';
                break;
            case 'calc_stage': {
                const stage = accountStage(row, ctx);
                out[field] = stage ? accountStageLabelKey(stage) : '';
                break;
            }
            case 'calc_agentSignals':
                out[field] = JSON.stringify(accountAgentSignals(row));
                break;
            case 'calc_auditReasons':
                out[field] = JSON.stringify(audit().reasons.map(auditReasonLabelKey));
                break;
            case 'calc_missingDocuments':
                out[field] = JSON.stringify(accountMissingDocuments(row, checklist, ctx).flat());
                break;
        }
    }
    return out;
}

import {
    addFinding,
    AgentFindingLike,
    emptyAuditRecord,
    FindingOrigin,
    FindingSeverity,
    fromAgentFinding,
    intakeFindingStatusById,
    InvoiceAuditRecord,
    InvoiceAuditState,
    IntakeServiceLike as AuditIntakeServiceLike,
} from '../invoice-workspace/audit-findings.util';
import { countIntakeServicesWithWarnings, intakeWarningsById, IntakeServiceLike, resolvedIntakeServiceIds } from './case-intake.util';

/**
 * Risk signal of one patient (customer invoice) for the Control Center account row, pure. The
 * stages belong to the ACCOUNT (shown once in the account row); the patient sub-card shows what
 * was found for that patient instead, telling findings from warnings (2026-11-18):
 * - findings: what was REGISTERED for the patient: the audit tray of the invoice (not dismissed)
 *   plus the analyst's registrations in case-progress.json whose findings are not in the tray;
 * - warnings: what was only observed: agent observations not in the tray yet (deduplicated like
 *   the workspace does) plus the intake services with a warning (`warningsOf`, see
 *   `patientIntakeWarningCount`: reviewed or remediated services do not count);
 * - severity: the highest one of the registered findings (never inferred).
 * Agent results cover the whole account: an observation belongs to the patient whose invoice bills
 * its service code, otherwise to the first invoice (same rule as the invoice workspace).
 */

export type PatientSignalTone = 'none' | 'ok' | 'warn' | 'low' | 'medium' | 'high' | 'critical';

export interface PatientFindingSignal {
    key: string;
    /** Findings registered for the patient; null when nothing is known yet (no agent answered, nothing registered, no warning). */
    count: number | null;
    /** Warnings and observations of the patient that are not registered findings. */
    warnings: number;
    severity: FindingSeverity | null;
    tone: PatientSignalTone;
}

export interface PatientSignalInvoice {
    key: string;
}

export interface PatientSignalService {
    serviceCode: string | null;
    cup: string | null;
}

/** Registration of the analyst (case-progress.json), structural subset of CaseRegistration. */
export interface PatientSignalRegistration {
    invoiceKey: string;
    findingIds: readonly string[];
}

export interface PatientSignalOptions {
    registrations?: readonly PatientSignalRegistration[];
    /** Intake services of the patient with at least one warning. */
    warningsOf?: (invoice: PatientSignalInvoice) => number;
}

/** Analyst progress the intake warnings read (structural subset of CaseProgress). */
export interface PatientIntakeProgress {
    reviewedServices: ReadonlyArray<{ serviceId: string }>;
    registrations: ReadonlyArray<{ invoiceKey: string; kind: string; serviceIds: readonly string[]; findingIds: readonly string[] }>;
}

/**
 * Intake services of one patient with at least one warning (subtotal mismatch, no support), leaving
 * out the services reviewed or remediated (case-progress.json, findings in review/accepted/dismissed).
 * Same rule as the invoice workspace, for the amber warnings chip of the Control Center.
 */
export function patientIntakeWarningCount<T extends IntakeServiceLike & AuditIntakeServiceLike>(
    invoiceKey: string,
    services: readonly T[],
    record: InvoiceAuditRecord,
    progress: PatientIntakeProgress | null
): number {
    const resolved = resolvedIntakeServiceIds({
        reviewed: (progress?.reviewedServices ?? []).map((entry) => entry.serviceId),
        registrations: (progress?.registrations ?? []).filter((entry) => entry.invoiceKey === invoiceKey),
        findings: record.findings,
        findingStatus: intakeFindingStatusById(invoiceKey, services, record),
    });
    return countIntakeServicesWithWarnings(intakeWarningsById(services, resolved));
}

/** Agent result variables, with the finding origin used by the audit tray. */
export const PATIENT_SIGNAL_AGENTS: ReadonlyArray<{ variable: string; origin: FindingOrigin }> = [
    { variable: 'codingIntegrityResult', origin: 'codingIntegrity' },
    { variable: 'complianceAlertResult', origin: 'complianceAlert' },
    { variable: 'financialVarianceResult', origin: 'financialVariance' },
];

const SEVERITY_RANK: Record<FindingSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

function parseObject(value: unknown): Record<string, unknown> | null {
    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch {
            return null;
        }
    }
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
}

function highest(severities: Array<FindingSeverity | null>): FindingSeverity | null {
    return severities.reduce<FindingSeverity | null>((best, value) => (value && (!best || SEVERITY_RANK[value] > SEVERITY_RANK[best]) ? value : best), null);
}

export function patientFindingSignals(
    invoices: readonly PatientSignalInvoice[],
    variables: Record<string, unknown>,
    audit: InvoiceAuditState,
    servicesOf: (invoice: PatientSignalInvoice) => readonly PatientSignalService[],
    options: PatientSignalOptions = {}
): PatientFindingSignal[] {
    const first = invoices[0]?.key;
    const results = PATIENT_SIGNAL_AGENTS.map((agent) => ({ ...agent, result: parseObject(variables[agent.variable]) })).filter((agent) => !!agent.result);
    const owners = new Map<string, ReturnType<typeof fromAgentFinding>[]>();
    const codes = new Map<string, Set<string>>();
    const codesOf = (invoice: PatientSignalInvoice): Set<string> => {
        let set = codes.get(invoice.key);
        if (!set) {
            set = new Set(servicesOf(invoice).flatMap((service) => [service.serviceCode, service.cup]).filter((code): code is string => !!code));
            codes.set(invoice.key, set);
        }
        return set;
    };
    if (first) {
        for (const agent of results) {
            const findings = Array.isArray(agent.result?.['findings']) ? (agent.result?.['findings'] as AgentFindingLike[]) : [];
            findings.forEach((raw, index) => {
                if (!raw || typeof raw !== 'object') {
                    return;
                }
                const code = fromAgentFinding(agent.origin, first, raw, index).serviceCode;
                const owner = (code && invoices.find((invoice) => codesOf(invoice).has(code))?.key) || first;
                owners.set(owner, [...(owners.get(owner) ?? []), fromAgentFinding(agent.origin, owner, raw, index)]);
            });
        }
    }
    return invoices.map((invoice) => {
        const record = audit.invoices[invoice.key] ?? emptyAuditRecord();
        const tray = record.findings.filter((finding) => finding.status !== 'dismissed');
        const known = new Set(record.findings.map((finding) => finding.id));
        // A registration usually created its findings in the tray; it counts apart only when none of them is there.
        const registered = (options.registrations ?? []).filter((entry) => entry.invoiceKey === invoice.key && !entry.findingIds.some((id) => known.has(id))).length;
        const observations = (owners.get(invoice.key) ?? []).filter((candidate) => addFinding(record, candidate).added).length;
        const warnings = observations + (options.warningsOf?.(invoice) ?? 0);
        const count = tray.length + registered;
        if (!results.length && !count && !warnings) {
            return { key: invoice.key, count: null, warnings: 0, severity: null, tone: 'none' };
        }
        const severity = highest(tray.map((finding) => finding.severity));
        const tone: PatientSignalTone = count ? (severity ?? 'low') : warnings ? 'warn' : 'ok';
        return { key: invoice.key, count, warnings, severity, tone };
    });
}

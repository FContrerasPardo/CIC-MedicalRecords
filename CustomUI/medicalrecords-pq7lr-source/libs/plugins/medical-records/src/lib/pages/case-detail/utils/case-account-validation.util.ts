import { AccountSummaryPatient, AccountValidationState } from '../../../dashboard/utils/dashboard-provider-group.util';
import { CaseInvoiceOption } from './case-invoice.util';
import { ValidationState, ValidationStep, ValidationStepKey } from './case-validation-map.util';

/**
 * Validations of a medical account are per customer invoice (patient) and per account: the
 * account step is complete only when every patient passed it. Pure module: no Angular imports.
 *
 * Per-patient states come from `accountSummary.patients[].validations` when Automate writes
 * them; until then the documentary step uses the IDP review state of the patient's documents and
 * the other steps follow the account (process) state.
 */

export interface PatientValidationRow {
    key: string;
    patientName: string | null;
    invoiceNumber: string | null;
    steps: ValidationStep[];
}

export interface AccountValidationStepView extends ValidationStep {
    /** Patients that passed the step. */
    done: number;
    total: number;
    blockingCount: number;
    patients: Array<{ key: string; patientName: string | null; invoiceNumber: string | null; state: ValidationState }>;
}

/** Summary steps (Automate) for each step of the map. */
const SUMMARY_STEP: Record<ValidationStepKey, 'documents' | 'rules' | 'analysis'> = {
    documents: 'documents',
    rules: 'rules',
    coding: 'analysis',
    compliance: 'analysis',
    financial: 'analysis',
};

function fromSummary(state: AccountValidationState | undefined): ValidationState | null {
    switch (state) {
        case 'ok':
            return 'executed';
        case 'attention':
        case 'blocking':
            return 'blocking';
        case 'pending':
            return 'pending';
        default:
            return null;
    }
}

export function derivePatientValidations(
    accountSteps: readonly ValidationStep[],
    invoices: readonly CaseInvoiceOption[],
    summaryPatients: readonly AccountSummaryPatient[] = []
): PatientValidationRow[] {
    const summaryByKey = new Map(summaryPatients.map((patient) => [patient.key, patient]));
    const rulesReached = accountSteps.some((step) => step.key === 'rules' && step.state !== 'pending') || accountSteps.some((step) => step.key === 'documents' && step.state === 'executed');
    return invoices.map((invoice) => {
        const summary = summaryByKey.get(invoice.key);
        const steps = accountSteps.map((step) => {
            const reported = fromSummary(summary?.validations?.[SUMMARY_STEP[step.key]]);
            if (reported) {
                return { ...step, state: reported, source: 'real' as const };
            }
            if (step.key === 'documents') {
                const state: ValidationState = invoice.needsReview ? 'blocking' : rulesReached ? 'executed' : 'pending';
                return { ...step, state, source: invoice.needsReview ? ('real' as const) : ('inferred' as const) };
            }
            return { ...step };
        });
        return { key: invoice.key, patientName: invoice.patientName, invoiceNumber: invoice.invoiceNumber, steps };
    });
}

/** Account step = combination of its patients: blocking if any is, complete only if all are. */
export function aggregateAccountValidations(accountSteps: readonly ValidationStep[], patients: readonly PatientValidationRow[]): AccountValidationStepView[] {
    return accountSteps.map((step) => {
        if (!patients.length) {
            const done = step.state === 'executed' ? 1 : 0;
            return { ...step, done, total: 1, blockingCount: step.state === 'blocking' ? 1 : 0, patients: [] };
        }
        const rows = patients.map((patient) => ({
            key: patient.key,
            patientName: patient.patientName,
            invoiceNumber: patient.invoiceNumber,
            state: patient.steps.find((entry) => entry.key === step.key)?.state ?? 'pending',
        }));
        const done = rows.filter((row) => row.state === 'executed').length;
        const blockingCount = rows.filter((row) => row.state === 'blocking').length;
        const state: ValidationState = blockingCount ? 'blocking' : done === rows.length ? 'executed' : 'pending';
        return { ...step, state, done, total: rows.length, blockingCount, patients: rows };
    });
}

/** Identifier shown for the account: radicación/account variable, the single invoice, else the process. */
export function resolveAccountReference(
    variables: Record<string, unknown>,
    invoices: readonly CaseInvoiceOption[],
    processInstanceId: string | null | undefined
): { value: string; kind: 'account' | 'invoice' | 'process' } {
    for (const name of ['accountId', 'medicalAccountId', 'radicationId']) {
        const value = variables[name];
        if (value !== null && value !== undefined && String(value).trim()) {
            return { value: String(value).trim(), kind: 'account' };
        }
    }
    if (invoices.length === 1 && invoices[0].invoiceNumber) {
        return { value: invoices[0].invoiceNumber, kind: 'invoice' };
    }
    return { value: (processInstanceId ?? '').slice(0, 8) || '—', kind: 'process' };
}

/**
 * Patients of the account that match a search term (name, invoice, identification, record).
 * `null` when there is no term or no patient matches (the account matched by itself): show all.
 */
export function matchingInvoiceKeys(invoices: readonly CaseInvoiceOption[], term: string | null | undefined): Set<string> | null {
    const needle = (term ?? '').trim().toLowerCase();
    if (!needle) {
        return null;
    }
    const keys = invoices
        .filter((invoice) =>
            [invoice.patientName, invoice.invoiceNumber, invoice.patient?.identification, invoice.patient?.medicalRecord].some((part) =>
                (part ?? '').toLowerCase().includes(needle)
            )
        )
        .map((invoice) => invoice.key);
    return keys.length ? new Set(keys) : null;
}

/** Text a search box can match: account reference, provider and every patient and invoice. */
export function accountSearchText(parts: ReadonlyArray<string | null | undefined>, invoices: readonly CaseInvoiceOption[]): string {
    return [...parts, ...invoices.flatMap((invoice) => [invoice.patientName, invoice.invoiceNumber, invoice.patient?.identification, invoice.patient?.medicalRecord])]
        .filter((part): part is string => !!part)
        .join(' ')
        .toLowerCase();
}

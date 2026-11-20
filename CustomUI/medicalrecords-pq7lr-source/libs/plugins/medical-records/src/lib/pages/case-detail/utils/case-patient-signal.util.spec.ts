import { emptyAuditRecord, emptyAuditState, fromIntakeService } from '../invoice-workspace/audit-findings.util';
import { patientFindingSignals, patientIntakeWarningCount } from './case-patient-signal.util';

/** Synthetic intake row without support (an intake warning). */
const intakeRow = (id: string) => ({
    id,
    serviceDate: null,
    serviceCode: `SVC-${id}`,
    cup: null,
    description: `Synthetic service ${id}`,
    quantity: null,
    price: '10.00',
    total: null,
    coverage: null,
    invoiceNumber: 'INV-1',
    category: null,
    completionPercent: 50,
    requiredDocuments: ['Invoice', 'Order'],
    presentDocuments: ['Invoice'],
    missingDocuments: ['Order'],
    extractionSource: null,
    supportStatus: 'Partial',
    alerts: [],
});

// Synthetic data only.
const invoices = [{ key: 'inv-a' }, { key: 'inv-b' }];
const services: Record<string, Array<{ serviceCode: string | null; cup: string | null }>> = {
    'inv-a': [{ serviceCode: 'S-100', cup: null }],
    'inv-b': [{ serviceCode: null, cup: 'C-200' }],
};
const servicesOf = (invoice: { key: string }) => services[invoice.key] ?? [];

const finding = (id: string, severity: string, status: string) =>
    ({ id, origin: 'intake', alsoReportedBy: [], invoiceKey: 'inv-a', serviceCode: id, document: null, description: 'Synthetic', evidence: null, severity, status, comment: null }) as never;

describe('case-patient-signal.util', () => {
    it('has no signal before any agent answered, with an empty tray and no warning', () => {
        const signals = patientFindingSignals(invoices, {}, emptyAuditState(), servicesOf);
        expect(signals.map((signal) => signal.tone)).toEqual(['none', 'none']);
        expect(signals[0].count).toBeNull();
    });

    it('counts agent observations not in the tray as warnings, never as findings', () => {
        const variables = {
            codingIntegrityResult: JSON.stringify({
                findings: [
                    { findingId: 'f1', serviceCode: 'C-200', riskLevel: 'HIGH', description: 'Synthetic coding observation' },
                    { findingId: 'f2', serviceCode: 'C-200', riskLevel: 'LOW', description: 'Synthetic minor observation' },
                    { findingId: 'f3', description: 'Synthetic account-level observation' },
                ],
            }),
            complianceAlertResult: JSON.stringify({ findings: [] }),
        };
        const [a, b] = patientFindingSignals(invoices, variables, emptyAuditState(), servicesOf);
        expect(b).toEqual({ key: 'inv-b', count: 0, warnings: 2, severity: null, tone: 'warn' });
        // Without a matching code the observation belongs to the first invoice.
        expect(a.warnings).toBe(1);
        expect(a.count).toBe(0);
    });

    it('adds the intake warnings of each patient', () => {
        const signals = patientFindingSignals(invoices, {}, emptyAuditState(), servicesOf, { warningsOf: (invoice) => (invoice.key === 'inv-a' ? 3 : 0) });
        expect(signals[0]).toEqual({ key: 'inv-a', count: 0, warnings: 3, severity: null, tone: 'warn' });
        expect(signals[1].tone).toBe('none');
    });

    it('counts the audit tray without dismissed ones as findings and keeps its highest severity', () => {
        const variables = { financialVarianceResult: JSON.stringify({ findings: [] }) };
        const audit = emptyAuditState();
        audit.invoices['inv-a'] = { ...emptyAuditRecord(), findings: [finding('x1', 'medium', 'open'), finding('x2', 'critical', 'dismissed')] };
        const [a, b] = patientFindingSignals(invoices, variables, audit, servicesOf, { warningsOf: () => 2 });
        expect(a).toEqual({ key: 'inv-a', count: 1, warnings: 2, severity: 'medium', tone: 'medium' });
        expect(b).toEqual({ key: 'inv-b', count: 0, warnings: 2, severity: null, tone: 'warn' });
    });

    it('counts registrations of the analyst only when their findings are not in the tray', () => {
        const audit = emptyAuditState();
        audit.invoices['inv-a'] = { ...emptyAuditRecord(), findings: [finding('x1', 'low', 'open')] };
        const registrations = [
            { invoiceKey: 'inv-a', findingIds: ['x1'] },
            { invoiceKey: 'inv-b', findingIds: ['missing'] },
        ];
        const [a, b] = patientFindingSignals(invoices, {}, audit, servicesOf, { registrations });
        expect(a.count).toBe(1);
        expect(b).toEqual({ key: 'inv-b', count: 1, warnings: 0, severity: null, tone: 'low' });
    });

    it('leaves reviewed and remediated services out of the patient warnings chip', () => {
        const rows = [intakeRow('p1'), intakeRow('p2'), intakeRow('p3'), intakeRow('p4')];
        const record = { ...emptyAuditRecord(), findings: [{ ...fromIntakeService('inv-a', rows[3]), status: 'dismissed' as const }] };
        // A computed total (no quantity, no total) is not a warning: only the missing support counts.
        expect(patientIntakeWarningCount('inv-a', rows, emptyAuditRecord(), null)).toBe(4);
        const progress = {
            reviewedServices: [{ serviceId: 'p1' }],
            registrations: [
                { invoiceKey: 'inv-a', kind: 'remediation', serviceIds: ['p2'], findingIds: [] },
                { invoiceKey: 'inv-b', kind: 'remediation', serviceIds: ['p3'], findingIds: [] },
            ],
        };
        expect(patientIntakeWarningCount('inv-a', rows, record, progress)).toBe(1);
        const audit = emptyAuditState();
        audit.invoices['inv-a'] = record;
        const [a] = patientFindingSignals(invoices, {}, audit, servicesOf, { warningsOf: (invoice) => patientIntakeWarningCount(invoice.key, invoice.key === 'inv-a' ? rows : [], record, progress) });
        expect(a.warnings).toBe(1);
        const allReviewed = { reviewedServices: rows.map((row) => ({ serviceId: row.id })), registrations: [] };
        expect(patientIntakeWarningCount('inv-a', rows, emptyAuditRecord(), allReviewed)).toBe(0);
    });

    it('is ok with no findings and no warnings once agents answered', () => {
        const [, b] = patientFindingSignals(invoices, { codingIntegrityResult: '{"findings":[]}' }, emptyAuditState(), servicesOf);
        expect(b).toEqual({ key: 'inv-b', count: 0, warnings: 0, severity: null, tone: 'ok' });
    });
});

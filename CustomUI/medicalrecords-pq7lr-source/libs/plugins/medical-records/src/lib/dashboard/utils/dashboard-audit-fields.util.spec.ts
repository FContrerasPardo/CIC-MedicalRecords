import { fromDocumentationRules } from '../../pages/agreements/checklist/documentation-checklist.util';
import { needForWidget } from './dashboard-data-plan.util';
import {
    accountAgentSignals,
    accountAuditSignals,
    accountBilledAmount,
    accountStage,
    ACCOUNT_STAGES,
    accountStageLabelKey,
    normalizeAccountStage,
    accountMissingDocuments,
    addDerivedFields,
    reconciliationHours,
    derivedFieldVariables,
    derivedFieldsNeedChecklist,
    auditReasonLabelKey,
    widgetDerivedFields,
} from './dashboard-audit-fields.util';

// Synthetic data only.
function summary(value: Record<string, unknown>): string {
    return JSON.stringify(value);
}

const CHECKLIST = fromDocumentationRules({
    rulesetId: 'TEST',
    rules: [
        { ruleId: 'ALL', description: 'Every account', requiredDocuments: ['Medical Order', 'Clinical Notes'] },
        { ruleId: 'RX', appliesToProcedureCode: '903895', description: 'Imaging', requiredDocuments: ['Radiology Report'] },
    ],
});

const BATCH = {
    documents: [
        {
            id: 'd1',
            className: 'Factura y Desglose',
            fields: [{ name: 'Numero de Factura', value: 'F-1' }],
            tables: [{ name: 'Tabla de Servicios facturados', records: [{ records: [{ recordName: 'CUPS', value: '903895' }] }] }],
        },
        { id: 'd2', className: 'Medical Order' },
    ],
};

describe('dashboard-audit-fields util (derived fields)', () => {
    describe('reconciliation time', () => {
        it('measures start to completion of completed instances in hours', () => {
            expect(reconciliationHours({ status: 'COMPLETED', startDate: '2026-11-10T08:00:00Z', completedDate: '2026-11-11T02:00:00Z' })).toBe(18);
        });

        it('is null for running instances or invalid dates', () => {
            expect(reconciliationHours({ status: 'RUNNING', startDate: '2026-11-10T08:00:00Z', completedDate: '' })).toBeNull();
            expect(reconciliationHours({ status: 'COMPLETED', startDate: '2026-11-10T08:00:00Z', completedDate: '2026-11-09T08:00:00Z' })).toBeNull();
        });
    });

    describe('account signals', () => {
        it('marks an audit finding when an agent asks for manual review or reports high risk, or an invoice was rejected', () => {
            expect(accountAuditSignals({ var_codingIntegrityResult: JSON.stringify({ requiresManualReview: true }) }, null).withFinding).toBe(true);
            expect(accountAuditSignals({ var_financialVarianceResult: { overallRiskLevel: 'high' } }, null).withFinding).toBe(true);
            expect(accountAuditSignals({ var_accountSummary: summary({ patients: [{ key: 'p1', rejected: true, documentClasses: {} }] }) }, null).withFinding).toBe(true);
            expect(accountAuditSignals({ var_complianceAlertResult: { overallRiskLevel: 'LOW' } }, null).withFinding).toBe(false);
        });

        it('derives the reasons from each agent result', () => {
            const row = {
                var_codingIntegrityResult: { codingSummary: { duplicatesDetected: 1 } },
                var_financialVarianceResult: { analyzedTotals: { totalsMatch: false, varianceAmount: -150 } },
                var_complianceAlertResult: {
                    missingDocuments: [{ documentType: 'Medical Order' }],
                    findings: [{ type: 'MISSING_DOCUMENT', requiredDocumentType: 'Medical Order' }, { type: 'PAYER_POLICY' }],
                },
                var_accountSummary: summary({ totalBilled: 1000 }),
            };
            const signals = accountAuditSignals(row, null);
            expect(signals.reasons).toEqual(['documentation', 'coding', 'tariff', 'compliance']);
            expect(signals.varianceAmount).toBe(150);
            expect(signals.billed).toBe(1000);
        });

        it('does not count compliance when its only findings are about documents', () => {
            expect(accountAuditSignals({ var_complianceAlertResult: { findings: [{ type: 'MISSING_DOCUMENT' }] } }, null).reasons).toEqual([]);
        });
    });

    describe('missing documents', () => {
        it('evaluates the checklist per customer invoice of the IDP output', () => {
            expect(accountMissingDocuments({ var_batchState: JSON.stringify(BATCH) }, CHECKLIST)).toEqual([['Clinical Notes', 'Radiology Report']]);
        });

        it('falls back to the document classes of the account summary', () => {
            const row = {
                var_accountSummary: summary({
                    patients: [
                        { key: 'p1', documentClasses: { 'Medical Order': 1 } },
                        { key: 'p2', documentClasses: { 'Clinical Notes': 1, 'Medical Order': 1 } },
                    ],
                }),
            };
            expect(accountMissingDocuments(row, CHECKLIST)).toEqual([['Clinical Notes'], []]);
        });

        it('returns nothing without a checklist', () => {
            expect(accountMissingDocuments({ var_batchState: JSON.stringify(BATCH) }, null)).toEqual([]);
        });
    });

    describe('derived columns', () => {
        const row: Record<string, string> = {
            status: 'COMPLETED',
            startDate: '2026-11-10T08:00:00Z',
            completedDate: '2026-11-10T20:30:00Z',
            var_accountSummary: summary({ provider: 'Clinica Uno', payer: 'ARS Demo', totalBilled: 500 }),
            var_codingIntegrityResult: JSON.stringify({ requiresManualReview: true, findings: [{ type: 'DUPLICATE' }] }),
            var_financialVarianceResult: JSON.stringify({ analyzedTotals: { varianceAmount: 50 } }),
            var_batchState: JSON.stringify(BATCH),
        };

        it('adds only the requested calc_ columns as strings', () => {
            const out = addDerivedFields(row, ['calc_reconciliationHours', 'calc_provider', 'calc_payer', 'calc_auditFinding', 'calc_auditVarianceAmount', 'calc_billedAmount'], null);
            expect(out['calc_reconciliationHours']).toBe('12.5');
            expect(out['calc_provider']).toBe('Clinica Uno');
            expect(out['calc_payer']).toBe('ARS Demo');
            expect(out['calc_auditFinding']).toBe('1');
            expect(out['calc_auditVarianceAmount']).toBe('50');
            expect(out['calc_billedAmount']).toBe('500');
            expect(out['calc_auditReasons']).toBe(undefined);
        });

        it('stores reasons as translation keys and missing documents as JSON lists', () => {
            const out = addDerivedFields(row, ['calc_auditReasons', 'calc_missingDocuments'], CHECKLIST);
            expect(JSON.parse(out['calc_auditReasons'])).toEqual([auditReasonLabelKey('documentation'), auditReasonLabelKey('coding')]);
            expect(JSON.parse(out['calc_missingDocuments'])).toEqual(['Clinical Notes', 'Radiology Report']);
        });

        it('returns the same row when no derived field is bound', () => {
            expect(addDerivedFields(row, [], null)).toBe(row);
        });
    });

    describe('data plan', () => {
        it('finds the derived fields a widget binds and the variables they read', () => {
            const fields = widgetDerivedFields({
                id: 'w1',
                type: 'chart',
                bindings: { argumentField: 'calc_provider', valueField: 'calc_auditFinding', valueAggregation: 'avg' },
            });
            expect(fields).toEqual(['calc_auditFinding', 'calc_provider']);
            expect(derivedFieldVariables(fields)).toContain('codingIntegrityResult');
            expect(derivedFieldVariables(fields)).toContain('batchState');
            expect(derivedFieldsNeedChecklist(fields)).toBe(false);
            expect(derivedFieldsNeedChecklist(['calc_missingDocuments'])).toBe(true);
        });

        it('declares the derived-field variables in the widget need', () => {
            const need = needForWidget({
                id: 'w2',
                type: 'chart',
                dataSource: 'process',
                processQuery: { processDefinitionKey: 'medical-records', metricScope: 'root' },
                bindings: { argumentField: 'calc_missingDocuments' },
            });
            expect(need?.variables).toEqual(['accountSummary', 'batchState']);
        });
    });
});

describe('dashboard-audit-fields util (amounts, stages, agents)', () => {
    it('counts the billed amount once, preferring the per-invoice totals of the summary', () => {
        const v3 = { var_accountSummary: summary({ totalBilled: 999, patients: [{ key: 'a', totals: { billed: 100 } }, { key: 'b', totals: { billed: 50 } }] }) };
        expect(accountBilledAmount(v3)).toBe(150);
        expect(accountBilledAmount({ var_accountSummary: summary({ totalBilled: 300 }) })).toBe(300);
        expect(accountBilledAmount({ var_financialVarianceResult: { analyzedTotals: { invoiceTotal: 75 } } })).toBe(75);
        expect(accountBilledAmount({})).toBe(0);
    });

    it('splits billed, in-audit and observed amounts without double counting', () => {
        const row: Record<string, string> = {
            status: 'RUNNING',
            var_accountSummary: summary({ totalBilled: 400 }),
            var_codingIntegrityResult: JSON.stringify({ requiresManualReview: true }),
        };
        const out = addDerivedFields(row, ['calc_billedAmount', 'calc_inAuditAmount', 'calc_observedAmount'], null);
        expect([out['calc_billedAmount'], out['calc_inAuditAmount'], out['calc_observedAmount']]).toEqual(['400', '400', '400']);
        const closed = addDerivedFields({ ...row, status: 'COMPLETED', var_codingIntegrityResult: '' }, ['calc_inAuditAmount', 'calc_observedAmount'], null);
        expect([closed['calc_inAuditAmount'], closed['calc_observedAmount']]).toEqual(['0', '0']);
    });

    it('has no rules stage and maps the legacy rules stage to agent analysis', () => {
        expect(ACCOUNT_STAGES).toEqual(['1_RECEIVED', '2_INTAKE', '4_AGENTS', '5_AUDIT', '6_CLOSED']);
        expect(ACCOUNT_STAGES.map(accountStageLabelKey).some((key) => key.includes('RULES'))).toBe(false);
        expect(normalizeAccountStage('3_RULES')).toBe('4_AGENTS');
        expect(normalizeAccountStage('2_INTAKE')).toBe('2_INTAKE');
        expect(normalizeAccountStage('X')).toBeNull();
        const out = addDerivedFields({ status: 'RUNNING', var_batchState: JSON.stringify({ documents: [] }) }, ['calc_stage'], null);
        expect(out['calc_stage']).toBe('MEDICAL_RECORDS.DASHBOARD.ACCOUNT_STAGE.STAGE_4_AGENTS');
    });

    it('infers the stage from status and variables', () => {
        expect(accountStage({ status: 'COMPLETED' })).toBe('6_CLOSED');
        expect(accountStage({ status: 'CANCELLED' })).toBeNull();
        expect(accountStage({ status: 'RUNNING' })).toBe('1_RECEIVED');
        expect(accountStage({ status: 'RUNNING', var_batchState: JSON.stringify({ documents: [{ id: 'd', extractionReviewStatus: 'ReviewRequired' }] }) })).toBe('2_INTAKE');
        // The former rules stage (IDP reviewed, no agent result yet) shows as agent analysis.
        expect(accountStage({ status: 'RUNNING', var_batchState: JSON.stringify({ documents: [] }) })).toBe('4_AGENTS');
        expect(accountStage({ status: 'RUNNING', var_codingIntegrityResult: '{"a":1}' })).toBe('4_AGENTS');
        expect(
            accountStage({ status: 'RUNNING', var_codingIntegrityResult: '{"a":1}', var_complianceAlertResult: '{"a":1}', var_financialVarianceResult: '{"a":1}' })
        ).toBe('5_AUDIT');
    });

    it('lists the agents that raised a risk signal, from their own results only', () => {
        const row = {
            var_codingIntegrityResult: JSON.stringify({ findings: [{ type: 'DUPLICATE' }] }),
            var_complianceAlertResult: JSON.stringify({ overallRiskLevel: 'LOW', findings: [] }),
            var_financialVarianceResult: JSON.stringify({ overallRiskLevel: 'HIGH' }),
        };
        expect(accountAgentSignals(row)).toEqual([
            'MEDICAL_RECORDS.DASHBOARD.AUDIT_AGENT.CODING_INTEGRITY',
            'MEDICAL_RECORDS.DASHBOARD.AUDIT_AGENT.FINANCIAL_VARIANCE',
        ]);
    });
});

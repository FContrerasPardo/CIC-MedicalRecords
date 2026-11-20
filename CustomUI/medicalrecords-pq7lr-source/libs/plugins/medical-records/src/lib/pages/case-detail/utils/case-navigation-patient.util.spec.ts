import { buildCaseQueryParams, INTAKE_FINDINGS_SUB, patientChipTarget, readCaseRouteContext, resolveInitialInvoiceKey } from './case-navigation.util';

// Synthetic data only.
const reference = { processInstanceId: 'proc-child', rootProcessInstanceId: 'proc-root', taskId: null, taskProcessName: null } as never;
const KEYS = ['inv-1', 'inv-2', 'inv-3'];

describe('case-navigation.util patient chip', () => {
    it('opens the audit of the patient once the account reached the audit', () => {
        const params = buildCaseQueryParams(reference, patientChipTarget('5_AUDIT', 'inv-2'));
        expect(params).toEqual({ processInstanceId: 'proc-root', tab: 'audit', invoice: 'inv-2' });
    });

    it('opens the intake of the patient with the Findings panel before the audit', () => {
        for (const stage of ['1_RECEIVED', '2_INTAKE', '4_AGENTS', null]) {
            const params = buildCaseQueryParams(reference, patientChipTarget(stage, 'inv-3'));
            expect(params).toEqual({ processInstanceId: 'proc-root', tab: 'intake', sub: INTAKE_FINDINGS_SUB, invoice: 'inv-3' });
        }
    });

    it('reads the patient and the section back from the query params', () => {
        const params = buildCaseQueryParams(reference, patientChipTarget('2_INTAKE', 'inv-3'));
        const context = readCaseRouteContext((key) => params[key] ?? null);
        expect(context.invoiceKey).toBe('inv-3');
        expect(context.target).toEqual({ tab: 'intake', subTab: 'findings' });
    });

    it('opens the patient of the URL, else the last one worked on, else none', () => {
        expect(resolveInitialInvoiceKey('inv-2', 'inv-3', KEYS)).toBe('inv-2');
        expect(resolveInitialInvoiceKey(null, 'inv-3', KEYS)).toBe('inv-3');
        expect(resolveInitialInvoiceKey('inv-unknown', 'inv-3', KEYS)).toBe('inv-3');
        expect(resolveInitialInvoiceKey(null, 'inv-gone', KEYS)).toBeNull();
        expect(resolveInitialInvoiceKey(null, null, KEYS)).toBeNull();
    });
});

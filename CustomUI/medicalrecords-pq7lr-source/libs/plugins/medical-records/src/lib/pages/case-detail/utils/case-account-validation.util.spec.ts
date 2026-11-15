import { CaseInvoiceOption } from './case-invoice.util';
import { accountSearchText, aggregateAccountValidations, matchingInvoiceKeys, derivePatientValidations, resolveAccountReference } from './case-account-validation.util';
import { ValidationStep } from './case-validation-map.util';

const step = (key: ValidationStep['key'], state: ValidationStep['state']): ValidationStep => ({ key, state, source: 'inferred', target: { tab: 'summary' } });

const invoice = (key: string, needsReview = false): CaseInvoiceOption => ({
    key,
    patientName: `Synthetic ${key}`,
    invoiceNumber: `F-${key}`,
    documentIds: [key],
    documentCount: 1,
    totalBilled: null,
    currency: null,
    needsReview,
    patient: { identification: `ID-${key}`, medicalRecord: `H-${key}` } as CaseInvoiceOption['patient'],
});

describe('account validations (per patient and per account)', () => {
    const accountSteps = [step('documents', 'blocking'), step('rules', 'pending'), step('coding', 'executed')];

    it('uses each patient’s IDP review for the documentary step and the account state for the rest', () => {
        const rows = derivePatientValidations(accountSteps, [invoice('a', true), invoice('b')]);
        expect(rows[0].steps.map((entry) => entry.state)).toEqual(['blocking', 'pending', 'executed']);
        expect(rows[1].steps.map((entry) => entry.state)).toEqual(['pending', 'pending', 'executed']);
    });

    it('prefers the states written by Automate in the account summary', () => {
        const rows = derivePatientValidations(accountSteps, [invoice('a')], [
            { key: 'a', invoice: {}, totals: {}, patient: {}, documentIds: [], documentCount: 0, reviewRequired: false, validations: { rules: 'ok', analysis: 'attention' } },
        ]);
        expect(rows[0].steps.map((entry) => entry.state)).toEqual(['pending', 'executed', 'blocking']);
        expect(rows[0].steps[1].source).toBe('real');
    });

    it('completes an account step only when every patient passed it', () => {
        const rows = derivePatientValidations([step('documents', 'pending'), step('coding', 'executed')], [invoice('a', true), invoice('b')]);
        const account = aggregateAccountValidations([step('documents', 'pending'), step('coding', 'executed')], rows);
        expect(account[0].state).toBe('blocking');
        expect(account[0].blockingCount).toBe(1);
        expect(account[0].done).toBe(0);
        expect(account[1].state).toBe('executed');
        expect(account[1].done).toBe(2);
        expect(account[1].total).toBe(2);
        expect(account[1].patients.map((patient) => patient.key)).toEqual(['a', 'b']);
    });

    it('keeps the account state when there are no invoices', () => {
        const account = aggregateAccountValidations([step('rules', 'executed')], []);
        expect(account[0].state).toBe('executed');
        expect(account[0].total).toBe(1);
    });

    it('identifies the account by its variable, its single invoice or the process', () => {
        expect(resolveAccountReference({ accountId: 'RAD-1' }, [invoice('a')], 'p-123456789')).toEqual({ value: 'RAD-1', kind: 'account' });
        expect(resolveAccountReference({}, [invoice('a')], 'p-123456789')).toEqual({ value: 'F-a', kind: 'invoice' });
        expect(resolveAccountReference({}, [invoice('a'), invoice('b')], 'p-123456789')).toEqual({ value: 'p-123456', kind: 'process' });
    });

    it('lets the search match any patient of the account', () => {
        const text = accountSearchText(['RAD-1', 'Synthetic Hospital'], [invoice('a'), invoice('b')]);
        expect(text).toContain('synthetic b');
        expect(text).toContain('id-a');
        expect(text).toContain('synthetic hospital');
    });

    it('narrows the patients of an account to those matching the search', () => {
        const invoices = [invoice('a'), invoice('b')];
        expect(matchingInvoiceKeys(invoices, '')).toBeNull();
        expect([...(matchingInvoiceKeys(invoices, 'synthetic b') ?? [])]).toEqual(['b']);
        expect([...(matchingInvoiceKeys(invoices, 'H-A') ?? [])]).toEqual(['a']);
        expect(matchingInvoiceKeys(invoices, 'hospital')).toBeNull();
    });
});

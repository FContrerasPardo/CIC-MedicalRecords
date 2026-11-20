import {
    aggregateVerificationStatus,
    buildSimulatedVerification,
    deriveExternalCheckRows,
    deriveValidationStates,
    externalChecksFor,
    externalChecksSettled,
    externalVerificationInvoices,
} from './external-verification.util';

describe('radication external verifications', () => {
    it('lists the systems of each channel; prior claims only for the ARS, HIS only when authorized', () => {
        expect(externalChecksFor('provider').map((check) => check.key)).toEqual(['affiliation', 'authorization', 'contract']);
        expect(externalChecksFor('provider', { hisAuthorized: true }).map((check) => check.key)).toEqual(['affiliation', 'authorization', 'contract']);
        expect(externalChecksFor('ars').map((check) => check.key)).toEqual(['affiliation', 'authorization', 'contract', 'priorClaims']);
        expect(externalChecksFor('ars', { hisAuthorized: true }).map((check) => check.key)).toEqual(['affiliation', 'authorization', 'contract', 'priorClaims', 'providerHis']);
        expect(externalChecksFor('ars').every((check) => check.mode === 'simulated')).toBe(true);
    });

    it('lists the validation types of each provider system', () => {
        const validations = Object.fromEntries(externalChecksFor('provider').map((check) => [check.key, check.validationKeys.map((key) => key.split('.').pop())]));
        expect(validations).toEqual({
            affiliation: ['AFFILIATION_ACTIVE', 'AFFILIATION_PLAN', 'AFFILIATION_COPAY'],
            authorization: ['AUTHORIZATION_PRIOR', 'AUTHORIZATION_VALIDITY', 'AUTHORIZATION_MATCH'],
            contract: ['CONTRACT_TARIFF', 'CONTRACT_VARIATION', 'CONTRACT_SERVICES'],
        });
    });

    it('verifies every invoice of every system: the demo shows no alerts', () => {
        const invoices = Array.from({ length: 40 }, (_, index) => ({ invoiceNumber: `SYN-FAC-${index}`, patientRef: `P-${index + 1}` }));
        for (const check of externalChecksFor('ars', { hisAuthorized: true })) {
            const result = buildSimulatedVerification(check.key, { providerId: 'SYN-PROVIDER', invoices }, '2026-01-01T00:00:00.000Z');
            expect(result.items.length).toBe(40);
            expect(result.mode).toBe('simulated');
            expect(result.checkedAt).toBe('2026-01-01T00:00:00.000Z');
            expect(result.status).toBe('ok');
            expect(result.items.every((item) => item.status === 'ok' && item.detailKey.endsWith('_OK'))).toBe(true);
        }
    });

    it('answers no_response only without items or with an unanswered item', () => {
        expect(aggregateVerificationStatus([])).toBe('no_response');
        expect(aggregateVerificationStatus([{ status: 'ok' }, { status: 'no_response' }])).toBe('no_response');
        expect(aggregateVerificationStatus([{ status: 'ok' }, { status: 'ok' }])).toBe('ok');
    });

    it('checks the validation types one by one and ends with all of them verified', () => {
        const [check] = externalChecksFor('provider');
        const row = (state: 'querying' | 'ok') => ({ definition: check, state, result: null });
        const third = check.durationMs / 3;
        expect(deriveValidationStates(row('querying'), 0)).toEqual(['checking', 'pending', 'pending']);
        expect(deriveValidationStates(row('querying'), third)).toEqual(['ok', 'checking', 'pending']);
        expect(deriveValidationStates(row('querying'), third * 2)).toEqual(['ok', 'ok', 'checking']);
        // Held (no result yet): the last type keeps checking whatever the time.
        expect(deriveValidationStates(row('querying'), 60000)).toEqual(['ok', 'ok', 'checking']);
        expect(deriveValidationStates(row('ok'), 0)).toEqual(['ok', 'ok', 'ok']);
        expect(deriveValidationStates({ definition: { ...check, validationKeys: [] }, state: 'querying', result: null }, 0)).toEqual([]);
    });

    it('uses the account invoices or synthetic references from a count', () => {
        expect(externalVerificationInvoices([{ invoiceNumber: 'FAC-9' }, { invoiceNumber: null }])).toEqual([{ invoiceNumber: 'FAC-9', patientRef: 'P-1' }]);
        expect(externalVerificationInvoices(null, 2, 'RAD-1')).toEqual([
            { invoiceNumber: 'RAD-1-1', patientRef: 'P-1' },
            { invoiceNumber: 'RAD-1-2', patientRef: 'P-2' },
        ]);
        expect(externalVerificationInvoices([], 0).length).toBe(1);
    });

    it('keeps each row querying until its time passed and its result arrived, and holds the last row', () => {
        const checks = externalChecksFor('provider');
        const query = { providerId: 'SYN', invoices: [{ invoiceNumber: 'FAC-1', patientRef: 'P-1' }] };
        const results = Object.fromEntries(checks.map((check) => [check.key, buildSimulatedVerification(check.key, query, 'now')]));
        const states = (elapsedMs: number, released: boolean, withResults = true) =>
            deriveExternalCheckRows(checks, { elapsedMs, results: withResults ? results : {}, released }).map((row) => row.state);

        expect(states(0, true)).toEqual(['querying', 'querying', 'querying']);
        expect(states(60000, true, false)).toEqual(['querying', 'querying', 'querying']);
        const afterFirst = states(checks[0].durationMs, false);
        expect(afterFirst[0]).toBe(results['affiliation'].status);
        expect(afterFirst.slice(1)).toEqual(['querying', 'querying']);

        const held = deriveExternalCheckRows(checks, { elapsedMs: 60000, results, released: false });
        expect(held[2].state).toBe('querying');
        expect(held[2].result).toBeNull();
        expect(externalChecksSettled(held)).toBe(false);

        const released = deriveExternalCheckRows(checks, { elapsedMs: 60000, results, released: true });
        expect(released.map((row) => row.state)).toEqual(checks.map((check) => results[check.key].status));
        expect(externalChecksSettled(released)).toBe(true);
    });
});

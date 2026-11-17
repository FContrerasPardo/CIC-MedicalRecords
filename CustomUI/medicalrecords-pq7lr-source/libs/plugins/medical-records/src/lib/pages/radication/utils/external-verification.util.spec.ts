import {
    aggregateVerificationStatus,
    buildSimulatedVerification,
    deriveExternalCheckRows,
    externalChecksFor,
    externalChecksSettled,
    externalVerificationInvoices,
    hashText,
    simulatedItemStatus,
} from './external-verification.util';

describe('radication external verifications', () => {
    it('lists the systems of each channel; prior claims only for the ARS, HIS only when authorized', () => {
        expect(externalChecksFor('provider').map((check) => check.key)).toEqual(['affiliation', 'authorization', 'contract']);
        expect(externalChecksFor('provider', { hisAuthorized: true }).map((check) => check.key)).toEqual(['affiliation', 'authorization', 'contract']);
        expect(externalChecksFor('ars').map((check) => check.key)).toEqual(['affiliation', 'authorization', 'contract', 'priorClaims']);
        expect(externalChecksFor('ars', { hisAuthorized: true }).map((check) => check.key)).toEqual(['affiliation', 'authorization', 'contract', 'priorClaims', 'providerHis']);
        expect(externalChecksFor('ars').every((check) => check.mode === 'simulated')).toBe(true);
    });

    it('derives the same synthetic result for the same invoice', () => {
        expect(hashText('FAC-001')).toBe(hashText('FAC-001'));
        expect(hashText('FAC-001')).not.toBe(hashText('FAC-002'));
        expect(simulatedItemStatus('contract', 'fac-001 ')).toBe(simulatedItemStatus('contract', 'FAC-001'));
        const statuses = new Set(Array.from({ length: 40 }, (_, index) => simulatedItemStatus('contract', `FAC-${index}`)));
        expect(statuses.has('ok')).toBe(true);
        expect(statuses.has('inconsistency')).toBe(true);
    });

    it('builds one item per invoice and keeps the worst status', () => {
        const invoices = Array.from({ length: 12 }, (_, index) => ({ invoiceNumber: `FAC-${index}`, patientRef: `P-${index + 1}` }));
        const result = buildSimulatedVerification('affiliation', { providerId: 'SYN-PROVIDER', invoices }, '2026-01-01T00:00:00.000Z');
        expect(result.items.length).toBe(12);
        expect(result.mode).toBe('simulated');
        expect(result.checkedAt).toBe('2026-01-01T00:00:00.000Z');
        expect(result.items.every((item) => ['ok', 'alert'].includes(item.status))).toBe(true);
        expect(result.status).toBe(result.items.some((item) => item.status === 'alert') ? 'alert' : 'ok');
        expect(result.items[0].detailKey).toContain('MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.DETAIL.AFFILIATION_');
    });

    it('aggregates statuses by severity', () => {
        expect(aggregateVerificationStatus([])).toBe('no_response');
        expect(aggregateVerificationStatus([{ status: 'ok' }, { status: 'no_response' }])).toBe('no_response');
        expect(aggregateVerificationStatus([{ status: 'alert' }, { status: 'no_response' }])).toBe('alert');
        expect(aggregateVerificationStatus([{ status: 'alert' }, { status: 'inconsistency' }, { status: 'ok' }])).toBe('inconsistency');
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

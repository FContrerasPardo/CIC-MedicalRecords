import {
    extractBatchBillingIdentity,
    groupInstancesByProvider,
    providerGroupKey,
    UNIDENTIFIED_PROVIDER_KEY,
} from './dashboard-provider-group.util';

function batch(provider: string | null, extra: object = {}): unknown {
    return {
        documents: [
            {
                fields: [
                    { name: 'Nombre del Paciente', value: 'Paciente Sintetico' },
                    ...(provider === null ? [] : [{ name: 'Prestador', value: provider }]),
                    { name: 'Numero de Factura', value: 'F-0001' },
                ],
                ...extra,
            },
        ],
    };
}

describe('dashboard-provider-group.util', () => {
    describe('extractBatchBillingIdentity', () => {
        it('reads provider and invoice from document fields', () => {
            const identity = extractBatchBillingIdentity(batch('Clinica Ejemplo'));
            expect(identity.providerName).toBe('Clinica Ejemplo');
            expect(identity.invoiceNumber).toBe('F-0001');
            expect(identity.reviewRequired).toBe(false);
        });

        it('accepts a JSON string and the IPS alias', () => {
            const raw = JSON.stringify({ fields: [{ name: 'IPS', value: 'Centro Demo' }] });
            expect(extractBatchBillingIdentity(raw).providerName).toBe('Centro Demo');
        });

        it('ignores placeholder values and invalid input', () => {
            expect(extractBatchBillingIdentity(batch('NULL')).providerName).toBeNull();
            expect(extractBatchBillingIdentity('not json').providerName).toBeNull();
            expect(extractBatchBillingIdentity(null).providerName).toBeNull();
        });

        it('flags review required from any document status', () => {
            const identity = extractBatchBillingIdentity(batch('A', { extractionReviewStatus: 'ReviewRequired' }));
            expect(identity.reviewRequired).toBe(true);
        });
    });

    describe('providerGroupKey', () => {
        it('ignores case, accents and spacing', () => {
            expect(providerGroupKey('  Clínica   Ejemplo ')).toBe(providerGroupKey('CLINICA ejemplo'));
        });

        it('maps empty names to the unidentified key', () => {
            expect(providerGroupKey('')).toBe(UNIDENTIFIED_PROVIDER_KEY);
            expect(providerGroupKey(null)).toBe(UNIDENTIFIED_PROVIDER_KEY);
        });
    });

    describe('groupInstancesByProvider', () => {
        it('groups spelling variants and counts statuses', () => {
            const groups = groupInstancesByProvider([
                { status: 'RUNNING', batchState: batch('Clinica Ejemplo') },
                { status: 'completed', batchState: batch('CLINICA  EJEMPLO') },
                { status: 'CANCELLED', batchState: batch('Clinica Ejemplo') },
            ]);
            expect(groups.length).toBe(1);
            expect(groups[0].name).toBe('Clinica Ejemplo');
            expect(groups[0].total).toBe(3);
            expect(groups[0].running).toBe(1);
            expect(groups[0].completed).toBe(1);
            expect(groups[0].cancelled).toBe(1);
        });

        it('puts instances without provider in the unidentified group, last', () => {
            const groups = groupInstancesByProvider([
                { status: 'RUNNING', batchState: batch(null) },
                { status: 'RUNNING', batchState: batch(null) },
                { status: 'RUNNING', batchState: batch('Centro Demo') },
            ]);
            expect(groups.map((group) => group.key)).toEqual(['CENTRO DEMO', UNIDENTIFIED_PROVIDER_KEY]);
            expect(groups[1].name).toBeNull();
            expect(groups[1].total).toBe(2);
        });

        it('returns an empty list for no rows', () => {
            expect(groupInstancesByProvider([])).toEqual([]);
        });
    });
});

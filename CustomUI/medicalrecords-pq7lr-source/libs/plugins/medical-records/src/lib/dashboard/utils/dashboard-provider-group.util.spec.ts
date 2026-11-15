import {
    extractBatchBillingIdentity,
    DEFAULT_PROVIDER_KPI_KEYS,
    groupInstancesByProvider,
    isProviderDataPartial,
    buildProviderCards,
    moveProviderKpi,
    providerRequiredVariables,
    resolveProviderMetrics,
    rowMatchesCard,
    variablesToRow,
    readBatchFieldValue,
    resolveGroupName,
    resolveProviderKpiKeys,
    toggleProviderKpi,
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

    describe('isProviderDataPartial', () => {
        it('flags partial data above the enrich limit', () => {
            expect(isProviderDataPartial(100, 100)).toBe(false);
            expect(isProviderDataPartial(101, 100)).toBe(true);
        });
    });

    describe('group-by source', () => {
        const batchJson = JSON.stringify({ documents: [{ fields: [{ name: 'Nombre del Prestador', value: 'Clinica Demo' }, { name: 'ARS', value: 'Payer Demo' }] }] });

        it('reads a named IDP field accent- and case-insensitively', () => {
            expect(readBatchFieldValue(batchJson, 'nombre del prestador')).toBe('Clinica Demo');
            expect(readBatchFieldValue(batchJson, 'Missing')).toBeNull();
        });

        it('defaults to the provider aliases when no field is configured', () => {
            expect(resolveGroupName({ var_batchState: batchJson }, undefined)).toBeUndefined();
            expect(resolveGroupName({ var_batchState: batchJson }, { source: 'batch-field', name: '' })).toBeUndefined();
        });

        it('groups by another IDP field or a process variable', () => {
            expect(resolveGroupName({ var_batchState: batchJson }, { source: 'batch-field', name: 'ARS' })).toBe('Payer Demo');
            expect(resolveGroupName({ var_provider: ' Provider A ' }, { source: 'process-variable', name: 'provider' })).toBe('Provider A');
            expect(resolveGroupName({}, { source: 'process-variable', name: 'provider' })).toBeNull();
        });

        it('uses the explicit group name when grouping', () => {
            const groups = groupInstancesByProvider([
                { status: 'RUNNING', batchState: batchJson, groupName: 'Payer Demo' },
                { status: 'COMPLETED', batchState: batchJson, groupName: null },
            ]);
            expect(groups.map((group) => group.name)).toEqual(['Payer Demo', null]);
        });
    });

    describe('configurable filter cards', () => {
        const batch = (provider: string, review = false) =>
            JSON.stringify({
                documents: [
                    {
                        fields: [
                            { name: 'Nombre del Prestador', value: provider },
                            { name: 'Total', value: '10' },
                        ],
                        extractionReviewStatus: review ? 'ReviewRequired' : 'Completed',
                    },
                ],
            });
        const rows: Array<Record<string, unknown>> = [
            { status: 'RUNNING', var_batchState: batch('Clinica A', true), var_region: 'North' },
            { status: 'COMPLETED', var_batchState: batch('Clinica A'), var_region: 'South' },
            { status: 'RUNNING', var_batchState: batch('Hospital B'), var_region: 'North' },
            { status: 'RUNNING', var_batchState: '{}' },
        ];
        const metrics = resolveProviderMetrics({
            metrics: [
                { id: 'all', label: 'All', kind: 'count' },
                { id: 'run', label: 'Running', kind: 'status', status: 'running' },
                { id: 'north', label: 'North', kind: 'field-equals', field: { source: 'process-variable', name: 'region' }, equals: 'north' },
                { id: 'sum', label: 'Total', kind: 'sum', field: { source: 'batch-field', name: 'Total' } },
            ],
        });

        it('builds one card per provider found, unidentified last', () => {
            const cards = buildProviderCards(rows, undefined, metrics);
            expect(cards.map((card) => card.name)).toEqual(['Clinica A', 'Hospital B', null]);
            expect(cards[0].values).toEqual({ all: 2, run: 1, north: 1, sum: 20 });
        });

        it('groups by a process variable when configured', () => {
            const cards = buildProviderCards(rows, { source: 'process-variable', name: 'region' }, metrics);
            expect(cards.map((card) => card.name)).toEqual(['North', 'South', null]);
        });

        it('converts legacy KPI keys to metrics', () => {
            expect(resolveProviderMetrics({ kpis: ['running', 'reviewRequired'] }).map((metric) => metric.kind)).toEqual([
                'status',
                'review-required',
            ]);
            const legacy = buildProviderCards(rows, undefined, resolveProviderMetrics({ kpis: ['reviewRequired'] }));
            expect(legacy[0].values['reviewRequired']).toBe(1);
        });

        it('matches task variables against the selected card', () => {
            const cards = buildProviderCards(rows, undefined, metrics);
            const row = variablesToRow({ batchState: batch('Hospital B') }, 'ASSIGNED');
            expect(rowMatchesCard(row, undefined, cards[1].key)).toBe(true);
            expect(rowMatchesCard(row, undefined, cards[0].key)).toBe(false);
        });
    });

    describe('accountSummary variable', () => {
        const heavyBatch = JSON.stringify({ documents: [{ fields: [{ name: 'Nombre del Prestador', value: 'From Batch' }] }] });

        it('prefers the light summary over the batchState', () => {
            const row = {
                status: 'RUNNING',
                var_batchState: heavyBatch,
                var_accountSummary: JSON.stringify({ provider: 'From Summary', reviewRequired: true, fields: { ARS: 'Payer S' } }),
            };
            const ctx = { idpVariable: 'batchState', summaryVariable: 'accountSummary' };
            const cards = buildProviderCards([row], undefined, resolveProviderMetrics({ kpis: ['reviewRequired'] }), ctx);
            expect(cards[0].name).toBe('From Summary');
            expect(cards[0].values['reviewRequired']).toBe(1);
            expect(resolveGroupName(row, { source: 'batch-field', name: 'ars' }, ctx)).toBe('Payer S');
            // Without a configured summary variable the IDP variable is used.
            expect(buildProviderCards([row], undefined, [])[0].name).toBe('From Batch');
        });

        it('falls back to the batchState when there is no summary', () => {
            const cards = buildProviderCards([{ status: 'RUNNING', var_batchState: heavyBatch }], undefined, []);
            expect(cards[0].name).toBe('From Batch');
        });
    });

    describe('configurable variables', () => {
        it('reads the IDP output from the configured variable', () => {
            const row = { status: 'RUNNING', var_idpResult: JSON.stringify({ documents: [{ fields: [{ name: 'IPS', value: 'Custom Var' }] }] }) };
            expect(buildProviderCards([row], undefined, [], { idpVariable: 'idpResult' })[0].name).toBe('Custom Var');
            expect(buildProviderCards([row], undefined, [])[0].name).toBeNull();
        });

        it('lists exactly the variables a widget configuration reads', () => {
            expect(providerRequiredVariables({})).toEqual(['batchState']);
            expect(providerRequiredVariables({ idpVariable: 'idpResult', summaryVariable: 'accountSummary', kpis: ['running'] })).toEqual([
                'accountSummary',
                'idpResult',
            ]);
            expect(
                providerRequiredVariables({
                    groupBy: { source: 'process-variable', name: 'provider' },
                    metrics: [
                        { id: 'a', label: 'A', kind: 'count' },
                        { id: 'b', label: 'B', kind: 'sum', field: { source: 'process-variable', name: 'amount' } },
                    ],
                })
            ).toEqual(['amount', 'provider']);
        });
    });

    describe('provider KPI configuration', () => {
        it('falls back to defaults for empty or invalid config', () => {
            expect(resolveProviderKpiKeys(undefined)).toEqual([...DEFAULT_PROVIDER_KPI_KEYS]);
            expect(resolveProviderKpiKeys(['bogus'])).toEqual([...DEFAULT_PROVIDER_KPI_KEYS]);
        });

        it('keeps order and drops duplicates', () => {
            expect(resolveProviderKpiKeys(['total', 'running', 'total'])).toEqual(['total', 'running']);
        });

        it('toggles but never removes the last KPI', () => {
            expect(toggleProviderKpi(['running'], 'running')).toEqual(['running']);
            expect(toggleProviderKpi(['running'], 'total')).toEqual(['running', 'total']);
            expect(toggleProviderKpi(['running', 'total'], 'running')).toEqual(['total']);
        });

        it('moves a KPI within bounds', () => {
            expect(moveProviderKpi(['running', 'total'], 'total', -1)).toEqual(['total', 'running']);
            expect(moveProviderKpi(['running', 'total'], 'running', -1)).toEqual(['running', 'total']);
        });
    });
});

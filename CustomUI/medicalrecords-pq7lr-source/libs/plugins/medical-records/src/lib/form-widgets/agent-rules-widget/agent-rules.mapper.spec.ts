import {
    ensureUiTabItems,
    getPayerProfileById,
    getTariffModifierLabel,
    mapAgreementGeneralViewModel,
    mapTariffSectionFromPayloadValue,
    mapToViewModel,
    parseScriptPayload,
    resolveActivePayerId,
    ruleHasIssues,
} from './agent-rules.mapper';
import { AGREEMENT_GENERAL_DEMO } from './agent-rules-demo.fixture';

describe('agent-rules.mapper UI helpers', () => {
    it('injects UI-only agreement items when missing', () => {
        const items = parseScriptPayload([
            {
                id: 'tariffAgreement',
                label: 'Tariff Agreement',
                agent: 'Financial Variance Agent',
                group: 'Financial',
                value: {
                    contractId: 'CONV-TEST-2024',
                    payer: 'ARS Primera',
                    provider: 'CM-UCE',
                    tariffRules: [],
                },
            },
        ]);

        const ensured = ensureUiTabItems(items);

        expect(ensured.some((item) => item.id === 'agreementGeneral')).toBe(true);
        expect(ensured.some((item) => item.id === 'agreementDocuments')).toBe(true);
    });

    it('derives agreement general fields from tariff payload', () => {
        const items = ensureUiTabItems(
            parseScriptPayload([
                {
                    id: 'tariffAgreement',
                    label: 'Tariff Agreement',
                    agent: 'Financial Variance Agent',
                    group: 'Financial',
                    value: {
                        contractId: 'CONV-TEST-2024',
                        payer: 'ARS Primera',
                        provider: 'CM-UCE',
                        effectiveFrom: '2024-02-01',
                        effectiveTo: '2024-11-30',
                        tariffRules: [{ serviceCode: '890201', description: 'Panel', expectedAmount: 10000 }],
                    },
                },
            ])
        );

        const general = mapAgreementGeneralViewModel(items);

        expect(general.contractId).toBe('CONV-TEST-2024');
        expect(general.payer).toBe('ARS Primera');
        expect(general.providerDisplayName).toBe('CM-UCE');
        expect(general.effectiveFrom).toBe('2024-02-01');
    });

    it('excludes batchState and UI tabs from editable workspace sections', () => {
        const items = ensureUiTabItems(
            parseScriptPayload([
                { id: 'batchState', label: 'Batch State', agent: '', group: 'Context', value: { documents: [] } },
                {
                    id: 'documentationRules',
                    label: 'Documentation Rules',
                    agent: 'Intake',
                    group: 'Intake',
                    value: { rules: [{ ruleId: 'DOC-001', description: 'Need order', riskLevelIfMissing: 'HIGH' }] },
                },
            ])
        );

        const viewModel = mapToViewModel(items);
        const ids = viewModel.sections.map((section) => section.itemId);

        expect(ids).not.toContain('batchState');
        expect(ids).not.toContain('agreementGeneral');
        expect(ids).toContain('documentationRules');
    });

    it('flags incomplete rules as issues', () => {
        expect(
            ruleHasIssues({
                id: '1',
                title: 'DOC-001',
                riskLevel: 'HIGH',
                fields: [{ key: 'description', label: 'Description', type: 'textarea', value: '' }],
                chips: { key: 'requiredDocuments', label: 'Required documents', items: [], editable: true },
            })
        ).toBe(true);
    });

    it('falls back to demo fixture values when source payloads are sparse', () => {
        const general = mapAgreementGeneralViewModel(ensureUiTabItems([]));
        expect(general.contractId).toBe(AGREEMENT_GENERAL_DEMO.contractId);
    });

    it('computes tariff modifier labels', () => {
        const label = getTariffModifierLabel({
            id: '890201',
            title: '890201',
            fields: [
                { key: 'expectedAmount', label: 'Expected amount', type: 'number', value: 10000 },
                { key: 'maxAmount', label: 'Maximum amount', type: 'number', value: 11500 },
                { key: 'minAmount', label: 'Minimum amount', type: 'number', value: 9500 },
            ],
        });

        expect(label).toBe('+15%');
    });

    it('resolves ARS Primera as the active payer from tariff payload', () => {
        const items = ensureUiTabItems(
            parseScriptPayload([
                {
                    id: 'tariffAgreement',
                    label: 'Tariff Agreement',
                    agent: 'Financial Variance Agent',
                    group: 'Financial',
                    value: {
                        contractId: 'CONV-TEST-2024',
                        payer: 'ARS Primera',
                        provider: 'CM-UCE',
                        tariffRules: [],
                    },
                },
            ])
        );

        expect(resolveActivePayerId(items)).toBe('ars-primera');
    });

    it('returns demo payer profiles with read-only tariff sections', () => {
        const profile = getPayerProfileById('sura-arl');

        expect(profile?.bindsRealPayload).toBe(false);
        expect(profile?.demoTariffPayload.tariffRules).toBeTruthy();

        const section = mapTariffSectionFromPayloadValue(profile!.demoTariffPayload, { readOnly: true });

        expect(section.readOnly).toBe(true);
        expect(section.listItems.length).toBeGreaterThan(0);
    });
});

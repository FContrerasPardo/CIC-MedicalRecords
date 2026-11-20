import * as indexTemplate from '../../agreements/store/templates/agreements-index.json';
import { parseDocumentationChecklist } from '../../agreements/checklist/documentation-checklist.util';
import { agreementAliases, AgreementIndexEntry, parseAgreementsIndex } from '../../agreements/store/agreement-store.util';
import { agreementTemplateFile, templateTranslations } from '../../agreements/store/agreement-templates';
import {
    agreementDisplayName,
    buildProviderOptions,
    buildRequiredDocumentsSummary,
    chooseLocalizedChecklist,
    defaultProviderOption,
    shortCondition,
} from './radication-provider.util';
import { MULTI_INVOICE_PROFILE, parsePreanalysisPolicy, SINGLE_INVOICE_PROFILE } from './radication-policy.util';

const entries = (parseAgreementsIndex(indexTemplate)?.agreements ?? []) as AgreementIndexEntry[];
const entry = (agreementId: string, providerName: string, status: AgreementIndexEntry['status'] = 'ACTIVE'): AgreementIndexEntry => ({
    agreementId,
    providerName,
    payer: 'Synthetic ARS',
    status,
    updatedAt: null,
});

describe('provider options from the agreements index', () => {
    it('lists one provider per agreement of the index, sorted, with the aliases of agreement.json', () => {
        const details = Object.fromEntries(
            entries.map((item) => [item.agreementId, { aliases: agreementAliases(agreementTemplateFile(item.agreementId, 'agreement')), contractId: 'CONV-SYN-1' }])
        );
        const options = buildProviderOptions(entries, details);
        expect(options.map((option) => option.agreementId)).toEqual(['centro-medico-latam', 'hospital-general-hyland-latam']);
        expect(options[0].providerName).toBe('Centro Medico LATAM');
        // "Centro Médico LATAM" is the main name with an accent: not repeated as an alias.
        expect(options[0].aliases).toEqual(['CM LATAM']);
        expect(options[1].aliases).toEqual(['HG HYLAND LATAM', 'Hospital General Hyland']);
    });

    it('leaves out inactive agreements and entries without a provider, and deduplicates aliases', () => {
        const options = buildProviderOptions(
            [entry('b-clinic', 'Clinica Nube Sintetica'), entry('a-off', 'Clinica Apagada', 'INACTIVE'), entry('c-empty', ' ')],
            { 'b-clinic': { aliases: ['Clínica Nube Sintética', 'Nube', 'NUBE', ' '], payer: 'Payer from agreement.json' } }
        );
        expect(options).toEqual([
            { agreementId: 'b-clinic', providerName: 'Clinica Nube Sintetica', payer: 'Payer from agreement.json', aliases: ['Nube'], contractId: '' },
        ]);
    });

    it('names the applied agreement with provider, payer and contract', () => {
        expect(agreementDisplayName({ providerName: 'Clinica Nube', payer: 'Synthetic ARS', contractId: 'CONV-SYN-1' })).toBe('Clinica Nube – Synthetic ARS (CONV-SYN-1)');
        expect(agreementDisplayName({ providerName: 'Clinica Nube', payer: '', contractId: '' })).toBe('Clinica Nube');
    });
});

describe('default provider selection', () => {
    it('preselects the only agreement', () => {
        const options = buildProviderOptions([entry('only-one', 'Clinica Unica')]);
        expect(defaultProviderOption(options)?.agreementId).toBe('only-one');
    });

    it('lets the provider choose when there are several agreements or none', () => {
        expect(defaultProviderOption(buildProviderOptions(entries))).toBeNull();
        expect(defaultProviderOption([])).toBeNull();
    });
});

describe('required documents summary', () => {
    const summaryOf = (agreementId: string) =>
        buildRequiredDocumentsSummary(
            parsePreanalysisPolicy(agreementTemplateFile(agreementId, 'preanalysisPolicy', 'en')),
            parseDocumentationChecklist(agreementTemplateFile(agreementId, 'documentationChecklist', 'en'))
        );

    it('groups the single-invoice profile into always, conditional and optional documents', () => {
        const summary = summaryOf('centro-medico-latam');
        expect(summary?.always.map((item) => item.className)).toEqual(['Factura y Desglose', 'Planilla de Admisión', 'Formulario de Reclamación', 'Carnet de Afiliación']);
        expect(summary?.conditional.map((item) => item.ruleId)).toEqual(['SIF-010', 'SIF-011', 'SIF-012', 'SIF-013', 'SIF-014']);
        expect(summary?.conditional.find((item) => item.ruleId === 'SIF-012')?.condition).toBe('Surgical services billed');
        expect(summary?.conditional.every((item) => (item.condition ?? '').length <= 81)).toBe(true);
        expect(summary?.optional).toContain('Nota de Enfermeria');
        expect(summary?.multiInvoiceDocuments).toEqual(['Factura y Desglose']);
    });

    it('depends on the agreement: the hospital requires the nursing note under a condition', () => {
        const summary = summaryOf('hospital-general-hyland-latam');
        expect(summary?.conditional.map((item) => item.className)).toContain('Nota de Enfermeria');
        expect(summary?.optional).not.toContain('Nota de Enfermeria');
    });

    it('completes the policy with checklist rules it does not list and takes their condition', () => {
        const policy = parsePreanalysisPolicy({
            profiles: {
                [SINGLE_INVOICE_PROFILE]: { documentRequirements: { alwaysRequired: [{ className: 'Factura', ruleId: 'R-1' }], conditionallyRequired: [{ className: 'Laboratorio', ruleId: 'R-2' }] } },
            },
        });
        const checklist = parseDocumentationChecklist({
            rules: [
                { ruleId: 'R-2', requiredDocuments: ['Laboratorio'], profiles: [SINGLE_INVOICE_PROFILE], condition: 'Lab billed', enabled: true },
                { ruleId: 'R-3', requiredDocuments: ['Orden medica'], profiles: [], condition: '', enabled: true },
                { ruleId: 'R-4', requiredDocuments: ['Apagado'], profiles: [], condition: '', enabled: false },
                { ruleId: 'R-5', requiredDocuments: ['Factura'], profiles: [MULTI_INVOICE_PROFILE], condition: '', enabled: true },
            ],
        });
        const summary = buildRequiredDocumentsSummary(policy, checklist);
        expect(summary?.always.map((item) => item.className)).toEqual(['Factura', 'Orden medica']);
        expect(summary?.conditional).toEqual([{ className: 'Laboratorio', ruleId: 'R-2', condition: 'Lab billed', conditionFull: 'Lab billed' }]);
        expect(summary?.optional).toEqual([]);
        // The policy has no multi-invoice profile: the checklist rules of that profile say it.
        expect(summary?.multiInvoiceDocuments).toEqual(['Factura']);
    });

    it('uses the checklist alone without a policy, and returns null when nothing is required', () => {
        const checklist = parseDocumentationChecklist({
            rules: [
                { ruleId: 'A', requiredDocuments: ['Factura'], profiles: [SINGLE_INVOICE_PROFILE], condition: '', enabled: true },
                { ruleId: 'B', requiredDocuments: ['Factura'], profiles: [MULTI_INVOICE_PROFILE], condition: '', enabled: true },
            ],
        });
        const summary = buildRequiredDocumentsSummary(null, checklist);
        expect(summary?.always.map((item) => item.className)).toEqual(['Factura']);
        expect(summary?.multiInvoiceDocuments).toEqual(['Factura']);
        expect(buildRequiredDocumentsSummary(null, null)).toBeNull();
    });

    it('shortens a condition to its first clause or a word boundary', () => {
        expect(shortCondition('Hospitalization of two or more nights')).toBe('Hospitalization of two or more nights');
        expect(shortCondition('Any surgery above RD$ 50,000: the authorization is always required')).toBe('Any surgery above RD$ 50,000');
        expect(shortCondition('one two three four five six', 12)).toBe('one two…');
        expect(shortCondition(null)).toBe('');
    });
});

describe('checklist in the UI language', () => {
    const translations = templateTranslations();
    const template = agreementTemplateFile('centro-medico-latam', 'documentationChecklist', 'es');
    const base = agreementTemplateFile('centro-medico-latam', 'documentationChecklist');

    it('uses the language version when usable', () => {
        const variant = { ...template, name: 'Synthetic variant' };
        expect(chooseLocalizedChecklist({ language: 'es', variant, base, template, translations })?.name).toBe('Synthetic variant');
    });

    it('translates the base when the language version is absent, and falls back to the template', () => {
        const fromBase = chooseLocalizedChecklist({ language: 'es', variant: undefined, base, template, translations });
        expect(fromBase?.rules.map((rule) => rule.condition)).toEqual(parseDocumentationChecklist(template)?.rules.map((rule) => rule.condition));
        expect(chooseLocalizedChecklist({ language: 'es', base: null, template, translations })?.rules.length).toBe(parseDocumentationChecklist(template)?.rules.length);
    });
});

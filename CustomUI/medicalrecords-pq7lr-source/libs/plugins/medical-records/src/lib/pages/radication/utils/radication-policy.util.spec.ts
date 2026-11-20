import * as policyModule from '../policy/default-preanalysis-policy.json';
import { resolveContentLanguage } from '../../agreements/store/agreement-locale.util';
import { agreementTemplateFile, templateTranslations } from '../../agreements/store/agreement-templates';
import {
    buildPolicyView,
    chooseLocalizedPolicy,
    LocalizedPolicyChoice,
    MULTI_INVOICE_PROFILE,
    parsePreanalysisPolicy,
    policyClassStatus,
    selectPolicyProfileKey,
    SINGLE_INVOICE_PROFILE,
} from './radication-policy.util';

// Jest (no esModuleInterop) gives the JSON object itself; bundlers add a `default` export.
const defaultPolicy: unknown = (policyModule as { default?: unknown }).default ?? policyModule;

describe('radication policy', () => {
    const policy = parsePreanalysisPolicy(defaultPolicy);

    it('parses the bundled policy with both profiles', () => {
        expect(policy).not.toBeNull();
        expect(Object.keys(policy?.profiles ?? {}).sort()).toEqual([MULTI_INVOICE_PROFILE, SINGLE_INVOICE_PROFILE].sort());
        expect(policy?.profiles[SINGLE_INVOICE_PROFILE].alwaysRequired.length).toBe(4);
        expect(policy?.profiles[SINGLE_INVOICE_PROFILE].conditionallyRequired[0].condition).toBeTruthy();
    });

    it('parses the file text and rejects text without profiles', () => {
        expect(parsePreanalysisPolicy(JSON.stringify(defaultPolicy))?.policyId).toBe('ARS-PREANALYSIS-POLICY');
        expect(parsePreanalysisPolicy('not json')).toBeNull();
        expect(parsePreanalysisPolicy({ profiles: {} })).toBeNull();
    });

    it('selects the profile by invoice count', () => {
        if (!policy) {
            throw new Error('policy');
        }
        expect(selectPolicyProfileKey(policy, 1)).toBe(SINGLE_INVOICE_PROFILE);
        expect(selectPolicyProfileKey(policy, 3)).toBe(MULTI_INVOICE_PROFILE);
        expect(selectPolicyProfileKey(policy, 0)).toBe(SINGLE_INVOICE_PROFILE);
    });

    it('matches classes by normalized name, missing over attention over found', () => {
        const rows = [
            { className: 'Factura y desglose', status: 'pass' as const },
            { className: 'PLANILLA DE ADMISION', status: 'attention' as const },
            { className: 'Planilla de Admisión', status: 'pass' as const },
            { className: 'Carnet de Afiliación', status: 'missing' as const },
        ];
        expect(policyClassStatus('Factura y Desglose', rows)).toBe('found');
        expect(policyClassStatus('Planilla de Admisión', rows)).toBe('attention');
        expect(policyClassStatus('Carnet de Afiliacion', rows)).toBe('missing');
        expect(policyClassStatus('Laboratorios', rows)).toBe('none');
    });

    it('builds the view: unmentioned required classes are missing, conditional ones stay neutral', () => {
        if (!policy) {
            throw new Error('policy');
        }
        const view = buildPolicyView(policy, 1, [
            { className: 'Factura y Desglose', status: 'pass' },
            { className: 'Laboratorios', status: 'pass' },
        ]);
        expect(view.profileKey).toBe(SINGLE_INVOICE_PROFILE);
        expect(view.required.map((item) => item.status)).toEqual(['found', 'missing', 'missing', 'missing']);
        expect(view.conditional.find((item) => item.className === 'Laboratorios')?.status).toBe('found');
        expect(view.conditional.find((item) => item.className === 'Receta Médica')?.status).toBe('none');
        expect(view.crossChecks.length).toBe(6);

        const multi = buildPolicyView(policy, 2, []);
        expect(multi.profileKey).toBe(MULTI_INVOICE_PROFILE);
        expect(multi.required.length).toBe(1);
        expect(multi.conditional.length).toBe(0);
    });
});

describe('radication policy language', () => {
    // Synthetic agreement seeds bundled with the plugin; their base texts are English.
    const agreementId = 'centro-medico-latam';
    const base = agreementTemplateFile(agreementId, 'preanalysisPolicy');
    const translations = templateTranslations();
    const labels = (choice: LocalizedPolicyChoice) => Object.values(choice.policy?.profiles ?? {}).map((profile) => profile.label);
    const crossCheckLabels = (choice: LocalizedPolicyChoice) => choice.policy?.profiles[MULTI_INVOICE_PROFILE]?.crossChecks.map((check) => `${check.label} / ${check.rule}`) ?? [];

    it('maps the UI language to a content language (es/en/pt, others English)', () => {
        expect(resolveContentLanguage('es')).toBe('es');
        expect(resolveContentLanguage('es-DO')).toBe('es');
        expect(resolveContentLanguage('pt_BR')).toBe('pt');
        expect(resolveContentLanguage('de')).toBe('en');
        expect(resolveContentLanguage(undefined)).toBe('en');
    });

    it('shows the language version of the agreement when it is usable', () => {
        const variant = agreementTemplateFile(agreementId, 'preanalysisPolicy', 'pt');
        const choice = chooseLocalizedPolicy({ language: 'pt', variant, base, template: agreementTemplateFile(agreementId, 'preanalysisPolicy', 'pt'), translations });
        expect(choice.origin).toBe('variant');
        expect(choice.baseLanguageShown).toBe(false);
        expect(labels(choice)).toContain('Fatura única: suporte clínico completo');
    });

    it('without any Appdata file, shows the bundled template in the UI language', () => {
        const template = agreementTemplateFile(agreementId, 'preanalysisPolicy', 'es');
        const choice = chooseLocalizedPolicy({ language: 'es', base: null, template, translations });
        expect(choice.origin).toBe('template');
        expect(labels(choice).sort()).toEqual(['Factura única: soporte clínico completo', 'Varias facturas: solo factura']);
        expect(crossCheckLabels(choice)[0]).toBe('Identidad de la factura / Cada factura tiene número, paciente y pagador.');
        const conditions = choice.policy?.profiles[SINGLE_INVOICE_PROFILE].conditionallyRequired.map((item) => item.condition ?? '') ?? [];
        expect(conditions.length).toBeGreaterThan(0);
        // No condition is left as the English base text.
        expect(conditions.filter((condition) => condition in translations)).toEqual([]);
    });

    it('an unusable language version falls back like an absent one', () => {
        const template = agreementTemplateFile(agreementId, 'preanalysisPolicy', 'es');
        const choice = chooseLocalizedPolicy({ language: 'es', variant: null, base: null, template, translations });
        expect(choice.origin).toBe('template');
        expect(labels(choice)).toContain('Varias facturas: solo factura');
    });

    it('with only the base file in Appdata, translates its texts and flags those left in the base language', () => {
        const template = agreementTemplateFile(agreementId, 'preanalysisPolicy', 'es');
        const translated = chooseLocalizedPolicy({ language: 'es', base, template, translations });
        expect(translated.origin).toBe('base');
        expect(translated.baseLanguageShown).toBe(false);
        expect(labels(translated)).toContain('Varias facturas: solo factura');

        const edited = JSON.parse(JSON.stringify(base));
        edited.profiles[MULTI_INVOICE_PROFILE].label = 'Synthetic edited profile';
        const partial = chooseLocalizedPolicy({ language: 'es', base: edited, template, translations });
        expect(partial.origin).toBe('base');
        expect(partial.baseLanguageShown).toBe(true);
        expect(labels(partial)).toContain('Synthetic edited profile');
        expect(labels(partial)).toContain('Factura única: soporte clínico completo');
    });

    it('in English the base is shown as written, without notice', () => {
        const choice = chooseLocalizedPolicy({ language: 'en', base, template: agreementTemplateFile(agreementId, 'preanalysisPolicy', 'en'), translations });
        expect(choice.origin).toBe('base');
        expect(choice.baseLanguageShown).toBe(false);
        expect(labels(choice)).toContain('Several invoices: invoice only');
    });
});

import {
    AGREEMENT_CONTENT_LANGUAGES,
    localizeAgreementContent,
    localizedFileName,
    resolveContentLanguage,
    resolveLocalizedSource,
    structuralDifferences,
    syncAgreementLanguageVersion,
    translateText,
    untranslatedTexts,
} from './agreement-locale.util';
import { AGREEMENT_FILE_KINDS, agreementFilePath } from './agreement-store.util';
import { agreementTemplateFile, TEMPLATE_AGREEMENT_IDS, templateAgreementsIndex, templateTranslations } from './agreement-templates';
import { DEMO_PAYER_NAME } from './demo-payer';

describe('agreement files per language', () => {
    it('resolves the content language from the UI language, falling back to English', () => {
        expect(resolveContentLanguage('es')).toBe('es');
        expect(resolveContentLanguage('es-DO')).toBe('es');
        expect(resolveContentLanguage('pt_BR')).toBe('pt');
        expect(resolveContentLanguage('EN')).toBe('en');
        expect(resolveContentLanguage('de')).toBe('en');
        expect(resolveContentLanguage('fr')).toBe('en');
        expect(resolveContentLanguage('')).toBe('en');
        expect(resolveContentLanguage(undefined)).toBe('en');
    });

    it('names the language version next to the base file the agents read', () => {
        expect(localizedFileName('documentation-checklist.json', 'es')).toBe('documentation-checklist.es.json');
        expect(agreementFilePath('centro-medico-latam', 'documentationChecklist')).toBe('/MedRec/Appdata/Agreements/centro-medico-latam/documentation-checklist.json');
        expect(agreementFilePath('centro-medico-latam', 'documentationChecklist', 'pt')).toBe('/MedRec/Appdata/Agreements/centro-medico-latam/documentation-checklist.pt.json');
        expect(agreementFilePath('x', 'agreement', null)).toBe('/MedRec/Appdata/Agreements/x/agreement.json');
    });

    it('shows the language version, else the base with a notice, else the template in that language', () => {
        expect(resolveLocalizedSource('usable', true)).toBe('variant');
        expect(resolveLocalizedSource('usable', false)).toBe('variant');
        expect(resolveLocalizedSource('absent', true)).toBe('base');
        expect(resolveLocalizedSource('unusable', true)).toBe('base');
        expect(resolveLocalizedSource('absent', false)).toBe('template');
        expect(resolveLocalizedSource('unusable', false)).toBe('template');
    });

    it('translates only free-text keys and keeps ids, codes, class names and numbers', () => {
        const translations = { 'Payer claim form.': { es: 'Formulario de reclamación del pagador.', pt: 'Formulário do pagador.' }, Evento: { en: 'Fee for service' } };
        const source = {
            ruleId: 'SIF-003',
            description: 'Payer claim form.',
            requiredDocuments: ['Formulario de Reclamación'],
            contractType: 'Evento',
            expectedAmount: 2500,
            contacts: [{ name: 'Payer claim form.', role: 'Payer claim form.' }],
        };
        const es = localizeAgreementContent(source, 'es', translations);
        expect(es.description).toBe('Formulario de reclamación del pagador.');
        expect(es.requiredDocuments).toEqual(['Formulario de Reclamación']);
        expect(es.ruleId).toBe('SIF-003');
        expect(es.expectedAmount).toBe(2500);
        expect(es.contractType).toBe('Evento');
        expect(es.contacts[0].name).toBe('Payer claim form.');
        expect(es.contacts[0].role).toBe('Formulario de reclamación del pagador.');
        expect(localizeAgreementContent(source, 'en', translations).contractType).toBe('Fee for service');
        expect(source.description).toBe('Payer claim form.');
    });

    it('has every template text in es and pt, with the same structure as the base file', () => {
        const translations = templateTranslations();
        for (const agreementId of TEMPLATE_AGREEMENT_IDS) {
            for (const kind of AGREEMENT_FILE_KINDS) {
                const base = agreementTemplateFile(agreementId, kind);
                for (const language of AGREEMENT_CONTENT_LANGUAGES) {
                    expect(`${agreementId}/${kind}/${language}:${untranslatedTexts(base, language, translations).join(' | ')}`).toBe(`${agreementId}/${kind}/${language}:`);
                    const localized = agreementTemplateFile(agreementId, kind, language);
                    expect(`${agreementId}/${kind}/${language}:${structuralDifferences(base, localized).join(',')}`).toBe(`${agreementId}/${kind}/${language}:`);
                }
            }
        }
    });

    it('translates the template texts (Spanish base texts become English in the en version)', () => {
        const es = agreementTemplateFile('centro-medico-latam', 'documentationChecklist', 'es') as { rules: Array<{ description: string }> };
        const pt = agreementTemplateFile('centro-medico-latam', 'documentationChecklist', 'pt') as { rules: Array<{ description: string }> };
        expect(es.rules[0].description).toBe('Factura con el desglose de servicios.');
        expect(pt.rules[0].description).toBe('Fatura com o detalhamento dos serviços.');
        const en = agreementTemplateFile('centro-medico-latam', 'tariffAgreement', 'en') as { tariffRules: Array<{ description: string }> };
        expect(en.tariffRules[0].description).toBe('General medicine consultation');
        const base = agreementTemplateFile('centro-medico-latam', 'tariffAgreement') as { tariffRules: Array<{ description: string }> };
        expect(base.tariffRules[0].description).toBe('Consulta de medicina general');
    });

    it('reports structural differences between versions', () => {
        expect(structuralDifferences({ rules: [{ ruleId: 'A', description: 'x' }] }, { rules: [{ ruleId: 'A', description: 'y' }] })).toEqual([]);
        expect(structuralDifferences({ rules: [{ ruleId: 'A' }] }, { rules: [{ ruleId: 'B' }] })).toEqual(['.rules[0].ruleId']);
        expect(structuralDifferences({ rules: [] }, { rules: [{ ruleId: 'B' }] })).toEqual(['.rules']);
        expect(structuralDifferences({ version: '1', amount: 2 }, { version: '2', amount: 3 })).toEqual(['.amount']);
    });

    it('uses the demo payer in every template and language, with no other payer name or id prefix', () => {
        expect(DEMO_PAYER_NAME).toBe('Hyland ARS');
        for (const entry of templateAgreementsIndex().agreements) {
            expect(entry.payer).toBe(DEMO_PAYER_NAME);
        }
        for (const agreementId of TEMPLATE_AGREEMENT_IDS) {
            for (const kind of AGREEMENT_FILE_KINDS) {
                for (const language of [null, ...AGREEMENT_CONTENT_LANGUAGES]) {
                    const content = agreementTemplateFile(agreementId, kind, language) as { payer?: string; general?: { payer?: string } };
                    const text = JSON.stringify(content);
                    expect(`${agreementId}/${kind}/${language}:${/primera|ARSP/i.test(text)}`).toBe(`${agreementId}/${kind}/${language}:false`);
                    const value = content.payer ?? content.general?.payer;
                    if (value !== undefined) {
                        expect(value).toBe(DEMO_PAYER_NAME);
                    }
                }
            }
        }
    });
    it('carries contacts, contract files and the Knowledge Discovery link to the other language versions', () => {
        const translations = templateTranslations();
        expect(translateText('Coordinación del convenio', 'es', 'en', translations)).toBe('Agreement coordination');
        expect(translateText('Coordinación del convenio', 'es', 'pt', translations)).toBe('Coordenação do convênio');
        expect(translateText('Rol libre', 'es', 'en', translations)).toBe('Rol libre');
        const en = agreementTemplateFile('centro-medico-latam', 'agreement', 'en');
        const es = agreementTemplateFile('centro-medico-latam', 'agreement', 'es') as Record<string, unknown>;
        const saved = {
            ...es,
            version: '2026-11-17-r2',
            contacts: [{ id: 'c1', name: 'Fernando Contreras', role: 'Facturación', email: 'fernando.contreras@hyland.com', phone: '' }],
            documents: { ...(es['documents'] as object), contractFiles: [{ documentId: 'n1', name: 'c.pdf' }] },
            knowledgeDiscovery: { url: 'https://kd.example.invalid/agent', label: 'KD' },
            general: { ...(es['general'] as object), payer: 'Hyland ARS', budgetTotal: 1 },
        };
        const synced = syncAgreementLanguageVersion(en, saved, 'es', 'en', translations) as Record<string, any>;
        expect(synced['contacts']).toEqual([{ id: 'c1', name: 'Fernando Contreras', role: 'Billing', email: 'fernando.contreras@hyland.com', phone: '' }]);
        expect(synced['documents'].contractFiles).toEqual([{ documentId: 'n1', name: 'c.pdf' }]);
        expect(synced['documents'].primaryDocument.title).toBe((en['documents'] as any).primaryDocument.title);
        expect(synced['knowledgeDiscovery']).toEqual({ url: 'https://kd.example.invalid/agent', label: 'KD' });
        expect(synced['general'].budgetTotal).toBe(1);
        expect(synced['general'].planName).toBe('Basic Plan (demo)');
        expect(synced['version']).toBe('2026-11-17-r2');
    });
});

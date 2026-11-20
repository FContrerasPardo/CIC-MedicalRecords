import { DEMO_CLAIM_FORM_CLASS, hasLegacyDemoValues, migrateDemoText, migrateDemoValues } from './agreement-demo-migration.util';
import { DEMO_PAYER_NAME } from './demo-payer';
import { AGREEMENT_FILE_KINDS, parseAgreementsIndex } from './agreement-store.util';
import { agreementTemplateFile, TEMPLATE_AGREEMENT_IDS, templateAgreementsIndex } from './agreement-templates';

describe('agreement demo migration', () => {
    it('replaces the old payer, claim form class and ARSP ids', () => {
        expect(migrateDemoText('ARS Primera')).toBe(DEMO_PAYER_NAME);
        expect(migrateDemoText('ARS PRIMERA')).toBe(DEMO_PAYER_NAME);
        expect(migrateDemoText('Formulario de Reclamación (ARS Primera)')).toBe(DEMO_CLAIM_FORM_CLASS);
        expect(migrateDemoText('Checklist documental Centro Médico LATAM – ARS Primera')).toBe(`Checklist documental Centro Médico LATAM – ${DEMO_PAYER_NAME}`);
        expect(migrateDemoText('CONV-DEMO-ARSP-CML-2026')).toBe('CONV-DEMO-HARS-CML-2026');
        expect(migrateDemoText('ARSP-HGHL-PREANALYSIS-POLICY')).toBe('HARS-HGHL-PREANALYSIS-POLICY');
        expect(migrateDemoText('DOC-ARSP-HGHL-2026')).toBe('DOC-HARS-HGHL-2026');
    });

    it('leaves other texts untouched', () => {
        expect(migrateDemoText('Primera consulta')).toBe('Primera consulta');
        expect(migrateDemoText('ARSPX-1')).toBe('ARSPX-1');
        expect(migrateDemoText('CONV-DEMO-HARS-CML-2026')).toBe('CONV-DEMO-HARS-CML-2026');
        expect(migrateDemoText(DEMO_CLAIM_FORM_CLASS)).toBe(DEMO_CLAIM_FORM_CLASS);
    });

    it('migrates an old agreement file deeply without modifying the input', () => {
        const old = {
            agreementId: 'hospital-general-hyland-latam',
            general: { payer: 'ARS Primera', contractId: 'CONV-DEMO-ARSP-HGHL-2026', budgetTotal: 10 },
            rules: [{ className: 'Formulario de Reclamación (ARS Primera)', ruleId: 'SIF-003', risk: 'MEDIUM' }],
            requiredDocuments: ['Formulario de Reclamación (ARS Primera)'],
            active: true,
            notes: null,
        };
        const snapshot = JSON.stringify(old);
        const result = migrateDemoValues(old);
        expect(result.changed).toBe(true);
        expect(JSON.stringify(old)).toBe(snapshot);
        expect(result.value).toEqual({
            agreementId: 'hospital-general-hyland-latam',
            general: { payer: DEMO_PAYER_NAME, contractId: 'CONV-DEMO-HARS-HGHL-2026', budgetTotal: 10 },
            rules: [{ className: DEMO_CLAIM_FORM_CLASS, ruleId: 'SIF-003', risk: 'MEDIUM' }],
            requiredDocuments: [DEMO_CLAIM_FORM_CLASS],
            active: true,
            notes: null,
        });
    });

    it('migrates an old index and keeps it parseable', () => {
        const old = { kind: 'medical-records.agreements-index', schemaVersion: 1, updatedAt: null, agreements: [{ agreementId: 'x', providerName: 'X', payer: 'ARS Primera', status: 'ACTIVE', updatedAt: null }] };
        const result = migrateDemoValues(old);
        expect(result.changed).toBe(true);
        expect(parseAgreementsIndex(result.value)?.agreements[0].payer).toBe(DEMO_PAYER_NAME);
    });

    it('reports no change for the current templates and the index', () => {
        expect(hasLegacyDemoValues(templateAgreementsIndex())).toBe(false);
        for (const agreementId of TEMPLATE_AGREEMENT_IDS) {
            for (const kind of AGREEMENT_FILE_KINDS) {
                const file = agreementTemplateFile(agreementId, kind);
                const result = migrateDemoValues(file);
                expect(`${agreementId}/${kind}:${result.changed}`).toBe(`${agreementId}/${kind}:false`);
                expect(result.value).toBe(file);
            }
        }
    });
});

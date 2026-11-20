import { parseDocumentationChecklist } from '../checklist/documentation-checklist.util';
import { policyRuleIdsMissingFromChecklist } from '../policy/preanalysis-policy-editor.util';
import {
    AGREEMENT_FILE_KINDS,
    agreementFilePath,
    agreementFileVersion,
    duplicateAgreementFiles,
    indexEntryFromAgreement,
    isUsableAgreementFile,
    isValidAgreementId,
    parseAgreementsIndex,
    resolveAgreementForProvider,
    slugAgreementId,
    stampAgreementFile,
    upsertIndexEntry,
    validateAgreementFile,
} from './agreement-store.util';
import { agreementTemplateFile, hasAgreementTemplate, TEMPLATE_AGREEMENT_IDS, templateAgreementsIndex } from './agreement-templates';

describe('agreement store (Appdata per agreement)', () => {
    const now = new Date('2026-11-18T10:00:00Z');

    it('builds one path per agreement file', () => {
        expect(agreementFilePath('centro-medico-latam', 'tariffAgreement')).toBe('/MedRec/Appdata/Agreements/centro-medico-latam/tariff-agreement.json');
        expect(agreementFilePath('x', 'documentationChecklist')).toBe('/MedRec/Appdata/Agreements/x/documentation-checklist.json');
    });

    it('seeds two valid agreements whose policy rule ids exist in their own checklist', () => {
        expect(TEMPLATE_AGREEMENT_IDS).toEqual(['centro-medico-latam', 'hospital-general-hyland-latam']);
        for (const agreementId of TEMPLATE_AGREEMENT_IDS) {
            for (const kind of AGREEMENT_FILE_KINDS) {
                expect(`${agreementId}/${kind}:${JSON.stringify(validateAgreementFile(kind, agreementTemplateFile(agreementId, kind)))}`).toBe(`${agreementId}/${kind}:[]`);
            }
            const checklist = parseDocumentationChecklist(agreementTemplateFile(agreementId, 'documentationChecklist'));
            const ruleIds = (checklist?.rules ?? []).map((rule) => rule.ruleId);
            expect(policyRuleIdsMissingFromChecklist(agreementTemplateFile(agreementId, 'preanalysisPolicy'), ruleIds)).toEqual([]);
        }
    });

    it('differentiates the two agreements: tariffs and an extra conditional document', () => {
        const amountOf = (agreementId: string) =>
            (agreementTemplateFile(agreementId, 'tariffAgreement')['tariffRules'] as Array<Record<string, unknown>>).find((row) => row['serviceCode'] === '903895')?.[
                'expectedAmount'
            ];
        expect(amountOf('centro-medico-latam')).not.toEqual(amountOf('hospital-general-hyland-latam'));
        const ids = (agreementId: string) => (parseDocumentationChecklist(agreementTemplateFile(agreementId, 'documentationChecklist'))?.rules ?? []).map((rule) => rule.ruleId);
        expect(ids('centro-medico-latam')).not.toContain('SIF-015');
        expect(ids('hospital-general-hyland-latam')).toContain('SIF-015');
    });

    it('reads the index as an object or a bare list and upserts entries', () => {
        const seed = templateAgreementsIndex();
        expect(seed.agreements.map((entry) => entry.providerName)).toEqual(['Centro Medico LATAM', 'Hospital General HYLAND LATAM']);
        expect(parseAgreementsIndex([{ agreementId: 'a', status: 'weird' }, { agreementId: 'A' }])?.agreements).toEqual([
            { agreementId: 'a', providerName: 'a', payer: '', status: 'DRAFT', updatedAt: null },
        ]);
        expect(parseAgreementsIndex('{ broken')).toBeNull();
        const next = upsertIndexEntry(seed, { agreementId: 'nuevo', providerName: 'Nuevo', payer: 'Hyland ARS', status: 'DRAFT', updatedAt: null }, now);
        expect(next.agreements.length).toBe(3);
        expect(next.updatedAt).toBe('2026-11-18T10:00:00.000Z');
        const replaced = upsertIndexEntry(next, { ...next.agreements[2], status: 'ACTIVE' }, now);
        expect(replaced.agreements.length).toBe(3);
        expect(replaced.agreements[2].status).toBe('ACTIVE');
        expect(indexEntryFromAgreement('x', agreementTemplateFile('hospital-general-hyland-latam', 'agreement'), null).providerName).toBe('Hospital General HYLAND LATAM');
    });

    it('resolves the agreement by the provider name, falling back to the default agreement', () => {
        const entries = templateAgreementsIndex().agreements;
        expect(resolveAgreementForProvider(entries, 'HOSPITAL GENERAL HYLAND LATAM, S.A.').entry?.agreementId).toBe('hospital-general-hyland-latam');
        expect(resolveAgreementForProvider(entries, 'Centro Médico Latam').matched).toBe(true);
        expect(resolveAgreementForProvider(entries, 'Hospital General Hyland').entry?.agreementId).toBe('hospital-general-hyland-latam');
        expect(resolveAgreementForProvider(entries, 'CM LATAM', { 'centro-medico-latam': ['CM LATAM'] }).matched).toBe(true);
        const unknown = resolveAgreementForProvider(entries, 'Clinica Ficticia Demo');
        expect(unknown.matched).toBe(false);
        expect(unknown.entry?.agreementId).toBe('centro-medico-latam');
        expect(resolveAgreementForProvider([], 'x').entry).toBeNull();
    });

    it('validates agent rule files row by row', () => {
        const tariff = agreementTemplateFile('centro-medico-latam', 'tariffAgreement');
        const rows = tariff['tariffRules'] as Array<Record<string, unknown>>;
        rows[1]['serviceCode'] = rows[0]['serviceCode'];
        rows[1]['procedureCode'] = rows[0]['procedureCode'];
        rows[2]['minAmount'] = 999999;
        rows[3]['expectedAmount'] = 'abc';
        expect(validateAgreementFile('tariffAgreement', tariff).map((issue) => `${issue.code}:${issue.row}`)).toEqual([
            'ROW_ID_DUPLICATE:1',
            'AMOUNT_RANGE_INVALID:2',
            'AMOUNT_INVALID:3',
        ]);
        const coding = agreementTemplateFile('centro-medico-latam', 'codingRules');
        (coding['rules'] as Array<Record<string, unknown>>)[0]['riskLevelIfViolated'] = 'CRITICAL';
        expect(validateAgreementFile('codingRules', coding)).toEqual([{ code: 'RISK_INVALID', row: 0 }]);
        expect(validateAgreementFile('payerCodingPolicy', '{ broken')).toEqual([{ code: 'JSON_INVALID', row: null }]);
        expect(isUsableAgreementFile('payerCompliancePolicy', { rules: 'x' })).toBe(false);
        expect(isUsableAgreementFile('codingRules', coding)).toBe(true);
    });

    it('bumps the version of every file kind on save', () => {
        const tariff = stampAgreementFile('tariffAgreement', agreementTemplateFile('centro-medico-latam', 'tariffAgreement'), now);
        expect(agreementFileVersion('tariffAgreement', tariff)).toBe('2026-11-18-r1');
        expect(tariff['updatedAt']).toBe('2026-11-18T10:00:00.000Z');
        expect(agreementFileVersion('tariffAgreement', stampAgreementFile('tariffAgreement', tariff, now))).toBe('2026-11-18-r2');
        const policy = stampAgreementFile('preanalysisPolicy', agreementTemplateFile('centro-medico-latam', 'preanalysisPolicy'), now);
        expect(agreementFileVersion('preanalysisPolicy', policy)).toBe('2026-11-18-r1');
    });

    it('duplicates an agreement under a new id and provider, as a draft', () => {
        const source = Object.fromEntries(AGREEMENT_FILE_KINDS.map((kind) => [kind, agreementTemplateFile('hospital-general-hyland-latam', kind)]));
        const copy = duplicateAgreementFiles(source, { agreementId: 'clinica-demo-norte', providerName: 'Clinica Demo Norte' }, now);
        expect(Object.keys(copy).length).toBe(AGREEMENT_FILE_KINDS.length);
        expect(copy.agreement?.['status']).toBe('DRAFT');
        expect((copy.agreement?.['general'] as Record<string, unknown>)['providerName']).toBe('Clinica Demo Norte');
        expect(copy.tariffAgreement?.['provider']).toBe('Clinica Demo Norte');
        expect(copy.codingRules?.['agreementId']).toBe('clinica-demo-norte');
        expect((copy.preanalysisPolicy?.['policyMetadata'] as Record<string, unknown>)['agreementId']).toBe('clinica-demo-norte');
        expect(source['tariffAgreement']['provider']).toBe('Hospital General HYLAND LATAM');
    });

    it('slugs and checks agreement ids', () => {
        expect(slugAgreementId('  Clínica Ficticia, S.R.L. ')).toBe('clinica-ficticia-s-r-l');
        expect(isValidAgreementId('clinica-ficticia')).toBe(true);
        expect(isValidAgreementId('Clinica Ficticia')).toBe(false);
        expect(hasAgreementTemplate('clinica-ficticia')).toBe(false);
        expect(agreementTemplateFile('clinica-ficticia', 'agreement')['agreementId']).toBe('centro-medico-latam');
    });
});

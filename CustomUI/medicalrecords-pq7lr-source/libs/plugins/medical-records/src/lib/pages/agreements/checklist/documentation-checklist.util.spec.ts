import {
    addUniqueValue,
    checklistDocumentCatalogue,
    createChecklistRule,
    duplicateChecklistRule,
    validateChecklist,
    DEFAULT_DOCUMENTATION_CHECKLIST,
    DOCUMENTATION_CHECKLIST_KIND,
    evaluateChecklist,
    fromDocumentationRules,
    parseDocumentationChecklist,
    serializeDocumentationChecklist,
    toDocumentationRules,
} from './documentation-checklist.util';

const legacy = {
    rulesetId: 'DOC-TEST',
    rules: [
        { ruleId: 'R1', appliesToProcedureCode: '903895', requiredDocuments: ['Medical Order', 'Radiology Report'], riskLevelIfMissing: 'high' },
        { ruleId: 'R2', appliesToServiceCategory: 'surgery', requiredDocuments: ['Surgical Report'], riskLevelIfMissing: 'LOW' },
    ],
};

describe('documentation checklist (Appdata)', () => {
    it('migrates the legacy documentationRules variable', () => {
        const checklist = fromDocumentationRules(JSON.stringify(legacy));
        expect(checklist.kind).toBe(DOCUMENTATION_CHECKLIST_KIND);
        expect(checklist.rulesetId).toBe('DOC-TEST');
        expect(checklist.rules[0].appliesTo.procedureCodes).toEqual(['903895']);
        expect(checklist.rules[0].riskLevelIfMissing).toBe('HIGH');
        expect(checklist.rules[1].appliesTo.serviceCategories).toEqual(['surgery']);
        expect(checklist.rules[1].consumers).toEqual(['validation', 'agent']);
        expect(checklist.rules[1].enabled).toBe(true);
    });

    it('seeds the demo checklist with the policy rule ids and IDP classes', () => {
        expect(DEFAULT_DOCUMENTATION_CHECKLIST.rules.map((rule) => rule.ruleId)).toEqual([
            'SIF-001',
            'SIF-002',
            'SIF-003',
            'SIF-004',
            'SIF-010',
            'SIF-011',
            'SIF-012',
            'SIF-013',
            'SIF-014',
            'MIO-001',
        ]);
        expect(DEFAULT_DOCUMENTATION_CHECKLIST.rules[0].requiredDocuments).toEqual(['Factura y Desglose']);
        expect(DEFAULT_DOCUMENTATION_CHECKLIST.rules[9].profiles).toEqual(['MULTI_INVOICE_INVOICE_ONLY']);
        expect(validateChecklist(DEFAULT_DOCUMENTATION_CHECKLIST)).toEqual([]);
    });

    it('limits rules to the account profile and leaves unscoped conditional rules to the agent', () => {
        const facts = { procedureCodes: [], serviceCategories: [], documentClasses: ['Factura y Desglose'] };
        const single = evaluateChecklist(DEFAULT_DOCUMENTATION_CHECKLIST, { ...facts, profile: 'SINGLE_INVOICE_FULL' });
        expect(single.map((entry) => entry.ruleId)).toEqual(['SIF-001', 'SIF-002', 'SIF-003', 'SIF-004']);
        const multi = evaluateChecklist(DEFAULT_DOCUMENTATION_CHECKLIST, { ...facts, profile: 'MULTI_INVOICE_INVOICE_ONLY' });
        expect(multi.map((entry) => `${entry.ruleId}:${entry.status}`)).toEqual(['MIO-001:ok']);
    });

    it('keeps profiles, condition and version through the agent payload and a saved file', () => {
        const checklist = fromDocumentationRules({ agreementId: 'demo', version: '2026-11-17-r1', rules: [{ ruleId: 'SIF-010', profiles: ['P1'], condition: 'Lab billed', requiredDocuments: ['Laboratorios'] }] });
        const payload = toDocumentationRules(checklist) as { rules: Array<Record<string, unknown>> };
        expect(payload.rules[0]['profiles']).toEqual(['P1']);
        expect(payload.rules[0]['condition']).toBe('Lab billed');
        const parsed = parseDocumentationChecklist(serializeDocumentationChecklist(checklist));
        expect(parsed?.agreementId).toBe('demo');
        expect(parsed?.version).toBe('2026-11-17-r1');
        expect(parsed?.rules[0].condition).toBe('Lab billed');
    });

    it('rejects files without rules and round-trips a saved file', () => {
        expect(parseDocumentationChecklist('{"foo":1}')).toBeNull();
        expect(parseDocumentationChecklist('not json')).toBeNull();
        const saved = serializeDocumentationChecklist(fromDocumentationRules(legacy), new Date('2026-11-15T00:00:00Z'));
        const parsed = parseDocumentationChecklist(saved);
        expect(parsed?.updatedAt).toBe('2026-11-15T00:00:00.000Z');
        expect(parsed?.rules.length).toBe(2);
    });

    it('builds the agent payload in the legacy shape, only enabled agent rules', () => {
        const checklist = fromDocumentationRules(legacy);
        checklist.rules[1].consumers = ['validation'];
        const payload = toDocumentationRules(checklist) as { rulesetId: string; rules: Array<Record<string, unknown>> };
        expect(payload.rulesetId).toBe('DOC-TEST');
        expect(payload.rules.length).toBe(1);
        expect(payload.rules[0]['appliesToProcedureCode']).toBe('903895');
        expect(payload.rules[0]['requiredDocuments']).toEqual(['Medical Order', 'Radiology Report']);
    });

    it('evaluates applicable rules against the documents of an account', () => {
        const checklist = fromDocumentationRules(legacy);
        const result = evaluateChecklist(checklist, { procedureCodes: ['903895'], serviceCategories: [], documentClasses: ['medical order'] });
        expect(result.length).toBe(1);
        expect(result[0].present).toEqual(['Medical Order']);
        expect(result[0].missing).toEqual(['Radiology Report']);
        expect(result[0].status).toBe('missing');
    });

    it('skips disabled rules and applies rules without scope to every account', () => {
        const checklist = fromDocumentationRules({ rules: [{ ruleId: 'ALL', requiredDocuments: ['Invoice'] }, { ruleId: 'OFF', enabled: false, requiredDocuments: ['X'] }] });
        const result = evaluateChecklist(checklist, { procedureCodes: [], serviceCategories: [], documentClasses: ['Invoice'] });
        expect(result.map((entry) => entry.ruleId)).toEqual(['ALL']);
        expect(result[0].status).toBe('ok');
    });

    it('lists the distinct required documents', () => {
        expect(checklistDocumentCatalogue(fromDocumentationRules(legacy))).toEqual(['Medical Order', 'Radiology Report', 'Surgical Report']);
    });

    it('flags missing ruleset, duplicated ids, rules without documents or consumers', () => {
        const checklist = fromDocumentationRules(legacy);
        checklist.rulesetId = ' ';
        checklist.rules[1].ruleId = 'r1';
        checklist.rules[1].requiredDocuments = [];
        checklist.rules[1].consumers = [];
        expect(validateChecklist(checklist).map((issue) => issue.ruleIndex + ':' + issue.code)).toEqual([
            'null:RULESET_REQUIRED',
            '1:RULE_ID_DUPLICATE',
            '1:DOCUMENTS_REQUIRED',
            '1:CONSUMER_REQUIRED',
        ]);
        expect(validateChecklist(fromDocumentationRules(legacy))).toEqual([]);
    });

    it('creates and duplicates rules with the next free id', () => {
        const rules = fromDocumentationRules({ rules: [{ ruleId: 'DOC-001' }, { ruleId: 'DOC-003' }] }).rules;
        const created = createChecklistRule(rules);
        expect(created.ruleId).toBe('DOC-004');
        expect(created.consumers).toEqual(['validation', 'agent']);
        const copy = duplicateChecklistRule(fromDocumentationRules(legacy).rules[0], rules);
        expect(copy.ruleId).toBe('DOC-004');
        expect(copy.requiredDocuments).toEqual(['Medical Order', 'Radiology Report']);
    });

    it('adds values once, ignoring case, accents and blanks', () => {
        expect(addUniqueValue(['Medical Order'], ' medical order ')).toEqual(['Medical Order']);
        expect(addUniqueValue(['Medical Order'], '  ')).toEqual(['Medical Order']);
        expect(addUniqueValue(['Orden'], 'Autorización')).toEqual(['Orden', 'Autorización']);
    });
});

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

    it('seeds the demo checklist from the Automate default', () => {
        expect(DEFAULT_DOCUMENTATION_CHECKLIST.rules.map((rule) => rule.ruleId)).toEqual(['DOC-001', 'DOC-002', 'DOC-003']);
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

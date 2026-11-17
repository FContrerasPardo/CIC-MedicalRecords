import { DEFAULT_DOCUMENTATION_CHECKLIST, fromDocumentationRules } from '../../agreements/checklist/documentation-checklist.util';
import { buildRadicationPreanalysis } from './radication-preanalysis.util';
import {
    buildIntakeFormValues,
    buildProviderFindingComments,
    INTAKE_FORM_FIELDS,
    parseProviderFindingComments,
    resolveIntakeOutcome,
    sameFindingComments,
} from './radication-intake.util';

const checklist = fromDocumentationRules({
    rulesetId: 'demo',
    rules: [
        { ruleId: 'R-ALL', appliesTo: { procedureCodes: [], serviceCategories: [] }, description: 'Authorization for every account', requiredDocuments: ['Autorizacion'], riskLevelIfMissing: 'HIGH' },
        { ruleId: 'R-SURG', appliesTo: { procedureCodes: ['S-100'], serviceCategories: [] }, description: 'Surgery report', requiredDocuments: ['Informe Quirurgico'], riskLevelIfMissing: 'MEDIUM' },
    ],
});

const invoice = (id: string, extra: Record<string, unknown> = {}) => ({ id, className: 'Factura y Desglose', fields: [{ name: 'invoiceNumber', value: `F-${id}` }], ...extra });

describe('radication pre-analysis', () => {
    it('is complete when every applicable rule has its documents', () => {
        const result = buildRadicationPreanalysis(checklist, { documents: [invoice('1'), { id: '2', className: 'Autorizacion' }] });
        expect(result.status).toBe('complete');
        expect(result.findings).toEqual([]);
        expect(result.rules.map((rule) => `${rule.ruleId}:${rule.status}`)).toEqual(['R-ALL:ok']);
        expect(result.documentCount).toBe(2);
    });

    it('reports missing documents and documents pending IDP review, highest risk first', () => {
        const result = buildRadicationPreanalysis(checklist, { documents: [invoice('1', { extractionReviewStatus: 'ReviewRequired' })] });
        expect(result.status).toBe('missing');
        expect(result.findings.map((finding) => `${finding.kind}:${finding.risk}`)).toEqual(['MISSING_DOCUMENTS:HIGH', 'REVIEW_REQUIRED:MEDIUM']);
        expect(result.findings[0].documents).toEqual(['Autorizacion']);
        expect(result.findings[0].id).toBe('rule:R-ALL');
        expect(result.findings[0].documentIds).toEqual([]);
        expect(result.findings[1].documentIds).toEqual(['1']);
        expect(result.findings[1].invoiceKey).toBe('document:1');
    });

    it('applies only the checklist rules of the policy profile chosen by invoice count', () => {
        const single = buildRadicationPreanalysis(DEFAULT_DOCUMENTATION_CHECKLIST, { documents: [invoice('1')] });
        expect(single.rules.map((rule) => rule.ruleId)).toEqual(['SIF-001', 'SIF-002', 'SIF-003', 'SIF-004']);
        expect(single.rules[0].status).toBe('ok');
        const multi = buildRadicationPreanalysis(DEFAULT_DOCUMENTATION_CHECKLIST, { documents: [invoice('1'), invoice('2')] });
        expect(multi.invoiceCount).toBe(2);
        expect(multi.rules.map((rule) => `${rule.ruleId}:${rule.status}`)).toEqual(['MIO-001:ok']);
    });

    it('flags an account without invoices and survives an empty batch state', () => {
        expect(buildRadicationPreanalysis(checklist, null).findings.map((finding) => finding.kind)).toEqual(['NO_INVOICE', 'MISSING_DOCUMENTS']);
    });
});

describe('provider finding comments', () => {
    const findings = buildRadicationPreanalysis(checklist, { documents: [invoice('1')] }).findings;

    it('keeps only trimmed comments of existing findings', () => {
        const payload = buildProviderFindingComments({
            radicationNumber: 'RAD-2026-12345',
            findings,
            comments: { 'rule:R-ALL': '  Sent by mail  ', 'rule:GONE': 'x', other: '' },
            at: new Date('2026-11-16T10:00:00Z'),
        });
        expect(payload.comments).toEqual([
            {
                id: 'rule:R-ALL',
                findingId: 'rule:R-ALL',
                date: '2026-11-16T10:00:00.000Z',
                kind: 'MISSING_DOCUMENTS',
                ruleId: 'R-ALL',
                comment: 'Sent by mail',
            },
        ]);
        expect(payload.updatedAt).toBe('2026-11-16T10:00:00.000Z');
    });

    it('reads the stored variable back, as JSON text or object', () => {
        const payload = buildProviderFindingComments({ radicationNumber: 'RAD-2026-12345', findings, comments: { 'rule:R-ALL': 'ok' }, at: new Date(0) });
        expect(parseProviderFindingComments(JSON.stringify(payload))).toEqual({ 'rule:R-ALL': 'ok' });
        expect(parseProviderFindingComments(payload)).toEqual({ 'rule:R-ALL': 'ok' });
        expect(parseProviderFindingComments('not json')).toEqual({});
        expect(sameFindingComments({ a: 'x' }, { a: 'x', b: '' })).toBe(true);
        expect(sameFindingComments({ a: 'x' }, { a: 'y' })).toBe(false);
    });
});

describe('intake form values', () => {
    const comments = buildProviderFindingComments({ radicationNumber: 'RAD-2026-12345', findings: [], comments: {}, at: new Date(0) });

    it('loads more documents through supportDocumentUpload and keeps the account values', () => {
        const values = buildIntakeFormValues({
            currentValues: { [INTAKE_FORM_FIELDS.account]: { documents: [] } },
            comments,
            decision: 'more-documents',
            newDocuments: [{ sys_id: 'doc-1' }],
            commentsFieldPresent: true,
        });
        expect(values[INTAKE_FORM_FIELDS.newDocuments]).toEqual([{ sys_id: 'doc-1' }]);
        expect(values[INTAKE_FORM_FIELDS.account]).toEqual({ documents: [] });
        expect(typeof values[INTAKE_FORM_FIELDS.comments]).toBe('string');
    });

    it('clears new documents when continuing and skips comments without the form field', () => {
        const values = buildIntakeFormValues({
            currentValues: { [INTAKE_FORM_FIELDS.newDocuments]: [{ sys_id: 'old' }] },
            comments,
            decision: 'continue',
            commentsFieldPresent: false,
        });
        expect(values[INTAKE_FORM_FIELDS.newDocuments]).toBeNull();
        expect(INTAKE_FORM_FIELDS.comments in values).toBe(false);
    });

    it('uses the declared outcome name, or the default completion', () => {
        expect(resolveIntakeOutcome([{ name: 'Complete', isSystem: true }, { name: 'Send' }])).toBe('Send');
        expect(resolveIntakeOutcome([])).toBe('');
    });
});

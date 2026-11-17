import * as policyModule from '../../radication/policy/default-preanalysis-policy.json';
import { MULTI_INVOICE_PROFILE, parsePreanalysisPolicy, SINGLE_INVOICE_PROFILE } from '../../radication/utils/radication-policy.util';
import { DEFAULT_DOCUMENTATION_CHECKLIST } from '../checklist/documentation-checklist.util';
import {
    bumpPolicyVersion,
    createPolicyCrossCheck,
    createPolicyRequirement,
    fromPolicyDraft,
    policyClassSuggestions,
    policyRuleIdsMissingFromChecklist,
    PolicyDraft,
    toPolicyDraft,
    validatePolicyDraft,
} from './preanalysis-policy-editor.util';

// Jest (no esModuleInterop) gives the JSON object itself; bundlers add a `default` export.
const defaultPolicy: unknown = (policyModule as { default?: unknown }).default ?? policyModule;

function draftOf(): PolicyDraft {
    const draft = toPolicyDraft(defaultPolicy);
    if (!draft) {
        throw new Error('draft');
    }
    return draft;
}

function profileOf(draft: PolicyDraft, key: string) {
    const profile = draft.profiles.find((item) => item.key === key);
    if (!profile) {
        throw new Error(key);
    }
    return profile;
}

describe('pre-analysis policy editor', () => {
    const now = new Date('2026-11-18T10:00:00Z');

    it('builds a draft with both profiles and the advanced fields as JSON', () => {
        const draft = draftOf();
        expect(draft.profiles.map((profile) => profile.key)).toEqual([SINGLE_INVOICE_PROFILE, MULTI_INVOICE_PROFILE]);
        expect(profileOf(draft, SINGLE_INVOICE_PROFILE).alwaysRequired.length).toBe(4);
        expect(profileOf(draft, SINGLE_INVOICE_PROFILE).optional).toContain('cedula');
        expect(JSON.parse(draft.advanced.policyMetadata).policyId).toBe('ARS-PREANALYSIS-POLICY');
        expect(toPolicyDraft('not json')).toBeNull();
        expect(toPolicyDraft({ profiles: {} })).toBeNull();
    });

    it('accepts the bundled policy', () => {
        expect(validatePolicyDraft(draftOf())).toEqual([]);
    });

    it('round-trips without losing fields and keeps it readable by the review', () => {
        const output = fromPolicyDraft(draftOf(), now);
        const profiles = output['profiles'] as Record<string, { documentRequirements: { alwaysRequired: Array<Record<string, unknown>> } }>;
        expect(profiles[MULTI_INVOICE_PROFILE].documentRequirements.alwaysRequired[0]['perInvoice']).toBe(true);
        expect(profiles[SINGLE_INVOICE_PROFILE].documentRequirements.alwaysRequired[0]['condition']).toBeUndefined();
        expect((output['evidenceRules'] as Record<string, unknown>)['normalization']).toBeTruthy();
        const parsed = parsePreanalysisPolicy(output);
        expect(parsed?.version).toBe('2026-11-18-r1');
        expect(parsed?.profiles[SINGLE_INVOICE_PROFILE].conditionallyRequired.length).toBe(5);
    });

    it('bumps the version by date and revision', () => {
        expect(bumpPolicyVersion('2026-11-17-r1', now)).toBe('2026-11-18-r1');
        expect(bumpPolicyVersion('2026-11-18-r2', now)).toBe('2026-11-18-r3');
        expect(bumpPolicyVersion('v1', now)).toBe('2026-11-18-r1');
    });

    it('reports empty classes, duplicated or missing ids, bad risks and invalid advanced JSON', () => {
        const draft = draftOf();
        const single = profileOf(draft, SINGLE_INVOICE_PROFILE);
        single.alwaysRequired[0].className = ' ';
        single.conditionallyRequired[0].ruleId = 'sif-001';
        single.alwaysRequired[1].ruleId = '';
        single.alwaysRequired[2].risk = 'CRITICAL';
        single.crossChecks.push(createPolicyCrossCheck());
        single.crossChecks[1].checkId = 'X-PATIENT';
        draft.advanced.evidenceRules = '{ broken';
        draft.advanced.profileSelection = '[]';
        const codes = validatePolicyDraft(draft).map((issue) => `${issue.code}:${issue.section}:${issue.index}`);
        expect(codes).toContain('CLASS_NAME_REQUIRED:alwaysRequired:0');
        expect(codes).toContain('RULE_ID_DUPLICATE:alwaysRequired:0');
        expect(codes).toContain('RULE_ID_DUPLICATE:conditionallyRequired:0');
        expect(codes).toContain('RULE_ID_REQUIRED:alwaysRequired:1');
        expect(codes).toContain('RISK_INVALID:alwaysRequired:2');
        expect(codes).toContain('CHECK_ID_DUPLICATE:crossChecks:0');
        expect(codes).toContain('CHECK_ID_REQUIRED:crossChecks:6');
        expect(codes).toContain('ADVANCED_INVALID:evidenceRules:null');
        expect(codes).toContain('ADVANCED_INVALID:profileSelection:null');
    });

    it('cross-checks the rule ids against the checklist of the agreement', () => {
        const catalogue = DEFAULT_DOCUMENTATION_CHECKLIST.rules.map((rule) => rule.ruleId);
        expect(validatePolicyDraft(draftOf(), catalogue)).toEqual([]);
        expect(policyRuleIdsMissingFromChecklist(defaultPolicy, catalogue)).toEqual([]);
        const draft = draftOf();
        profileOf(draft, SINGLE_INVOICE_PROFILE).conditionallyRequired[0].ruleId = 'SIF-099';
        const codes = validatePolicyDraft(draft, catalogue).map((issue) => `${issue.code}:${issue.section}:${issue.index}`);
        expect(codes).toEqual(['RULE_ID_NOT_IN_CHECKLIST:conditionallyRequired:0']);
        expect(validatePolicyDraft(draft)).toEqual([]);
        expect(policyRuleIdsMissingFromChecklist(fromPolicyDraft(draft, now), catalogue)).toEqual([`${SINGLE_INVOICE_PROFILE}:SIF-099`]);
    });

    it('allows the same rule id in different profiles', () => {
        const draft = draftOf();
        profileOf(draft, MULTI_INVOICE_PROFILE).alwaysRequired[0].ruleId = 'SIF-001';
        expect(validatePolicyDraft(draft)).toEqual([]);
    });

    it('creates rows with a free rule id and suggests class names', () => {
        const draft = draftOf();
        const single = profileOf(draft, SINGLE_INVOICE_PROFILE);
        expect(createPolicyRequirement(single, 'alwaysRequired').ruleId).toBe('SIF-005');
        expect(createPolicyRequirement(single, 'conditionallyRequired').ruleId).toBe('SIF-015');
        const suggestions = policyClassSuggestions(draft, ['Laboratorios', 'Epicrisis']);
        expect(suggestions).toContain('Epicrisis');
        expect(suggestions.filter((name) => name === 'Laboratorios').length).toBe(1);
    });
});

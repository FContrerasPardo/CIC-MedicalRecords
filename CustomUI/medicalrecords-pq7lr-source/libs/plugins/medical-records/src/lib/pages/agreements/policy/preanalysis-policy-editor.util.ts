/**
 * Editable form of the pre-analysis policy (`/MedRec/Appdata/Policies/preanalysis-policy.json`).
 * The draft keeps every field it does not edit (`source`) so saving never drops content such as
 * `perInvoice`; `policyMetadata`, `profileSelection` and `evidenceRules` are edited as JSON text.
 * Pure module.
 */

export type PolicyRisk = 'HIGH' | 'MEDIUM' | 'LOW';
export const POLICY_RISKS: readonly PolicyRisk[] = ['HIGH', 'MEDIUM', 'LOW'];

export type PolicyAdvancedField = 'policyMetadata' | 'profileSelection' | 'evidenceRules';
export const POLICY_ADVANCED_FIELDS: readonly PolicyAdvancedField[] = ['policyMetadata', 'profileSelection', 'evidenceRules'];

export type PolicyRequirementSection = 'alwaysRequired' | 'conditionallyRequired';

export interface PolicyRequirementDraft {
    className: string;
    ruleId: string;
    risk: string;
    condition: string;
    source: Record<string, unknown>;
}

export interface PolicyCrossCheckDraft {
    checkId: string;
    label: string;
    rule: string;
    source: Record<string, unknown>;
}

export interface PolicyProfileDraft {
    key: string;
    label: string;
    alwaysRequired: PolicyRequirementDraft[];
    conditionallyRequired: PolicyRequirementDraft[];
    optional: string[];
    crossChecks: PolicyCrossCheckDraft[];
    source: Record<string, unknown>;
}

export interface PolicyDraft {
    profiles: PolicyProfileDraft[];
    advanced: Record<PolicyAdvancedField, string>;
    source: Record<string, unknown>;
}

export type PolicyIssueCode =
    | 'CLASS_NAME_REQUIRED'
    | 'RULE_ID_REQUIRED'
    | 'RULE_ID_DUPLICATE'
    | 'RULE_ID_NOT_IN_CHECKLIST'
    | 'RISK_INVALID'
    | 'CHECK_ID_REQUIRED'
    | 'CHECK_ID_DUPLICATE'
    | 'ADVANCED_INVALID';

export type PolicyIssueSection = PolicyRequirementSection | 'crossChecks' | PolicyAdvancedField;

export interface PolicyIssue {
    code: PolicyIssueCode;
    /** `null` for the advanced fields, which belong to the whole policy. */
    profileKey: string | null;
    section: PolicyIssueSection;
    index: number | null;
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** JSON-safe deep copy (the jest environment has no `structuredClone`). */
function clone(value: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function list(value: unknown): Record<string, unknown>[] {
    return (Array.isArray(value) ? value : []).map(record);
}

function toRequirement(item: Record<string, unknown>): PolicyRequirementDraft {
    return {
        className: text(item['className']),
        ruleId: text(item['ruleId']),
        risk: text(item['risk']).toUpperCase(),
        condition: text(item['condition']),
        source: { ...item },
    };
}

/** The draft of a policy document (object or file text); `null` when it is not an object with profiles. */
export function toPolicyDraft(value: unknown): PolicyDraft | null {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    const root = record(parsed);
    const profiles: PolicyProfileDraft[] = Object.entries(record(root['profiles'])).map(([key, raw]) => {
        const profile = record(raw);
        const documents = record(profile['documentRequirements']);
        return {
            key,
            label: text(profile['label']),
            alwaysRequired: list(documents['alwaysRequired']).map(toRequirement),
            conditionallyRequired: list(documents['conditionallyRequired']).map(toRequirement),
            optional: (Array.isArray(documents['optional']) ? documents['optional'] : []).map(text).filter((name) => !!name),
            crossChecks: list(profile['crossChecks']).map((check) => ({
                checkId: text(check['checkId']),
                label: text(check['label']),
                rule: text(check['rule']),
                source: { ...check },
            })),
            source: clone(profile),
        };
    });
    if (!profiles.length) {
        return null;
    }
    const advanced = {} as Record<PolicyAdvancedField, string>;
    for (const field of POLICY_ADVANCED_FIELDS) {
        advanced[field] = JSON.stringify(record(root[field]), null, 2);
    }
    return { profiles, advanced, source: clone(root) };
}

/** Parses an advanced field; `null` unless it is a JSON object. */
export function parseAdvancedField(value: string): Record<string, unknown> | null {
    try {
        const parsed: unknown = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

/**
 * Blocking problems of an edited policy. With `checklistRuleIds` (the rule ids of the same
 * agreement's documentary checklist, the canonical catalogue), a requirement whose rule id is not in
 * the checklist is an error too.
 */
export function validatePolicyDraft(draft: PolicyDraft, checklistRuleIds: readonly string[] | null = null): PolicyIssue[] {
    const issues: PolicyIssue[] = [];
    const catalogue = checklistRuleIds ? new Set(checklistRuleIds.map((id) => id.trim().toUpperCase())) : null;
    for (const profile of draft.profiles) {
        const profileKey = profile.key;
        const ruleIds = new Map<string, number>();
        for (const section of ['alwaysRequired', 'conditionallyRequired'] as const) {
            profile[section].forEach((item) => {
                const id = item.ruleId.trim().toUpperCase();
                if (id) {
                    ruleIds.set(id, (ruleIds.get(id) ?? 0) + 1);
                }
            });
        }
        for (const section of ['alwaysRequired', 'conditionallyRequired'] as const) {
            profile[section].forEach((item, index) => {
                if (!item.className.trim()) {
                    issues.push({ code: 'CLASS_NAME_REQUIRED', profileKey, section, index });
                }
                const id = item.ruleId.trim().toUpperCase();
                if (!id) {
                    issues.push({ code: 'RULE_ID_REQUIRED', profileKey, section, index });
                } else if ((ruleIds.get(id) ?? 0) > 1) {
                    issues.push({ code: 'RULE_ID_DUPLICATE', profileKey, section, index });
                } else if (catalogue && !catalogue.has(id)) {
                    issues.push({ code: 'RULE_ID_NOT_IN_CHECKLIST', profileKey, section, index });
                }
                if (!POLICY_RISKS.includes(item.risk as PolicyRisk)) {
                    issues.push({ code: 'RISK_INVALID', profileKey, section, index });
                }
            });
        }
        const checkIds = profile.crossChecks.map((check) => check.checkId.trim().toUpperCase());
        checkIds.forEach((id, index) => {
            if (!id) {
                issues.push({ code: 'CHECK_ID_REQUIRED', profileKey, section: 'crossChecks', index });
            } else if (checkIds.indexOf(id) !== index || checkIds.lastIndexOf(id) !== index) {
                issues.push({ code: 'CHECK_ID_DUPLICATE', profileKey, section: 'crossChecks', index });
            }
        });
    }
    for (const field of POLICY_ADVANCED_FIELDS) {
        if (!parseAdvancedField(draft.advanced[field])) {
            issues.push({ code: 'ADVANCED_INVALID', profileKey: null, section: field, index: null });
        }
    }
    return issues;
}

function datePart(now: Date): string {
    return now.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD-rN` for the save day: the next revision when the version already has that date, else `r1`. */
export function bumpPolicyVersion(version: string, now = new Date()): string {
    const today = datePart(now);
    const match = /^(\d{4}-\d{2}-\d{2})-r(\d+)$/.exec(version.trim());
    const revision = match && match[1] === today ? Number(match[2]) + 1 : 1;
    return `${today}-r${revision}`;
}

function fromRequirement(item: PolicyRequirementDraft, conditional: boolean): Record<string, unknown> {
    const output: Record<string, unknown> = {
        ...item.source,
        className: item.className.trim(),
        ruleId: item.ruleId.trim(),
        risk: item.risk,
    };
    if (conditional || item.condition.trim()) {
        output['condition'] = item.condition.trim();
    } else {
        delete output['condition'];
    }
    return output;
}

/**
 * The policy document for Appdata. Advanced fields must be valid (see `validatePolicyDraft`);
 * `policyMetadata.version` is bumped with `bumpPolicyVersion`.
 */
export function fromPolicyDraft(draft: PolicyDraft, now = new Date()): Record<string, unknown> {
    const metadata = parseAdvancedField(draft.advanced.policyMetadata) ?? {};
    const profiles: Record<string, unknown> = {};
    for (const profile of draft.profiles) {
        profiles[profile.key] = {
            ...profile.source,
            label: profile.label.trim() || profile.key,
            documentRequirements: {
                ...record(profile.source['documentRequirements']),
                alwaysRequired: profile.alwaysRequired.map((item) => fromRequirement(item, false)),
                conditionallyRequired: profile.conditionallyRequired.map((item) => fromRequirement(item, true)),
                optional: profile.optional.map((name) => name.trim()).filter((name) => !!name),
            },
            crossChecks: profile.crossChecks.map((check) => ({
                ...check.source,
                checkId: check.checkId.trim(),
                label: check.label.trim(),
                rule: check.rule.trim(),
            })),
        };
    }
    return {
        ...draft.source,
        policyMetadata: { ...metadata, version: bumpPolicyVersion(text(metadata['version']), now) },
        profileSelection: parseAdvancedField(draft.advanced.profileSelection) ?? {},
        evidenceRules: parseAdvancedField(draft.advanced.evidenceRules) ?? {},
        profiles,
    };
}

export function serializePolicyDocument(document: Record<string, unknown>): string {
    return `${JSON.stringify(document, null, 2)}\n`;
}

export function createPolicyRequirement(profile: PolicyProfileDraft, section: PolicyRequirementSection): PolicyRequirementDraft {
    const prefix = profile.key
        .split('_')
        .map((word) => word.charAt(0))
        .join('')
        .slice(0, 3);
    const used = new Set([...profile.alwaysRequired, ...profile.conditionallyRequired].map((item) => item.ruleId.toUpperCase()));
    let number = section === 'conditionallyRequired' ? 10 : 1;
    let ruleId = '';
    do {
        ruleId = `${prefix}-${String(number).padStart(3, '0')}`;
        number += 1;
    } while (used.has(ruleId.toUpperCase()));
    return { className: '', ruleId, risk: 'MEDIUM', condition: '', source: {} };
}

export function createPolicyCrossCheck(): PolicyCrossCheckDraft {
    return { checkId: '', label: '', rule: '', source: {} };
}

/** Rule ids of the policy document (object or text) missing from the checklist catalogue, as `PROFILE:RULE`. */
export function policyRuleIdsMissingFromChecklist(policy: unknown, checklistRuleIds: readonly string[]): string[] {
    const draft = toPolicyDraft(policy);
    if (!draft) {
        return [];
    }
    const catalogue = new Set(checklistRuleIds.map((id) => id.trim().toUpperCase()));
    return draft.profiles.flatMap((profile) =>
        [...profile.alwaysRequired, ...profile.conditionallyRequired]
            .map((item) => item.ruleId.trim())
            .filter((id) => !!id && !catalogue.has(id.toUpperCase()))
            .map((id) => `${profile.key}:${id}`)
    );
}

/** Class names for suggestions: every class the draft names plus the extra ones (e.g. checklist catalogue), sorted, without duplicates. */
export function policyClassSuggestions(draft: PolicyDraft, extra: readonly string[] = []): string[] {
    const names = draft.profiles.flatMap((profile) => [
        ...profile.alwaysRequired.map((item) => item.className),
        ...profile.conditionallyRequired.map((item) => item.className),
        ...profile.optional,
    ]);
    const unique = new Map<string, string>();
    for (const name of [...names, ...extra].map((value) => value.trim()).filter((value) => !!value)) {
        if (!unique.has(name.toLowerCase())) {
            unique.set(name.toLowerCase(), name);
        }
    }
    return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

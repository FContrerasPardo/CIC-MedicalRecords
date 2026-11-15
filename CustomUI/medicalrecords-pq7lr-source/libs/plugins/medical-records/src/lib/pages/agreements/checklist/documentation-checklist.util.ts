import { normalizeKey } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';

/**
 * Documentary checklist of an agreement, stored as a JSON file in Appdata so it can be changed at
 * runtime instead of living in a process variable (`documentationRules`). One source feeds both
 * the validation interface (what is missing for an account) and the agent rules (the legacy
 * `documentationRules` payload). Pure module: no Angular imports.
 */
export const DOCUMENTATION_CHECKLIST_KIND = 'medical-records.documentation-checklist';
export const DOCUMENTATION_CHECKLIST_SCHEMA_VERSION = 1;

export type ChecklistRisk = 'HIGH' | 'MEDIUM' | 'LOW';
/** Who reads the rule: the validation interface of the account, the documentation agent, or both. */
export type ChecklistConsumer = 'validation' | 'agent';

export interface ChecklistRule {
    ruleId: string;
    /** Empty lists mean the rule applies to every account. */
    appliesTo: { procedureCodes: string[]; serviceCategories: string[] };
    description: string;
    requiredDocuments: string[];
    riskLevelIfMissing: ChecklistRisk;
    consumers: ChecklistConsumer[];
    enabled: boolean;
}

export interface DocumentationChecklist {
    kind: typeof DOCUMENTATION_CHECKLIST_KIND;
    schemaVersion: number;
    rulesetId: string;
    name: string;
    payer: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    updatedAt: string | null;
    rules: ChecklistRule[];
}

const RISKS: ChecklistRisk[] = ['HIGH', 'MEDIUM', 'LOW'];
const ALL_CONSUMERS: ChecklistConsumer[] = ['validation', 'agent'];

/** Demo seed, identical to the default `documentationRules` of the Automate agent mesh process. */
export const DEFAULT_DOCUMENTATION_CHECKLIST: DocumentationChecklist = fromDocumentationRules({
    rulesetId: 'DOC-RULES-DEMO-2024',
    rules: [
        {
            ruleId: 'DOC-001',
            appliesToProcedureCode: '903895',
            description: 'Radiology procedure requires imaging report, medical order, and prior authorization when required by payer.',
            requiredDocuments: ['Radiology Report', 'Medical Order', 'Prior Authorization'],
            riskLevelIfMissing: 'HIGH',
        },
        {
            ruleId: 'DOC-002',
            appliesToProcedureCode: '890201',
            description: 'Laboratory panel requires laboratory result and medical order.',
            requiredDocuments: ['Laboratory Result', 'Medical Order'],
            riskLevelIfMissing: 'MEDIUM',
        },
        {
            ruleId: 'DOC-003',
            appliesToServiceCategory: 'surgery',
            description: 'Surgical services require surgical report, anesthesia record, authorization, and clinical notes.',
            requiredDocuments: ['Surgical Report', 'Anesthesia Record', 'Prior Authorization', 'Clinical Notes'],
            riskLevelIfMissing: 'HIGH',
        },
    ],
});

function asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value === 'string') {
        try {
            return asRecord(JSON.parse(value));
        } catch {
            return null;
        }
    }
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value).trim();
}

function textOrNull(value: unknown): string | null {
    return text(value) || null;
}

function textList(...values: unknown[]): string[] {
    const out: string[] = [];
    for (const value of values) {
        const items = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
        for (const item of items) {
            const entry = text(item);
            if (entry && !out.includes(entry)) {
                out.push(entry);
            }
        }
    }
    return out;
}

function risk(value: unknown): ChecklistRisk {
    const upper = text(value).toUpperCase() as ChecklistRisk;
    return RISKS.includes(upper) ? upper : 'MEDIUM';
}

function consumers(value: unknown): ChecklistConsumer[] {
    const list = textList(value).filter((entry): entry is ChecklistConsumer => (ALL_CONSUMERS as string[]).includes(entry));
    return list.length ? list : [...ALL_CONSUMERS];
}

function normalizeRule(raw: Record<string, unknown>, index: number): ChecklistRule {
    const appliesTo = asRecord(raw['appliesTo']) ?? {};
    return {
        ruleId: text(raw['ruleId']) || `DOC-${String(index + 1).padStart(3, '0')}`,
        appliesTo: {
            procedureCodes: textList(appliesTo['procedureCodes'], raw['appliesToProcedureCode'], raw['appliesToProcedureCodes']),
            serviceCategories: textList(appliesTo['serviceCategories'], raw['appliesToServiceCategory'], raw['appliesToServiceCategories']),
        },
        description: text(raw['description']),
        requiredDocuments: textList(raw['requiredDocuments']),
        riskLevelIfMissing: risk(raw['riskLevelIfMissing']),
        consumers: consumers(raw['consumers']),
        enabled: raw['enabled'] !== false,
    };
}

function rulesOf(record: Record<string, unknown>): ChecklistRule[] {
    const rules = Array.isArray(record['rules']) ? record['rules'] : [];
    return rules
        .map((rule) => asRecord(rule))
        .filter((rule): rule is Record<string, unknown> => !!rule)
        .map((rule, index) => normalizeRule(rule, index));
}

/** Legacy process variable `documentationRules` → checklist document (migration and seed). */
export function fromDocumentationRules(value: unknown): DocumentationChecklist {
    const record = asRecord(value) ?? {};
    return {
        kind: DOCUMENTATION_CHECKLIST_KIND,
        schemaVersion: DOCUMENTATION_CHECKLIST_SCHEMA_VERSION,
        rulesetId: text(record['rulesetId']) || 'DOC-RULES',
        name: text(record['name']) || 'Documentary checklist',
        payer: textOrNull(record['payer']),
        effectiveFrom: textOrNull(record['effectiveFrom']),
        effectiveTo: textOrNull(record['effectiveTo']),
        updatedAt: textOrNull(record['updatedAt']),
        rules: rulesOf(record),
    };
}

/** Reads an Appdata checklist file (object or JSON text); also accepts the legacy variable shape. */
export function parseDocumentationChecklist(raw: unknown): DocumentationChecklist | null {
    const record = asRecord(raw);
    if (!record || !Array.isArray(record['rules'])) {
        return null;
    }
    return fromDocumentationRules(record);
}

/** Pretty JSON written to Appdata, stamped with the save time. */
export function serializeDocumentationChecklist(checklist: DocumentationChecklist, savedAt = new Date()): string {
    return JSON.stringify({ ...checklist, updatedAt: savedAt.toISOString() }, null, 2);
}

/**
 * Payload for the documentation agent, in the legacy `documentationRules` shape it already reads.
 * Only enabled rules addressed to the agent are included.
 */
export function toDocumentationRules(checklist: DocumentationChecklist): Record<string, unknown> {
    return {
        rulesetId: checklist.rulesetId,
        rules: checklist.rules
            .filter((rule) => rule.enabled && rule.consumers.includes('agent'))
            .map((rule) => ({
                ruleId: rule.ruleId,
                ...(rule.appliesTo.procedureCodes.length === 1 ? { appliesToProcedureCode: rule.appliesTo.procedureCodes[0] } : {}),
                ...(rule.appliesTo.procedureCodes.length > 1 ? { appliesToProcedureCodes: rule.appliesTo.procedureCodes } : {}),
                ...(rule.appliesTo.serviceCategories.length === 1 ? { appliesToServiceCategory: rule.appliesTo.serviceCategories[0] } : {}),
                ...(rule.appliesTo.serviceCategories.length > 1 ? { appliesToServiceCategories: rule.appliesTo.serviceCategories } : {}),
                description: rule.description,
                requiredDocuments: rule.requiredDocuments,
                riskLevelIfMissing: rule.riskLevelIfMissing,
            })),
    };
}

export interface ChecklistAccountFacts {
    procedureCodes: string[];
    serviceCategories: string[];
    /** Document classes found in the account (IDP class names). */
    documentClasses: string[];
}

export interface ChecklistRuleEvaluation {
    ruleId: string;
    risk: ChecklistRisk;
    present: string[];
    missing: string[];
    status: 'ok' | 'missing';
}

function ruleApplies(rule: ChecklistRule, facts: ChecklistAccountFacts): boolean {
    const { procedureCodes, serviceCategories } = rule.appliesTo;
    if (!procedureCodes.length && !serviceCategories.length) {
        return true;
    }
    const codes = new Set(facts.procedureCodes.map(normalizeKey));
    const categories = new Set(facts.serviceCategories.map(normalizeKey));
    return procedureCodes.some((code) => codes.has(normalizeKey(code))) || serviceCategories.some((category) => categories.has(normalizeKey(category)));
}

/** What the validation interface shows: applicable rules and the required documents found or missing. */
export function evaluateChecklist(checklist: DocumentationChecklist, facts: ChecklistAccountFacts): ChecklistRuleEvaluation[] {
    const found = new Set(facts.documentClasses.map(normalizeKey));
    return checklist.rules
        .filter((rule) => rule.enabled && rule.consumers.includes('validation') && ruleApplies(rule, facts))
        .map((rule) => {
            const present = rule.requiredDocuments.filter((document) => found.has(normalizeKey(document)));
            const missing = rule.requiredDocuments.filter((document) => !found.has(normalizeKey(document)));
            return { ruleId: rule.ruleId, risk: rule.riskLevelIfMissing, present, missing, status: missing.length ? 'missing' : 'ok' };
        });
}

/** Distinct required documents across the rules, for the viewer's catalogue. */
export function checklistDocumentCatalogue(checklist: DocumentationChecklist): string[] {
    return textList(...checklist.rules.map((rule) => rule.requiredDocuments)).sort((a, b) => a.localeCompare(b));
}

export type ChecklistIssueCode = 'RULESET_REQUIRED' | 'RULE_ID_REQUIRED' | 'RULE_ID_DUPLICATE' | 'DOCUMENTS_REQUIRED' | 'CONSUMER_REQUIRED';

export interface ChecklistIssue {
    /** Index of the rule, or null for the checklist header. */
    ruleIndex: number | null;
    code: ChecklistIssueCode;
}

/** Blocking problems of an edited checklist; saving is allowed only without issues. */
export function validateChecklist(checklist: DocumentationChecklist): ChecklistIssue[] {
    const issues: ChecklistIssue[] = [];
    if (!text(checklist.rulesetId)) {
        issues.push({ ruleIndex: null, code: 'RULESET_REQUIRED' });
    }
    const seen = new Map<string, number>();
    checklist.rules.forEach((rule, index) => {
        const id = normalizeKey(rule.ruleId);
        if (!id) {
            issues.push({ ruleIndex: index, code: 'RULE_ID_REQUIRED' });
        } else if (seen.has(id)) {
            issues.push({ ruleIndex: index, code: 'RULE_ID_DUPLICATE' });
        } else {
            seen.set(id, index);
        }
        if (!rule.requiredDocuments.some((document) => text(document))) {
            issues.push({ ruleIndex: index, code: 'DOCUMENTS_REQUIRED' });
        }
        if (!rule.consumers.length) {
            issues.push({ ruleIndex: index, code: 'CONSUMER_REQUIRED' });
        }
    });
    return issues;
}

/** New rule with the next free `DOC-NNN` id, for both consumers and enabled. */
export function createChecklistRule(existing: readonly ChecklistRule[]): ChecklistRule {
    const used = new Set(existing.map((rule) => normalizeKey(rule.ruleId)));
    let next = existing.length + 1;
    let ruleId = `DOC-${String(next).padStart(3, '0')}`;
    while (used.has(normalizeKey(ruleId))) {
        next += 1;
        ruleId = `DOC-${String(next).padStart(3, '0')}`;
    }
    return {
        ruleId,
        appliesTo: { procedureCodes: [], serviceCategories: [] },
        description: '',
        requiredDocuments: [],
        riskLevelIfMissing: 'MEDIUM',
        consumers: [...ALL_CONSUMERS],
        enabled: true,
    };
}

/** Copy of a rule with a new free id, placed by the caller after the original. */
export function duplicateChecklistRule(rule: ChecklistRule, existing: readonly ChecklistRule[]): ChecklistRule {
    return {
        ...rule,
        ruleId: createChecklistRule(existing).ruleId,
        appliesTo: { procedureCodes: [...rule.appliesTo.procedureCodes], serviceCategories: [...rule.appliesTo.serviceCategories] },
        requiredDocuments: [...rule.requiredDocuments],
        consumers: [...rule.consumers],
    };
}

/** Adds a trimmed value unless it is empty or already there (case and accent insensitive). */
export function addUniqueValue(list: readonly string[], value: string): string[] {
    const entry = text(value);
    if (!entry || list.some((item) => normalizeKey(item) === normalizeKey(entry))) {
        return [...list];
    }
    return [...list, entry];
}

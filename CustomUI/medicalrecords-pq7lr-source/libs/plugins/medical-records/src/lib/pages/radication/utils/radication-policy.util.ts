import { normalizeKey } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';
import { AgreementContentLanguage, localizeAgreementContent, resolveLocalizedSource, TemplateTranslations, untranslatedTexts } from '../../agreements/store/agreement-locale.util';

/**
 * Documentary pre-analysis policy (`docs/automate/policies/preanalysis-policy.json`), shown in the
 * review's right column as CIC-Fin showed its policy: the profile chosen for the account, its
 * required and conditional classes with what the review found, and the cross-checks. Pure module.
 */

export const SINGLE_INVOICE_PROFILE = 'SINGLE_INVOICE_FULL';
export const MULTI_INVOICE_PROFILE = 'MULTI_INVOICE_INVOICE_ONLY';

/** Marker of a policy class: a review row passed, was flagged, is missing, or none mentions it. */
export type PolicyClassStatus = 'found' | 'attention' | 'missing' | 'none';

export interface PolicyDocumentRequirement {
    className: string;
    ruleId: string;
    risk: string;
    condition?: string;
}

export interface PolicyCrossCheck {
    checkId: string;
    label: string;
    rule: string;
}

export interface PolicyProfile {
    label: string;
    alwaysRequired: PolicyDocumentRequirement[];
    conditionallyRequired: PolicyDocumentRequirement[];
    /** Classes the profile accepts without requiring them (`documentRequirements.optional`). */
    optional?: string[];
    crossChecks: PolicyCrossCheck[];
}

export interface PreanalysisPolicy {
    policyId: string;
    version: string;
    defaultProfile: string;
    profiles: Record<string, PolicyProfile>;
}

/** A review row reduced to what the policy needs. */
export interface PolicyReviewRow {
    className: string;
    status: 'missing' | 'attention' | 'pass';
}

export interface PolicyClassView extends PolicyDocumentRequirement {
    status: PolicyClassStatus;
}

export interface PolicyView {
    policyId: string;
    version: string;
    profileKey: string;
    profileLabel: string;
    required: PolicyClassView[];
    conditional: PolicyClassView[];
    crossChecks: PolicyCrossCheck[];
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function requirements(value: unknown): PolicyDocumentRequirement[] {
    return (Array.isArray(value) ? value : [])
        .map(record)
        .filter((item) => !!text(item['className']))
        .map((item) => ({
            className: text(item['className']),
            ruleId: text(item['ruleId']),
            risk: text(item['risk']).toUpperCase(),
            ...(text(item['condition']) ? { condition: text(item['condition']) } : {}),
        }));
}

/** The policy from the Appdata file text or an already parsed object; `null` when it has no profiles. */
export function parsePreanalysisPolicy(value: unknown): PreanalysisPolicy | null {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    const root = record(parsed);
    const profiles: Record<string, PolicyProfile> = {};
    for (const [key, raw] of Object.entries(record(root['profiles']))) {
        const profile = record(raw);
        const documents = record(profile['documentRequirements']);
        profiles[key] = {
            label: text(profile['label']) || key,
            alwaysRequired: requirements(documents['alwaysRequired']),
            conditionallyRequired: requirements(documents['conditionallyRequired']),
            optional: (Array.isArray(documents['optional']) ? documents['optional'] : []).map(text).filter((name) => !!name),
            crossChecks: (Array.isArray(profile['crossChecks']) ? profile['crossChecks'] : [])
                .map(record)
                .filter((check) => !!text(check['checkId']) || !!text(check['label']))
                .map((check) => ({ checkId: text(check['checkId']), label: text(check['label']) || text(check['checkId']), rule: text(check['rule']) })),
        };
    }
    if (!Object.keys(profiles).length) {
        return null;
    }
    const metadata = record(root['policyMetadata']);
    const selection = record(root['profileSelection']);
    return {
        policyId: text(metadata['policyId']),
        version: text(metadata['version']),
        defaultProfile: text(selection['defaultProfile']) || SINGLE_INVOICE_PROFILE,
        profiles,
    };
}

/** Where the policy shown on the page comes from in the UI language. */
export type PolicyLanguageOrigin = 'variant' | 'template' | 'base';

export interface LocalizedPolicyChoice {
    policy: PreanalysisPolicy | null;
    origin: PolicyLanguageOrigin;
    /** Some texts stayed in the base language (no `<name>.<lang>.json` and no template translation): discreet notice. */
    baseLanguageShown: boolean;
}

/**
 * The policy the page shows in a language (`resolveLocalizedSource`, as the agreements page): the
 * agreement's `preanalysis-policy.<lang>.json` when usable; else, with the base file in Appdata, the
 * base translated with the template dictionary (texts outside it stay in the base language and set
 * `baseLanguageShown`); else the bundled template in that language. The Automate agent keeps reading
 * the base file: this only decides what is displayed.
 */
export function chooseLocalizedPolicy(input: {
    language: AgreementContentLanguage;
    /** Content of `<name>.<lang>.json`; `undefined` when the file is absent, `null` when unreadable. */
    variant?: unknown;
    /** The readable base file in Appdata (`null` when absent, unreadable or only the legacy global file). */
    base: unknown;
    /** The bundled template already in `language`. */
    template: unknown;
    translations: TemplateTranslations;
}): LocalizedPolicyChoice {
    const variantPolicy = input.variant ? parsePreanalysisPolicy(input.variant) : null;
    const pick = resolveLocalizedSource(variantPolicy ? 'usable' : input.variant === undefined ? 'absent' : 'unusable', !!parsePreanalysisPolicy(input.base));
    if (pick === 'variant') {
        return { policy: variantPolicy, origin: 'variant', baseLanguageShown: false };
    }
    if (pick === 'base') {
        const localized = localizeAgreementContent(input.base, input.language, input.translations);
        return { policy: parsePreanalysisPolicy(localized), origin: 'base', baseLanguageShown: untranslatedTexts(input.base, input.language, input.translations).length > 0 };
    }
    return { policy: parsePreanalysisPolicy(input.template), origin: 'template', baseLanguageShown: false };
}

/** As the policy says: one invoice → full clinical support; two or more → invoice only. */
export function selectPolicyProfileKey(policy: PreanalysisPolicy, invoiceCount: number): string {
    const wanted = invoiceCount >= 2 ? MULTI_INVOICE_PROFILE : invoiceCount === 1 ? SINGLE_INVOICE_PROFILE : policy.defaultProfile;
    if (policy.profiles[wanted]) {
        return wanted;
    }
    return policy.profiles[policy.defaultProfile] ? policy.defaultProfile : Object.keys(policy.profiles)[0];
}

/**
 * What the review rows say about one class (matched by normalized name): missing wins over
 * attention, attention over found; `none` when no row mentions it.
 */
export function policyClassStatus(className: string, rows: readonly PolicyReviewRow[]): PolicyClassStatus {
    const wanted = normalizeKey(className);
    const matching = rows.filter((row) => normalizeKey(row.className) === wanted);
    if (!matching.length) {
        return 'none';
    }
    if (matching.some((row) => row.status === 'missing')) {
        return 'missing';
    }
    return matching.some((row) => row.status === 'attention') ? 'attention' : 'found';
}

/** The selected profile with the review's marker on each class. A required class no row mentions counts as missing. */
export function buildPolicyView(policy: PreanalysisPolicy, invoiceCount: number, rows: readonly PolicyReviewRow[]): PolicyView {
    const profileKey = selectPolicyProfileKey(policy, invoiceCount);
    const profile = policy.profiles[profileKey];
    const required = profile.alwaysRequired.map((item) => {
        const status = policyClassStatus(item.className, rows);
        return { ...item, status: status === 'none' ? ('missing' as const) : status };
    });
    const conditional = profile.conditionallyRequired.map((item) => ({ ...item, status: policyClassStatus(item.className, rows) }));
    return {
        policyId: policy.policyId,
        version: policy.version,
        profileKey,
        profileLabel: profile.label,
        required,
        conditional,
        crossChecks: profile.crossChecks,
    };
}

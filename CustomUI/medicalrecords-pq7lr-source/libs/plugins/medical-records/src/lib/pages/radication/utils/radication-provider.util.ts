import { normalizeKey } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';
import { DocumentationChecklist, parseDocumentationChecklist } from '../../agreements/checklist/documentation-checklist.util';
import { AgreementContentLanguage, localizeAgreementContent, resolveLocalizedSource, TemplateTranslations } from '../../agreements/store/agreement-locale.util';
import { AgreementIndexEntry, normalizeProviderName } from '../../agreements/store/agreement-store.util';
import { MULTI_INVOICE_PROFILE, PreanalysisPolicy, SINGLE_INVOICE_PROFILE } from './radication-policy.util';

/**
 * Step 1 of the provider radication: the provider picked from the agreements index and the
 * documents its agreement requires (checklist and pre-analysis policy in the UI language). Pure module.
 */

/** One provider of the selector: an agreement of the index. */
export interface ProviderOption {
    agreementId: string;
    providerName: string;
    payer: string;
    /** Other names of the provider (`agreement.json` → `providerAliases`), without the main name. */
    aliases: string[];
    /** `agreement.json` → `general.contractId`; empty when unknown. */
    contractId: string;
}

/** What `agreement.json` adds to an index entry. */
export interface ProviderOptionDetails {
    aliases?: readonly string[];
    contractId?: string | null;
    payer?: string | null;
}

/**
 * The providers of the selector, one per agreement of the index: inactive agreements and entries
 * without a provider name are left out; aliases are deduplicated (ignoring case, accents and legal
 * suffixes) and never repeat the main name. Sorted by provider name.
 */
export function buildProviderOptions(entries: readonly AgreementIndexEntry[], details: Readonly<Record<string, ProviderOptionDetails>> = {}): ProviderOption[] {
    return entries
        .filter((entry) => entry.status !== 'INACTIVE' && !!entry.providerName.trim())
        .map((entry) => {
            const extra = details[entry.agreementId] ?? {};
            const seen = new Set([normalizeProviderName(entry.providerName)]);
            const aliases = (extra.aliases ?? [])
                .map((alias) => alias.trim())
                .filter((alias) => {
                    const key = normalizeProviderName(alias);
                    return !!key && !seen.has(key) && (seen.add(key), true);
                });
            return {
                agreementId: entry.agreementId,
                providerName: entry.providerName.trim(),
                payer: (extra.payer ?? '').trim() || entry.payer,
                aliases,
                contractId: (extra.contractId ?? '').trim(),
            };
        })
        .sort((a, b) => a.providerName.localeCompare(b.providerName));
}

/** The option selected when the form opens: the only agreement, or none (the provider chooses). */
export function defaultProviderOption(options: readonly ProviderOption[]): ProviderOption | null {
    return options.length === 1 ? options[0] : null;
}

/** Name of the applied agreement: provider and payer, with the contract id when known. */
export function agreementDisplayName(option: Pick<ProviderOption, 'providerName' | 'payer' | 'contractId'>): string {
    const name = [option.providerName, option.payer].filter(Boolean).join(' – ');
    return option.contractId ? `${name} (${option.contractId})` : name;
}

export interface RequiredDocument {
    className: string;
    ruleId: string;
    /** Short condition shown next to the class (conditional documents only). */
    condition?: string;
    /** The whole condition, as written in the policy or the checklist. */
    conditionFull?: string;
}

/** What the provider must send with a single invoice, and what is enough with several invoices. */
export interface RequiredDocumentsSummary {
    always: RequiredDocument[];
    conditional: RequiredDocument[];
    optional: string[];
    /**
     * Classes required for each invoice when the account has several invoices: the policy's
     * multi-invoice profile, else the checklist rules of that profile; empty when neither has it.
     */
    multiInvoiceDocuments: string[];
}

/** First clause of a condition (up to `:`, `;` or a parenthesis), cut at a word boundary when longer than `max`. */
export function shortCondition(value: string | null | undefined, max = 80): string {
    const clause = (value ?? '').split(/[:;]| \(/)[0].trim();
    if (clause.length <= max) {
        return clause;
    }
    const cut = clause.slice(0, max);
    const space = cut.lastIndexOf(' ');
    return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.]+$/, '')}…`;
}

/**
 * The documents the agreement requires, grouped as the step-1 card shows them. The policy's
 * single-invoice profile (full clinical support) decides the groups; the checklist completes them
 * with its enabled rules of that profile not listed by the policy, and gives the condition when the
 * policy row has none. Without a policy, only the checklist. `null` when nothing is required.
 */
export function buildRequiredDocumentsSummary(policy: PreanalysisPolicy | null, checklist: DocumentationChecklist | null): RequiredDocumentsSummary | null {
    const single = policy ? (policy.profiles[SINGLE_INVOICE_PROFILE] ?? policy.profiles[policy.defaultProfile] ?? null) : null;
    const rules = (checklist?.rules ?? []).filter((rule) => rule.enabled);
    const ruleCondition = new Map(rules.filter((rule) => !!rule.condition.trim()).map((rule) => [rule.ruleId, rule.condition.trim()]));
    const covered = new Set<string>();
    const always: RequiredDocument[] = [];
    const conditional: RequiredDocument[] = [];
    const add = (className: string, ruleId: string, conditionalRow: boolean, condition = '') => {
        const key = normalizeKey(className);
        if (!key || covered.has(key)) {
            return;
        }
        covered.add(key);
        if (!conditionalRow) {
            always.push({ className, ruleId });
        } else {
            conditional.push(condition ? { className, ruleId, condition: shortCondition(condition), conditionFull: condition } : { className, ruleId });
        }
    };

    for (const item of single?.alwaysRequired ?? []) {
        add(item.className, item.ruleId, false);
    }
    for (const item of single?.conditionallyRequired ?? []) {
        add(item.className, item.ruleId, true, item.condition || ruleCondition.get(item.ruleId) || '');
    }
    for (const rule of rules.filter((candidate) => !candidate.profiles.length || candidate.profiles.includes(SINGLE_INVOICE_PROFILE))) {
        for (const className of rule.requiredDocuments) {
            add(className, rule.ruleId, !!rule.condition.trim(), rule.condition.trim());
        }
    }

    const optional = (single?.optional ?? []).filter((className) => {
        const key = normalizeKey(className);
        return !!key && !covered.has(key) && (covered.add(key), true);
    });

    const multi = policy?.profiles[MULTI_INVOICE_PROFILE];
    const multiClasses = multi
        ? multi.alwaysRequired.map((item) => item.className)
        : rules.filter((rule) => rule.profiles.includes(MULTI_INVOICE_PROFILE) && !rule.condition.trim()).flatMap((rule) => rule.requiredDocuments);
    const multiSeen = new Set<string>();
    const multiInvoiceDocuments = multiClasses.filter((className) => {
        const key = normalizeKey(className);
        return !!key && !multiSeen.has(key) && (multiSeen.add(key), true);
    });

    return always.length || conditional.length || optional.length ? { always, conditional, optional, multiInvoiceDocuments } : null;
}

/**
 * The agreement's checklist in a language, with the same order as the policy
 * (`chooseLocalizedPolicy`): the `<lang>` version when usable; else the base in Appdata translated
 * with the template dictionary; else the bundled template in that language.
 */
export function chooseLocalizedChecklist(input: {
    language: AgreementContentLanguage;
    /** Content of `documentation-checklist.<lang>.json`; `undefined` when absent, `null` when unreadable. */
    variant?: unknown;
    /** The readable base file in Appdata (`null` when absent or unreadable). */
    base: unknown;
    /** The bundled template already in `language`. */
    template: unknown;
    translations: TemplateTranslations;
}): DocumentationChecklist | null {
    const variant = input.variant ? parseDocumentationChecklist(input.variant) : null;
    const pick = resolveLocalizedSource(variant ? 'usable' : input.variant === undefined ? 'absent' : 'unusable', !!parseDocumentationChecklist(input.base));
    if (pick === 'variant') {
        return variant;
    }
    if (pick === 'base') {
        return parseDocumentationChecklist(localizeAgreementContent(input.base, input.language, input.translations));
    }
    return parseDocumentationChecklist(input.template);
}

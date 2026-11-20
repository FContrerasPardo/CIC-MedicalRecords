/**
 * Language versions of the agreement files in Appdata.
 *
 * ```
 * /MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.json      base: read by the Automate agents
 * /MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.es.json   Spanish version (UI)
 * /MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.en.json   English version (UI)
 * /MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.pt.json   Portuguese version (UI)
 * ```
 *
 * Every version has the same structure, ids, codes, IDP class names and numbers; only the texts
 * (descriptions, conditions, labels…) change. The page reads the version of the UI language and
 * falls back to the base; saving writes the version of the UI language and the base, so the agents
 * always read the last saved rules. Pure module.
 */

export type AgreementContentLanguage = 'es' | 'en' | 'pt';

export const AGREEMENT_CONTENT_LANGUAGES: readonly AgreementContentLanguage[] = ['es', 'en', 'pt'];

/** Language used when the UI language has no content version (de, fr, it, pl…). */
export const AGREEMENT_FALLBACK_LANGUAGE: AgreementContentLanguage = 'en';

/** The content language of a UI language (`es`, `es-DO`, `pt_BR`…); anything else falls back to English. */
export function resolveContentLanguage(uiLanguage: string | null | undefined): AgreementContentLanguage {
    const primary = String(uiLanguage ?? '')
        .trim()
        .toLowerCase()
        .split(/[-_]/)[0] as AgreementContentLanguage;
    return AGREEMENT_CONTENT_LANGUAGES.includes(primary) ? primary : AGREEMENT_FALLBACK_LANGUAGE;
}

/** `documentation-checklist.json` → `documentation-checklist.es.json`. */
export function localizedFileName(fileName: string, language: AgreementContentLanguage): string {
    return fileName.replace(/\.json$/i, '') + `.${language}.json`;
}

/** Keys whose string values are free text: the only values that differ between language versions. */
export const LOCALIZABLE_TEXT_KEYS: ReadonlySet<string> = new Set([
    'demoNote',
    'agreementBadge',
    'planName',
    'legalRepresentative',
    'contractType',
    'jurisdiction',
    'title',
    'description',
    'condition',
    'name',
    'label',
    'role',
    'when',
    'instruction',
    'neverSelectFrom',
    'scopeDecision',
    'policySources',
    'outputCompatibility',
    'commentRequirements',
    'allDocumentsCoverage',
    'sourceBoundary',
    'unavailableValues',
    'statusDecision',
    'normalization',
    'datesAndAmounts',
    'rule',
]);

/** Keys that are never text even inside a localizable object (contact names stay as written). */
const NEVER_LOCALIZED_PARENTS: ReadonlySet<string> = new Set(['contacts']);

/** Text of the base file → its version per language (`en` only when the base text is not English). */
export type TemplateTranslations = Record<string, Partial<Record<AgreementContentLanguage, string>>>;

function translate(value: string, language: AgreementContentLanguage, translations: TemplateTranslations): string {
    const entry = translations[value];
    return entry?.[language] ?? value;
}

/**
 * A copy of a file with its texts in `language` (free-text keys only; ids, codes, class names and
 * numbers untouched). Texts without a translation are kept as they are.
 */
export function localizeAgreementContent<T>(content: T, language: AgreementContentLanguage, translations: TemplateTranslations): T {
    const walk = (value: unknown, key: string, parent: string): unknown => {
        if (Array.isArray(value)) {
            return value.map((item) => walk(item, key, parent));
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([child, item]) => [child, walk(item, child, key || parent)]));
        }
        if (typeof value === 'string' && LOCALIZABLE_TEXT_KEYS.has(key) && !(key === 'name' && NEVER_LOCALIZED_PARENTS.has(parent))) {
            return translate(value, language, translations);
        }
        return value;
    };
    return walk(content, '', '') as T;
}

/** Texts (free-text keys) of a file without a translation for `language`: used to keep the templates complete. */
export function untranslatedTexts(content: unknown, language: AgreementContentLanguage, translations: TemplateTranslations): string[] {
    const missing = new Set<string>();
    const walk = (value: unknown, key: string, parent: string): void => {
        if (Array.isArray(value)) {
            value.forEach((item) => walk(item, key, parent));
        } else if (value && typeof value === 'object') {
            Object.entries(value as Record<string, unknown>).forEach(([child, item]) => walk(item, child, key || parent));
        } else if (typeof value === 'string' && value.trim() && LOCALIZABLE_TEXT_KEYS.has(key) && !(key === 'name' && NEVER_LOCALIZED_PARENTS.has(parent))) {
            // The base texts are English unless their entry has an `en` version.
            if (language !== 'en' && !translations[value]?.[language]) {
                missing.add(value);
            }
        }
    };
    walk(content, '', '');
    return [...missing];
}

/** True for a text value: a string, or a list of strings (e.g. `neverSelectFrom`). */
function isText(value: unknown): boolean {
    return typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

/**
 * Same structure in two versions (ids, codes, numbers, list sizes): the paths that differ outside
 * the free-text keys and the version stamps. Empty when only texts differ.
 */
export function structuralDifferences(a: unknown, b: unknown, path = ''): string[] {
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
            return [path || '/'];
        }
        return a.flatMap((item, index) => structuralDifferences(item, b[index], `${path}[${index}]`));
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        const left = a as Record<string, unknown>;
        const right = b as Record<string, unknown>;
        const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
        return [...keys].flatMap((key) => {
            if (key === 'version' || key === 'updatedAt' || (LOCALIZABLE_TEXT_KEYS.has(key) && isText(left[key]) && isText(right[key]))) {
                return [];
            }
            return structuralDifferences(left[key], right[key], `${path}.${key}`);
        });
    }
    return a === b ? [] : [path || '/'];
}

/**
 * Which content the page shows for a file in a language: its language version when it is usable;
 * else the base file when it is in Appdata (with the «no version in this language» notice); else the
 * bundled template translated to that language.
 */
export function resolveLocalizedSource(variant: 'usable' | 'unusable' | 'absent', baseInAppdata: boolean): 'variant' | 'base' | 'template' {
    if (variant === 'usable') {
        return 'variant';
    }
    return baseInAppdata ? 'base' : 'template';
}

/**
 * A text from one language version to another with the template dictionary (keys are base texts,
 * English unless the entry has an `en` version). Texts outside the dictionary are kept as written.
 */
export function translateText(value: string, from: AgreementContentLanguage, to: AgreementContentLanguage, translations: TemplateTranslations): string {
    if (from === to) {
        return value;
    }
    const direct = translations[value];
    if (direct) {
        return direct[to] ?? value;
    }
    const found = Object.entries(translations).find(([, entry]) => entry[from] === value);
    if (!found) {
        return value;
    }
    const [key, entry] = found;
    return entry[to] ?? key;
}

function plain(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Another language version of `agreement.json` after a save in `from`: the data that does not depend
 * on the language (contacts, contract files, Knowledge Discovery link, status, aliases, numbers and
 * codes of `general`, version) is taken from the saved file; the texts of the version are kept and
 * the contact roles are translated with the dictionary when they are template texts.
 */
export function syncAgreementLanguageVersion(
    version: Record<string, unknown>,
    saved: Record<string, unknown>,
    from: AgreementContentLanguage,
    to: AgreementContentLanguage,
    translations: TemplateTranslations
): Record<string, unknown> {
    const savedGeneral = plain(saved['general']);
    const general = { ...plain(version['general']) };
    for (const [key, value] of Object.entries(savedGeneral)) {
        if (!LOCALIZABLE_TEXT_KEYS.has(key) || !(key in general)) {
            general[key] = value;
        }
    }
    const contacts = (Array.isArray(saved['contacts']) ? saved['contacts'] : []).map((raw) => {
        const contact = plain(raw);
        const role = typeof contact['role'] === 'string' ? translateText(contact['role'], from, to, translations) : contact['role'];
        return { ...contact, role };
    });
    const out: Record<string, unknown> = { ...version, general, contacts };
    for (const key of ['agreementId', 'status', 'providerAliases', 'knowledgeDiscovery', 'version', 'updatedAt']) {
        if (key in saved) {
            out[key] = saved[key];
        }
    }
    const savedDocuments = plain(saved['documents']);
    if ('contractFiles' in savedDocuments) {
        out['documents'] = { ...plain(version['documents']), contractFiles: savedDocuments['contractFiles'] };
    }
    return out;
}

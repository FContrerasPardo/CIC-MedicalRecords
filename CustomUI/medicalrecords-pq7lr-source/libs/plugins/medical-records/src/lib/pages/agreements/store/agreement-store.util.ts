import { normalizeKey } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';
import { AI_SETTINGS_FILE_NAME, AiSettingsIssueCode, validateAiSettings } from '../ai-rules/agreement-ai-settings.util';
import { parsePreanalysisPolicy } from '../../radication/utils/radication-policy.util';
import { parseDocumentationChecklist } from '../checklist/documentation-checklist.util';
import { bumpPolicyVersion } from '../policy/preanalysis-policy-editor.util';
import { AgreementContentLanguage, localizedFileName } from './agreement-locale.util';

/**
 * Agreements (convenios) stored per agreement in Appdata. Each rule document is its own JSON file so
 * every agent or interface reads only what it needs:
 *
 * ```
 * /MedRec/Appdata/Agreements/agreements-index.json
 * /MedRec/Appdata/Agreements/<agreementId>/agreement.json            general data
 * /MedRec/Appdata/Agreements/<agreementId>/documentation-checklist.json  canonical rule-id catalogue
 * /MedRec/Appdata/Agreements/<agreementId>/preanalysis-policy.json   pre-analysis agent
 * /MedRec/Appdata/Agreements/<agreementId>/tariff-agreement.json     Financial Variance
 * /MedRec/Appdata/Agreements/<agreementId>/payer-compliance-policy.json  Compliance Alert
 * /MedRec/Appdata/Agreements/<agreementId>/payer-coding-policy.json  Coding Integrity
 * /MedRec/Appdata/Agreements/<agreementId>/coding-rules.json         Coding Integrity
 * /MedRec/Appdata/Agreements/<agreementId>/ai-settings.json          AI rules: validations, thresholds, change log (UI only for now)
 * ```
 *
 * Pure module: paths, parsing, validation, version stamps, provider matching and duplication.
 */

export const APPDATA_ROOT_PATH = '/MedRec/Appdata';
export const AGREEMENTS_FOLDER_NAME = 'Agreements';
export const AGREEMENTS_ROOT_PATH = `${APPDATA_ROOT_PATH}/${AGREEMENTS_FOLDER_NAME}`;
export const AGREEMENTS_INDEX_FILE_NAME = 'agreements-index.json';
export const AGREEMENTS_INDEX_PATH = `${AGREEMENTS_ROOT_PATH}/${AGREEMENTS_INDEX_FILE_NAME}`;
export const AGREEMENTS_INDEX_KIND = 'medical-records.agreements-index';
export const AGREEMENT_KIND = 'medical-records.agreement';

/** Global files used before agreements existed; read only as a fallback by the consumers. */
export const LEGACY_CHECKLIST_PATH = `${APPDATA_ROOT_PATH}/Checklists/documentation-checklist.json`;
export const LEGACY_POLICY_PATH = `${APPDATA_ROOT_PATH}/Policies/preanalysis-policy.json`;

/** Agreement used when the provider of an account matches no agreement of the index. */
export const DEFAULT_AGREEMENT_ID = 'centro-medico-latam';

export type AgreementFileKind =
    | 'agreement'
    | 'documentationChecklist'
    | 'preanalysisPolicy'
    | 'tariffAgreement'
    | 'payerCompliancePolicy'
    | 'payerCodingPolicy'
    | 'codingRules'
    | 'aiSettings';

export const AGREEMENT_FILE_KINDS: readonly AgreementFileKind[] = [
    'agreement',
    'documentationChecklist',
    'preanalysisPolicy',
    'tariffAgreement',
    'payerCompliancePolicy',
    'payerCodingPolicy',
    'codingRules',
    'aiSettings',
];

export const AGREEMENT_FILE_NAMES: Record<AgreementFileKind, string> = {
    agreement: 'agreement.json',
    documentationChecklist: 'documentation-checklist.json',
    preanalysisPolicy: 'preanalysis-policy.json',
    tariffAgreement: 'tariff-agreement.json',
    payerCompliancePolicy: 'payer-compliance-policy.json',
    payerCodingPolicy: 'payer-coding-policy.json',
    codingRules: 'coding-rules.json',
    aiSettings: AI_SETTINGS_FILE_NAME,
};

/** Who reads each file: the UI, the pre-analysis agent or one of the Agent Mesh agents (and its legacy variable). */
export const AGREEMENT_FILE_CONSUMERS: Record<AgreementFileKind, { agent: string; variable: string | null }> = {
    agreement: { agent: 'UI', variable: null },
    documentationChecklist: { agent: 'Pre-analysis / validation', variable: 'documentationRules' },
    preanalysisPolicy: { agent: 'Pre-analysis agent', variable: 'documentationChecklist' },
    tariffAgreement: { agent: 'Financial Variance', variable: 'tariffAgreement' },
    payerCompliancePolicy: { agent: 'Compliance Alert', variable: 'payerCompliancePolicy' },
    payerCodingPolicy: { agent: 'Coding Integrity', variable: 'payerCodingPolicy' },
    codingRules: { agent: 'Coding Integrity', variable: 'codingRules' },
    // Not read by the Automate agents yet (see docs/automate/convenios-appdata.md → «Reglas IA»).
    aiSettings: { agent: 'UI (AI rules; agents not wired yet)', variable: null },
};

/** `appdata`: read from the file; `default`: no file, bundled template shown; `invalid`: file unreadable, template shown. */
export type AgreementFileSource = 'appdata' | 'default' | 'invalid';

export type AgreementStatus = 'ACTIVE' | 'DRAFT' | 'INACTIVE';
export const AGREEMENT_STATUSES: readonly AgreementStatus[] = ['ACTIVE', 'DRAFT', 'INACTIVE'];

export interface AgreementIndexEntry {
    agreementId: string;
    providerName: string;
    payer: string;
    status: AgreementStatus;
    updatedAt: string | null;
}

export interface AgreementsIndex {
    kind: typeof AGREEMENTS_INDEX_KIND;
    schemaVersion: number;
    updatedAt: string | null;
    agreements: AgreementIndexEntry[];
}

export type JsonObject = Record<string, unknown>;

export function agreementFolderPath(agreementId: string): string {
    return `${AGREEMENTS_ROOT_PATH}/${agreementId}`;
}

/** Base file (read by the agents) or, with a language, its language version (`<name>.<lang>.json`). */
export function agreementFilePath(agreementId: string, kind: AgreementFileKind, language?: AgreementContentLanguage | null): string {
    return `${agreementFolderPath(agreementId)}/${agreementFileName(kind, language)}`;
}

export function agreementFileName(kind: AgreementFileKind, language?: AgreementContentLanguage | null): string {
    return language ? localizedFileName(AGREEMENT_FILE_NAMES[kind], language) : AGREEMENT_FILE_NAMES[kind];
}

/** Folder of the contract and annexes of an agreement (uploaded from the Documents tab). */
export function agreementContractFolderPath(agreementId: string): string {
    return `${agreementFolderPath(agreementId)}/Contract`;
}

function record(value: unknown): JsonObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

function text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value).trim();
}

/** JSON-safe deep copy (no `structuredClone` in the jest environment). */
export function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/** A JSON object from file text or an object; `null` for anything else. */
export function parseJsonObject(value: unknown): JsonObject | null {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as JsonObject) : null;
}

export function serializeAgreementJson(value: unknown): string {
    return `${JSON.stringify(value, null, 2)}\n`;
}

function status(value: unknown): AgreementStatus {
    const upper = text(value).toUpperCase() as AgreementStatus;
    return AGREEMENT_STATUSES.includes(upper) ? upper : 'DRAFT';
}

function indexEntry(value: unknown): AgreementIndexEntry | null {
    const raw = record(value);
    const agreementId = text(raw['agreementId']);
    if (!agreementId) {
        return null;
    }
    return {
        agreementId,
        providerName: text(raw['providerName']) || agreementId,
        payer: text(raw['payer']),
        status: status(raw['status']),
        updatedAt: text(raw['updatedAt']) || null,
    };
}

/** The index file (object with `agreements`, or a bare list); `null` when unreadable. Duplicated ids keep the first. */
export function parseAgreementsIndex(value: unknown): AgreementsIndex | null {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    const list = Array.isArray(parsed) ? parsed : Array.isArray(record(parsed)['agreements']) ? (record(parsed)['agreements'] as unknown[]) : null;
    if (!list) {
        return null;
    }
    const seen = new Set<string>();
    const agreements = list
        .map(indexEntry)
        .filter((entry): entry is AgreementIndexEntry => !!entry)
        .filter((entry) => {
            const key = entry.agreementId.toLowerCase();
            return seen.has(key) ? false : (seen.add(key), true);
        });
    return {
        kind: AGREEMENTS_INDEX_KIND,
        schemaVersion: 1,
        updatedAt: Array.isArray(parsed) ? null : text(record(parsed)['updatedAt']) || null,
        agreements,
    };
}

/** Adds or replaces an entry (by id), keeping the order; stamps the index. */
export function upsertIndexEntry(index: AgreementsIndex, entry: AgreementIndexEntry, now = new Date()): AgreementsIndex {
    const position = index.agreements.findIndex((item) => item.agreementId.toLowerCase() === entry.agreementId.toLowerCase());
    const agreements = [...index.agreements];
    if (position >= 0) {
        agreements[position] = entry;
    } else {
        agreements.push(entry);
    }
    return { ...index, updatedAt: now.toISOString(), agreements };
}

/** The index entry described by an `agreement.json` document. */
export function indexEntryFromAgreement(agreementId: string, agreement: unknown, updatedAt: string | null): AgreementIndexEntry {
    const root = record(agreement);
    const general = record(root['general']);
    return {
        agreementId,
        providerName: text(general['providerName']) || agreementId,
        payer: text(general['payer']),
        status: status(root['status']),
        updatedAt,
    };
}

/** Payer of an `agreement.json` document (`general.payer`); empty when absent. */
export function agreementPayer(agreement: unknown): string {
    return text(record(record(agreement)['general'])['payer']);
}

/** Provider aliases of an `agreement.json` document. */
export function agreementAliases(agreement: unknown): string[] {
    const aliases = record(agreement)['providerAliases'];
    return (Array.isArray(aliases) ? aliases : []).map(text).filter((alias) => !!alias);
}

/** Strips accents, punctuation, case and legal suffixes, for provider name matching. */
export function normalizeProviderName(value: unknown): string {
    return normalizeKey(value)
        .split(' ')
        .filter((word) => !!word && !['S', 'A', 'SA', 'SAS', 'SRL', 'LTDA', 'INC', 'EIRL'].includes(word))
        .join(' ');
}

export interface AgreementResolution {
    entry: AgreementIndexEntry | null;
    /** True when the provider name matched the entry; false when it is the default agreement. */
    matched: boolean;
}

/**
 * The agreement of an account by the provider name: exact normalized match with `providerName` (or
 * an alias), then containment either way (6+ characters); otherwise the default agreement
 * (`DEFAULT_AGREEMENT_ID`, else the first active, else the first entry).
 */
export function resolveAgreementForProvider(
    entries: readonly AgreementIndexEntry[],
    providerName: string | null | undefined,
    aliases: Record<string, readonly string[]> = {}
): AgreementResolution {
    const wanted = normalizeProviderName(providerName);
    if (wanted) {
        const namesOf = (entry: AgreementIndexEntry) => [entry.providerName, ...(aliases[entry.agreementId] ?? [])].map(normalizeProviderName).filter((name) => !!name);
        const exact = entries.find((entry) => namesOf(entry).includes(wanted));
        if (exact) {
            return { entry: exact, matched: true };
        }
        const partial = entries.find((entry) =>
            namesOf(entry).some((name) => Math.min(name.length, wanted.length) >= 6 && (name.includes(wanted) || wanted.includes(name)))
        );
        if (partial) {
            return { entry: partial, matched: true };
        }
    }
    const fallback =
        entries.find((entry) => entry.agreementId === DEFAULT_AGREEMENT_ID) ?? entries.find((entry) => entry.status === 'ACTIVE') ?? entries[0] ?? null;
    return { entry: fallback, matched: false };
}

export type AgreementFileIssueCode =
    | 'JSON_INVALID'
    | 'AGREEMENT_ID_REQUIRED'
    | 'PROVIDER_REQUIRED'
    | 'RULES_REQUIRED'
    | 'PROFILES_REQUIRED'
    | 'LIST_REQUIRED'
    | 'ROW_ID_REQUIRED'
    | 'ROW_ID_DUPLICATE'
    | 'RISK_INVALID'
    | 'AMOUNT_INVALID'
    | 'AMOUNT_RANGE_INVALID'
    | AiSettingsIssueCode;

export interface AgreementFileIssue {
    code: AgreementFileIssueCode;
    /** Row of the file's list, or null for the whole file. */
    row: number | null;
}

/** Issues that make a file unusable: it is then shown as `invalid` and the template is used. */
const STRUCTURAL: readonly AgreementFileIssueCode[] = ['JSON_INVALID', 'RULES_REQUIRED', 'PROFILES_REQUIRED', 'LIST_REQUIRED', 'AI_VALIDATIONS_REQUIRED'];

const RISKS = ['HIGH', 'MEDIUM', 'LOW'];

/** The list each agent rules file holds and the id of its rows. */
export const AGENT_RULES_LIST: Partial<Record<AgreementFileKind, { listKey: string; idKeys: string[]; riskKey: string | null }>> = {
    tariffAgreement: { listKey: 'tariffRules', idKeys: ['serviceCode', 'procedureCode'], riskKey: null },
    payerCompliancePolicy: { listKey: 'rules', idKeys: ['policyRuleId'], riskKey: 'riskLevelIfViolated' },
    payerCodingPolicy: { listKey: 'rules', idKeys: ['policyRuleId'], riskKey: 'riskLevelIfViolated' },
    codingRules: { listKey: 'rules', idKeys: ['ruleId'], riskKey: 'riskLevelIfViolated' },
};

function amount(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function validateRows(kind: AgreementFileKind, root: JsonObject): AgreementFileIssue[] {
    const config = AGENT_RULES_LIST[kind];
    if (!config) {
        return [];
    }
    const rows = root[config.listKey];
    if (!Array.isArray(rows)) {
        return [{ code: 'LIST_REQUIRED', row: null }];
    }
    const issues: AgreementFileIssue[] = [];
    const ids = rows.map((row) => normalizeKey(config.idKeys.map((key) => text(record(row)[key])).find((value) => !!value) ?? ''));
    rows.forEach((raw, row) => {
        const item = record(raw);
        const id = ids[row];
        if (!id) {
            issues.push({ code: 'ROW_ID_REQUIRED', row });
        } else if (ids.indexOf(id) !== row) {
            issues.push({ code: 'ROW_ID_DUPLICATE', row });
        }
        if (config.riskKey && !RISKS.includes(text(item[config.riskKey]).toUpperCase())) {
            issues.push({ code: 'RISK_INVALID', row });
        }
        if (kind === 'tariffAgreement') {
            const expected = amount(item['expectedAmount']);
            const min = amount(item['minAmount']);
            const max = amount(item['maxAmount']);
            if (expected === null || [expected, min, max].some((value) => value !== null && (Number.isNaN(value) || value < 0))) {
                issues.push({ code: 'AMOUNT_INVALID', row });
            } else if ((min !== null && min > expected) || (max !== null && max < expected)) {
                issues.push({ code: 'AMOUNT_RANGE_INVALID', row });
            }
        }
    });
    return issues;
}

/** Problems of a file's content (object or text); saving is allowed only without issues. */
export function validateAgreementFile(kind: AgreementFileKind, value: unknown): AgreementFileIssue[] {
    const root = parseJsonObject(value);
    if (!root) {
        return [{ code: 'JSON_INVALID', row: null }];
    }
    switch (kind) {
        case 'agreement': {
            const issues: AgreementFileIssue[] = [];
            if (!text(root['agreementId'])) {
                issues.push({ code: 'AGREEMENT_ID_REQUIRED', row: null });
            }
            if (!text(record(root['general'])['providerName'])) {
                issues.push({ code: 'PROVIDER_REQUIRED', row: null });
            }
            return issues;
        }
        case 'documentationChecklist':
            return parseDocumentationChecklist(root) ? [] : [{ code: 'RULES_REQUIRED', row: null }];
        case 'preanalysisPolicy':
            return parsePreanalysisPolicy(root) ? [] : [{ code: 'PROFILES_REQUIRED', row: null }];
        case 'aiSettings':
            return validateAiSettings(root).map((code) => ({ code, row: null }));
        default:
            return validateRows(kind, root);
    }
}

/** True when the content can be used at all (it may still have row issues to fix in the editor). */
export function isUsableAgreementFile(kind: AgreementFileKind, value: unknown): boolean {
    return !validateAgreementFile(kind, value).some((issue) => STRUCTURAL.includes(issue.code));
}

/** The version of a file: `policyMetadata.version` for the policy, the root `version` otherwise. */
export function agreementFileVersion(kind: AgreementFileKind, value: unknown): string {
    const root = record(value);
    return kind === 'preanalysisPolicy' ? text(record(root['policyMetadata'])['version']) : text(root['version']);
}

/** A copy ready to save: version bumped (`YYYY-MM-DD-rN`) and `updatedAt` stamped (the policy keeps its metadata block). */
export function stampAgreementFile(kind: AgreementFileKind, value: JsonObject, now = new Date()): JsonObject {
    const copy = cloneJson(value);
    const version = bumpPolicyVersion(agreementFileVersion(kind, copy), now);
    if (kind === 'preanalysisPolicy') {
        copy['policyMetadata'] = { ...record(copy['policyMetadata']), version };
        return copy;
    }
    return { ...copy, version, updatedAt: now.toISOString() };
}

/** `agreement-id` from a provider name: lowercase ASCII words joined by dashes. */
export function slugAgreementId(providerName: string): string {
    return String(providerName ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

/** Valid folder name for an agreement: lowercase letters, digits and dashes. */
export function isValidAgreementId(value: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 60;
}

/**
 * Files of a new agreement copied from an existing one: same rules, new id and provider, status
 * DRAFT, version reset to the day's first revision. The copy never shares the source's contract id.
 */
export function duplicateAgreementFiles(
    source: Partial<Record<AgreementFileKind, JsonObject>>,
    target: { agreementId: string; providerName: string },
    now = new Date()
): Partial<Record<AgreementFileKind, JsonObject>> {
    const version = `${now.toISOString().slice(0, 10)}-r1`;
    const stamp = now.toISOString();
    const out: Partial<Record<AgreementFileKind, JsonObject>> = {};
    const sourceGeneral = record(source.agreement?.['general']);
    const contractId = `${text(sourceGeneral['contractId']) || 'CONV'}-COPY-${target.agreementId.toUpperCase()}`.slice(0, 80);
    for (const kind of AGREEMENT_FILE_KINDS) {
        const value = source[kind];
        if (!value) {
            continue;
        }
        const copy = cloneJson(value);
        if (kind === 'preanalysisPolicy') {
            copy['policyMetadata'] = { ...record(copy['policyMetadata']), agreementId: target.agreementId, version };
            out[kind] = copy;
            continue;
        }
        copy['agreementId'] = target.agreementId;
        copy['version'] = version;
        copy['updatedAt'] = stamp;
        if (kind === 'agreement') {
            copy['kind'] = AGREEMENT_KIND;
            copy['status'] = 'DRAFT';
            copy['providerAliases'] = [];
            copy['general'] = {
                ...record(copy['general']),
                providerName: target.providerName,
                providerDisplayName: target.providerName,
                contractId,
            };
        }
        if (kind === 'tariffAgreement') {
            copy['provider'] = target.providerName;
            copy['contractId'] = contractId;
        }
        out[kind] = copy;
    }
    return out;
}

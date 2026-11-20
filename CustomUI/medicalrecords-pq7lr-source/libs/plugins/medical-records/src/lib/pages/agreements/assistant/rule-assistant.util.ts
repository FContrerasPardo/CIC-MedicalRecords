import type { AssistantTargetKind, RuleAssistantRequest, RuleAssistantResult, RuleProposal } from './rule-assistant.model';
import type { JsonObject } from '../store/agreement-store.util';

/**
 * Simulated rules assistant: a deterministic keyword parser (Spanish, English and Portuguese) that
 * turns a sentence or a rules file into rows of the agreement files. No AI is involved; the result
 * has the same shape the Agent Builder agent `reglas-convenio` will return. Pure module.
 */

const ID_PREFIX: Record<AssistantTargetKind, string> = {
    documentationChecklist: 'SIF',
    tariffAgreement: 'SVC',
    payerCompliancePolicy: 'COMP',
    payerCodingPolicy: 'PCP',
    codingRules: 'CR',
};

const ID_KEY: Record<AssistantTargetKind, string> = {
    documentationChecklist: 'ruleId',
    tariffAgreement: 'serviceCode',
    payerCompliancePolicy: 'policyRuleId',
    payerCodingPolicy: 'policyRuleId',
    codingRules: 'ruleId',
};

const AUTHORIZATION_CLASS = 'Orden o autorización de procedimiento';

/** Keywords (accent-free, lowercase) → IDP document class. */
const DOCUMENT_KEYWORDS: Array<[RegExp, string]> = [
    [/informe quirurgic|surgical report|relatorio cirurgic/, 'Informe quirúrgico'],
    [/nota(s)? de enfermer|nursing note|anotac\w* de enfermagem/, 'Nota de Enfermería'],
    [/receta|prescription|receita/, 'Receta Médica'],
    [/patolog|pathology/, 'Reporte de Patología'],
    [/laborator/, 'Laboratorios'],
    [/planilla de admision|admission sheet|ficha de admiss/, 'Planilla de Admisión'],
    [/carnet|affiliation card|carteirinha/, 'Carnet de Afiliación'],
    [/formulario de reclamacion|claim form/, 'Formulario de Reclamación'],
    [/orden|autorizac|authorization|order/, AUTHORIZATION_CLASS],
    [/factura|invoice|fatura/, 'Factura y Desglose'],
];

/** Keywords → service category of the agreement files. */
const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
    [/cirug|surg|cirurg/, 'surgery'],
    [/hospitaliz|internac|inpatient/, 'hospitalization'],
    [/\buci\b|\bicu\b|\buti\b|cuidados intensivos|intensive care|terapia intensiva/, 'icu'],
    [/imagen|imaging|imagem|radiolog/, 'imaging'],
    [/laborator/, 'laboratory'],
];

/** Lowercase, accent-free text for keyword matching. */
export function normalizeRuleText(value: string): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/** `80.000`, `80,000`, `RD$ 80 000`, `80k`, `80 mil` → 80000; null when there is no amount. */
export function parseRuleAmount(text: string): number | null {
    const match = normalizeRuleText(text).match(/(?:rd\$|us\$|\$|dop)\s*([\d][\d.,\s]*\d|\d)\s*(k|mil\b)?|([\d][\d.,]*\d|\d)\s*(k|mil\b)?\s*(?:pesos|dop|rd\$)/);
    if (!match) {
        return null;
    }
    const raw = (match[1] ?? match[3] ?? '').replace(/\s/g, '');
    const suffix = match[2] ?? match[4];
    let digits = raw;
    const grouped = raw.match(/^(\d{1,3}(?:[.,]\d{3})+)[.,](\d{1,2})$/);
    if (grouped) {
        digits = `${grouped[1].replace(/[.,]/g, '')}.${grouped[2]}`;
    } else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
        digits = raw.replace(/[.,]/g, '');
    } else if (/^\d+[.,]\d{1,2}$/.test(raw)) {
        digits = raw.replace(',', '.');
    } else {
        digits = raw.replace(/[.,]/g, '');
    }
    const value = Number(digits);
    if (!Number.isFinite(value)) {
        return null;
    }
    return suffix ? value * 1000 : value;
}

/** Procedure or service codes: 5-6 digits (CUPS/CPT) or `ABC-123`. */
export function extractProcedureCodes(text: string): string[] {
    const codes = String(text ?? '').match(/\b(?:\d{5,6}|[A-Z]{2,5}-\d{2,4})\b/g) ?? [];
    return [...new Set(codes)];
}

function diagnosisCodes(text: string): string[] {
    return [...new Set(String(text ?? '').match(/\b[A-TV-Z]\d{2}(?:\.\d{1,2})?\b/g) ?? [])];
}

function percentage(text: string): number | null {
    const match = normalizeRuleText(text).match(/(\d{1,2}(?:[.,]\d)?)\s*%/);
    return match ? Number(match[1].replace(',', '.')) : null;
}

function riskOf(text: string, fallback: 'HIGH' | 'MEDIUM' | 'LOW'): 'HIGH' | 'MEDIUM' | 'LOW' {
    const value = normalizeRuleText(text);
    if (/riesgo alto|alto riesgo|high risk|risco alto|critic/.test(value)) {
        return 'HIGH';
    }
    if (/riesgo bajo|bajo riesgo|low risk|risco baixo/.test(value)) {
        return 'LOW';
    }
    if (/riesgo medio|medium risk|risco medio/.test(value)) {
        return 'MEDIUM';
    }
    return fallback;
}

function categories(text: string): string[] {
    const value = normalizeRuleText(text);
    return CATEGORY_KEYWORDS.filter(([pattern]) => pattern.test(value)).map(([, category]) => category);
}

/** The document class a sentence asks for: a class of the agreement's catalogue, else a keyword. */
export function documentClassOf(text: string, catalogue: readonly string[] = []): string | null {
    const value = normalizeRuleText(text);
    const fromCatalogue = catalogue.find((name) => value.includes(normalizeRuleText(name)));
    if (fromCatalogue) {
        return fromCatalogue;
    }
    return DOCUMENT_KEYWORDS.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

/** Gives ids to new rows: the next free `<PREFIX>-NNN` of each file. */
class IdAllocator {
    private readonly used = new Map<AssistantTargetKind, Set<string>>();

    constructor(existing: RuleAssistantRequest['existingIds']) {
        for (const [kind, ids] of Object.entries(existing ?? {})) {
            this.used.set(kind as AssistantTargetKind, new Set((ids ?? []).map((id) => String(id).toUpperCase())));
        }
    }

    next(kind: AssistantTargetKind): string {
        const used = this.used.get(kind) ?? new Set<string>();
        this.used.set(kind, used);
        let index = Math.max(used.size + 1, 1);
        let id = `${ID_PREFIX[kind]}-${String(index).padStart(3, '0')}`;
        while (used.has(id)) {
            index += 1;
            id = `${ID_PREFIX[kind]}-${String(index).padStart(3, '0')}`;
        }
        used.add(id);
        return id;
    }

    claim(kind: AssistantTargetKind, id: string): string {
        const used = this.used.get(kind) ?? new Set<string>();
        this.used.set(kind, used);
        if (!id || used.has(id.toUpperCase())) {
            return this.next(kind);
        }
        used.add(id.toUpperCase());
        return id;
    }
}

interface ParseContext {
    ids: IdAllocator;
    catalogue: readonly string[];
    counter: { value: number };
}

function proposal(context: ParseContext, kind: AssistantTargetKind, row: JsonObject, reason: string, source: string): RuleProposal {
    context.counter.value += 1;
    return { id: `p${context.counter.value}`, kind, row, reason, source };
}

/** One sentence → at most one proposal (the most specific pattern wins), or null. */
function interpretSentence(sentence: string, context: ParseContext): RuleProposal | null {
    const text = sentence.trim();
    const value = normalizeRuleText(text);
    if (!value) {
        return null;
    }
    const codes = extractProcedureCodes(text);
    const amount = parseRuleAmount(text);
    const serviceCategories = categories(text);

    if (codes.length >= 2 && /no se factura|no se cobra|not (be )?billed together|incompatib|nao (podem ser|sao) faturad/.test(value)) {
        return proposal(
            context,
            'codingRules',
            {
                ruleId: context.ids.next('codingRules'),
                type: 'INCOMPATIBLE_PROCEDURE_COMBINATION',
                procedureCode: codes[0],
                incompatibleWith: codes.slice(1),
                description: text,
                riskLevelIfViolated: riskOf(text, 'HIGH'),
            },
            'REASON_INCOMPATIBLE',
            text
        );
    }
    if (codes.length >= 2 && /incluid|included|bundle|incluso|paquete|package|pacote/.test(value)) {
        return proposal(
            context,
            'payerCodingPolicy',
            {
                policyRuleId: context.ids.next('payerCodingPolicy'),
                type: 'BUNDLED_SERVICE',
                primaryProcedureCode: codes[0],
                bundledCodes: codes.slice(1),
                description: text,
                riskLevelIfViolated: riskOf(text, 'MEDIUM'),
            },
            'REASON_BUNDLED',
            text
        );
    }
    if (codes.length && amount !== null && /tarifa|valor|precio|price|tariff|cuesta|cost|paga|pays|preco/.test(value)) {
        const variance = percentage(text) ?? 10;
        const min = Math.round(amount * (1 - variance / 100) * 100) / 100;
        const max = Math.round(amount * (1 + variance / 100) * 100) / 100;
        return proposal(
            context,
            'tariffAgreement',
            {
                serviceCode: context.ids.claim('tariffAgreement', codes[0]),
                procedureCode: codes[0],
                description: text,
                expectedAmount: amount,
                minAmount: min,
                maxAmount: max,
                allowedVariancePercentage: variance,
                requiresAuthorization: /autoriz|authoriz/.test(value),
                requiredDocuments: [],
            },
            'REASON_TARIFF',
            text
        );
    }
    const diagnoses = diagnosisCodes(text);
    if (codes.length && diagnoses.length && /diagnost|diagnos/.test(value)) {
        return proposal(
            context,
            'codingRules',
            {
                ruleId: context.ids.next('codingRules'),
                type: 'DIAGNOSIS_PROCEDURE_REQUIRED_LINK',
                procedureCode: codes[0],
                allowedDiagnosisCodes: diagnoses,
                description: text,
                riskLevelIfViolated: riskOf(text, 'HIGH'),
            },
            'REASON_DIAGNOSIS',
            text
        );
    }
    if (/autoriza|authoriz/.test(value) && (amount !== null || /previa|prior|previa|requier|require|exige|necesit|need|precisa/.test(value))) {
        const row: JsonObject = {
            policyRuleId: context.ids.next('payerCompliancePolicy'),
            type: amount !== null ? 'PRIOR_AUTH_AMOUNT_THRESHOLD' : 'PRIOR_AUTH_REQUIRED',
        };
        if (amount !== null) {
            row['amountThreshold'] = amount;
            row['currency'] = 'DOP';
        }
        if (codes.length) {
            row['procedureCode'] = codes[0];
        }
        if (serviceCategories.length) {
            row['serviceCategory'] = serviceCategories[0];
        }
        row['description'] = text;
        row['requiredDocuments'] = [AUTHORIZATION_CLASS];
        row['riskLevelIfViolated'] = riskOf(text, 'HIGH');
        return proposal(context, 'payerCompliancePolicy', row, amount !== null ? 'REASON_PRIOR_AUTH_AMOUNT' : 'REASON_PRIOR_AUTH', text);
    }
    const documentClass = documentClassOf(text, context.catalogue);
    if (documentClass && /requier|require|exige|necesit|need|debe|must|adjunt|attach|precisa|deve|obligatori|mandatory/.test(value)) {
        const conditional = /\b(si|cuando|when|if|se|quando)\b|mas de|more than|mais de|por encima|above|acima/.test(value);
        return proposal(
            context,
            'documentationChecklist',
            {
                ruleId: context.ids.next('documentationChecklist'),
                appliesTo: { procedureCodes: codes, serviceCategories },
                description: text,
                requiredDocuments: [documentClass],
                riskLevelIfMissing: riskOf(text, 'MEDIUM'),
                consumers: ['validation', 'agent'],
                enabled: true,
                profiles: ['SINGLE_INVOICE_FULL'],
                condition: conditional ? text : '',
            },
            'REASON_DOCUMENT',
            text
        );
    }
    return null;
}

/** The file a JSON row belongs to, by its keys (same keys as the agreement files). */
export function kindOfRow(row: JsonObject): AssistantTargetKind | null {
    if ('expectedAmount' in row || 'serviceCode' in row) {
        return 'tariffAgreement';
    }
    if ('riskLevelIfMissing' in row || ('ruleId' in row && 'requiredDocuments' in row && !('type' in row))) {
        return 'documentationChecklist';
    }
    if ('policyRuleId' in row) {
        const type = String(row['type'] ?? '').toUpperCase();
        return /PRIOR_AUTH_AMOUNT|ADMISSION|SUPPORT|COMPLIANCE/.test(type) || String(row['policyRuleId']).toUpperCase().startsWith('COMP') ? 'payerCompliancePolicy' : 'payerCodingPolicy';
    }
    if ('ruleId' in row && 'type' in row) {
        return 'codingRules';
    }
    return null;
}

const FILE_LIST_KEYS: Array<[string, AssistantTargetKind | null]> = [
    ['tariffRules', 'tariffAgreement'],
    ['rules', null],
];

function rowsFromJson(value: unknown): Array<{ kind: AssistantTargetKind | null; row: unknown }> {
    if (Array.isArray(value)) {
        return value.map((row) => ({ kind: null, row }));
    }
    if (value && typeof value === 'object') {
        const root = value as JsonObject;
        // Agent output: { proposals: [{ kind, row }] }.
        if (Array.isArray(root['proposals'])) {
            return (root['proposals'] as JsonObject[]).map((item) => ({ kind: (item?.['kind'] as AssistantTargetKind) ?? null, row: item?.['row'] ?? item }));
        }
        for (const [key, kind] of FILE_LIST_KEYS) {
            if (Array.isArray(root[key])) {
                return (root[key] as unknown[]).map((row) => ({ kind, row }));
            }
        }
        return [{ kind: null, row: root }];
    }
    return [];
}

/** Minimal CSV: comma or semicolon, quoted values with doubled quotes. */
export function parseCsv(content: string): string[][] {
    const lines = String(content ?? '')
        .replace(/^﻿/, '')
        .split(/\r?\n/)
        .filter((line) => line.trim());
    if (!lines.length) {
        return [];
    }
    const separator = (lines[0].match(/;/g) ?? []).length > (lines[0].match(/,/g) ?? []).length ? ';' : ',';
    return lines.map((line) => {
        const cells: string[] = [];
        let current = '';
        let quoted = false;
        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            if (quoted) {
                if (char === '"' && line[index + 1] === '"') {
                    current += '"';
                    index += 1;
                } else if (char === '"') {
                    quoted = false;
                } else {
                    current += char;
                }
            } else if (char === '"') {
                quoted = true;
            } else if (char === separator) {
                cells.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        cells.push(current.trim());
        return cells;
    });
}

const TEXT_COLUMNS = ['text', 'texto', 'regla', 'rule', 'regra', 'description', 'descripcion', 'descricao'];

function csvValue(value: string): unknown {
    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }
    if (/^(true|false)$/i.test(value)) {
        return value.toLowerCase() === 'true';
    }
    if (value.includes('|')) {
        return value
            .split('|')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return value;
}

/** Row of a known file: missing id filled with the next free one, list keys kept as lists. */
function normalizeRow(kind: AssistantTargetKind, raw: JsonObject, context: ParseContext): JsonObject {
    const row = { ...raw };
    const idKey = ID_KEY[kind];
    row[idKey] = context.ids.claim(kind, String(row[idKey] ?? '').trim());
    for (const key of ['requiredDocuments', 'profiles', 'consumers', 'bundledCodes', 'incompatibleWith', 'allowedDiagnosisCodes']) {
        if (typeof row[key] === 'string') {
            row[key] = String(row[key])
                .split(/[|,]/)
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }
    if (kind === 'documentationChecklist') {
        const appliesTo = (row['appliesTo'] as JsonObject | undefined) ?? {};
        row['appliesTo'] = {
            procedureCodes: Array.isArray(appliesTo['procedureCodes']) ? appliesTo['procedureCodes'] : [],
            serviceCategories: Array.isArray(appliesTo['serviceCategories']) ? appliesTo['serviceCategories'] : [],
        };
        row['description'] = String(row['description'] ?? '');
        row['requiredDocuments'] = Array.isArray(row['requiredDocuments']) ? row['requiredDocuments'] : [];
        row['riskLevelIfMissing'] = ['HIGH', 'MEDIUM', 'LOW'].includes(String(row['riskLevelIfMissing']).toUpperCase()) ? String(row['riskLevelIfMissing']).toUpperCase() : 'MEDIUM';
        row['consumers'] = Array.isArray(row['consumers']) && row['consumers'].length ? row['consumers'] : ['validation', 'agent'];
        row['enabled'] = row['enabled'] !== false;
        row['profiles'] = Array.isArray(row['profiles']) ? row['profiles'] : [];
        row['condition'] = String(row['condition'] ?? '');
    } else if (kind !== 'tariffAgreement' && !['HIGH', 'MEDIUM', 'LOW'].includes(String(row['riskLevelIfViolated']).toUpperCase())) {
        row['riskLevelIfViolated'] = 'MEDIUM';
    }
    if (kind === 'tariffAgreement' && !row['procedureCode']) {
        row['procedureCode'] = row['serviceCode'];
    }
    return row;
}

function fromRows(items: Array<{ kind: AssistantTargetKind | null; row: unknown }>, context: ParseContext, result: RuleAssistantResult): void {
    items.forEach((item, index) => {
        if (typeof item.row === 'string') {
            addSentence(item.row, context, result);
            return;
        }
        if (!item.row || typeof item.row !== 'object') {
            return;
        }
        const raw = item.row as JsonObject;
        const textColumn = TEXT_COLUMNS.find((key) => typeof raw[key] === 'string' && raw[key]);
        const kind = item.kind ?? kindOfRow(raw);
        if (!kind) {
            if (textColumn) {
                addSentence(String(raw[textColumn]), context, result);
            } else {
                result.unrecognized.push(`#${index + 1}`);
            }
            return;
        }
        const row = normalizeRow(kind, raw, context);
        result.proposals.push(proposal(context, kind, row, 'REASON_IMPORTED', String(row[ID_KEY[kind]] ?? `#${index + 1}`)));
    });
}

function addSentence(sentence: string, context: ParseContext, result: RuleAssistantResult): void {
    const found = interpretSentence(sentence, context);
    if (found) {
        result.proposals.push(found);
    } else if (sentence.trim()) {
        result.unrecognized.push(sentence.trim());
    }
}

/** Splits free text into rules: one per line, or per sentence when it is a single line. */
export function splitRuleSentences(text: string): string[] {
    const lines = String(text ?? '')
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
        .filter(Boolean);
    if (lines.length > 1) {
        return lines;
    }
    // Sentence split, keeping decimal or thousands separators (`80.000`) inside the sentence.
    return (lines[0] ?? '')
        .split(/(?<=[.;!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/)
        .map((sentence) => sentence.replace(/[.;]$/, '').trim())
        .filter(Boolean);
}

/**
 * The simulated assistant: a sentence (or several) or a rules file (JSON rows or files, CSV with
 * the files' columns or a text column, TXT one rule per line) → proposals in the agreement files.
 */
export function interpretRuleRequest(request: RuleAssistantRequest): RuleAssistantResult {
    const result: RuleAssistantResult = { simulated: true, proposals: [], unrecognized: [] };
    const context: ParseContext = { ids: new IdAllocator(request.existingIds), catalogue: request.documentClasses ?? [], counter: { value: 0 } };
    if (request.file) {
        const name = request.file.name.toLowerCase();
        const content = request.file.content ?? '';
        if (name.endsWith('.json')) {
            let parsed: unknown = null;
            try {
                parsed = JSON.parse(content);
            } catch {
                result.unrecognized.push(request.file.name);
            }
            if (parsed !== null) {
                fromRows(rowsFromJson(parsed), context, result);
            }
        } else if (name.endsWith('.csv')) {
            const [header, ...rows] = parseCsv(content);
            const keys = (header ?? []).map((key) => key.trim());
            fromRows(
                rows.map((cells) => ({ kind: null, row: Object.fromEntries(keys.map((key, index) => [key, csvValue(cells[index] ?? '')]).filter(([, value]) => value !== '')) })),
                context,
                result
            );
        } else {
            content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith('#'))
                .forEach((line) => addSentence(line, context, result));
        }
    }
    if (request.text?.trim()) {
        splitRuleSentences(request.text).forEach((sentence) => addSentence(sentence, context, result));
    }
    return result;
}

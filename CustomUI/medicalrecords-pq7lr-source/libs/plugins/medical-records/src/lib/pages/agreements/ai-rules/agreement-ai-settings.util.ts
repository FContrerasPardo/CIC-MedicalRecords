/**
 * AI rules of an agreement (`/MedRec/Appdata/Agreements/<agreementId>/ai-settings.json`, with the
 * usual language versions `ai-settings.<lang>.json` for the texts only):
 *
 * ```json
 * {
 *   "kind": "medical-records.agreement-ai-settings",
 *   "schemaVersion": 1,
 *   "agreementId": "centro-medico-latam",
 *   "version": "2026-11-18-r1",
 *   "updatedAt": "2026-11-18T00:00:00.000Z",
 *   "validations": [{ "id": "tariff-variance", "enabled": true, "agent": "Financial Variance", "title": "…", "description": "…" }],
 *   "thresholds": { "autoApprovalMinConfidencePct": 90, "anomalySensitivity": "MEDIUM", "tariffVariancePct": 10 },
 *   "history": [{ "at": "…", "event": "THRESHOLD", "user": null, "file": "ai-settings.json", "field": "tariffVariancePct", "from": 10, "to": 8 }]
 * }
 * ```
 *
 * Which validations are on, the decision thresholds and the change log (at most `AI_HISTORY_MAX`
 * events, the oldest dropped first). The Automate agents do not read this file yet (see
 * `docs/automate/convenios-appdata.md`). Pure module: no Angular, no store imports.
 */

export const AI_SETTINGS_KIND = 'medical-records.agreement-ai-settings';
export const AI_SETTINGS_FILE_NAME = 'ai-settings.json';
/** Most events kept in `history`; older ones are dropped when a new change is logged. */
export const AI_HISTORY_MAX = 100;

export type AiSensitivity = 'LOW' | 'MEDIUM' | 'HIGH';
export const AI_SENSITIVITIES: readonly AiSensitivity[] = ['LOW', 'MEDIUM', 'HIGH'];

export interface AiThresholds {
    /** Accounts at or above this confidence pass without manual review when no hard rule fails (%). */
    autoApprovalMinConfidencePct: number;
    anomalySensitivity: AiSensitivity;
    /** Default tariff tolerance (%); mirrors `tariff-agreement.json` → `defaultAllowedVariancePercentage`. */
    tariffVariancePct: number;
}

export type AiNumericThreshold = 'autoApprovalMinConfidencePct' | 'tariffVariancePct';
export type AiThresholdKey = keyof AiThresholds;
export const AI_THRESHOLD_KEYS: readonly AiThresholdKey[] = ['autoApprovalMinConfidencePct', 'anomalySensitivity', 'tariffVariancePct'];

/** Allowed values of the numeric thresholds (the sliders use the same bounds). */
export const AI_THRESHOLD_RANGES: Record<AiNumericThreshold, { min: number; max: number; step: number }> = {
    autoApprovalMinConfidencePct: { min: 50, max: 100, step: 1 },
    tariffVariancePct: { min: 0, max: 30, step: 0.5 },
};

export const DEFAULT_AI_THRESHOLDS: AiThresholds = { autoApprovalMinConfidencePct: 90, anomalySensitivity: 'MEDIUM', tariffVariancePct: 10 };

export interface AiValidation {
    id: string;
    enabled: boolean;
    /** Agent that applies it (Coding Integrity, Compliance Alert, Pre-analysis, Financial Variance). */
    agent: string;
    title: string;
    description: string;
}

export type AiHistoryEventType = 'TEMPLATE_CREATED' | 'VALIDATION' | 'THRESHOLD' | 'FILE_SAVED';
export type AiHistoryValue = string | number | boolean | null;

export interface AiHistoryEvent {
    /** ISO date and time. */
    at: string;
    event: AiHistoryEventType;
    /** Who made the change; null when the user is unknown («Current user»). */
    user: string | null;
    /** File affected (`ai-settings.json`, `tariff-agreement.json`…). */
    file: string;
    /** Validation id, threshold key, or null. */
    field: string | null;
    from: AiHistoryValue;
    to: AiHistoryValue;
}

export interface AiSettings {
    validations: AiValidation[];
    thresholds: AiThresholds;
    history: AiHistoryEvent[];
}

/** What the AI rules panel saves: the switches (by validation id) and the thresholds. */
export interface AiSettingsChange {
    validations: Record<string, boolean>;
    thresholds: AiThresholds;
}

export interface AiChangeMeta {
    at: string;
    user: string | null;
}

export type AiSettingsIssueCode = 'AI_VALIDATIONS_REQUIRED' | 'AI_CONFIDENCE_RANGE' | 'AI_SENSITIVITY_INVALID' | 'AI_VARIANCE_RANGE';

const EVENT_TYPES: readonly AiHistoryEventType[] = ['TEMPLATE_CREATED', 'VALIDATION', 'THRESHOLD', 'FILE_SAVED'];

type Json = Record<string, unknown>;

function record(value: unknown): Json {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
}

function text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value).trim();
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function historyValue(value: unknown): AiHistoryValue {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;
}

function numberOr(value: unknown, fallback: number): number {
    const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
}

/** True when a numeric threshold is a number inside its range. */
export function isThresholdInRange(key: AiNumericThreshold, value: unknown): boolean {
    const range = AI_THRESHOLD_RANGES[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max;
}

/** A numeric threshold forced into its range (non-numbers become the minimum). */
export function clampThreshold(key: AiNumericThreshold, value: unknown): number {
    const range = AI_THRESHOLD_RANGES[key];
    const parsed = numberOr(value, range.min);
    return Math.min(range.max, Math.max(range.min, parsed));
}

function parseThresholds(value: unknown): AiThresholds {
    const raw = record(value);
    const sensitivity = text(raw['anomalySensitivity']).toUpperCase() as AiSensitivity;
    return {
        autoApprovalMinConfidencePct: numberOr(raw['autoApprovalMinConfidencePct'], DEFAULT_AI_THRESHOLDS.autoApprovalMinConfidencePct),
        anomalySensitivity: AI_SENSITIVITIES.includes(sensitivity) ? sensitivity : DEFAULT_AI_THRESHOLDS.anomalySensitivity,
        tariffVariancePct: numberOr(raw['tariffVariancePct'], DEFAULT_AI_THRESHOLDS.tariffVariancePct),
    };
}

function parseEvent(value: unknown): AiHistoryEvent | null {
    const raw = record(value);
    const event = text(raw['event']).toUpperCase() as AiHistoryEventType;
    const at = text(raw['at']);
    if (!at || !EVENT_TYPES.includes(event)) {
        return null;
    }
    return {
        at,
        event,
        user: text(raw['user']) || null,
        file: text(raw['file']) || AI_SETTINGS_FILE_NAME,
        field: text(raw['field']) || null,
        from: historyValue(raw['from']),
        to: historyValue(raw['to']),
    };
}

/** The AI settings of a file (object or text); `null` when it has no list of validations. */
export function parseAiSettings(value: unknown): AiSettings | null {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    const root = record(parsed);
    if (!Array.isArray(root['validations'])) {
        return null;
    }
    const seen = new Set<string>();
    const validations = (root['validations'] as unknown[])
        .map((item) => {
            const raw = record(item);
            return { id: text(raw['id']), enabled: raw['enabled'] !== false, agent: text(raw['agent']), title: text(raw['title']), description: text(raw['description']) };
        })
        .filter((item) => !!item.id && !seen.has(item.id) && !!seen.add(item.id));
    const history = (Array.isArray(root['history']) ? root['history'] : []).map(parseEvent).filter((item): item is AiHistoryEvent => !!item);
    return { validations, thresholds: parseThresholds(root['thresholds']), history };
}

/** Problems of an `ai-settings.json` content; saving is allowed only without issues. */
export function validateAiSettings(value: unknown): AiSettingsIssueCode[] {
    const parsed = parseAiSettings(value);
    if (!parsed) {
        return ['AI_VALIDATIONS_REQUIRED'];
    }
    const raw = record(record(typeof value === 'string' ? safeParse(value) : value)['thresholds']);
    const issues: AiSettingsIssueCode[] = [];
    if (!isThresholdInRange('autoApprovalMinConfidencePct', raw['autoApprovalMinConfidencePct'])) {
        issues.push('AI_CONFIDENCE_RANGE');
    }
    if (!AI_SENSITIVITIES.includes(text(raw['anomalySensitivity']).toUpperCase() as AiSensitivity)) {
        issues.push('AI_SENSITIVITY_INVALID');
    }
    if (!isThresholdInRange('tariffVariancePct', raw['tariffVariancePct'])) {
        issues.push('AI_VARIANCE_RANGE');
    }
    return issues;
}

function safeParse(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

/** The history events of a change: one per switched validation and one per changed threshold (from → to). */
export function diffAiSettings(before: AiSettings, change: AiSettingsChange, meta: AiChangeMeta): AiHistoryEvent[] {
    const base = { at: meta.at, user: meta.user, file: AI_SETTINGS_FILE_NAME };
    const events: AiHistoryEvent[] = [];
    for (const validation of before.validations) {
        const next = change.validations[validation.id];
        if (typeof next === 'boolean' && next !== validation.enabled) {
            events.push({ ...base, event: 'VALIDATION', field: validation.id, from: validation.enabled, to: next });
        }
    }
    for (const key of AI_THRESHOLD_KEYS) {
        const from = before.thresholds[key];
        const to = change.thresholds[key];
        if (from !== to) {
            events.push({ ...base, event: 'THRESHOLD', field: key, from, to });
        }
    }
    return events;
}

/** The history with new events at the end, keeping only the newest `max` (oldest dropped first). */
export function appendAiHistory(history: readonly AiHistoryEvent[], events: readonly AiHistoryEvent[], max = AI_HISTORY_MAX): AiHistoryEvent[] {
    const all = [...history, ...events];
    return max > 0 && all.length > max ? all.slice(all.length - max) : all;
}

/** A copy of the file content with new events appended to `history` (trimmed to `max`). */
export function appendAiHistoryToContent(content: Json, events: readonly AiHistoryEvent[], max = AI_HISTORY_MAX): Json {
    const copy = clone(content);
    const current = parseAiSettings(copy)?.history ?? [];
    copy['history'] = appendAiHistory(current, events, max);
    return copy;
}

/**
 * Applies the panel's change to the file content: the switches, the thresholds (numeric ones kept
 * inside their range) and the history events of what changed. Texts, ids and agents are untouched.
 * `events` is empty when nothing changed (the caller then has nothing to save).
 */
export function applyAiSettingsChange(content: Json, change: AiSettingsChange, meta: AiChangeMeta, max = AI_HISTORY_MAX): { content: Json; events: AiHistoryEvent[] } {
    const before = parseAiSettings(content) ?? { validations: [], thresholds: { ...DEFAULT_AI_THRESHOLDS }, history: [] };
    const thresholds: AiThresholds = {
        autoApprovalMinConfidencePct: clampThreshold('autoApprovalMinConfidencePct', change.thresholds.autoApprovalMinConfidencePct),
        anomalySensitivity: AI_SENSITIVITIES.includes(change.thresholds.anomalySensitivity) ? change.thresholds.anomalySensitivity : before.thresholds.anomalySensitivity,
        tariffVariancePct: clampThreshold('tariffVariancePct', change.thresholds.tariffVariancePct),
    };
    const events = diffAiSettings(before, { validations: change.validations, thresholds }, meta);
    const copy = clone(content);
    copy['validations'] = (Array.isArray(copy['validations']) ? (copy['validations'] as unknown[]) : []).map((item) => {
        const raw = record(item);
        const next = change.validations[text(raw['id'])];
        return typeof next === 'boolean' ? { ...raw, enabled: next } : raw;
    });
    copy['thresholds'] = { ...record(copy['thresholds']), ...thresholds };
    copy['history'] = appendAiHistory(before.history, events, max);
    return { content: copy, events };
}

/** History event of another rules file of the agreement saved from the page (version from → to). */
export function fileSavedEvent(fileName: string, fromVersion: string | null, toVersion: string | null, meta: AiChangeMeta): AiHistoryEvent {
    return { at: meta.at, user: meta.user, event: 'FILE_SAVED', file: fileName, field: null, from: fromVersion || null, to: toVersion || null };
}

/** «AI profile created from template»: the history of a file just created from the bundled template. */
export function stampTemplateCreation(content: Json, meta: AiChangeMeta): Json {
    const copy = clone(content);
    copy['history'] = [{ at: meta.at, event: 'TEMPLATE_CREATED', user: meta.user, file: AI_SETTINGS_FILE_NAME, field: null, from: null, to: null } satisfies AiHistoryEvent];
    return copy;
}

/**
 * Another language version after a save: everything from the saved file (switches, thresholds,
 * history, version) except the texts of each validation, which keep the version's own language.
 */
export function syncAiSettingsLanguageVersion(version: Json, saved: Json): Json {
    const texts = new Map(
        (Array.isArray(version['validations']) ? (version['validations'] as unknown[]) : []).map((item) => {
            const raw = record(item);
            return [text(raw['id']), { title: raw['title'], description: raw['description'] }] as const;
        })
    );
    const copy = clone(saved);
    copy['validations'] = (Array.isArray(copy['validations']) ? (copy['validations'] as unknown[]) : []).map((item) => {
        const raw = record(item);
        const own = texts.get(text(raw['id']));
        return own ? { ...raw, ...(typeof own.title === 'string' ? { title: own.title } : {}), ...(typeof own.description === 'string' ? { description: own.description } : {}) } : raw;
    });
    return copy;
}

/** `tariff-agreement.json` → `defaultAllowedVariancePercentage`, the tolerance the AI threshold mirrors; null when absent. */
export function tariffDefaultVariance(tariffAgreement: unknown): number | null {
    const value = record(tariffAgreement)['defaultAllowedVariancePercentage'];
    const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
}

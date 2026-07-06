import {
    AgentFieldId,
    AgentResult,
    AgentSource,
} from './analysis.mapper';
import { BatchStateSource } from '../intake-account-widget/batch-state.model';

interface GenericWidgetAgent {
    status?: string;
    slotName?: string;
    agentKey?: string;
    agentName?: string;
    name?: string;
    result?: unknown;
    payload?: unknown;
    message?: string;
    rawPreview?: string;
}

interface GenericWidgetWarning {
    slotName?: string;
    agentKey?: string;
    agentName?: string;
    type?: string;
    message?: string;
    rawPreview?: string;
}

type AnalysisWidgetPayload = Partial<Record<AgentFieldId, unknown>> & {
    agents?: Record<string, unknown>;
    warnings?: GenericWidgetWarning[];
    batchState?: unknown;
};

export type { AgentFieldId, AgentResult, AgentSource };

const AGENT_FIELD_IDS: AgentFieldId[] = [
    'codingIntegrityResult',
    'complianceAlertResult',
    'financialVarianceResult',
];

const AGENT_MATCHERS: Record<AgentFieldId, { slotName: string; tokens: string[] }> = {
    codingIntegrityResult: { slotName: 'json1', tokens: ['CODING', 'INTEGRITY'] },
    complianceAlertResult: { slotName: 'json2', tokens: ['COMPLIANCE', 'ALERT'] },
    financialVarianceResult: { slotName: 'json3', tokens: ['FINANCIAL', 'VARIANCE'] },
};

interface ParsedAgentCandidate<T extends AgentResult> {
    hasValue: boolean;
    result: T | null;
    parseError: AgentSource<T>['parseError'];
}

export interface ResolveAgentSourcesInput {
    fieldValue: unknown;
    fallbackValues?: Partial<Record<AgentFieldId, unknown>>;
}

export function resolveAgentSources(input: ResolveAgentSourcesInput): Array<AgentSource<AgentResult>> {
    const unifiedPayload = resolveUnifiedPayload(input.fieldValue);

    return AGENT_FIELD_IDS.map((id) => {
        if (unifiedPayload) {
            const parsed = parseAgentCandidate<AgentResult>(resolveUnifiedAgentValue(unifiedPayload, id));
            return { id, result: parsed.result, parseError: parsed.parseError };
        }

        return readFallbackAgentResult(id, input.fallbackValues?.[id]);
    });
}

/**
 * Extracts the current batchState embedded in the unified widget payload. The Automate
 * envelope carries `batchState` alongside the agent results; if absent (e.g. legacy
 * separate-field mode), callers can fall back to a dedicated batchState field.
 */
export function resolveBatchState(fieldValue: unknown): BatchStateSource | null {
    const payload = parseJsonObject<AnalysisWidgetPayload>(fieldValue);

    if (!payload || payload.batchState === undefined || payload.batchState === null) {
        return null;
    }

    return parseJsonObject<BatchStateSource>(payload.batchState);
}

function readFallbackAgentResult<T extends AgentResult>(id: AgentFieldId, candidate: unknown): AgentSource<T> {
    const parsed = parseAgentCandidate<T>(candidate);

    if (parsed.hasValue) {
        return { id, result: parsed.result, parseError: parsed.parseError };
    }

    return { id, result: null, parseError: null };
}

function resolveUnifiedPayload(value: unknown): AnalysisWidgetPayload | null {
    const payload = parseJsonObject<AnalysisWidgetPayload>(value);

    if (!payload) {
        return null;
    }

    const hasAgentKey = AGENT_FIELD_IDS.some((id) => Object.prototype.hasOwnProperty.call(payload, id));
    const hasAgentEnvelope = isPlainObject(payload.agents);

    return hasAgentKey || hasAgentEnvelope ? payload : null;
}

function resolveUnifiedAgentValue(payload: AnalysisWidgetPayload, id: AgentFieldId): unknown {
    if (Object.prototype.hasOwnProperty.call(payload, id)) {
        return payload[id];
    }

    const agent = findEnvelopeAgent(payload, id);

    if (agent !== null && agent !== undefined) {
        return extractEnvelopeAgentValue(agent);
    }

    const warning = findEnvelopeWarning(payload, id);

    if (warning) {
        return {
            parseError: true,
            rawValue: truncatePreview(warning.rawPreview ?? ''),
            errorMessage: warning.message ?? 'Invalid agent JSON.',
        };
    }

    return null;
}

function findEnvelopeAgent(payload: AnalysisWidgetPayload, id: AgentFieldId): unknown | null {
    if (!isPlainObject(payload.agents)) {
        return null;
    }

    const directAgent = payload.agents[id];

    if (directAgent !== undefined) {
        return directAgent;
    }

    for (const [agentMapKey, agent] of Object.entries(payload.agents)) {
        if (matchesAgentIdentity(id, agentMapKey)) {
            return agent;
        }

        if (!isPlainObject(agent)) {
            continue;
        }

        const result = isPlainObject(agent['result']) ? agent['result'] : null;
        const identities = [
            agent['agentKey'],
            agent['slotName'],
            agent['agentName'],
            agent['name'],
            result?.['agentName'],
            result?.['name'],
        ];

        if (identities.some((identity) => matchesAgentIdentity(id, identity))) {
            return agent;
        }
    }

    return null;
}

function findEnvelopeWarning(payload: AnalysisWidgetPayload, id: AgentFieldId): GenericWidgetWarning | null {
    if (!Array.isArray(payload.warnings)) {
        return null;
    }

    return payload.warnings.find((warning) => (
        warning.type !== 'EMPTY_INPUT' &&
        (
            matchesAgentIdentity(id, warning.agentKey) ||
            matchesAgentIdentity(id, warning.agentName) ||
            matchesAgentIdentity(id, warning.slotName)
        )
    )) ?? null;
}

function extractEnvelopeAgentValue(agent: unknown): unknown {
    if (!isPlainObject(agent)) {
        return agent;
    }

    const genericAgent = agent as GenericWidgetAgent;
    const status = normalizeToken(genericAgent.status);

    if (status === 'PENDING') {
        return null;
    }

    if (status === 'INVALID_JSON' || status.startsWith('INVALID')) {
        return {
            parseError: true,
            rawValue: truncatePreview(genericAgent.rawPreview ?? ''),
            errorMessage: genericAgent.message ?? 'Invalid agent JSON.',
        };
    }

    if (genericAgent.result !== undefined) {
        return genericAgent.result;
    }

    if (genericAgent.payload !== undefined) {
        return genericAgent.payload;
    }

    return genericAgent.status ? null : agent;
}

function matchesAgentIdentity(id: AgentFieldId, value: unknown): boolean {
    if (value === null || value === undefined) {
        return false;
    }

    const normalized = normalizeSearchText(value);
    const matcher = AGENT_MATCHERS[id];

    if (!normalized) {
        return false;
    }

    if (
        normalized === normalizeSearchText(id) ||
        normalized === normalizeSearchText(matcher.slotName)
    ) {
        return true;
    }

    return matcher.tokens.every((token) => normalized.includes(token));
}

function parseAgentCandidate<T extends AgentResult>(value: unknown): ParsedAgentCandidate<T> {
    if (value === null || value === undefined) {
        return { hasValue: false, result: null, parseError: null };
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return { hasValue: false, result: null, parseError: null };
        }

        try {
            const parsed = JSON.parse(trimmed);
            return normalizeParsedAgentCandidate<T>(parsed, trimmed);
        } catch (error) {
            return {
                hasValue: true,
                result: null,
                parseError: {
                    parseError: true,
                    rawValue: truncatePreview(trimmed),
                    errorMessage: error instanceof Error ? error.message : 'Invalid JSON string',
                },
            };
        }
    }

    return normalizeParsedAgentCandidate<T>(value);
}

function normalizeParsedAgentCandidate<T extends AgentResult>(
    value: unknown,
    rawValue?: string
): ParsedAgentCandidate<T> {
    if (!isPlainObject(value)) {
        return {
            hasValue: true,
            result: null,
            parseError: {
                parseError: true,
                rawValue: rawValue ?? truncatePreview(String(value)),
                errorMessage: 'Expected an agent JSON object.',
            },
        };
    }

    if (value['parseError'] === true) {
        return {
            hasValue: true,
            result: null,
            parseError: {
                parseError: true,
                rawValue: truncatePreview(String(value['rawValue'] ?? rawValue ?? '')),
                errorMessage: String(value['errorMessage'] ?? 'Agent result could not be parsed.'),
            },
        };
    }

    return {
        hasValue: true,
        result: Object.keys(value).length ? value as T : null,
        parseError: null,
    };
}

function parseJsonObject<T>(value: unknown): T | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        try {
            const parsed = JSON.parse(trimmed);
            return isPlainObject(parsed) ? parsed as T : null;
        } catch {
            return null;
        }
    }

    return isPlainObject(value) ? value as T : null;
}

function normalizeToken(value: string | undefined): string {
    return (value ?? '').trim().replace(/\s+/g, '_').toUpperCase();
}

function normalizeSearchText(value: unknown): string {
    return String(value ?? '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function truncatePreview(value: string, maxLength = 96): string {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

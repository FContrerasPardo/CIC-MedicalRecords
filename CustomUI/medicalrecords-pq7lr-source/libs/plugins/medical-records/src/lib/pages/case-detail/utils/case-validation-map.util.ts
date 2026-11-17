import { extractBatchContext } from '../../../dashboard/mappers/attention-batch-context';
import { CaseTabTarget } from './case-navigation.util';

/**
 * Pure derivation (no Angular) of the validation map shown as live icons in the open-accounts list.
 * The steps follow the medical-account flow in Automate: documentary checklist (intake), rules
 * validation, and the risk-analysis agents run by Agent Mesh. Each step says where its state comes from:
 *  - real: read from a process variable / batchState;
 *  - inferred: deduced from the most advanced open task (stage of the process);
 *  - demo: no data source yet.
 */

export type ValidationStepKey = 'documents' | 'rules' | 'coding' | 'compliance' | 'financial';
export type ValidationState = 'executed' | 'pending' | 'blocking';
export type ValidationSource = 'real' | 'inferred' | 'demo';
export type CaseTaskType = 'intake' | 'validateRules' | 'analysis' | 'unknown';

export interface ValidationStep {
    key: ValidationStepKey;
    state: ValidationState;
    source: ValidationSource;
    target: CaseTabTarget;
}

export interface CaseSignals {
    taskType: CaseTaskType;
    variables: Record<string, unknown>;
}

/** Process order of the map. */
export const VALIDATION_STEP_ORDER: readonly ValidationStepKey[] = ['documents', 'rules', 'coding', 'compliance', 'financial'];

/** Tab of the invoice workspace each step opens (WORKSPACE_TAB_IDS in case-navigation.util). */
const TARGETS: Record<ValidationStepKey, CaseTabTarget> = {
    documents: { tab: 'intake' },
    rules: { tab: 'analysis' },
    coding: { tab: 'codingIntegrity' },
    compliance: { tab: 'complianceAlert' },
    financial: { tab: 'financialVariance' },
};

const STAGE_RANK: Record<CaseTaskType, number> = { intake: 0, validateRules: 1, analysis: 2, unknown: -1 };

/** A task of one of the known medical-records types belongs to a patient case. */
export function isPatientCaseTask(taskType: CaseTaskType): boolean {
    return taskType !== 'unknown';
}

export function hasValue(value: unknown): boolean {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'string') {
        const text = value.trim();
        return text !== '' && text !== '{}' && text !== '[]' && text !== 'null';
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    if (typeof value === 'object') {
        return Object.keys(value as object).length > 0;
    }
    return true;
}

function hasRejectedDocuments(raw: unknown): boolean {
    let batchState: unknown = raw;
    if (typeof raw === 'string') {
        try {
            batchState = JSON.parse(raw);
        } catch {
            return false;
        }
    }
    return typeof batchState === 'object' && batchState !== null && (batchState as { hasRejectedDocuments?: unknown }).hasRejectedDocuments === true;
}

export function deriveValidationMap(signals: CaseSignals): ValidationStep[] {
    const { taskType, variables } = signals;
    const rank = STAGE_RANK[taskType] ?? -1;
    const agentStep = (key: ValidationStepKey, variable: string): ValidationStep => ({
        key,
        state: hasValue(variables[variable]) ? 'executed' : 'pending',
        source: 'real',
        target: TARGETS[key],
    });

    // Documentary checklist: blocking while IDP documents need review or were rejected; done once
    // the account moved past intake.
    const documentsBlocked = hasRejectedDocuments(variables['batchState']) || extractBatchContext(variables['batchState']).reviewRequired;

    return [
        {
            key: 'documents',
            state: documentsBlocked ? 'blocking' : rank >= 1 ? 'executed' : 'pending',
            source: documentsBlocked ? 'real' : 'inferred',
            target: TARGETS.documents,
        },
        { key: 'rules', state: rank >= 2 ? 'executed' : 'pending', source: 'inferred', target: TARGETS.rules },
        agentStep('coding', 'codingIntegrityResult'),
        agentStep('compliance', 'complianceAlertResult'),
        agentStep('financial', 'financialVarianceResult'),
    ];
}

export function countByState(steps: ValidationStep[]): Record<ValidationState, number> {
    return steps.reduce(
        (counts, step) => ({ ...counts, [step.state]: counts[step.state] + 1 }),
        { executed: 0, pending: 0, blocking: 0 } as Record<ValidationState, number>
    );
}

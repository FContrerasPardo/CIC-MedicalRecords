import { CaseTabTarget } from './case-navigation.util';

/**
 * Pure derivation (no Angular) of the case validation map shown as buttons in the patient row.
 *
 * Each step says where its state comes from:
 *  - real: read from a process variable / batchState field;
 *  - inferred: deduced from the open task type (stage of the process);
 *  - demo: no data source yet, shown as pending placeholder.
 * The step-to-variable mapping is a working assumption pending validation by the user.
 */

export type ValidationStepKey = 'compliance' | 'eligibility' | 'readiness' | 'medicalReport' | 'consolidation';
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
export const VALIDATION_STEP_ORDER: readonly ValidationStepKey[] = ['compliance', 'eligibility', 'readiness', 'medicalReport', 'consolidation'];

const TARGETS: Record<ValidationStepKey, CaseTabTarget> = {
    compliance: { tab: 'summary', subTab: 'documents' },
    eligibility: { tab: 'guidelines' },
    readiness: { tab: 'summary', subTab: 'score' },
    medicalReport: { tab: 'documents' },
    consolidation: { tab: 'summary', subTab: 'audit' },
};

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
    const executedWhenPresent = (key: ValidationStepKey, variable: string): ValidationStep => ({
        key,
        state: hasValue(variables[variable]) ? 'executed' : 'pending',
        source: 'real',
        target: TARGETS[key],
    });

    const readinessBlocked = hasRejectedDocuments(variables['batchState']);

    return [
        executedWhenPresent('compliance', 'complianceAlertResult'),
        { key: 'eligibility', state: taskType === 'analysis' ? 'executed' : 'pending', source: 'inferred', target: TARGETS.eligibility },
        {
            key: 'readiness',
            state: readinessBlocked ? 'blocking' : 'pending',
            source: readinessBlocked ? 'real' : 'demo',
            target: TARGETS.readiness,
        },
        executedWhenPresent('medicalReport', 'codingIntegrityResult'),
        executedWhenPresent('consolidation', 'financialVarianceResult'),
    ];
}

export function countByState(steps: ValidationStep[]): Record<ValidationState, number> {
    return steps.reduce(
        (counts, step) => ({ ...counts, [step.state]: counts[step.state] + 1 }),
        { executed: 0, pending: 0, blocking: 0 } as Record<ValidationState, number>
    );
}

import { MedicalRecordsTaskType } from '../definitions/process-attention.model';
import { isValidateRulesReady, parseScriptPayload } from '../../form-widgets/agent-rules-widget/agent-rules.mapper';
import { resolveAgentSources } from '../../form-widgets/analysis-task-widget/analysis-payload.resolver';
import { isAnalysisReadyForApproval } from '../../form-widgets/analysis-task-widget/analysis.mapper';
import { BatchStateSource } from '../../form-widgets/intake-account-widget/batch-state.model';
import { mapBatchStateToIntakeAccountViewModel } from '../../form-widgets/intake-account-widget/batch-state.mapper';
import { resolveMedicalRecordsTaskType } from '../mappers/task-attention.mapper';

export interface TaskEligibilityResult {
    eligible: boolean;
    reasons: string[];
    taskType: MedicalRecordsTaskType;
}

export function evaluateTaskEligibility(
    variables: Record<string, unknown>,
    taskName?: string,
    formKey?: string,
    taskDefinitionKey?: string
): TaskEligibilityResult {
    const taskType = resolveMedicalRecordsTaskType(taskName, formKey, taskDefinitionKey);

    switch (taskType) {
        case 'intake':
            return evaluateIntakeEligibility(variables, taskType);
        case 'analysis':
            return evaluateAnalysisEligibility(variables, taskType);
        case 'validateRules':
            return evaluateValidateRulesEligibility(variables, taskType);
        default:
            return {
                eligible: false,
                reasons: ['Bulk approve is not supported for this task type.'],
                taskType,
            };
    }
}

function evaluateIntakeEligibility(
    variables: Record<string, unknown>,
    taskType: MedicalRecordsTaskType
): TaskEligibilityResult {
    const batchState = parseBatchState(variables['batchState']);
    if (!batchState) {
        return { eligible: false, reasons: ['batchState is missing or invalid.'], taskType };
    }

    const viewModel = mapBatchStateToIntakeAccountViewModel(batchState, null);
    if (viewModel.readiness.readyForAnalysis) {
        return { eligible: true, reasons: [], taskType };
    }

    const reasons = viewModel.readiness.blockers.length
        ? [...viewModel.readiness.blockers]
        : [`Account is not ready for analysis (${viewModel.readiness.statusLabel}).`];

    return { eligible: false, reasons, taskType };
}

function evaluateAnalysisEligibility(
    variables: Record<string, unknown>,
    taskType: MedicalRecordsTaskType
): TaskEligibilityResult {
    const sources = resolveAgentSources({
        fieldValue: variables['analysis-task-widget'] ?? variables['analysisTaskWidget'],
        fallbackValues: {
            codingIntegrityResult: variables['codingIntegrityResult'],
            complianceAlertResult: variables['complianceAlertResult'],
            financialVarianceResult: variables['financialVarianceResult'],
        },
    });

    if (sources.some((source) => source.parseError)) {
        return { eligible: false, reasons: ['One or more agent payloads failed to parse.'], taskType };
    }

    if (sources.some((source) => !source.result)) {
        return { eligible: false, reasons: ['One or more agent results are still pending.'], taskType };
    }

    if (isAnalysisReadyForApproval(sources)) {
        return { eligible: true, reasons: [], taskType };
    }

    return {
        eligible: false,
        reasons: ['Manual review is required before approval can continue.'],
        taskType,
    };
}

function evaluateValidateRulesEligibility(
    variables: Record<string, unknown>,
    taskType: MedicalRecordsTaskType
): TaskEligibilityResult {
    const rawPayload =
        variables['agentRulesWidget'] ??
        variables['agent-rules-widget'] ??
        variables['agentRules'] ??
        variables['agent-rules'];

    const items = parseScriptPayload(rawPayload);
    if (!items.length) {
        return { eligible: false, reasons: ['agentRulesWidget payload is missing or empty.'], taskType };
    }

    if (isValidateRulesReady(items)) {
        return { eligible: true, reasons: [], taskType };
    }

    return {
        eligible: false,
        reasons: ['One or more rule sections still have missing data or review issues.'],
        taskType,
    };
}

function parseBatchState(raw: unknown): BatchStateSource | null {
    if (!raw) {
        return null;
    }

    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as BatchStateSource;
        } catch {
            return null;
        }
    }

    if (typeof raw === 'object') {
        return raw as BatchStateSource;
    }

    return null;
}

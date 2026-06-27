import {
    MedicalRecordsTaskStatus,
    MedicalRecordsTaskType,
    ProcessAttentionItem,
    ProcessAttentionTone,
} from '../definitions/process-attention.model';
import {
    extractBatchContext,
    formatStartedAt,
    shortId,
    stringify,
} from './attention-batch-context';

export interface TaskInstanceEntry {
    id?: string;
    name?: string;
    status?: string;
    formKey?: string;
    taskDefinitionKey?: string;
    processInstanceId?: string;
    rootProcessInstanceId?: string;
    processDefinitionKey?: string;
    createdDate?: string | number;
    assignee?: string;
}

const MEDICAL_RECORDS_PROCESS_KEY = 'medical-records';

export function mapTaskToAttentionItem(
    task: TaskInstanceEntry,
    variables: Record<string, unknown>,
    appName: string
): ProcessAttentionItem {
    const taskId = stringify(task.id) ?? 'unknown';
    const batchContext = extractBatchContext(variables['batchState']);
    const status = normalizeTaskStatus(task.status);
    const taskLabel = stringify(task.name) ?? stringify(task.formKey) ?? stringify(task.taskDefinitionKey) ?? 'Task';
    const taskType = resolveMedicalRecordsTaskType(taskLabel, task.formKey, task.taskDefinitionKey);
    const variablesProcessId =
        stringify(task.rootProcessInstanceId) ?? stringify(task.processInstanceId) ?? taskId;
    const title = buildTitle(batchContext.patientName, taskLabel, taskId);
    const subtitle = buildSubtitle(batchContext, variables, taskLabel);
    const meta = buildMeta(status, task.createdDate, batchContext.reviewRequired, task.assignee);

    return {
        id: taskId,
        icon: resolveIcon(status, batchContext.reviewRequired),
        tone: resolveTone(status, batchContext.reviewRequired),
        title,
        subtitle,
        meta,
        taskName: taskLabel,
        taskDefinitionKey: stringify(task.taskDefinitionKey),
        taskType,
        taskStatus: status,
        processVariables: { ...variables },
        nativeReference: {
            taskId,
            taskProcessName: appName,
            processInstanceId: variablesProcessId,
            processName: stringify(task.processDefinitionKey) ?? MEDICAL_RECORDS_PROCESS_KEY,
        },
    };
}

export function resolveMedicalRecordsTaskType(
    taskName?: string,
    formKey?: string,
    taskDefinitionKey?: string
): MedicalRecordsTaskType {
    const tokens = [taskName, formKey, taskDefinitionKey]
        .map((value) => stringify(value)?.toLowerCase() ?? '')
        .join(' ');

    if (/nueva cuenta|intake|intake-account/.test(tokens)) {
        return 'intake';
    }

    if (/validate rules|new form|agent-rules|agent rules/.test(tokens)) {
        return 'validateRules';
    }

    if (/analysis|analisys|analysis-task/.test(tokens)) {
        return 'analysis';
    }

    return 'unknown';
}

function normalizeTaskStatus(status?: string): MedicalRecordsTaskStatus {
    return stringify(status)?.toUpperCase() === 'ASSIGNED' ? 'ASSIGNED' : 'CREATED';
}

export function matchesMedicalRecordsTask(
    task: TaskInstanceEntry,
    medicalRecordsRootIds: ReadonlySet<string> = new Set()
): boolean {
    const key = stringify(task.processDefinitionKey) ?? '';
    if (key === MEDICAL_RECORDS_PROCESS_KEY) {
        return true;
    }

    const rootId = stringify(task.rootProcessInstanceId);
    if (rootId && medicalRecordsRootIds.has(rootId)) {
        return true;
    }

    const processInstanceId = stringify(task.processInstanceId);
    if (processInstanceId && medicalRecordsRootIds.has(processInstanceId)) {
        return true;
    }

    return false;
}

function buildTitle(patientName: string | null, taskLabel: string, taskId: string): string {
    if (patientName) {
        return `${patientName} · ${shortId(taskId)}`;
    }

    return `${taskLabel} · ${shortId(taskId)}`;
}

function buildSubtitle(
    batchContext: ReturnType<typeof extractBatchContext>,
    variables: Record<string, unknown>,
    taskLabel: string
): string {
    const parts: string[] = [taskLabel];

    if (batchContext.insurer) {
        parts.push(`Insurer: ${batchContext.insurer}`);
    }

    const accountId = stringify(variables['accountId']) ?? stringify(variables['medicalAccountId']);
    if (accountId) {
        parts.push(`Account: ${accountId}`);
    }

    if (batchContext.reviewRequired) {
        parts.push('Review required');
    }

    return parts.join(' · ');
}

function buildMeta(
    status: string,
    createdAt?: string | number,
    reviewRequired?: boolean,
    assignee?: string
): string {
    const chunks = [status];
    if (reviewRequired) {
        chunks.push('Needs attention');
    }
    if (assignee) {
        chunks.push(`Assignee: ${assignee}`);
    }
    if (createdAt !== undefined && createdAt !== null) {
        chunks.push(formatStartedAt(String(createdAt)));
    }
    return chunks.join(' · ');
}

function resolveIcon(status: string, reviewRequired?: boolean): string {
    if (reviewRequired) {
        return 'warning';
    }

    switch (status.toUpperCase()) {
        case 'ASSIGNED':
            return 'assignment_ind';
        case 'CREATED':
            return 'pending_actions';
        default:
            return 'task_alt';
    }
}

function resolveTone(status: string, reviewRequired?: boolean): ProcessAttentionTone {
    if (reviewRequired) {
        return 'red';
    }

    switch (status.toUpperCase()) {
        case 'CREATED':
            return 'amber';
        case 'ASSIGNED':
            return 'blue';
        default:
            return 'blue';
    }
}

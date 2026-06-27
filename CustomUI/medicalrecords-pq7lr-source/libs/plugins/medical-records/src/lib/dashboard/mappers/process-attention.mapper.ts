import { ProcessAttentionItem, ProcessAttentionTone } from '../definitions/process-attention.model';
import {
    extractBatchContext,
    formatStartedAt,
    shortId,
    stringify,
} from './attention-batch-context';

interface ProcessInstanceEntry {
    id?: string;
    name?: string;
    status?: string;
    processDefinitionKey?: string;
    startDate?: string;
    startedDate?: string;
}

export function mapProcessToAttentionItem(
    process: ProcessInstanceEntry,
    variables: Record<string, unknown>
): ProcessAttentionItem {
    const processInstanceId = stringify(process.id) ?? 'unknown';
    const batchContext = extractBatchContext(variables['batchState']);
    const status = stringify(process.status) ?? 'RUNNING';
    const title = buildTitle(processInstanceId, batchContext.patientName, process.name);
    const subtitle = buildSubtitle(batchContext, variables);
    const meta = buildMeta(status, process.startDate ?? process.startedDate, batchContext.reviewRequired);

    const processLabel = stringify(process.name) ?? stringify(process.processDefinitionKey) ?? 'Process';

    return {
        id: processInstanceId,
        icon: resolveIcon(status, batchContext.reviewRequired),
        tone: resolveTone(status, batchContext.reviewRequired),
        title,
        subtitle,
        meta,
        taskName: processLabel,
        taskDefinitionKey: stringify(process.processDefinitionKey),
        taskType: 'unknown',
        taskStatus: 'ASSIGNED',
        processVariables: { ...variables },
        nativeReference: {
            processInstanceId,
            processName: stringify(process.processDefinitionKey) ?? 'medical-records',
        },
    };
}

function buildTitle(processInstanceId: string, patientName: string | null, processName?: string): string {
    if (patientName) {
        return `${patientName} · ${shortId(processInstanceId)}`;
    }

    return processName?.trim() ? `${processName} · ${shortId(processInstanceId)}` : shortId(processInstanceId);
}

function buildSubtitle(
    batchContext: ReturnType<typeof extractBatchContext>,
    variables: Record<string, unknown>
): string {
    const parts: string[] = [];

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

    if (!parts.length) {
        return 'Active medical-records process instance';
    }

    return parts.join(' · ');
}

function buildMeta(status: string, startedAt?: string, reviewRequired?: boolean): string {
    const chunks = [status];
    if (reviewRequired) {
        chunks.push('Needs attention');
    }
    if (startedAt) {
        chunks.push(formatStartedAt(startedAt));
    }
    return chunks.join(' · ');
}

function resolveIcon(status: string, reviewRequired?: boolean): string {
    if (reviewRequired) {
        return 'warning';
    }

    switch (status.toUpperCase()) {
        case 'COMPLETED':
            return 'task_alt';
        case 'SUSPENDED':
            return 'pause_circle';
        default:
            return 'account_tree';
    }
}

function resolveTone(status: string, reviewRequired?: boolean): ProcessAttentionTone {
    if (reviewRequired) {
        return 'red';
    }

    switch (status.toUpperCase()) {
        case 'SUSPENDED':
            return 'amber';
        case 'COMPLETED':
            return 'green';
        default:
            return 'blue';
    }
}

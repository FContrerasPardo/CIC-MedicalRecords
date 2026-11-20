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
import { normalizeProcessIdentifier, processRoleOf, rootProcessKey } from '../definitions/process-mapping';
import { ProcessIdentitySet, resolveTaskQueryScope, TaskQueryScope } from '../utils/process-list-scope.util';

export interface TaskInstanceEntry {
    id?: string;
    name?: string;
    status?: string;
    formKey?: string;
    taskDefinitionKey?: string;
    processInstanceId?: string;
    rootProcessInstanceId?: string;
    processDefinitionKey?: string;
    /** Query service rows: `<key>:<version>:<uuid>`. */
    processDefinitionId?: string;
    processDefinitionName?: string;
    createdDate?: string | number;
    assignee?: string;
}

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
    const subprocessInstanceId = stringify(task.processInstanceId);
    const rootProcessInstanceId = stringify(task.rootProcessInstanceId);
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
            processInstanceId: subprocessInstanceId ?? rootProcessInstanceId,
            rootProcessInstanceId: rootProcessInstanceId ?? subprocessInstanceId,
            processName: stringify(task.processDefinitionKey) ?? definitionKeyFromId(task.processDefinitionId) ?? rootProcessKey(),
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

/** Why a task was accepted (technical view). */
export type TaskMatchRule =
    | 'root-key'
    | 'root-definition-id'
    | 'root-name'
    | 'process-instance'
    | 'root-instance'
    | 'subprocess-key'
    | 'subprocess-definition-id'
    | 'subprocess-name';

/** Why a task was discarded (technical view). */
export type TaskRejectReason = 'excluded-subprocess' | 'other-process' | 'no-root-link';

export interface TaskMatchResult {
    accepted: boolean;
    rule?: TaskMatchRule;
    reason?: TaskRejectReason;
}

export type IdentityMatch = 'key' | 'definition-id' | 'name';

/** Definition key carried by `processDefinitionId` (`Process_123:7:uuid` → `Process_123`). */
export function definitionKeyFromId(processDefinitionId: unknown): string | undefined {
    const id = stringify(processDefinitionId);
    return id ? stringify(id.split(':')[0]) : undefined;
}

/** How a task or process instance row matches one process identity (key, definition id prefix, name). */
export function matchProcessIdentity(
    task: Pick<TaskInstanceEntry, 'processDefinitionKey' | 'processDefinitionId' | 'processDefinitionName'>,
    identity: ProcessIdentitySet
): IdentityMatch | null {
    const keys = new Set(identity.keys.map(normalizeProcessIdentifier).filter(Boolean));
    const names = new Set(identity.names.map(normalizeProcessIdentifier).filter(Boolean));
    const key = normalizeProcessIdentifier(task.processDefinitionKey);
    // Legacy configs and old rows used a name as key (`medical-records`): accepted as a key match.
    if (key && (keys.has(key) || names.has(key))) {
        return 'key';
    }
    const definitionKey = normalizeProcessIdentifier(definitionKeyFromId(task.processDefinitionId));
    if (definitionKey && keys.has(definitionKey)) {
        return 'definition-id';
    }
    const name = normalizeProcessIdentifier(task.processDefinitionName);
    return name && names.has(name) ? 'name' : null;
}

/** Mapping role of the task's own definition (key, definition id prefix, then name). */
function taskRole(task: TaskInstanceEntry) {
    return processRoleOf({
        processDefinitionKey: stringify(task.processDefinitionKey) ?? definitionKeyFromId(task.processDefinitionId),
        processDefinitionName: stringify(task.processDefinitionName),
    });
}

const SUBPROCESS_RULES: Record<IdentityMatch, TaskMatchRule> = {
    key: 'subprocess-key',
    'definition-id': 'subprocess-definition-id',
    name: 'subprocess-name',
};

const ROOT_RULES: Record<IdentityMatch, TaskMatchRule> = {
    key: 'root-key',
    'definition-id': 'root-definition-id',
    name: 'root-name',
};

/**
 * Whether an open task belongs to the list's scope, and by which rule. The Query service task rows
 * usually carry `processDefinitionId` (`Process_…:N:…`) and `processDefinitionName`, not always
 * `processDefinitionKey` nor `rootProcessInstanceId`, so every identifier is tried:
 * 1. the task's own definition is the root (key, definition id prefix or root name);
 * 2. its process instance is one of the running roots;
 * 3. its root instance is one of the running roots: accepted unless it is a subprocess task and
 *    subprocesses are off, or its definition is a known subprocess that was not included;
 * 4. its definition is an included subprocess (key, definition id prefix or name).
 */
export function classifyMedicalRecordsTask(
    task: TaskInstanceEntry,
    rootIds: ReadonlySet<string> = new Set(),
    scope: TaskQueryScope = resolveTaskQueryScope(null)
): TaskMatchResult {
    const rootMatch = matchProcessIdentity(task, scope.root);
    if (rootMatch) {
        return { accepted: true, rule: ROOT_RULES[rootMatch] };
    }

    const processInstanceId = stringify(task.processInstanceId);
    if (processInstanceId && rootIds.has(processInstanceId)) {
        return { accepted: true, rule: 'process-instance' };
    }

    const subprocessMatch = scope.includeSubprocesses
        ? scope.subprocesses.map((identity) => matchProcessIdentity(task, identity)).find((match): match is IdentityMatch => !!match) ?? null
        : null;

    const rootId = stringify(task.rootProcessInstanceId);
    if (rootId && rootIds.has(rootId)) {
        const isChildTask = !!processInstanceId && processInstanceId !== rootId;
        if (!isChildTask || subprocessMatch) {
            return { accepted: true, rule: 'root-instance' };
        }
        if (!scope.includeSubprocesses) {
            return { accepted: false, reason: 'excluded-subprocess' };
        }
        const role = taskRole(task);
        // A known subprocess left out of the selection; unknown definitions under the root are kept.
        return role && role.role !== 'root' ? { accepted: false, reason: 'excluded-subprocess' } : { accepted: true, rule: 'root-instance' };
    }

    if (subprocessMatch) {
        return { accepted: true, rule: SUBPROCESS_RULES[subprocessMatch] };
    }

    const hasIdentity = !!(stringify(task.processDefinitionKey) ?? stringify(task.processDefinitionId) ?? stringify(task.processDefinitionName));
    if (!hasIdentity) {
        return { accepted: false, reason: 'no-root-link' };
    }
    const role = taskRole(task);
    return { accepted: false, reason: role && role.role !== 'root' ? 'excluded-subprocess' : 'other-process' };
}

export interface TaskMatchTally {
    accepted: number;
    acceptedByRule: Record<string, number>;
    rejected: number;
    rejectedByReason: Record<string, number>;
}

/** Counts of accepted tasks per rule and discarded tasks per reason (technical view). */
export function tallyTaskMatches(results: readonly TaskMatchResult[]): TaskMatchTally {
    const tally: TaskMatchTally = { accepted: 0, acceptedByRule: {}, rejected: 0, rejectedByReason: {} };
    for (const result of results) {
        if (result.accepted) {
            const rule = result.rule ?? 'unknown';
            tally.accepted += 1;
            tally.acceptedByRule[rule] = (tally.acceptedByRule[rule] ?? 0) + 1;
        } else {
            const reason = result.reason ?? 'unknown';
            tally.rejected += 1;
            tally.rejectedByReason[reason] = (tally.rejectedByReason[reason] ?? 0) + 1;
        }
    }
    return tally;
}

/** `rule=count, ...` sorted by name; `-` when empty. */
export function formatTally(counts: Record<string, number>): string {
    const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
    return entries.length ? entries.map(([name, count]) => `${name}=${count}`).join(', ') : '-';
}

export function matchesMedicalRecordsTask(
    task: TaskInstanceEntry,
    medicalRecordsRootIds: ReadonlySet<string> = new Set(),
    scope?: TaskQueryScope
): boolean {
    return classifyMedicalRecordsTask(task, medicalRecordsRootIds, scope).accepted;
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

    const accountId =
        stringify(variables['MedRec']) ?? stringify(variables['MedRecNum']) ?? stringify(variables['accountId']) ?? stringify(variables['medicalAccountId']);
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

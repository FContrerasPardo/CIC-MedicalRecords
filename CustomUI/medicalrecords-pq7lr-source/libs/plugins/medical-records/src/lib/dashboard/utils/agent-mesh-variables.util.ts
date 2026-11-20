import { AccountStage, ACCOUNT_STAGES } from './dashboard-audit-fields.util';
import { matchesProcessRole, ProcessRole } from '../definitions/process-mapping';

/**
 * Variables of the "AgentMesh" called process, read while it runs.
 *
 * The root BPMN (`medical-records`, call activity "Agentic Mesh Analysis") maps the agent results
 * back to the root only when the call activity COMPLETES (`outputs` of `Activity_0pcaj5z` in
 * `medical-records-qozik-extensions.json`). AgentMesh ends with the user tasks "Validate Rules" and
 * "Analisys", so while the analyst has not completed them the results exist only in the child
 * instance. These helpers pick that child, merge its variables under the root ones and decide when
 * the agent stage stops "processing".
 */

/**
 * AgentMesh is identified through the central process mapping (`definitions/process-mapping.ts`,
 * role `agentMesh`): BPMN process id `Process_1777579089863` first, then its names.
 */

/** Variables AgentMesh produces that the account view reads. */
export const AGENT_MESH_RESULT_VARIABLES: readonly string[] = [
    'codingIntegrityResult',
    'complianceAlertResult',
    'financialVarianceResult',
    'unifiedWidgetPayloadText',
    'unifiedWidgetPayload',
    'agentRulesWidget',
    'agentRulesWidgetSummary',
];

const CLOSED_TASK_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'DELETED']);

export interface ChildProcessCandidate {
    id?: string | null;
    name?: string | null;
    processDefinitionName?: string | null;
    processDefinitionKey?: string | null;
    status?: string | null;
    startDate?: string | null;
}

export interface ChildTaskCandidate {
    id?: string | null;
    name?: string | null;
    status?: string | null;
}

export type VariableOrigin = 'root' | 'child';

export interface MergedProcessVariables {
    variables: Record<string, unknown>;
    /** Where each variable came from. */
    origins: Record<string, VariableOrigin>;
}

function matchesRole(child: ChildProcessCandidate, role: ProcessRole): boolean {
    // Definition key first, then definition name; the instance name only when the name is missing.
    return matchesProcessRole(
        { processDefinitionKey: child.processDefinitionKey, processDefinitionName: child.processDefinitionName ?? child.name },
        role
    );
}

/**
 * The child instance of the given process role (AgentMesh by default): the most recent by start date.
 * Children without id are ignored; without dates the last listed wins.
 */
export function selectLatestChildInstance<T extends ChildProcessCandidate>(children: readonly T[], role: ProcessRole = 'agentMesh'): T | null {
    let best: T | null = null;
    for (const child of children) {
        if (!child?.id || !matchesRole(child, role)) {
            continue;
        }
        if (!best || String(child.startDate ?? '') >= String(best.startDate ?? '')) {
            best = child;
        }
    }
    return best;
}

/** Empty for the merge: null, blank text, `{}` / `[]` (as values or as JSON text). */
export function isEmptyVariableValue(value: unknown): boolean {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        const text = value.trim();
        return !text || text === '{}' || text === '[]' || text === 'null';
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    if (typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>).length === 0;
    }
    return false;
}

/**
 * Root variables win; a child variable is used when the root does not have it or has it empty
 * while the child has data.
 */
export function mergeProcessVariables(root: Record<string, unknown> | null | undefined, child: Record<string, unknown> | null | undefined): MergedProcessVariables {
    const variables: Record<string, unknown> = { ...(root ?? {}) };
    const origins: Record<string, VariableOrigin> = {};
    for (const name of Object.keys(variables)) {
        origins[name] = 'root';
    }
    for (const [name, value] of Object.entries(child ?? {})) {
        if (isEmptyVariableValue(value)) {
            continue;
        }
        if (!(name in variables) || isEmptyVariableValue(variables[name])) {
            variables[name] = value;
            origins[name] = 'child';
        }
    }
    return { variables, origins };
}

/** Open user tasks (not completed, cancelled or deleted). */
export function openTasks<T extends ChildTaskCandidate>(tasks: readonly T[]): T[] {
    return tasks.filter((task) => !!task?.id && !CLOSED_TASK_STATUSES.has(String(task.status ?? '').toUpperCase()));
}

function stagePosition(stage: AccountStage | null): number {
    return stage ? ACCOUNT_STAGES.indexOf(stage) : -1;
}

/**
 * Stage Automate reached: an AgentMesh instance exists only after the intake ("Nueva Cuenta")
 * completed, so the account is at least in agent analysis even if the root batchState still asks
 * for an intake review.
 */
export function reachedAutomateStage(inferred: AccountStage | null, agentMeshStarted: boolean): AccountStage | null {
    if (agentMeshStarted && stagePosition(inferred) < stagePosition('4_AGENTS')) {
        return '4_AGENTS';
    }
    return inferred;
}

export interface AgentStageInput {
    stage: AccountStage | null;
    /** Agents with a readable result (root or AgentMesh). */
    agentsAnswered: number;
    /** AgentMesh has an open user task: the process waits for the analyst. */
    agentMeshTaskOpen: boolean;
}

/** The agent stage is "processing" only while no agent answered and AgentMesh is not waiting for the analyst. */
export function agentStageProcessing(input: AgentStageInput): boolean {
    return input.stage === '4_AGENTS' && input.agentsAnswered === 0 && !input.agentMeshTaskOpen;
}

/** AgentMesh waits for the analyst but no result could be read yet: show the content with a notice. */
export function agentStageWaitingWithoutResults(input: AgentStageInput): boolean {
    return input.stage === '4_AGENTS' && input.agentsAnswered === 0 && input.agentMeshTaskOpen;
}

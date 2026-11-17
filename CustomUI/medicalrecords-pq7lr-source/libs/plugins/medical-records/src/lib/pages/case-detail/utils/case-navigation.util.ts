import { NativeAutomationReference } from '../../../models/medical-record.model';

/** Pure helpers (no Angular) to open the case detail from a task and land on a section. */

export const CASE_ROUTE_COMMANDS = ['/medical-records', 'case'] as const;

export interface CaseTabTarget {
    tab: string;
    subTab?: string;
    /** Customer invoice (patient) of the account to open directly. */
    invoice?: string;
}

export interface CaseRouteContext {
    /** Root process instance (where the process variables live), else the task's instance. */
    processInstanceId: string | null;
    taskId: string | null;
    taskProcessName: string | null;
    /** Customer invoice (patient cluster) chosen in a multi-invoice account. */
    invoiceKey: string | null;
    target: CaseTabTarget | null;
}

export function buildCaseQueryParams(reference: NativeAutomationReference, target?: CaseTabTarget): Record<string, string> {
    const params: Record<string, string> = {};
    const processInstanceId = reference.rootProcessInstanceId ?? reference.processInstanceId;
    if (processInstanceId) {
        params['processInstanceId'] = processInstanceId;
    }
    if (reference.taskId) {
        params['taskId'] = reference.taskId;
    }
    if (reference.taskProcessName) {
        params['taskProcessName'] = reference.taskProcessName;
    }
    if (target?.tab) {
        params['tab'] = target.tab;
        if (target.subTab) {
            params['sub'] = target.subTab;
        }
    }
    if (target?.invoice) {
        params['invoice'] = target.invoice;
    }
    return params;
}

export function readCaseRouteContext(get: (key: string) => string | null): CaseRouteContext {
    const tab = get('tab');
    const subTab = get('sub');
    return {
        processInstanceId: get('processInstanceId'),
        taskId: get('taskId'),
        taskProcessName: get('taskProcessName'),
        invoiceKey: get('invoice'),
        target: tab ? { tab, ...(subTab ? { subTab } : {}) } : null,
    };
}

/** Keeps only values the view knows, so a hand-edited URL cannot select a missing tab. */
export function pickKnown<T extends string>(value: string | undefined | null, known: readonly T[]): T | null {
    return known.find((candidate) => candidate === value) ?? null;
}

/** Tabs of the invoice workspace, by phase: Intake, Analysis (overview + one per agent), Audit and glosas. */
export type WorkspaceTabId = 'intake' | 'analysis' | 'codingIntegrity' | 'complianceAlert' | 'financialVariance' | 'audit';

export const WORKSPACE_TAB_IDS: readonly WorkspaceTabId[] = ['intake', 'analysis', 'codingIntegrity', 'complianceAlert', 'financialVariance', 'audit'];

/** Section ids of the former oncology case view, kept so old links still land on a phase. */
const LEGACY_TABS: Record<string, WorkspaceTabId> = {
    summary: 'intake',
    documents: 'intake',
    tasks: 'intake',
    requests: 'intake',
    guidelines: 'analysis',
    timeline: 'audit',
    returns: 'audit',
};

/** Workspace tab for a route target: a workspace id, or a former section id; null when unknown. */
export function resolveWorkspaceTab(target: CaseTabTarget | null | undefined): WorkspaceTabId | null {
    const tab = target?.tab;
    if (!tab) {
        return null;
    }
    return pickKnown(tab, WORKSPACE_TAB_IDS) ?? LEGACY_TABS[tab] ?? null;
}

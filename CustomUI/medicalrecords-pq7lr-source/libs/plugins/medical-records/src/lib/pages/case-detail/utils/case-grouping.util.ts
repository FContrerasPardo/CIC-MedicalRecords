import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';
import { CaseTaskType, isPatientCaseTask } from './case-validation-map.util';

/**
 * Pure grouping (no Angular) of open tasks into one entry per case. The case identity is a
 * process/account identifier, never the patient name: OCR spellings of the same name differ
 * between tasks.
 */

export interface PatientCaseGroup {
    key: string;
    /** Tasks of the case, in process order (intake, validate rules, analysis). */
    items: ProcessAttentionItem[];
    /** Task used to open the case and to name it: the most advanced stage. */
    primary: ProcessAttentionItem;
    /** Most advanced stage among the open tasks. */
    stage: CaseTaskType;
}

export type ListEntry = { kind: 'case'; key: string; group: PatientCaseGroup } | { kind: 'task'; key: string; item: ProcessAttentionItem };

const STAGE_ORDER: Record<CaseTaskType, number> = { intake: 0, validateRules: 1, analysis: 2, unknown: -1 };

function text(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }
    const normalized = String(value).trim();
    return normalized || null;
}

/** Identifier of the case: root process, else account variable, else process instance, else the task. */
export function resolveCaseKey(item: ProcessAttentionItem): string {
    const reference = item.nativeReference ?? {};
    const root = text(reference.rootProcessInstanceId);
    if (root) {
        return `process:${root}`;
    }
    const account = text(item.processVariables?.['accountId']) ?? text(item.processVariables?.['medicalAccountId']);
    if (account) {
        return `account:${account}`;
    }
    const instance = text(reference.processInstanceId);
    return instance ? `process:${instance}` : `task:${item.id}`;
}

export function compareByStage(left: ProcessAttentionItem, right: ProcessAttentionItem): number {
    return STAGE_ORDER[left.taskType] - STAGE_ORDER[right.taskType];
}

/**
 * Patient tasks sharing a case collapse into one `case` entry placed where its first task
 * appeared; other tasks stay as individual `task` entries. Input order is otherwise kept.
 */
export function buildListEntries(items: ProcessAttentionItem[]): ListEntry[] {
    const slots: Array<{ item: ProcessAttentionItem } | { caseKey: string }> = [];
    const groups = new Map<string, ProcessAttentionItem[]>();

    for (const item of items) {
        if (!isPatientCaseTask(item.taskType)) {
            slots.push({ item });
            continue;
        }
        const key = resolveCaseKey(item);
        const bucket = groups.get(key);
        if (bucket) {
            bucket.push(item);
        } else {
            groups.set(key, [item]);
            slots.push({ caseKey: key });
        }
    }

    return slots.map((slot): ListEntry => {
        if ('item' in slot) {
            return { kind: 'task', key: `task:${slot.item.id}`, item: slot.item };
        }
        const sorted = [...(groups.get(slot.caseKey) ?? [])].sort(compareByStage);
        const primary = sorted[sorted.length - 1];
        return { kind: 'case', key: slot.caseKey, group: { key: slot.caseKey, items: sorted, primary, stage: primary.taskType } };
    });
}

import { NativeAutomationReference } from '../../models/medical-record.model';

export type ProcessAttentionTone = 'red' | 'orange' | 'amber' | 'green' | 'blue';

export type MedicalRecordsTaskType = 'intake' | 'validateRules' | 'analysis' | 'unknown';

export type MedicalRecordsTaskStatus = 'CREATED' | 'ASSIGNED';

export interface ProcessAttentionItem {
    id: string;
    icon: string;
    tone: ProcessAttentionTone;
    title: string;
    subtitle: string;
    meta: string;
    taskName: string;
    taskDefinitionKey?: string;
    taskType: MedicalRecordsTaskType;
    taskStatus: MedicalRecordsTaskStatus;
    processVariables: Record<string, unknown>;
    nativeReference: NativeAutomationReference;
}

/** What the open-tasks query received and kept (technical view and builder preview; no patient data). */
export interface OpenTasksQueryStats {
    /** Root key and names used, and the subprocess keys included (or 'off'). */
    root: string;
    subprocesses: string;
    /** Running root ids returned per root name sent to the Query service. */
    rootIdsByName: Array<{ name: string; count: number }>;
    rootIds: number;
    /** Unique tasks returned by the server (ASSIGNED to me + CREATED). */
    received: number;
    accepted: number;
    acceptedByRule: Record<string, number>;
    rejected: number;
    rejectedByReason: Record<string, number>;
}

export interface ProcessAttentionListState {
    items: ProcessAttentionItem[];
    loading: boolean;
    error?: string;
    stats?: OpenTasksQueryStats;
}

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

export interface ProcessAttentionListState {
    items: ProcessAttentionItem[];
    loading: boolean;
    error?: string;
}

export interface PatientInfo {
    id: string;
    name: string;
    dob: string;
    gender: string;
    insuranceId: string;
}

export type AccountStatus = 'Intake' | 'Analysis' | 'Assembly' | 'Review' | 'Appeals' | 'Closed';
export type UrgencyLevel = 'High' | 'Medium' | 'Low';

export interface NativeAutomationReference {
    processName?: string;
    processInstanceId?: string;
    taskId?: string;
    taskProcessName?: string;
    documentId?: string;
    repositoryId?: string;
    taskFilterId?: string;
    processFilterId?: string;
}

export interface MedicalAccount {
    id: string;
    status: AccountStatus;
    patient: PatientInfo;
    admissionDate: string;
    dischargeDate: string;
    totalBilled: number;
    totalExpected: number;
    totalGlosado?: number;
    totalRecuperado?: number;
    insurer: string;
    urgency: UrgencyLevel;
    nativeReference?: NativeAutomationReference;
}

export interface MetricData {
    label: string;
    value: string;
    trend: string;
    trendUp: boolean;
    icon: string;
}

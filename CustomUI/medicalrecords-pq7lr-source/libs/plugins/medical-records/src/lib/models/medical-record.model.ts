export interface PatientInfo {
    id: string;
    name: string;
    dob: string;
    gender: string;
    insuranceId: string;
}

export type AccountStatus = 'Intake' | 'Analysis' | 'Assembly' | 'Review' | 'Appeals' | 'Closed';
export type UrgencyLevel = 'High' | 'Medium' | 'Low';

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
}

export interface MetricData {
    label: string;
    value: string;
    trend: string;
    trendUp: boolean;
    icon: string;
}

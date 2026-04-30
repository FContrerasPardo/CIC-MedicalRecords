import { IdpBatchStageStatus } from './batch-state.model';

export type IntakeAccountTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface IntakeAccountStageItemViewModel {
    key: string;
    label: string;
    active: boolean;
    completed: boolean;
}

export interface IntakeAccountHeaderViewModel {
    patientName: string | null;
    patientInitials: string;
    mrn: string | null;
    patientId: string | null;
    dob: string | null;
    ageLabel: string | null;
    provider: string | null;
    invoiceNumber: string | null;
    admissionDate: string | null;
    dischargeDate: string | null;
    insurancePlan: string | null;
    intakeStatus: string;
}

export interface IntakeAccountPatientOptionViewModel {
    key: string;
    label: string;
    subtitle: string | null;
    documentCount: number;
    serviceCount: number;
    tone: IntakeAccountTone;
    selected: boolean;
}

export interface IntakeAccountPatientSelectorViewModel {
    visible: boolean;
    selectedKey: string | null;
    totalPatients: number;
    options: IntakeAccountPatientOptionViewModel[];
}

export interface IntakeAccountPatientResolutionViewModel {
    canonicalName: string | null;
    aliases: string[];
    assistedMerged: boolean;
    showAliasBanner: boolean;
    message: string | null;
}

export interface IntakeAccountSummaryViewModel {
    totalServices: number;
    totalProcedures: number;
    totalDocumentsFound: number;
    missingRequirements: number;
    pendingReviewCount: number;
    readyForAnalysis: boolean;
}

export interface IntakeAccountServiceItemViewModel {
    id: string;
    serviceDate: string | null;
    serviceName: string | null;
    cup: string | null;
    description: string | null;
    quantity: string | null;
    price: string | null;
    total: string | null;
    coverage: string | null;
    invoiceNumber: string | null;
    sourceDocument: string | null;
    derivedStatus: 'Ready' | 'Pending Review' | 'Missing Support';
    tone: IntakeAccountTone;
    procedureKey: string;
    totalAmountValue: number | null;
    coverageAmountValue: number | null;
    copayAmountValue: number | null;
}

export interface IntakeAccountServiceExplorerFiltersViewModel {
    statuses: string[];
    serviceNames: string[];
    invoices: string[];
    coverages: string[];
}

export interface IntakeAccountServiceExplorerViewModel {
    items: IntakeAccountServiceItemViewModel[];
    filters: IntakeAccountServiceExplorerFiltersViewModel;
    pageSizeOptions: number[];
}

export interface IntakeAccountDocumentHighlightViewModel {
    label: string;
    value: string;
}

export interface IntakeAccountDocumentControlItemViewModel {
    id: string;
    documentName: string;
    documentType: string;
    linkedProcedureCode: string | null;
    linkedProcedureName: string | null;
    status: string;
    dateReceived: string | null;
    extractedFields: IntakeAccountDocumentHighlightViewModel[];
    extractionBadge: string;
    confidence: number | null;
    tone: IntakeAccountTone;
    viewLabel: string;
}

export interface IntakeAccountMissingDocumentViewModel {
    id: string;
    documentName: string;
    linkedProcedureCode: string | null;
    linkedProcedureName: string;
    status: string;
    primaryActionLabel: string;
    secondaryActionLabel: string;
}

export interface IntakeAccountProcedureSummaryItemViewModel {
    id: string;
    procedureCode: string | null;
    procedureName: string | null;
    serviceCount: number;
    lastServiceDate: string | null;
    requiredDocs: string[];
    presentDocs: string[];
    missingDocs: string[];
    supportStatus: string;
    tone: IntakeAccountTone;
    hasPendingReview: boolean;
}

export interface IntakeAccountReviewAlertViewModel {
    title: string;
    description: string;
    tone: IntakeAccountTone;
}

export interface IntakeAccountAiExtractionViewModel {
    predictedDiagnoses: string[];
    predictedProcedures: string[];
    extractionStatus: IdpBatchStageStatus | null;
    classificationStatus: IdpBatchStageStatus | null;
    separationStatus: IdpBatchStageStatus | null;
    confidenceSummary: string | null;
}

export interface IntakeAccountReadinessViewModel {
    score: number;
    readyForAnalysis: boolean;
    statusLabel: string;
    blockers: string[];
}

export interface IntakeAccountMetaViewModel {
    parseError: boolean;
    parseErrorMessage: string | null;
    emptyState: boolean;
    schemaHints: string[];
}

export interface IntakeAccountViewModel {
    stageNav: {
        stages: IntakeAccountStageItemViewModel[];
        currentStage: string;
    };
    patientSelector: IntakeAccountPatientSelectorViewModel;
    patientResolution: IntakeAccountPatientResolutionViewModel;
    header: IntakeAccountHeaderViewModel;
    summary: IntakeAccountSummaryViewModel;
    serviceExplorer: IntakeAccountServiceExplorerViewModel;
    documentControl: {
        items: IntakeAccountDocumentControlItemViewModel[];
        missingItems: IntakeAccountMissingDocumentViewModel[];
        verifiedCount: number;
    };
    procedureSummary: {
        items: IntakeAccountProcedureSummaryItemViewModel[];
    };
    aiExtraction: IntakeAccountAiExtractionViewModel;
    reviewAlerts: IntakeAccountReviewAlertViewModel[];
    readiness: IntakeAccountReadinessViewModel;
    meta: IntakeAccountMetaViewModel;
}

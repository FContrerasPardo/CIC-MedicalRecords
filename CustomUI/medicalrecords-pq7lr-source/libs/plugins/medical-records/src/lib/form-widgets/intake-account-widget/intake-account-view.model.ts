export type IntakeAccountTone = 'neutral' | 'success' | 'warning' | 'danger';

export type IntakeServiceFilterKey = 'all' | 'complete' | 'missing-support' | 'pending-review' | 'low-confidence';

export type IntakeServiceStatus = 'Complete' | 'Partial' | 'Missing Support' | 'Review Required' | 'Low Confidence';

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

export interface IntakeAccountSummaryCardViewModel {
    key: string;
    label: string;
    value: string;
    tone: IntakeAccountTone;
    clickable: boolean;
    visible: boolean;
    helperText?: string | null;
    filterKey?: IntakeServiceFilterKey | null;
}

export interface IntakeAccountSummaryCardsViewModel {
    primary: IntakeAccountSummaryCardViewModel[];
    secondary: IntakeAccountSummaryCardViewModel[];
}

export interface IntakeAccountServiceItemViewModel {
    id: string;
    serviceDate: string | null;
    serviceCode: string | null;
    cup: string | null;
    description: string | null;
    quantity: string | null;
    price: string | null;
    total: string | null;
    coverage: string | null;
    invoiceNumber: string | null;
    category: string | null;
    supportStatus: IntakeServiceStatus;
    completionPercent: number;
    requiredDocuments: string[];
    presentDocuments: string[];
    missingDocuments: string[];
    extractionSource: string | null;
    classificationConfidence: number | null;
    confidenceSummary: string | null;
    alerts: string[];
    tone: IntakeAccountTone;
    hasReviewRequired: boolean;
    hasLowConfidence: boolean;
}

export interface IntakeAccountDocumentHighlightViewModel {
    label: string;
    value: string;
    tone: IntakeAccountTone;
}

export interface IntakeAccountDocumentItemViewModel {
    id: string;
    name: string;
    className: string;
    repositoryNodeId: string | null;
    mimeType: string | null;
    contentFileReferenceIndex: number | null;
    sourcePageIndex: number | null;
    status: string;
    classificationStatus: string;
    extractionStatus: string;
    classificationConfidence: number | null;
    extractionReviewStatus: string | null;
    separationReviewStatus: string | null;
    extractedHighlights: IntakeAccountDocumentHighlightViewModel[];
    tone: IntakeAccountTone;
    viewLabel: string;
}

export interface IntakeAccountReviewAlertViewModel {
    title: string;
    description: string;
    tone: IntakeAccountTone;
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
    summaryCards: IntakeAccountSummaryCardsViewModel;
    activeFilter: IntakeServiceFilterKey;
    services: IntakeAccountServiceItemViewModel[];
    documents: IntakeAccountDocumentItemViewModel[];
    readiness: IntakeAccountReadinessViewModel;
    alerts: IntakeAccountReviewAlertViewModel[];
    meta: IntakeAccountMetaViewModel;
}

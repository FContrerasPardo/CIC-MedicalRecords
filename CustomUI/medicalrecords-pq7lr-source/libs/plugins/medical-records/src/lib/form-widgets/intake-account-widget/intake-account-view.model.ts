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
    /** IDP document the billed row was read from. */
    sourceDocumentId?: string;
    /** Every extracted cell of the billed row (IDP label and value), in table order. */
    extractedFields?: Array<{ label: string; value: string }>;
    /** Service group of the billed row (section header or group text of the "Servicio" column); null when none. */
    serviceGroup?: IntakeServiceGroupRef | null;
}

/** Service group a billed row belongs to; rows of the same group share `key`. */
export interface IntakeServiceGroupRef {
    /** `section:<code>` for a group (subtotal) row, `service:<normalized text>` for a group text. */
    key: string;
    /** 3-digit code of a section header (e.g. "300"); null for a group text. */
    code: string | null;
    /** Display name, e.g. "300 HABITACION" or "02-CONSUL CONSULTA E INTERNCONSULTA". */
    label: string;
    /** Position of the first row of the group in its table (keeps the invoice order). */
    order: number;
    /** Billed subtotal of the group rows of this code (a repeated amount counts once); null when none. */
    billedSubtotal?: number | null;
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

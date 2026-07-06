export type IntakeDocumentKind =
    | 'billing'
    | 'authorization'
    | 'admission'
    | 'objection'
    | 'pathology'
    | 'lab'
    | 'other';

export type IntakeClassNameMatchMode = 'all' | 'any';

export interface IntakeDocumentClassificationRule {
    kind: IntakeDocumentKind;
    classNameContains: string[];
    classNameMatch: IntakeClassNameMatchMode;
    label: string;
}

export interface IntakeServiceRequirementRule {
    requiredDocument: string;
    triggerDocumentKind: IntakeDocumentKind;
    serviceDescriptionPattern: string;
}

export interface IntakeSupportHeuristicsConfig {
    schemaVersion: string;
    alwaysRequired: string[];
    documentClassification: IntakeDocumentClassificationRule[];
    serviceRequirements: IntakeServiceRequirementRule[];
    documentPriority: Record<IntakeDocumentKind, number>;
}

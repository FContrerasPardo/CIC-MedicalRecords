/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export interface IdpConfiguration {
    classification: IdpClassificationConfiguration;
    extraction: IdpExtractionConfiguration;
}

export interface IdpDocumentClassDefinition {
    id: string;
    name: string;
    description: string;
    reviewThreshold?: number;
    classAssignmentThreshold?: number;
    ignoreForAuto?: boolean;
    ignoreForReview?: boolean;
    parentClassId?: string;
}

export const IdpFieldDataType = {
    Text: 'Text',
    Table: 'Table',
    Reasoning: 'Reasoning',
} as const;
export type IdpFieldDataType = typeof IdpFieldDataType[keyof typeof IdpFieldDataType];

export const IdpFieldRedactionMode = {
    None: 'None',
    Soft: 'Soft',
    Hard: 'Hard'
} as const;
export type IdpFieldRedactionMode = typeof IdpFieldRedactionMode[keyof typeof IdpFieldRedactionMode];

export interface IdpFieldDefinition {
    columns: IdpColumnValidation[];
    id: string;
    name: string;
    dataType: IdpFieldDataType;
    format: string;
    description: string;
    redactionMode: IdpFieldRedactionMode;
    ignoreForAuto?: boolean;
    ignoreForReview?: boolean;
    validation?: IdpFieldValidationRules;
}

export interface ProcessValidationRule {
    name: string;
}

export interface IdpClassificationConfiguration {
    documentClassDefinitions: IdpDocumentClassDefinition[];
    classificationConfidenceThreshold: number;
    reviewThreshold?: number;
    classAssignmentThreshold?: number;
    classCandidatesMinDistance?: number;
}

export interface IdpFieldDefinitionsByClass {
    documentClassId: string;
    fieldDefinitions: IdpFieldDefinition[];
    fieldConfidenceThreshold: number;
    formModelKey?: string;
    validationProcessName?: string;
    validationProcessId?: string;
}

export interface IdpExtractionConfiguration {
    fieldDefinitionsByClass: IdpFieldDefinitionsByClass[];
}

export interface IdpFieldValidationRules {
    length?: IdpFieldValidationLengthRule;
    required: boolean;
    regex?: IdpFieldValidationRegExRule;
    process?: ProcessValidationRule;
}

export interface ProcessValidationRule {
    name: string;
}

export interface IdpFieldValidationLengthRule {
    min?: number;
    max?: number;
}

export interface IdpFieldValidationRegExRule {
    pattern?: string;
}

export interface IdpColumnValidation {
    name: string;
    validation?: IdpFieldValidationRules;
}

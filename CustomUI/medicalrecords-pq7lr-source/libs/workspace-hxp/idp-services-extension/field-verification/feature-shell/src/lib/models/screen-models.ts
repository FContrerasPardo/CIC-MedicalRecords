/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    IdentifierData,
    IdpClassificationConfiguration,
    IdpExtractionConfiguration,
    IdpFieldDataType,
    IdpTaskInfoBase,
    IdpVerificationStatus,
    SomeRequired,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { ApiBoundingBox, FieldVerificationBatchState, FieldVerificationInput } from './contracts/field-verification-models';

export type IdpTaskInfo = IdpTaskInfoBase;
export type IdpConfigClass = IdentifierData & {
    formModelKey?: string;
    validationProcessName?: string;
    validationProcessId?: string;
};

export type IdpTaskData = FieldVerificationInput & {
    batchState: SomeRequired<FieldVerificationBatchState, 'contentFileReferences'>;
    classificationConfiguration: IdpClassificationConfiguration;
    extractionConfiguration: IdpExtractionConfiguration;
};

export type IdpBoundingBox = ApiBoundingBox & {
    pageId?: string;
};

export interface IdpField extends IdentifierData {
    dataType: IdpFieldDataType;
    format: string;
    confidence: number;
    verificationStatus: IdpVerificationStatus;
    validationStatus: IdpValidationStatus;
    value?: string;
    boundingBox?: IdpBoundingBox;
    isSelected?: boolean;
    needsKeyboardFocus?: boolean;
    hasIssue?: boolean;
    isFormFieldValid?: boolean;
    tableId?: string;
    validatorName?: string;
}

export interface IdpDocument extends IdentifierData {
    class: IdpConfigClass;
    pages: IdpDocumentPage[];
    rejectReasonId?: string;
    markAsRejected?: boolean;
    rejectNote?: string;
    hasIssue: boolean;
}

export interface IdpDocumentPage extends IdentifierData {
    documentId: string;
    fileReference: string;
    sourcePageIndex: number;
    rotation?: number;
    viewerRotation?: number;
    hasMachineTextLayer?: boolean;
    hasIssue: boolean;
    isSelected: boolean;
    height: number;
    width: number;
}

export interface IdpTableRowRecord {
    rowCells: IdpField[];
}

export interface IdpFieldWithHeader extends IdpField {
    rowHeader: string;
}

export interface IdpTable {
    id: string;
    name: string;
    columnHeaderNames: string[];
    rows: IdpTableRowRecord[];
    validationStatus: IdpValidationStatus;
    validatorName?: string;
    isDirty: boolean;
}

export interface IdpTableSummary {
    id: string;
    name: string;
    rowCount: number;
}

export const GroupSelectionType = {
    Row: 'Row',
    Column: 'Column',
    Table: 'Table',
    None: 'None',
} as const;
export type GroupSelectionType = keyof typeof GroupSelectionType;

export interface TableGroupSelection {
    type: GroupSelectionType;
    index?: number;
    tableId?: string;
}

export const IdpValidationStatus = {
    Valid: 'Valid',
    Invalid: 'Invalid',
} as const;
export type IdpValidationStatus = keyof typeof IdpValidationStatus;

export const FillDirection = {
    AllAbove: 'AllAbove',
    AllBelow: 'AllBelow',
    ToAbove: 'ToAbove',
    ToBelow: 'ToBelow',
} as const;
export type FillDirection = keyof typeof FillDirection;

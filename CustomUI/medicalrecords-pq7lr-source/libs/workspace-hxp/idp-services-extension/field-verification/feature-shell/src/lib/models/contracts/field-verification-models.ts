/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ApiBaseDocument, ContentFileReference, IdpFieldDataType, TaskInput } from '@hxp/workspace-hxp/idp-services-extension/shared';

export interface FieldVerificationInput extends TaskInput {
    batchState: FieldVerificationBatchState;
    documentIndex: number;
}

export interface FieldVerificationBatchState {
    documents: ApiDocument[];
    extractionStatus?: 'Awaiting' | 'Extracted' | 'ReviewRequired';
    contentFileReferences?: ContentFileReference[];
    hasRejectedDocuments?: boolean;
}

export interface ApiDocument extends ApiBaseDocument {
    classId: string;
    extractionReviewStatus?: 'ReviewRequired' | 'ReviewNotRequired';
    fields?: ApiField[];
    tables?: ApiTable[];
    markAsRejected?: boolean;
    rejectReasonId?: string;
    rejectNote?: string;
}

export interface ApiBoundingBox {
    pageIndex?: number;
    top: number;
    left: number;
    height: number;
    width: number;
}

export interface ApiField {
    id: string;
    name: string;
    value?: string;
    extractionConfidence?: number;
    extractionReviewStatus?: 'ReviewRequired' | 'ReviewNotRequired';
    boundingBox?: ApiBoundingBox;
}

export interface ApiTable {
    id: string;
    name: string;
    columnHeaderNames: string[];
    columnHeaderBoundingBoxes: ApiBoundingBox[];
    tableBoundingBoxes: ApiBoundingBox[];
    records?: ApiTableRowRecord[];
    pageIndexes: number[];
    extractionConfidence: number;
    reviewStatus: string;
}

export interface ApiTableRowRecord {
    records?: ApiTableRowCell[];
}

export interface ApiTableRowCell {
    recordName: string;
    type: IdpFieldDataType;
    value?: string;
    boundingBox?: ApiBoundingBox;
}

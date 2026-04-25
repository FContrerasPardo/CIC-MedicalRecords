/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ApiBaseDocument, TaskInput, RejectReason, ContentFileReference, ApiDocPage } from '@hxp/workspace-hxp/idp-services-extension/shared';

export interface ClassVerificationInput extends TaskInput {
    batchState: ClassVerificationBatchState;
    rejectReasons: RejectReason[];
    targetFolder?: string;
}

export interface ClassVerificationBatchState {
    documents: ApiDocument[];
    deletedPages?: ApiDocPage[];
    separationStatus?: 'Awaiting' | 'Separated' | 'ReviewRequired';
    classificationStatus?: 'Awaiting' | 'Classified' | 'ReviewRequired';
    extractionStatus?: 'Awaiting' | 'Extracted' | 'ReviewRequired';
    hasRejectedDocuments?: boolean;
    // in the future this property will no longer be optional
    contentFileReferences?: ContentFileReference[];
}

export interface ApiDocument extends ApiBaseDocument, TransientApiDocument {
    markAsDeleted?: boolean;
    markAsRejected?: boolean;
    markAsResolved?: boolean;
    classificationConfidence?: number;
    rejectReasonId?: string;
    rejectNote?: string;
    classId?: string;
    className?: string;
    classificationReviewStatus?: 'ReviewRequired' | 'ReviewNotRequired';
    classificationClassCandidates?: ClassificationCandidate[] | null;
    classificationSelectionReason?: ClassSelectionReasonCode;
}

export interface TransientApiDocument {
    reprocess?: boolean;
}

export type ClassSelectionReasonCode =
    | 'AUTOWIN'
    | 'BELOW_REVIEW_THRESHOLD'
    | 'BELOW_ASSIGNMENT_THRESHOLD'
    | 'DIST_NOT_ENOUGH'
    | 'NO_DATA'
    | 'ALL_AUTO_IGNORED'
    | 'DEFAULT_CLASS_ID';

export interface ClassificationCandidate {
    classId?: string | null;
    className?: string | null;
    confidence: number;
    reason?: string | null;
}

export interface ReasoningDialogCandidate {
    name: string | null;
    confidence: string;
    reason: string | null;
    isSelected: boolean;
}

export interface ReasoningDialogData {
    documentName: string;
    candidates: ReasoningDialogCandidate[];
    selectionReason: ClassSelectionReasonCode;
}

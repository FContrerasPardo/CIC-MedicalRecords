/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    IdentifierData,
    IdpClassificationConfiguration,
    IdpTaskInfoBase,
    IdpVerificationStatus,
    RejectReason,
    SomeRequired,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { ClassificationCandidate, ClassSelectionReasonCode, ClassVerificationBatchState, ClassVerificationInput } from './contracts/class-verification-models';

export type IdpTaskInfo = IdpTaskInfoBase;

export type IdpTaskData = ClassVerificationInput & {
    batchState: SomeRequired<ClassVerificationBatchState, 'contentFileReferences'>;
    configuration: IdpClassificationConfiguration;
};

export interface IdpConfigClass extends IdentifierData {
    isSpecialClass: boolean;
    isExpanded?: boolean;
    isSelected?: boolean;
    isPreviewed?: boolean;
    parentClassId?: string;
    reviewThreshold?: number;
    classAssignmentThreshold?: number;
    ignoreForAuto?: boolean;
    ignoreForReview?: boolean;
}

export interface IdpDocument extends IdentifierData {
    class?: IdpConfigClass;
    verificationStatus: IdpVerificationStatus;
    classificationConfidence: number;
    pages: IdpDocumentPage[];
    hasIssue?: boolean;
    isSelected?: boolean;
    isExpanded?: boolean;
    isPreviewed?: boolean;
    isDragging?: boolean;
    rejectedReasonId?: string;
    rejectNote?: string;
    isCut?: boolean;
    classificationClassCandidates?: ClassificationCandidate[] | null;
    classificationSelectionReason?: ClassSelectionReasonCode;
}

export interface IdpDocumentPage extends IdentifierData {
    documentId: string;
    fileReference: string;
    sourcePageIndex: number;
    rotation?: number;
    viewerRotation?: number;
    hasMachineTextLayer?: boolean;
    hasIssue?: boolean;
    isSelected?: boolean;
    isCut?: boolean;
    height: number;
    width: number;
}

export type IdpRejectReason = RejectReason;

// System Document Classes
export const UNCLASSIFIED_CLASS_ID = 'unclassified';
export const REJECTED_CLASS_ID = 'rejected';
export const UNSORTED_DOCUMENT_LIST_ID = 'unsorted-document-list';

export const SYS_DOCUMENT_CLASS_UNCLASSIFIED: IdpConfigClass = {
    id: UNCLASSIFIED_CLASS_ID,
    name: 'Unclassified',
    isSpecialClass: true,
};

export const SYS_DOCUMENT_CLASS_REJECTED: IdpConfigClass = {
    id: REJECTED_CLASS_ID,
    name: 'Flagged',
    isSpecialClass: true,
};

export type DocumentClassMetadata = IdpConfigClass & {
    documentsCount: number;
    issuesCount: number;
    canExpand: boolean;
    disabled: boolean;
};

export const IdpDocumentAction = {
    ChangeClass: 'ChangeClass',
    Split: 'Split',
    Merge: 'Merge',
    Delete: 'Delete',
    Undo: 'Undo',
    Redo: 'Redo',
    Reject: 'Reject',
    Resolve: 'Resolve',
    MovePage: 'MovePage',
    MovePageAndCreate: 'MovePageAndCreate',
    CreateCopy: 'CreateCopy',
    InsertPage: 'InsertPage',
    ViewReasoning: 'ViewReasoning',
} as const;
export type IdpDocumentAction = typeof IdpDocumentAction[keyof typeof IdpDocumentAction];

export interface IdpDocumentActionCompleteEvent {
    action: IdpDocumentAction;
    isSuccess: boolean;
    documents: string[];
    pages: Array<Pick<IdpDocumentPage, 'id' | 'documentId'>>;
}

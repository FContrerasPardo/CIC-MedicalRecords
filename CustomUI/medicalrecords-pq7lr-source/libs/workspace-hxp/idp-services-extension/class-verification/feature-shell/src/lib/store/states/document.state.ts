/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { IdpDocument, IdpDocumentActionCompleteEvent, UNCLASSIFIED_CLASS_ID } from '../../models/screen-models';
import { IdentifierData, IdpDocumentPage, IdpLoadState, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';

export type DocumentEntityPage = Omit<IdpDocumentPage, 'documentId' | 'hasIssue' | 'isSelected'> & {
    contentFileReferenceIndex: number;
    markAsDeleted?: boolean;
};

export type DocumentEntity = Omit<IdpDocument, 'isSelected' | 'isExpanded' | 'pages' | 'hasIssue'> & {
    isGenerated: boolean;
    isImported?: boolean;
    markAsDeleted?: boolean;
    markAsResolved?: boolean;
    pages: DocumentEntityPage[];
};

export interface DocumentState extends EntityState<DocumentEntity> {
    selectedPageIds: string[];
    cutPageIds: string[];
    expandedDocumentIds: string[];
    previewedDocumentId?: string;
    draggedDocumentIds: string[];
    loadState: IdpLoadState;
    lastAction?: IdpDocumentActionCompleteEvent;
}

export const documentAdapter = createEntityAdapter<DocumentEntity>();

export const initialDocumentState: DocumentState = documentAdapter.getInitialState({
    selectedPageIds: [],
    cutPageIds: [],
    draggedDocumentIds: [],
    expandedDocumentIds: [],
    loadState: IdpLoadState.NotInitialized,
});

export function isDocumentValid(document: DocumentEntity, documentClasses: IdentifierData[]): boolean {
    const reviewRequired = document.verificationStatus === IdpVerificationStatus.AutoInvalid;
    const hasValidClass = documentClasses.some((c) => c.id === document.class?.id && c.id !== UNCLASSIFIED_CLASS_ID);
    const isRejected = Boolean(document.rejectedReasonId);
    const isResolved = document.markAsResolved === true;
    return isRejected || (hasValidClass && (isResolved || !reviewRequired));
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IdpScreenViewFilter, IdpScreenViewSortOption } from '../../models/common-models';
import { IdpDocumentPage, IdpTaskData } from '../../models/screen-models';
import { DocumentEntity, DocumentState } from '../states/document.state';
import { DocumentStateUpdate, IdpPagesMetadata } from '../models/document-state-updates';
import { IdpDocumentAction } from './../../models/screen-models';
import {
    IdpFileMetadata,
    IdpTaskActions,
    TaskAssignmentContext,
    TaskClaimPermissions,
    TaskContext,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { ImportingDocument } from '../states/importing-document.state';

interface DocActionCommonProps {
    docAction: IdpDocumentAction;
    canUndoAction: boolean;
    pages: IdpDocumentPage[];
}

export const userActions = createActionGroup({
    source: 'Hx Idp Class Verification User',
    events: {
        // document and page structure actions
        pageMerge: props<DocActionCommonProps & { targetDocumentId: string }>(),
        pageSplit: props<DocActionCommonProps & { createAfterDocId?: string }>(),
        pageMove: props<DocActionCommonProps & { targetDocumentId: string; targetIndex: number }>(),
        pageDelete: props<DocActionCommonProps>(),
        pageCreateCopy: props<DocActionCommonProps>(),
        documentClassChange: props<DocActionCommonProps & { classId: string }>(),
        documentResolve: props<DocActionCommonProps>(),
        documentReject: props<DocActionCommonProps & { rejectReasonId?: string; rejectNote?: string }>(),
        updatePagesRotation: props<{ pages: IdpPagesMetadata[]; taskDataSynced?: boolean }>(),

        // selection and ui state actions
        pageSelect: props<{ pageIds: string[] }>(),
        documentExpandToggle: props<{ documentId: string }>(),
        documentPreviewToggle: props<{ documentId?: string }>(),
        documentDragToggle: props<{ documentId: string }>(),

        // class actions
        classSelect: props<{ classId: string }>(),
        classExpandToggle: props<{ classId: string }>(),
        classPreviewToggle: props<{ classId?: string }>(),

        // view actions
        viewFilterChange: props<{ filter: IdpScreenViewFilter }>(),
        viewFilterToggle: emptyProps(),
        changeFullScreen: props<{ fullScreen: boolean }>(),
        sortOptionChange: props<{ option: IdpScreenViewSortOption }>(),

        // undo redo actions
        undoAction: emptyProps(),
        redoAction: emptyProps(),

        // task actions
        taskSave: emptyProps(),
        taskComplete: props<{ openNextTask?: boolean }>(),
        taskCancel: emptyProps(),

        // document upload
        queueDocumentUpload: props<{ files: File[] }>(),
        cancelDocumentUpload: props<{ documentIds: string[] }>(),

        copyDocumentDetailsToClipboard: props<{ documentId: string }>(),

        // cut/insert
        pageCut: props<{ pageIds: string[] }>(),

        taskUnclaim: emptyProps(),
        taskUnclaimSuccess: props<{ taskAssignmentContext: TaskAssignmentContext }>(),
        taskUnclaimError: props<{ error: Error | string }>(),
    },
});

export const systemActions = createActionGroup({
    source: 'Hx Idp Class Verification System',
    events: {
        // screen actions
        taskInitialize: props<{ taskContext: TaskContext; taskClaimPermissions: TaskClaimPermissions }>(),
        taskInitializeSuccess: props<{ taskAssignmentContext: TaskAssignmentContext }>(),
        taskInitializeError: props<{ error: Error | string }>(),
        screenLoad: emptyProps(),
        screenLoadSuccess: props<{ taskData: IdpTaskData }>(),
        screenLoadError: props<{ error: Error }>(),
        screenStateReset: emptyProps(),

        // document actions
        createDocuments: props<{ documents: DocumentEntity[] }>(),
        documentOperationSuccess: props<{
            docAction: IdpDocumentAction;
            canUndoAction: boolean;
            updates: DocumentStateUpdate[];
            contextPageIds: string[];
            notificationMessage: string;
            messageArgs?: Record<string, any>;
        }>(),
        documentOperationError: props<{
            docAction: IdpDocumentAction;
            error: Error | string;
            notificationMessage: string;
            messageArgs?: Record<string, any>;
        }>(),
        applyDocumentUpdates: props<{ updates: DocumentStateUpdate[]; isUndo?: boolean; isRedo?: boolean }>(),

        // notification actions
        notificationShow: props<{ severity: 'info' | 'success' | 'error' | 'warn'; message: string; messageArgs?: Record<string, any> }>(),

        // task actions
        taskActionSuccess: props<{ action: IdpTaskActions; openNextTask?: boolean }>(),
        taskActionError: props<{ error: Error | string; action?: IdpTaskActions }>(),
        taskPrepareUpdate: props<{ taskAction: IdpTaskActions; openNextTask?: boolean }>(),
        taskPrepareUpdateSuccess: props<{ taskAction: IdpTaskActions; taskData: IdpTaskData; openNextTask?: boolean }>(),
        taskPrepareUpdateError: props<{ taskAction: IdpTaskActions; error: Error | string }>(),

        updateDocumentsRotation: props<{ taskAction: IdpTaskActions; taskData: IdpTaskData; openNextTask?: boolean }>(),

        // undo redo actions
        registerUndoDocumentOperation: props<{ docState: DocumentState; updates: DocumentStateUpdate[] }>(),
        undoAction: props<{ docState: DocumentState }>(),
        redoAction: props<{ docState: DocumentState }>(),

        // task claim
        taskClaim: emptyProps(),
        taskClaimSuccess: props<{ taskAssignmentContext: TaskAssignmentContext }>(),
        taskClaimError: props<{ error: Error | string }>(),

        // screen document upload actions
        screenLoadDocumentUpload: props<{ taskData: IdpTaskData }>(),
        screenLoadDocumentUploadSuccess: props<{ enabled: boolean }>(),
        screenLoadDocumentUploadError: props<{ message?: string }>(),
        documentImportStarted: emptyProps(),
        documentImportFinished: emptyProps(),
        queueDocumentUploadSuccess: props<{ documents: ImportingDocument[] }>(),
        queueDocumentUploadError: props<{ documents: ImportingDocument[] }>(),
        documentUploadProgress: props<{ documentId: string; progress: number }>(),
        documentUploadComplete: props<{ documentId: string; fileUploadId: string }>(),
        documentUploadCancelled: props<{ documentIds: string[] }>(),
        documentUploadError: props<{ documentId: string; errorCode?: number }>(),
        uploadedDocumentCreated: props<{ documentId: string; sysId: string; processFolderId?: string }>(),
        uploadedDocumentReceivedMetadataSuccess: props<{ metadata: IdpFileMetadata; documentId: string; uploadedDocument: ImportingDocument }>(),
        uploadedDocumentReceivedMetadataError: props<{ documentId: string }>(),
        uploadedDocumentReceivedMetadataCancelled: props<{ documentIds: string[] }>(),

        copyDocumentDetailsToClipboardSuccess: props<{ documentId: string }>(),
    },
});

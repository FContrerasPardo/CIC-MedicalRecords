/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createEntityAdapter, EntityState } from '@ngrx/entity';

export const DocumentImportingStatus = {
    Pending: 'pending',
    Progress: 'progress',
    Complete: 'complete',
    Cancelled: 'cancelled',
    Error: 'error',
};

export type DocumentImportingStatus = typeof DocumentImportingStatus[keyof typeof DocumentImportingStatus];

export interface ImportingDocument {
    id: string;
    fileUploadId?: string;
    sysId?: string;
    fileName: string;
    importingStatus: DocumentImportingStatus;
    progress: number;
    errorCode?: number;
}

export interface ScreenImportingDocumentState extends EntityState<ImportingDocument> {
    enabled: boolean;
    running: boolean;
    processFolderId?: string;
}

export const screenImportingDocumentAdapter = createEntityAdapter<ImportingDocument>();

export const initialScreenImportingDocumentState = screenImportingDocumentAdapter.getInitialState({
    enabled: false,
    running: false,
});

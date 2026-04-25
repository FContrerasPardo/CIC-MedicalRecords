/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Document } from '@hylandsoftware/hxcs-js-client';

export const UploadDocumentModelStatus = {
    COMPLETED: 'COMPLETED',
    PENDING: 'PENDING',
    ERRORED: 'ERRORED',
} as const;
export type UploadDocumentModelStatus = typeof UploadDocumentModelStatus[keyof typeof UploadDocumentModelStatus];

export class UploadDocumentModel {
    constructor(public document: Document, public status: UploadDocumentModelStatus = UploadDocumentModelStatus.PENDING) {}
}

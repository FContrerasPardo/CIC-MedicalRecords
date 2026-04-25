/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { PendingDocument, isPendingDocument } from './model/pending-document.model';
import { HxpPendingDocumentService } from './pending-document.service';

@Injectable({
    providedIn: 'root',
})
export class PendingDocumentProcessorService {
    async processPendingDocuments(values: unknown, documentOps: HxpPendingDocumentService): Promise<unknown> {
        if (!values || typeof values !== 'object') {
            return values;
        }

        const processedValues: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(values)) {
            processedValues[key] = await this.processValue(value, documentOps);
        }

        return processedValues;
    }

    private async processValue(value: unknown, documentOps: HxpPendingDocumentService): Promise<unknown> {
        if (isPendingDocument(value)) {
            return this.restorePendingDocumentPermissions(value, documentOps);
        }

        if (Array.isArray(value)) {
            return Promise.all(value.map((item) => this.processValue(item, documentOps)));
        }

        if (value && typeof value === 'object') {
            const processedObj: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) {
                processedObj[k] = await this.processValue(v, documentOps);
            }
            return processedObj;
        }

        return value;
    }

    private async restorePendingDocumentPermissions(pending: PendingDocument, documentOps: HxpPendingDocumentService): Promise<Document> {
        const documentId = pending.document.sys_id;
        if (!documentId) {
            throw new Error('Cannot restore permissions: document has no sys_id');
        }

        return documentOps.restorePermissions(documentId, pending.originalPermissions);
    }
}

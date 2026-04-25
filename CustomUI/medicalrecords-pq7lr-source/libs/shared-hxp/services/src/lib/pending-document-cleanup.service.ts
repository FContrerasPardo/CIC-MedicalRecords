/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { PendingDocument, isPendingDocument } from './model/pending-document.model';
import { HxpPendingDocumentService } from './pending-document.service';
import { FormValues } from '@alfresco/adf-core';

@Injectable()
export class PendingDocumentCleanupService {
    private readonly trackedDocuments = new Map<string, PendingDocument>();

    track(pending: PendingDocument): void {
        const documentId = pending.document.sys_id;
        if (documentId) {
            this.trackedDocuments.set(documentId, pending);
        }
    }

    untrack(documentId: string): void {
        this.trackedDocuments.delete(documentId);
    }

    untrackAndDelete(documentId: string, documentOps: HxpPendingDocumentService): Promise<void> {
        const pending = this.trackedDocuments.get(documentId);
        this.trackedDocuments.delete(documentId);
        if (!pending?.document.sys_id) {
            return Promise.resolve();
        }
        return documentOps.deleteDocument(pending.document.sys_id);
    }

    clearTracking(): void {
        this.trackedDocuments.clear();
    }

    markAllPersisted(): void {
        for (const pending of this.trackedDocuments.values()) {
            pending.persisted = true;
        }
    }

    markPersistedInFormValues(formValues: FormValues): void {
        if (!formValues || typeof formValues !== 'object') {
            return;
        }
        this.walkAndMarkPersisted(formValues);
    }

    async cleanupUnpersisted(documentOps: HxpPendingDocumentService): Promise<void> {
        const unpersisted = [...this.trackedDocuments.values()].filter((p) => !p.persisted);
        for (const pending of unpersisted) {
            const docId = pending.document.sys_id;
            if (docId) {
                this.trackedDocuments.delete(docId);
            }
        }

        await Promise.allSettled(
            unpersisted
                .filter((p) => !!p.document.sys_id)
                .map((p) => {
                    if (!p.document.sys_id) {
                        return Promise.resolve();
                    }

                    return documentOps.deleteDocument(p.document.sys_id);
                })
        );
    }

    private walkAndMarkPersisted(value: FormValues): void {
        if (isPendingDocument(value)) {
            value.persisted = true;
            const docId = value.document.sys_id;
            if (docId && this.trackedDocuments.has(docId)) {
                const tracked = this.trackedDocuments.get(docId);
                if (tracked) {
                    tracked.persisted = true;
                }
            }
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => this.walkAndMarkPersisted(item));
            return;
        }

        if (value && typeof value === 'object') {
            Object.values(value).forEach((v) => this.walkAndMarkPersisted(v));
        }
    }
}

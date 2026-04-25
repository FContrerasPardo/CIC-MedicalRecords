/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { TranslationService } from '@alfresco/adf-core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { isRoot, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { filter } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class CacheLabelService {
    private cache = new Map<string, string>();
    private readonly translationService: TranslationService = inject(TranslationService);
    private readonly documentService: DocumentService = inject(DocumentService);

    constructor() {
        // Automatically update cache when documents are updated
        this.documentService.documentUpdated$
            .pipe(
                filter(({ document }) => !!document?.sys_id),
            )
            .subscribe(({ document }) => {
                if (document) {
                    this.updateCacheOnDocumentUpdate(document);
                }
            });
    }

    getCache(): Map<string, string> {
        return this.cache;
    }

    getTranslation(doc: Document, rootTranslationKey: string): string {
        const key = doc.sys_id ?? this.generateUniqueKey(doc);

        if (this.cache.has(key)) {
            return this.cache.get(key) as string;
        }

        const translatedValue = this.getLabel(doc, rootTranslationKey);
        this.cache.set(key, translatedValue);

        return translatedValue;
    }

    private updateCacheOnDocumentUpdate(document: Document, rootTranslationKey = 'DOCUMENT_BREADCRUMB.ROOT'): void {
        if (!document.sys_id) {
            return; // Skip documents without sys_id as they cannot be reliably cached
        }
        const updatedLabel = this.getLabel(document, rootTranslationKey);
        this.cache.set(document.sys_id, updatedLabel);
    }


    private getLabel(doc: Document, rootTranslationKey: string): string {
        return isRoot(doc) ? this.translationService.instant(rootTranslationKey) : doc.sys_title || doc.sys_name || '';
    }

    private generateUniqueKey(doc: Record<string, Document>): string {
        const sortedEntries = Object.entries(doc).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

        const keyString = sortedEntries
            .map(([key, value]) => {
                return `${key}=${value ?? ''}`;
            })
            .join('|');

        return keyString;
    }
}

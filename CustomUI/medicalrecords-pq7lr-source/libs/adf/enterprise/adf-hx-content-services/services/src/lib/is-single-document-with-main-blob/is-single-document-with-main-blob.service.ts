/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';
import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Document } from '@hylandsoftware/hxcs-js-client';

@Injectable({
    providedIn: 'root',
})
export class IsSingleDocumentWithMainBlobService {
    protected readonly featuresService = inject(FeaturesServiceToken);
    protected readonly isDocumentLayoutFeatureFlagOn = toSignal(
        this.featuresService.isOn$(ADF_HX_CONTENT_SERVICES_INTERNAL.CIC_WORKSPACE_DOCUMENT_LAYOUT_TOGGLE)
    );
    /**
     * Checks if the given array of documents represents a single document with a valid file blob.
     *
     * @param documents - The array of documents to be checked.
     * @returns A boolean value indicating whether the array represents a single document with a valid file blob.
     */
    validate(documents: Document[]): boolean {
        return this.isSingleDocument(documents) && this.hasValidFileBlob(documents[0]);
    }

    private isSingleDocument(documents: Document[]) {
        if (this.isDocumentLayoutFeatureFlagOn()) {
            return documents.length === 1;
        } else {
            return documents.length === 1 && !documents[0].sys_isFolderish;
        }
    }

    private hasValidFileBlob({ sysfile_blob }: Document) {
        return Boolean(sysfile_blob?.filename);
    }
}

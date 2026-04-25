/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { DocumentApi, Document } from '@hylandsoftware/hxcs-js-client';
import { DOCUMENT_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { HxpPendingDocumentService, Permissions } from '@hxp/shared-hxp/services';

@Injectable()
export class PendingDocumentService extends HxpPendingDocumentService {
    private readonly documentApi: DocumentApi = inject(DOCUMENT_API_TOKEN);

    async restorePermissions(documentId: string, originalPermissions: Permissions): Promise<Document> {
        const response = await this.documentApi.updateDocumentById(
            documentId,
            undefined,
            { sys_acl: originalPermissions }
        );
        return response.data;
    }

    async deleteDocument(documentId: string): Promise<void> {
        await this.documentApi.deleteDocumentById(documentId);
    }
}

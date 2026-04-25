/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    ActionContext,
    DocumentActionService,
    DocumentPermissions,
    FileDownloadService,
    hasPermission,
    IsSingleDocumentWithMainBlobService,
} from '@alfresco/adf-hx-content-services/services';
import { inject, Injectable } from '@angular/core';

@Injectable()
export class SingleItemDownloadButtonActionService extends DocumentActionService {
    private readonly fileDownloadService = inject(FileDownloadService);
    private readonly isSingleDocumentWithMainBlobService = inject(IsSingleDocumentWithMainBlobService);

    isAvailable(context: ActionContext): boolean {
        return (
            context?.documents &&
            this.isSingleDocumentWithMainBlobService.validate(context.documents) &&
            hasPermission(context.documents?.[0], DocumentPermissions.READ)
        );
    }

    execute(context: ActionContext): void {
        if (context?.documents[0]) {
            this.fileDownloadService.downloadFile(context?.documents);
        }
    }
}

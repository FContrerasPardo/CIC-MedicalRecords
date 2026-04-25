/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import {
    ActionContext,
    DocumentActionService,
    DocumentPermissions,
    DocumentService,
    hasPermission,
    HxpNotificationService,
    isVersionable,
} from '@alfresco/adf-hx-content-services/services';
import { from } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CreateDocumentVersionActionService extends DocumentActionService {
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly documentService = inject(DocumentService);

    isAvailable(context: ActionContext): boolean {
        if (context?.documents?.length !== 1) {
            return false;
        }

        const document: Document = context.documents[0];
        return (
            isVersionable(document) &&
            !document.sysver_isCheckedIn &&
            !document.sysver_isVersion &&
            hasPermission(document, DocumentPermissions.WRITE) &&
            hasPermission(document, DocumentPermissions.CREATE_VERSION)
        );
    }

    execute(context: ActionContext): void {
        const document = context.documents[0];
        from(this.documentService.createDocumentVersion(document.sys_id)).subscribe({
            next: () => this.hxpNotificationService.showSuccess('DOCUMENT_VERSION.SNACKBAR.CREATE_SUCCESS'),
            error: () => this.hxpNotificationService.showError('DOCUMENT_VERSION.SNACKBAR.CREATE_ERROR'),
        });
    }
}

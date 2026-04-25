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
    DocumentService,
    hasPermission,
    HxpNotificationService,
    isVersion,
} from '@alfresco/adf-hx-content-services/services';
import { inject, Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class VersionRestoreActionService extends DocumentActionService {
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly documentService = inject(DocumentService);

    isAvailable(context: ActionContext): boolean {
        return (
            !!context.documents &&
            isVersion(context.documents[0]) &&
            hasPermission(context.documents[0], DocumentPermissions.READ) &&
            !!context.parentDocument &&
            hasPermission(context.parentDocument, DocumentPermissions.WRITE)
        );
    }

    execute(context: ActionContext): void {
        const document = context.documents[0];

        if (!document?.sys_id) {
            this.hxpNotificationService.showError('DOCUMENT_VERSION.SNACKBAR.RESTORE_ERROR');
            return;
        }
        this.documentService.restoreVersion(document.sys_id).subscribe({
            next: () => {
                this.documentService.requestReload();
                this.hxpNotificationService.showSuccess('DOCUMENT_VERSION.SNACKBAR.RESTORE_SUCCESS');
            },
            error: () => this.hxpNotificationService.showError('DOCUMENT_VERSION.SNACKBAR.RESTORE_ERROR'),
        });
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ActionContext, DocumentActionService, DocumentPermissions, hasPermission, isVersion } from '@alfresco/adf-hx-content-services/services';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VersionDeleteConfirmationDialogComponent } from '../version-delete-confirmation-dialog/version-delete-confirmation-dialog.component';
import { VersionDeleteDialogData } from '../configs/version-delete-dialog.interface';

@Injectable()
export class VersionDeleteButtonActionService extends DocumentActionService {
    private readonly dialog = inject(MatDialog);

    isAvailable(context: ActionContext): boolean {
        return (
            !!context.documents &&
            context.documents.length === 1 &&
            isVersion(context.documents[0]) &&
            hasPermission(context.documents[0], DocumentPermissions.DELETE) &&
            !!context.parentDocument &&
            hasPermission(context.parentDocument, DocumentPermissions.DELETE_CHILD)
        );
    }

    execute(context: ActionContext): void {
        const document = context.documents[0];

        this.dialog.open<VersionDeleteConfirmationDialogComponent, VersionDeleteDialogData>(VersionDeleteConfirmationDialogComponent, {
            data: {
                version: document,
                shouldRedirect: context.shouldRedirect || false,
                parentId: document.sys_parentId || '',
            },
        });
    }
}

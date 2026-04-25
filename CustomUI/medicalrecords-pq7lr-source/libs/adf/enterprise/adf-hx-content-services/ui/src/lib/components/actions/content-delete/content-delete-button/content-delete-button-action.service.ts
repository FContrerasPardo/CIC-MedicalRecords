/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
    hasPermission,
    ActionContext,
    DocumentActionService,
    DocumentPermissions,
    isVersion,
    getRetentionStatus,
    BLOCK_DELETE_STATUSES,
} from '@alfresco/adf-hx-content-services/services';
import { ContentDeleteConfirmationDialogComponent } from '../content-delete-confirmation-dialog/content-delete-confirmation-dialog.component';
import { ContentDeleteDialogData } from '../configs/delete-dialog.interface';

@Injectable()
export class DeleteButtonActionService extends DocumentActionService {
    private readonly dialog = inject(MatDialog);

    isAvailable(context: ActionContext): boolean {
        const docs = context.documents ?? [];
        const parent = context.parentDocument;

        if (!parent || docs.length === 0) {
            return false;
        }

        const hasRequiredPermissions =
            docs.every((doc) => hasPermission(doc, DocumentPermissions.DELETE)) && hasPermission(parent, DocumentPermissions.DELETE_CHILD);

        const isAnyRetainedOrHold = docs.some((doc) => {
            const status = getRetentionStatus(doc);
            return status && BLOCK_DELETE_STATUSES.includes(status);
        });

        const isAnyVersion = isVersion(docs[0]);

        return hasRequiredPermissions && !isAnyRetainedOrHold && !isAnyVersion;
    }

    execute(context: ActionContext): void {
        if (this.canOpenConfirmationDialog(context)) {
            this.dialog.open<ContentDeleteConfirmationDialogComponent, ContentDeleteDialogData>(ContentDeleteConfirmationDialogComponent, {
                data: {
                    documents: context.documents,
                    shouldRedirect: context.shouldRedirect || false,
                    refererURL: context.refererURL || '',
                },
            });
        }
    }

    private canOpenConfirmationDialog(context: ActionContext): boolean {
        return context.documents?.length > 0;
    }
}

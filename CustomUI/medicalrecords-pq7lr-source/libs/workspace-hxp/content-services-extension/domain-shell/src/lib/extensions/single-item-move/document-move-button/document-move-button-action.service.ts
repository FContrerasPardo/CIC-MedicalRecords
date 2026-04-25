/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { hasPermission, ActionContext, DocumentActionService, DocumentPermissions, isVersion } from '@alfresco/adf-hx-content-services/services';
import { DocumentMoveDialogComponent, MoveDialogData } from '../document-move-dialog/document-move-dialog.component';
import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { DialogConfig } from '@alfresco/adf-hx-content-services/ui';

@Injectable()
export class DocumentMoveButtonActionService extends DocumentActionService {
    private readonly dialog = inject(MatDialog);

    public isAvailable(context: ActionContext): boolean {
        return (
            !!context.parentDocument &&
            context.documents?.length > 0 &&
            hasPermission(context.documents[0], DocumentPermissions.DELETE) &&
            hasPermission(context.parentDocument, DocumentPermissions.DELETE_CHILD) &&
            !isVersion(context.documents[0])
        );
    }

    public execute(context: ActionContext): void {
        if (context.documents.length > 0) {
            this.dialog.open<DocumentMoveDialogComponent, MoveDialogData>(DocumentMoveDialogComponent, {
                width: DialogConfig.small.width,
                height: DialogConfig.small.height,
                data: {
                    parentDocument: context.parentDocument || ROOT_DOCUMENT,
                    documentToMove: context.documents[0],
                    shouldRefresh: true,
                },
            });
        }
    }
}

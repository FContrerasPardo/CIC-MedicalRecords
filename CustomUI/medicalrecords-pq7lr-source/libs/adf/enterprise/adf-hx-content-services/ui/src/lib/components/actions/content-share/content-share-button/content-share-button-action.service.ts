/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { hasPermission, ActionContext, DocumentActionService, DocumentPermissions } from '@alfresco/adf-hx-content-services/services';
import { MatDialog } from '@angular/material/dialog';
import { ContentShareDialogComponent } from '../content-share-dialog/content-share-dialog.component';

@Injectable()
export class ContentShareButtonActionService extends DocumentActionService {
    private readonly dialog = inject(MatDialog);

    isAvailable(context: ActionContext): boolean {
        return context.documents?.length === 1 && hasPermission(context.documents[0], DocumentPermissions.READ);
    }

    execute(context: ActionContext): void {
        const DIALOG_MIN_WIDTH = '750px';
        if (context.documents?.[0]?.sys_id) {
            this.dialog.open(ContentShareDialogComponent, {
                width: DIALOG_MIN_WIDTH,
                data: { sharedDocument: context.documents[0] },
            });
        }
    }
}

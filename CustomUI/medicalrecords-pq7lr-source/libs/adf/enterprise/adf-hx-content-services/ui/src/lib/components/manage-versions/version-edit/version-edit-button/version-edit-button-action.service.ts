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
    hasPermission,
    isVersion,
    VersionableDocument,
} from '@alfresco/adf-hx-content-services/services';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { VersionEditDialogComponent } from '../version-edit-dialog/version-edit-dialog.component';
import { DialogConfig } from '../../../../util/dialog/config';

@Injectable()
export class VersionEditButtonActionService extends DocumentActionService {
    private readonly dialog = inject(MatDialog);

    isAvailable(context: ActionContext): boolean {
        return (
            !!context.documents &&
            context.documents.length === 1 &&
            hasPermission(context.documents[0], DocumentPermissions.WRITE) &&
            hasPermission(context.documents[0], DocumentPermissions.WRITE_VERSION) &&
            isVersion(context.documents[0])
        );
    }

    execute(context: ActionContext): void {
        const document = context.documents[0];

        this.dialog.open<VersionEditDialogComponent, VersionableDocument>(VersionEditDialogComponent, {
            width: DialogConfig.small.width,
            data: document,
        });
    }
}

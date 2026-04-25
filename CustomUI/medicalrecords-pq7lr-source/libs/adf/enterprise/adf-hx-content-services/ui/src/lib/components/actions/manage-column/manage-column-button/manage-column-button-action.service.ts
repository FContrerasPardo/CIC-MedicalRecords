/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActionContext, DocumentActionService } from '@alfresco/adf-hx-content-services/services';
import { ManageColumnDialogComponent } from '../manage-column-dialog/manage-column-dialog.component';
import { DialogConfig } from '../../../../util/dialog/config';

@Injectable()
export class ManageColumnActionService extends DocumentActionService {
    private readonly dialog = inject(MatDialog);

    public isAvailable(context: ActionContext): boolean {
        return /search/i.test(context.refererURL || '');
    }

    public execute(context: ActionContext): void {
        this.dialog.open<ManageColumnDialogComponent, any>(ManageColumnDialogComponent, {
            width: DialogConfig.medium.width,
            height: DialogConfig.medium.height,
            minWidth: DialogConfig.medium.width,
            minHeight: DialogConfig.medium.height,
            data: context,
        });
    }
}

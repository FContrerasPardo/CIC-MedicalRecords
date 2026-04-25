/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { ActionContext, GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { RecordDeleteConfirmationComponent } from '../../dialogs/record-delete-confirmation/record-delete-confirmation.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfig } from '@alfresco/adf-hx-content-services/ui';
import { BLOCK_DELETE_STATUSES, RecordStatusType } from '@alfresco/adf-hx-content-services/services';

@Injectable({
    providedIn: 'root',
})
export class RecordDeleteButtonService {
    private dialog = inject(MatDialog);

    isAvailable(records: GovernanceRecord[]): boolean {
        return records.length > 0 && records.every((record) => !BLOCK_DELETE_STATUSES.includes(record.status as RecordStatusType));
    }

    execute(context: ActionContext): void {
        this.dialog.open(RecordDeleteConfirmationComponent, {
            width: DialogConfig.small.width,
            data: context,
        });
    }
}

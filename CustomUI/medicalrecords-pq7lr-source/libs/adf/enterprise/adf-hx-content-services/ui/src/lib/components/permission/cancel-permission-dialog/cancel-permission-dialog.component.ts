/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PermissionsPanelRequestService } from '@alfresco/adf-hx-content-services/services';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';

export interface DismissPermissionDialogData<T = any> {
    dialogTitle: string;
    dialogDescription: string;
    dialogRejectButton: string;
    dialogConfirmButton: string;
    permissionDialogRef?: MatDialogRef<T>;
}

export abstract class DismissPermission {
    protected abstract close(isEdited: boolean): void;
    protected abstract cancel(isEdited: boolean): void;
}

@Component({
    templateUrl: './cancel-permission-dialog.component.html',
    styleUrls: [],
    encapsulation: ViewEncapsulation.None,
    imports: [MatDialogModule, MatButtonModule, MatRadioModule, FormsModule, TranslatePipe],
})
export class CancelPermissionDialogComponent {

    private readonly dialogRef = inject<MatDialogRef<CancelPermissionDialogComponent>>(MatDialogRef);
    public readonly dialogData = inject<DismissPermissionDialogData>(MAT_DIALOG_DATA);
    private readonly permissionsPanelRequestService = inject(PermissionsPanelRequestService);

    reject() {
        this.dialogRef.close();
    }

    confirm() {
        this.dialogRef.close();
        if (this.dialogData?.permissionDialogRef) {
            this.dialogData.permissionDialogRef.close();
        } else {
            this.permissionsPanelRequestService.requestClosePanel();
        }
    }
}

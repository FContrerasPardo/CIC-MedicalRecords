/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DismissPermissionDialogData } from './cancel-permission-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    templateUrl: './close-permission-dialog.component.html',
    styleUrls: [],
    encapsulation: ViewEncapsulation.None,
    imports: [MatDialogModule, MatButtonModule, TranslatePipe],
})
export class ClosePermissionDialogComponent {
    private readonly dialogRef = inject<MatDialogRef<ClosePermissionDialogComponent>>(MatDialogRef);
    public readonly dialogData = inject<DismissPermissionDialogData>(MAT_DIALOG_DATA);

    reject() {
        this.closeDialog();
    }

    confirm() {
        this.closeDialog(true);
    }

    private closeDialog(save: boolean = false) {
        this.dialogRef.close({ save });
    }
}

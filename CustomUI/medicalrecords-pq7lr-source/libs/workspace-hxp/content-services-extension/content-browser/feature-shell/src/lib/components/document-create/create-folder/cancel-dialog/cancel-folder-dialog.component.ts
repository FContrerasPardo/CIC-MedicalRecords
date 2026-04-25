/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { HxPCreateFolderDialogComponent } from '../folder-create-dialog/folder-create-dialog.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'hxp-cancel-folder-dialog',
    templateUrl: './cancel-folder-dialog.component.html',
    styleUrls: [],
    imports: [TranslatePipe, MatDialogModule, MatButtonModule],
})
export class CancelFolderDialogComponent {
    public readonly dialogRef = inject(MatDialogRef<CancelFolderDialogComponent>);
    public readonly createDialogRef = inject<MatDialogRef<HxPCreateFolderDialogComponent>>(MAT_DIALOG_DATA);

    confirm() {
        this.dialogRef.close();
        this.createDialogRef.close();
    }

    reject() {
        this.dialogRef.close();
    }
}

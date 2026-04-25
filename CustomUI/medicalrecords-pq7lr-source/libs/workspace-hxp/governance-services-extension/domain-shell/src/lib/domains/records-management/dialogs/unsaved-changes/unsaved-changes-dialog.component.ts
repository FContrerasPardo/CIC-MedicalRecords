/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-unsaved-changes-dialog',
    templateUrl: './unsaved-changes-dialog.component.html',
    styleUrl: '../../../../shared/dialogs/governance-dialogs.shared.scss',
    imports: [MatDialogModule, MatButtonModule, TranslatePipe],
})
export class UnsavedChangesDialogComponent {
    data = inject<{ message: string }>(MAT_DIALOG_DATA);
    private dialogRef = inject(MatDialogRef<UnsavedChangesDialogComponent>);

    close(discard: boolean): void {
        this.dialogRef.close(discard);
    }
}

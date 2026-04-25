/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmDialogSettings {
    title: string;
    message: string;
    action: string;
}

@Component({
    imports: [MatDialogModule, MatButtonModule, TranslatePipe],
    selector: 'apa-confirmation-dialog',
    templateUrl: './confirmation-dialog.component.html',
})
export class ConfirmationDialogComponent {
    public readonly dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);
    public readonly data = inject<ConfirmDialogSettings>(MAT_DIALOG_DATA);
}

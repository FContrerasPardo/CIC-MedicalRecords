/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

export const ConfirmButtonModifier = {
    Primary: 'primary',
    Warn: 'warn',
} as const;
export type ConfirmButtonModifier = typeof ConfirmButtonModifier[keyof typeof ConfirmButtonModifier];
export interface IdpConfirmationDialogData {
    dialogHeader: string;
    confirmLabel: string;
    confirmButtonModifier?: ConfirmButtonModifier;
    cancelLabel: string;
    content: string;
}

@Component({
    templateUrl: './confirmation.dialog.html',
    styleUrls: ['./confirmation.dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatButtonModule, MatDialogModule, TranslatePipe],
})
export class ConfirmationDialogComponent {
    confirmButtonModifier: ConfirmButtonModifier = ConfirmButtonModifier.Primary;

    readonly data: IdpConfirmationDialogData = inject(MAT_DIALOG_DATA);

    constructor() {
        if (this.data.confirmButtonModifier) {
            this.confirmButtonModifier = this.data.confirmButtonModifier;
        }
    }
}

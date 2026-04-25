/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';

@Component({
    templateUrl: './discard-changes-dialog.html',
    styleUrls: ['./discard-changes-dialog.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [MatDialogModule, MatIconModule, MatButtonModule, TranslatePipe],
})
export class DiscardChangesDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<DiscardChangesDialogComponent>);

    protected onDiscard() {
        this.dialogRef.close(true);
    }

    static open(dialog: MatDialog, onDiscardCallback?: () => void): MatDialogRef<DiscardChangesDialogComponent> {
        const ref = dialog.open(DiscardChangesDialogComponent, {
            width: '600px',
            height: 'auto',
            autoFocus: '[data-automation-id="idp-discard-dialog__cancel-button"]',
            restoreFocus: true,
        });
        if (onDiscardCallback) {
            ref.afterClosed()
                .pipe(filter((discard) => discard === true))
                .subscribe(() => onDiscardCallback());
        }

        return ref;
    }
}

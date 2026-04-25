/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-cancel-metadata-sidebar-edit-dialog',
    imports: [CommonModule, MatDialogModule, MatButtonModule, TranslatePipe],
    templateUrl: './hxp-cancel-metadata-sidebar-edit-dialog.component.html',
})
export class HxpCancelMetadataSidebarEditDialogComponent {
    discardChanges = output<void>();
    saveChanges = output<void>();

    private readonly dialogRef = inject(MatDialogRef<HxpCancelMetadataSidebarEditDialogComponent>);

    protected onDiscardChanges() {
        this.dialogRef.close();
        this.discardChanges.emit();
    }

    protected onSaveAndExit() {
        this.dialogRef.close();
        this.saveChanges.emit();
    }
}

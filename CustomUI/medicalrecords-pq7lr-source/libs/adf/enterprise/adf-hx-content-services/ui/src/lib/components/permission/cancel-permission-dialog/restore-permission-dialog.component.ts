/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { UserType } from '@alfresco/adf-hx-content-services/services';

@Component({
    selector: 'hxp-restore-permission-dialog',
    templateUrl: './restore-dialog.component.html',
    styleUrls: [],
    encapsulation: ViewEncapsulation.None,
    imports: [MatDialogModule, MatButtonModule, MatRadioModule, FormsModule, TranslatePipe],
})
export class RestorePermissionDialogComponent {
    restoreOption: UserType = UserType.ALL;
    private readonly dialogRef = inject<MatDialogRef<RestorePermissionDialogComponent>>(MatDialogRef);

    reject() {
        this.dialogRef.close();
    }

    confirm() {
        this.dialogRef.close({ restore: true, option: this.restoreOption });
    }
}

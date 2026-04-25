/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'aps-waiting-screen-dialog',
    imports: [MatProgressSpinner, TranslatePipe, MatDialogModule, MatButtonModule],
    templateUrl: './waiting-screen-dialog.component.html',
    styleUrl: './waiting-screen-dialog.component.scss',
})
export class WaitingScreenDialogComponent {
    public readonly dialogRef = inject<MatDialogRef<WaitingScreenDialogComponent>>(MatDialogRef);
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ReasoningDialogData } from '../../models/contracts/class-verification-models';

@Component({
    templateUrl: './reasoning.dialog.html',
    styleUrls: ['./reasoning.dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatDialogModule, MatIconModule, MatTooltipModule, TranslatePipe],
})
export class ReasoningDialogComponent {
    readonly data: ReasoningDialogData = inject(MAT_DIALOG_DATA);

    toggleHelpTooltip(tooltip: MatTooltip): void {
        tooltip.toggle();
    }
}

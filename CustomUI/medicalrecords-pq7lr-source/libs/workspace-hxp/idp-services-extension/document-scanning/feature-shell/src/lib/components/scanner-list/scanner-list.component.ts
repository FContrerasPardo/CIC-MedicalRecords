/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslatePipe } from '@ngx-translate/core';
import { ScannerDetails } from '../../models/scanning-models';
import { MatIconModule } from '@angular/material/icon';
import { SatStatusTagComponent } from '@hylandsoftware/satori-ui';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScanningHubState } from '../../services/scanning-hub-client.service';

@Component({
    selector: 'hyland-idp-scanner-list',
    templateUrl: './scanner-list.component.html',
    styleUrls: ['./scanner-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatSelectModule,
        MatFormFieldModule,
        MatIconModule,
        TranslatePipe,
        MatProgressSpinner,
        SatStatusTagComponent,
        MatTooltipModule,
    ],
})
export class ScannerListComponent {
    readonly scanners = input<ScannerDetails[]>([]);
    readonly scanClientState = input<ScanningHubState>();
    readonly scanClientErrorMessage = computed(() => {
        const state = this.scanClientState();
        if (state?.status === 'failed') {
            return state.error instanceof Error ? state.error.message : String(state.error);
        }
        return undefined;
    });
    readonly selectedScanner = model<ScannerDetails>();

    compareScanners(a?: ScannerDetails, b?: ScannerDetails) {
        return a?.name === b?.name && a?.protocol === b?.protocol;
    }
}

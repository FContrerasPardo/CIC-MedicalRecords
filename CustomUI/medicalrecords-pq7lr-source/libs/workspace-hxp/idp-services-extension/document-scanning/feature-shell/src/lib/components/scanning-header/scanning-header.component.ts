/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ScannerListComponent } from '../scanner-list/scanner-list.component';
import { SatAppHeaderModule } from '@hylandsoftware/satori-ui';
import { ScanningSession } from '../../services/scanning-session.service';

@Component({
    selector: 'hyland-idp-scanning-header',
    templateUrl: './scanning-header.component.html',
    styleUrls: ['./scanning-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatButtonModule, MatIconModule, SatAppHeaderModule, ScannerListComponent, TranslatePipe],
})
export class ScanningHeaderComponent {
    readonly scanSession = inject(ScanningSession);
}

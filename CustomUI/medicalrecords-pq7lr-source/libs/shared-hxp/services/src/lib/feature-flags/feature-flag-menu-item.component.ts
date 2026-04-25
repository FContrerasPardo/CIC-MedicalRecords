/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, ViewEncapsulation } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FlagsComponent, FlagsOverrideComponent, FlagsOverrideToken } from '@alfresco/adf-core/feature-flags';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

@Component({
    imports: [TranslatePipe, MatIconModule, MatButtonModule, MatMenuModule, FlagsOverrideComponent],

    selector: 'app-feature-flags-menu-item',
    template: `
        @if (isVisible) {
            <button mat-menu-item data-automation-id="features" class="features-button" (click)="openFeatureFlags()">
                <mat-icon svgIcon="settings" />
                {{ 'FEATURE-FLAGS.MENU-ITEM' | translate }}
                <adf-feature-flags-override-indicator size="small" />
            </button>
        }
    `,
    styles: [
        `
            .features-button .activity-indicator {
                margin: 0 5px;
            }
            .override-features-dialog mat-dialog-container {
                padding: 0;
                overflow: auto;
                position: relative;
            }
        `,
    ],
    encapsulation: ViewEncapsulation.None,
})
export class FeatureFlagsMenuItemComponent {
    isVisible = inject(FlagsOverrideToken, { optional: true }) || false;

    private readonly dialog = inject(MatDialog);

    openFeatureFlags() {
        this.dialog.open(FlagsComponent, { width: '700px', height: '500px', panelClass: 'override-features-dialog' });
    }
}

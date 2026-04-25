/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SatHMarkLogoComponent } from '@hylandsoftware/satori-ui/logo';
import { TranslatePipe } from '@ngx-translate/core';

export type BannerVariant = 'promote' | 'navigate-back';

@Component({
    selector: 'hxp-new-ui-banner',
    templateUrl: './new-ui-banner.component.html',
    styleUrls: ['./new-ui-banner.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule, SatHMarkLogoComponent, TranslatePipe],
})
export class NewUiBannerComponent {
    readonly variant = input<BannerVariant>('promote');

    tryNewUi = output<void>();
    closeBanner = output<void>();

    onTryNewUi(): void {
        this.tryNewUi.emit();
    }

    onClose(): void {
        this.closeBanner.emit();
    }
}

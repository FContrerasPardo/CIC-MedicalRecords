/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { TranslatePipe } from '@ngx-translate/core';
import { HEADER_CONFIG_TOKEN } from '../../tokens/header-config.token';

@Component({
    selector: 'hxp-help-action',
    imports: [CommonModule, MatMenuModule, MatIconModule, SatIconModule, TranslatePipe],
    templateUrl: './help-action.component.html',
})
export class HelpActionComponent {
    public readonly headerConfig = inject(HEADER_CONFIG_TOKEN);
}

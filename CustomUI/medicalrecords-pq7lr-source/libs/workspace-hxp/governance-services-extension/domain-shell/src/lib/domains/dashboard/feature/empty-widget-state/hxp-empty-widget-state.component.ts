/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'hxp-empty-widget-state',
    imports: [MatIconModule],
    templateUrl: './hxp-empty-widget-state.component.html',
    styleUrl: './hxp-empty-widget-state.component.scss',
})
export class HxpEmptyWidgetStateComponent {
    message = input.required<string>();
}

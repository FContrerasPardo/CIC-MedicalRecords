/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarRow, MatToolbar } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-action-toolbar',
    imports: [CommonModule, MatIconModule, MatToolbarRow, MatToolbar, MatButtonModule, MatDividerModule, TranslatePipe],
    templateUrl: './action-toolbar.component.html',
    styleUrl: './action-toolbar.component.scss',
})
export class ActionToolbarComponent {
    @Input() selectedCount = 0;
    @Input() hasSelection = false;
    @Input() clearAll!: () => void;
    @Input() showDivider = true;
    @Input() clearAllLabel = 'GOVERNANCE.SHARED.CLEAR_ALL';
}

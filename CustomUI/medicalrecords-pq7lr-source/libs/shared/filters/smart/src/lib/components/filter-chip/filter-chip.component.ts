/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'hxp-filter-chip',
    templateUrl: './filter-chip.component.html',
    styleUrls: ['./filter-chip.component.scss'],
    imports: [CommonModule, MatChipsModule, MatIconModule, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterChipComponent {
    @Input() labelTranslationKey = '';
    @Input() suffix: string | null = null;
    @Input() chipCount: number | null = null;
    @Input() removable = true;

    @Output() chipClick = new EventEmitter<void>();
    @Output() removeIconClick = new EventEmitter<void>();
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { RadioFilter, Option } from '@alfresco-dbp/shared-filters-services';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilterComponent } from '../filter.component';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { FilterChipComponent } from '../../filter-chip/filter-chip.component';
import { RadioFilterMenuComponent } from './radio-filter-menu/radio-filter-menu.component';
import { FilterMenuOverlayDirective } from '../../filter-menu/filter-menu-overlay.directive';

@Component({
    selector: 'hxp-radio-filter',
    templateUrl: './radio-filter.component.html',
    imports: [CommonModule, OverlayModule, FilterMenuOverlayDirective, FilterChipComponent, RadioFilterMenuComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioFilterComponent extends FilterComponent<RadioFilter> {
    onUpdate(option: Option | null): void {
        if (this.filter) {
            this.filter.value = option;
            this.filterChange.emit(this.filter);
            this.isMenuOpen = false;
        }
    }
}

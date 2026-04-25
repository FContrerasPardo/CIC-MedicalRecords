/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { StringFilter } from '@alfresco-dbp/shared-filters-services';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FilterComponent } from '../filter.component';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { FilterChipComponent } from '../../filter-chip/filter-chip.component';
import { StringFilterMenuComponent } from './string-filter-menu/string-filter-menu.component';
import { FilterMenuOverlayDirective } from '../../filter-menu/filter-menu-overlay.directive';

@Component({
    selector: 'hxp-string-filter',
    templateUrl: './string-filter.component.html',
    imports: [CommonModule, FilterMenuOverlayDirective, OverlayModule, FilterChipComponent, StringFilterMenuComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StringFilterComponent extends FilterComponent<StringFilter> implements OnInit {
    labelSuffix = '';
    filterMenuInputValue = '';

    ngOnInit(): void {
        if (this.filter?.value?.length) {
            this.onUpdate(this.filter.value.join(' '));
        }
    }

    override onFilterInputChange(): void {
        this.updateDisplayState();
    }

    private updateDisplayState(): void {
        this.labelSuffix = this.filter?.value ? this.filter.value.join(' ') : '';
        this.filterMenuInputValue = this.filter?.value?.join(' ') || '';
    }

    onUpdate(value: string | null): void {
        const values = value?.split(' ').map((v) => v.trim()) || [];

        if (this.filter) {
            this.filter.value = values?.length ? values : null;
            this.filterChange.emit(this.filter);
            this.isMenuOpen = false;
        }

        this.updateDisplayState();
    }
}

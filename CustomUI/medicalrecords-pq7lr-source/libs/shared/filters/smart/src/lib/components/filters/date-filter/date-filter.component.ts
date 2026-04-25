/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateFilter, DateFilterValue, RANGE_DATE_OPTION } from '@alfresco-dbp/shared-filters-services';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FilterComponent } from '../filter.component';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { FilterChipComponent } from '../../filter-chip/filter-chip.component';
import { DateFilterMenuComponent } from './date-filter-menu/date-filter-menu.component';
import { TranslateService } from '@ngx-translate/core';
import { FilterMenuOverlayDirective } from '../../filter-menu/filter-menu-overlay.directive';
import { UserPreferencesService } from '@alfresco/adf-core';

@Component({
    selector: 'hxp-date-filter',
    templateUrl: './date-filter.component.html',
    imports: [CommonModule, FilterMenuOverlayDirective, OverlayModule, FilterChipComponent, DateFilterMenuComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateFilterComponent extends FilterComponent<DateFilter> {
    private readonly translateService = inject(TranslateService);
    private readonly userPreferencesService = inject(UserPreferencesService);

    labelSuffix = '';
    locale = 'en';

    constructor() {
        super();
        effect(() => {
            this.updateLocale();
        });
    }

    override onFilterInputChange(): void {
        this.updateSuffix();
    }

    onUpdate(newValue: DateFilterValue | null): void {
        if (!this.filter) {
            return;
        }

        if (!this.filter.allowEmpty && !newValue) {
            this.isMenuOpen = false;
            return;
        }

        this.filter.value = !newValue?.range && !newValue?.selectedOption ? null : newValue;

        this.updateSuffix();
        this.filterChange.emit(this.filter);
        this.isMenuOpen = false;
    }

    private updateSuffix(): void {
        if (!this.filter) {
            return;
        }

        if (this.filter.value?.selectedOption?.value === RANGE_DATE_OPTION.value) {
            const fromLocaleString = this.formatDate(this.filter.value.range?.from);
            const toLocaleString = this.formatDate(this.filter.value.range?.to);

            if (fromLocaleString && toLocaleString) {
                this.labelSuffix = `${fromLocaleString} - ${toLocaleString}`;
            } else if (fromLocaleString) {
                this.labelSuffix = this.translateService.instant('FILTERS.DATE_FILTER.FROM_DATE', { date: fromLocaleString });
            } else if (toLocaleString) {
                this.labelSuffix = this.translateService.instant('FILTERS.DATE_FILTER.TO_DATE', { date: toLocaleString });
            }
        } else {
            this.labelSuffix = this.filter.value?.selectedOption ? this.filter.value.selectedOption.label : '';
        }
    }

    private formatDate(date: Date | undefined): string {
        if (!date) {
            return '';
        }

        if (this.filter.useTime) {
            return date.toLocaleString(this.locale);
        }

        return date.toLocaleDateString(this.locale);
    }

    updateLocale(): void {
        this.locale = this.userPreferencesService.localeSignal() || 'en';
        this.updateSuffix();
    }
}

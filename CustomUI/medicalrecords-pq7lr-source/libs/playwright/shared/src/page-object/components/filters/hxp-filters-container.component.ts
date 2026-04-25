/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '..';
import {
    HxpCheckboxFilterMenuComponent,
    HxpDateFilterMenuComponent,
    HxpMoreFiltersComponent,
    HxpNumberFilterMenuComponent,
    HxpStringFilterMenuComponent,
    HxpUserFilterMenuComponent,
    HxpRadioFilterMenuComponent,
} from '.';

export interface IFilterOptions {
    filterName: string;
    operator?: string;
    value?: string;
    predefinedDateOption?: string;
    customStartDate?: string;
    customEndDate?: string;
    datetimeCustomValue?: {
        dateTimeFrom: IDatetimeFilterValues;
        dateTimeTo: IDatetimeFilterValues;
    };
}

export type FilterType = 'string' | 'checkbox' | 'number' | 'radio' | 'user' | 'date' | 'datetime';

export interface IDatetimeFilterValues {
    date: Date;
    formattedHour: string;
    formattedMinutes: string;
}

export class HxpFiltersContainerComponent extends BaseComponent {
    static rootElement = 'hxp-filters-container';

    moreFiltersComponent = new HxpMoreFiltersComponent(this.page);
    checkboxFilterMenuComponent = new HxpCheckboxFilterMenuComponent(this.page);
    dateFilterMenuComponent = new HxpDateFilterMenuComponent(this.page);
    stringFilterMenuComponent = new HxpStringFilterMenuComponent(this.page);
    userFilterMenuComponent = new HxpUserFilterMenuComponent(this.page);
    numberFilterMenuComponent = new HxpNumberFilterMenuComponent(this.page);
    radioFilterMenuComponent = new HxpRadioFilterMenuComponent(this.page);

    constructor(page: Page) {
        super(page, HxpFiltersContainerComponent.rootElement);
    }

    moreFiltersButton = this.getChild('.hxp-filters-container__more-button');
    filterCheckboxMenu = this.getElementByAutomationId('hxp-checkbox-filter-menu');
    resetFiltersButton = this.getElementByAutomationId('hxp-filters-container-action-FILTERS.RESET');
    filterChips = this.getChild('hxp-filter-chip');
    creationDateFilterChip = this.getElementByAutomationId('creationDate-filter-chip').getByRole('gridcell').first();
    projectNameFilterChip = this.getElementByAutomationId('projectName-filter-chip').getByRole('gridcell').first();
    dateRangeFilterChip = this.getElementByAutomationId('dateRange-filter-chip').getByRole('gridcell').first();
    getFilterChipLabel = (filterName: string) => this.getChild('.hxp-filter-chip', { hasText: filterName }).locator('.hxp-filter-chip__label');
    getFilterValueByFilterName = (filterName: string) =>
        this.getChild('.hxp-filter-chip', { hasText: filterName }).locator('.hxp-filter-chip__label-suffix span');
    dateRangeFilterValue = this.getElementByAutomationId('dateRange-filter-chip').locator('[data-automation-id="hxp-filter-chip-label-suffix"] span');
    getFilterRemoveIconByFilterName = (filterName: string) =>
        this.getChild(`[data-automation-id="hxp-filter-chip"]:has-text("${filterName}") .hxp-filter-chip__remove-icon`);

    async enableFilter(filterName: string): Promise<void> {
        await this.moreFiltersButton.click();
        await this.moreFiltersComponent.selectFilterName(filterName);
    }

    async performSearch(type: FilterType, filterOptions: IFilterOptions): Promise<void> {
        if (!(await this.getFilterChipLabel(filterOptions.filterName).isVisible())) {
            await this.enableFilter(filterOptions.filterName);
        }

        await this.getFilterChipLabel(filterOptions.filterName).click();

        switch (type) {
            case 'string': {
                await this.stringFilterMenuComponent.provideTestFilterValue(filterOptions.value);
                break;
            }
            case 'checkbox': {
                await this.checkboxFilterMenuComponent.selectSingleFilterValue(filterOptions.value);
                break;
            }
            case 'date': {
                if (filterOptions.predefinedDateOption) {
                    await this.dateFilterMenuComponent.selectPredefinedDateOption(filterOptions.predefinedDateOption);
                }
                if (filterOptions.customStartDate && filterOptions.customEndDate) {
                    await this.dateFilterMenuComponent.provideCustomDateRange(filterOptions.customStartDate, filterOptions.customEndDate);
                }
                break;
            }
            case 'datetime': {
                await this.dateFilterMenuComponent.provideCustomDatetimeRange(
                    filterOptions.datetimeCustomValue.dateTimeFrom,
                    filterOptions.datetimeCustomValue.dateTimeTo
                );
                break;
            }
            case 'number': {
                await this.numberFilterMenuComponent.provideNumberValue(filterOptions.operator, filterOptions.value);
                break;
            }
            case 'user': {
                await this.userFilterMenuComponent.provideUserName(filterOptions.value);
                break;
            }
            case 'radio': {
                await this.radioFilterMenuComponent.getRadioFilterOptionLocator(filterOptions.value).click();
                await this.radioFilterMenuComponent.getUpdateFilterButtonLocator.click();
                break;
            }
        }
    }
}

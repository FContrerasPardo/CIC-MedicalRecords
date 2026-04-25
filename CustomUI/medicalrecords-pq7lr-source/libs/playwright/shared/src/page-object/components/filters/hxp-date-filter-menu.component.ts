/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, DateTimePicker, DatePicker } from '..';
import { IDatetimeFilterValues } from '.';
export class HxpDateFilterMenuComponent extends BaseComponent {
    static rootElement = 'hxp-date-filter-menu';

    dateTimePicker = new DateTimePicker(this.page);
    datePicker = new DatePicker(this.page);

    constructor(page: Page) {
        super(page, HxpDateFilterMenuComponent.rootElement);
    }

    getUpdateFilterButtonLocator = this.getElementByAutomationId('hxp-filter-menu-update-button');
    private getDateFilterOptionLocator = (option: string) => this.getElementByAutomationId(`hxp-date-filter-menu-option-${option}`).locator('label');
    private getCustomRangeButtonLocator = this.getElementByAutomationId('hxp-date-filter-menu-custom-range-button');
    private getFromInputLocator = this.getElementByAutomationId('hxp-filter-menu-from-input');
    private getToInputLocator = this.getElementByAutomationId('hxp-filter-menu-to-input');
    private getClearSelectionLocator = this.getElementByAutomationId('hxp-filter-menu-clear-selection-button');
    private getRangeFormLocator = this.getChild('.hxp-date-filter-menu__range-form');
    private getDatepickerLocator = this.getRangeFormLocator.locator('.hxp-date-filter-menu__range-form-field-suffix');

    async provideCustomDateRange(startDate: string, endDate?: string): Promise<void> {
        await this.getRootLocator.waitFor({ state: 'visible' });

        if (await this.getClearSelectionLocator.isEnabled()) {
            await this.getClearSelectionLocator.click();
        }

        if (await this.getCustomRangeButtonLocator.isVisible()) {
            await this.getCustomRangeButtonLocator.click();
        }

        await this.getFromInputLocator.fill(startDate);
        await this.getToInputLocator.fill(endDate);
        await this.getUpdateFilterButtonLocator.click();
    }

    async selectPredefinedDateOption(option: string): Promise<void> {
        await this.getDateFilterOptionLocator(option).click();
        await this.getUpdateFilterButtonLocator.click();
    }

    async provideCustomDatetimeRange(datetimeFrom: IDatetimeFilterValues, datetimeTo: IDatetimeFilterValues): Promise<void> {
        await this.getRootLocator.waitFor({ state: 'visible' });

        if (await this.getCustomRangeButtonLocator.isVisible()) {
            await this.getCustomRangeButtonLocator.click();
        }

        await this.getDatepickerLocator.nth(0).click();
        await this.dateTimePicker.setDateAndTime(datetimeFrom.date, datetimeFrom.formattedHour, datetimeFrom.formattedMinutes);
        await this.getDatepickerLocator.nth(1).click();
        await this.dateTimePicker.setDateAndTime(datetimeTo.date, datetimeTo.formattedHour, datetimeTo.formattedMinutes);
        await this.getUpdateFilterButtonLocator.click();
    }

    async setCustomDateRange(fromDate: Date, toDate: Date, locale?: string): Promise<void> {
        await this.getRootLocator.waitFor({ state: 'visible' });

        if (await this.getCustomRangeButtonLocator.isVisible()) {
            await this.getCustomRangeButtonLocator.click();
        }

        await this.getDatepickerLocator.nth(0).click();
        await this.datePicker.setDate(fromDate, locale);
        await this.getDatepickerLocator.nth(1).click();
        await this.datePicker.setDate(toDate, locale);
    }

    async getDateValue(field: 'from' | 'to'): Promise<string> {
        const locator = field === 'from' ? this.getFromInputLocator : this.getToInputLocator;
        return locator.inputValue();
    }
}

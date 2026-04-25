/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '..';
import { materialLocators } from '.';

export class DatePicker extends BaseComponent {
    constructor(page: Page) {
        super(page, materialLocators.DatePicker.root);
    }

    todayButton = this.getChild(materialLocators.DatePicker.bodyToday);
    monthYearButton = this.getChild('[aria-label="Choose month and year"]');
    getPreviousMonthButton = this.getChild('[aria-label="Previous month"]');
    getNextMonthButton = this.getChild('[aria-label="Next month"]');
    getYearButton = (year: string) => this.getChild(`[aria-label="${year}"]`);
    getMonthButton = (month: string) => this.getButtonByText(month);
    getDayButton = (day: number) => this.getChild(materialLocators.DatePicker.bodyDay).nth(day - 1);
    isDaySelected = (day: string) => this.getChild(materialLocators.DatePicker.selectedDay, { hasText: day });

    async setDate(date: Date, locale?: string): Promise<void> {
        await this.monthYearButton.click();
        await this.setYearMonth(date, locale);
        if (await this.getDayButton(date.getDate()).isVisible()) {
            await this.getDayButton(date.getDate()).click({ force: true });
        }
    }

    private async setYearMonth(date: Date, locale?: string): Promise<void> {
        await this.getYearButton(date.getFullYear().toString()).click();
        await this.getMonthButton(date.toLocaleString(locale ?? 'default', { month: 'short' })).click({ force: true });
    }
}

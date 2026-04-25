/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { HxpSearchFilterBaseComponent } from './hxp-search-filter.base.component';

export class HxpSearchCreatedDateFilterComponent extends HxpSearchFilterBaseComponent {
    static rootElement = '.hxp-created-date-filter-container';

    constructor(page: Page) {
        super(page, HxpSearchCreatedDateFilterComponent.rootElement);
    }

    customDateButton = this.getChild('.hxp-created-date-filter-custom-date-button');

    afterDateToggle = this.getElementByAutomationId('hxp-after-created-date-toggle');
    beforeDateToggle = this.getElementByAutomationId('hxp-before-created-date-toggle');

    afterDatePickerInput = this.getChild('#hxp-after-created-date-picker-input');

    getQuickFilterButton = (option: '7_DAYS' | '30_DAYS' | '6_MONTHS' | 'YEAR') => {
        return this.getChild(`#LAST_${option}`);
    };
}

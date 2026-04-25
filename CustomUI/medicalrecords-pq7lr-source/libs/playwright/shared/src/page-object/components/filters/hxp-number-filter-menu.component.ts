/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, DropdownListComponent, materialLocators } from '..';

export class HxpNumberFilterMenuComponent extends BaseComponent {
    static rootElement = 'hxp-number-filter-menu';
    dropdown = new DropdownListComponent(this.page, materialLocators.Select.panel.class);

    constructor(page: Page) {
        super(page, HxpNumberFilterMenuComponent.rootElement);
    }

    private getOperatorSelectLocator = this.getElementByAutomationId('hxp-number-filter-menu-operator-select');
    private getValueInputLocator = this.getElementByAutomationId('hxp-number-filter-menu-input-single');
    private getUpdateButtonLocator = this.getElementByAutomationId('hxp-filter-menu-update-button');

    async provideNumberValue(operator: string, value: string): Promise<void> {
        await this.getOperatorSelectLocator.click();
        await this.dropdown.getOptionLocator(operator).click();
        await this.getValueInputLocator.fill(value);
        await this.getUpdateButtonLocator.click();
    }
}

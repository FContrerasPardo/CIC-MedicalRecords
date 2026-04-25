/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { DropdownListComponent } from './dropdown-list.component';
import { materialLocators } from '../material';

export class DropdownStandardComponent extends DropdownListComponent {
    constructor(page: Page) {
        super(page, materialLocators.Select.panel.class);
    }

    getAllOptionLocator = this.getChild(materialLocators.Option.root);
    searchOptionLocator = this.getChild('adf-select-filter-input');
    getOptionByValue = (optionValue: string) => this.getChild(materialLocators.Option.root, { hasText: optionValue }).first();
    getOptionByAutomationId = (option: string) => this.getElementByAutomationId(option);
}

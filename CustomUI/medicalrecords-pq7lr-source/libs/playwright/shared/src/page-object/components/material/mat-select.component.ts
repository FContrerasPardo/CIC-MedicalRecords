/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { materialLocators } from '.';

export class MatSelectComponent extends BaseComponent {
    private optionLocator = materialLocators.Option.root;

    constructor(page: Page) {
        super(page, materialLocators.Select.panel.class);
    }

    getOptionByName = (text: string) => this.getChild(this.optionLocator).getByText(text, { exact: true });
}

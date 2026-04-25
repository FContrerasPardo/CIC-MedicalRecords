/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class GenericDialogComponent extends BaseComponent {
    private static rootElement = 'apa-dialog';

    constructor(page: Page) {
        super(page, GenericDialogComponent.rootElement);
    }

    public getOptionButtonLocator = (option: 'No' | 'Yes') => this.getButtonByExactText(option);
}

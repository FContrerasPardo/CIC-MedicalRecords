/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { timeouts } from '../../../utils';
import { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { materialLocators } from '.';

export class SpinnerComponent extends BaseComponent {
    constructor(page: Page, rootElement = materialLocators.ProgressSpinner.root) {
        super(page, rootElement);
    }

    async waitForReload(): Promise<void> {
        try {
            await this.getRootLocator.waitFor({ state: 'attached', timeout: timeouts.short });
            await this.getRootLocator.waitFor({ state: 'detached', timeout: timeouts.medium });
        } catch {
            /* do nothing */
        }
    }
}

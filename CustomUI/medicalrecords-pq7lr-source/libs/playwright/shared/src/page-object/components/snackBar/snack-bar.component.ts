/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { timeouts } from '../../../utils';

export class SnackBarComponent extends BaseComponent {
    private static rootElement = 'adf-snackbar-content';

    messageLocator = '[data-automation-id="adf-snackbar-message-content"]';
    message = this.getChild(this.messageLocator).first();

    closeButton = this.getChild('.adf-snackbar-message-content-action-icon');

    getSnackbarByMessage = (message: string) => this.getChild(this.messageLocator, { hasText: message });
    getCloseButtonByMessage = (message: string) => this.getRootLocator.filter({ hasText: message }).locator('.adf-snackbar-message-content-action-icon');

    errorSnackBarLocator = '.adf-error-snackbar';

    constructor(page: Page, rootElement = SnackBarComponent.rootElement) {
        super(page, rootElement);
    }

    async closeSnackBar(message: string, timeout: number = timeouts.medium) {
        try {
            await this.getCloseButtonByMessage(message).click({ timeout });
        } catch {}
    }

    async waitForSnackBarMessage() {
        await this.message.isEnabled({ timeout: timeouts.large });
    }

    async ensureNoErrorSnackBar(duration: number): Promise<boolean> {
        const errorSnackbar = this.page.locator(this.errorSnackBarLocator);

        try {
            await errorSnackbar.waitFor({ state: 'visible', timeout: duration });
            return true;
        } catch {
            return false;
        }
    }
}

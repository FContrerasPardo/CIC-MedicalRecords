/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from './base.component';

export class AdfConfirmDialog extends BaseComponent {
    static rootElement = 'adf-confirm-dialog';

    constructor(page: Page) {
        super(page, AdfConfirmDialog.rootElement);
    }

    confirmButton = this.getElementByAutomationId('adf-confirm-dialog-confirmation');

    async waitForDialogToClose(): Promise<void> {
        await this.getRootLocator.waitFor({ state: 'detached' });
    }
}

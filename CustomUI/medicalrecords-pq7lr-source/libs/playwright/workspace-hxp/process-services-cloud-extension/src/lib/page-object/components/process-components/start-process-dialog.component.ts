/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { MatDialogContainer } from '@alfresco-dbp/playwright/shared';

export class StartProcessDialog extends MatDialogContainer {
    private static rootElement = 'apa-start-process-dialog';

    constructor(page: Page) {
        super(page, StartProcessDialog.rootElement);
    }

    startProcessSearchInput = this.getElementByAutomationId('start-process-dialog-search-input');
    getProcessMessage = this.getElementByAutomationId('process-by-category-list-id').locator('span');
    closeStartProcessDialogButton = this.getElementByAutomationId('apa-start-process-dialog-close-button');

    async selectProcess(processName: string): Promise<void> {
        await this.startProcessSearchInput.fill(processName);
        await this.getElementByAutomationId(processName).click();
    }
}

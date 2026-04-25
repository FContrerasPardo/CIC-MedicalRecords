/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, materialLocators } from '@alfresco-dbp/playwright/shared';

export class AdfContextMenuComponent extends BaseComponent {
    static rootElement = '.adf-context-menu';

    constructor(page: Page) {
        super(page, AdfContextMenuComponent.rootElement);
    }

    allButtons = this.getChild(`button ${materialLocators.Menu.text}`);

    async downloadFileFromContextMenu(): Promise<null | string> {
        const [download] = await Promise.all([this.page.waitForEvent('download'), this.getButtonByExactText('Download').click()]);
        return download.path();
    }
}

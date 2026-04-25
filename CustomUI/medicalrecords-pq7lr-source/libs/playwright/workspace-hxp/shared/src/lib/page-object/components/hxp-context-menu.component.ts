/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, materialLocators } from '@alfresco-dbp/playwright/shared';

export class HxpContextMenuComponent extends BaseComponent {
    static rootElement = '.hxp-context-menu';

    constructor(page: Page) {
        super(page, HxpContextMenuComponent.rootElement);
    }

    getMenuByName = (name: string) => this.getChild('[role="menuitem"]').filter({ hasText: name.toLowerCase() });

    async getAllActionNames(): Promise<string[]> {
        return this.getChild(`button ${materialLocators.Menu.text}`).allInnerTexts();
    }
}

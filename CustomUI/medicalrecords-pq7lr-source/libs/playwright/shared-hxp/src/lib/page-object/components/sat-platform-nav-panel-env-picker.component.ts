/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class SatPlatformNavPanelEnvPickerComponent extends BaseComponent {
    private static rootElement = '.sat-platform-nav-switcher-menu';

    constructor(page: Page) {
        super(page, SatPlatformNavPanelEnvPickerComponent.rootElement);
    }

    private readonly satMenuItemByIndex = (index: number) => this.getChild('sat-platform-nav-switcher-item').nth(index);

    private readonly getEnvSwitcherMenuItemContent = (index: number) =>
        this.getChild('.sat-platform-nav-switcher-item .sat-platform-nav-switcher-item-content').nth(index);

    async selectEnvironment(envIndex: number): Promise<string> {
        await this.waitForRootElement();
        const itemContent = await this.getEnvSwitcherMenuItemContent(envIndex).textContent();
        await this.satMenuItemByIndex(envIndex).click();
        return itemContent;
    }
}

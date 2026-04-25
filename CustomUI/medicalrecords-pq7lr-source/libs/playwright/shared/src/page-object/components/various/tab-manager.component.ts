/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';

export class TabManagerComponent extends BaseComponent {
    private static rootElement = 'modelingsdk-tab-manager';

    constructor(page: Page) {
        super(page, TabManagerComponent.rootElement);
    }

    selectedTabAttribute = 'aria-selected';

    getCreateButtonLocator = this.getElementByAutomationId('create-button').filter({ visible: true });
    getAllTabsTitlesLocator = this.getChild('.ama-tab-title');
    getActiveTabTitleLocator = this.getChild(`[${this.selectedTabAttribute}='true']`).locator('.ama-tab-title');
    getHomeTabLocator = this.getElementByAutomationId('home-tab');

    getTabByNameLocator = (tabName: string) => this.getChild('[role=\'tab\']', { hasText: tabName });
    getTitleLocator = (tabName: string) => this.getTabByNameLocator(tabName).locator('.ama-tab-title');
    getCloseButtonLocator = (tabName: string) => this.getTabByNameLocator(tabName).locator('[data-automation-id^="model-tab-close-button-"]');
    getDirtyStateDotLocator = (tabName: string) => this.getTabByNameLocator(tabName).locator('.ama-tab-model-dirty');
    getReadOnlyStateIconLocator = (tabName: string) => this.getTabByNameLocator(tabName).locator('.ama-tab-model-readonly-icon');

    async switchToTab(tabName: string): Promise<void> {
        await this.getTitleLocator(tabName).click();
        await this.spinnerWaitForReload();
    }

    async isTabSelected(tabName: string): Promise<boolean> {
        return (await this.getTabByNameLocator(tabName).getAttribute(this.selectedTabAttribute)) === 'true';
    }
}

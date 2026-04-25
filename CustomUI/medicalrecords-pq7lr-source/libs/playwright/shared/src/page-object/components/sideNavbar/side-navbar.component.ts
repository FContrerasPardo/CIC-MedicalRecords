/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { materialLocators } from '../material';

export class SideNavbarComponent extends BaseComponent {
    constructor(page: Page, rootElement: string) {
        super(page, rootElement);
    }

    getMenuItemsLocator = this.getChild(materialLocators.Expansion.panel.header);
    getActivePanelsLocator = this.getChild('[data-automation-id*="side-menu-nav-list"] a');

    getMenuItemLocator = (dataAutomationId: string) => this.getChild(`[data-automation-id='${dataAutomationId}']`);
    getMenuItemLocatorLabel = (dataAutomationId: string) => this.getChild(`[data-automation-id='${dataAutomationId}'] .aca-action-button__label`);
    getMenuItemByNameLocator = (headerName: string) => this.getChild(materialLocators.Expansion.panel.header, { hasText: headerName });

    async isElementExpanded(elementToCheck: Locator): Promise<boolean> {
        const isExpanded = await elementToCheck.getAttribute('aria-expanded');
        return [true, 'true'].includes(isExpanded);
    }

    async isMenuExpanded(headerName: string): Promise<boolean> {
        return this.isElementExpanded(this.getMenuItemByNameLocator(headerName));
    }

    async expandPanelHeader(headerName: string): Promise<void> {
        if (!(await this.isMenuExpanded(headerName))) {
            await this.getMenuItemByNameLocator(headerName).click();
        }
    }

    async collapsePanelHeader(headerName: string): Promise<void> {
        if (await this.isMenuExpanded(headerName)) {
            await this.getMenuItemByNameLocator(headerName).click();
        }
    }

    async navigateTo(menuItem: string, parentExpandablePanelName?: string): Promise<void> {
        if (parentExpandablePanelName) {
            await this.expandPanelHeader(parentExpandablePanelName);
        }
        await this.getMenuItemLocator(menuItem).click();
        await this.spinnerWaitForReload();
    }
}

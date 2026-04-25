/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { BaseComponent, MatDialogContainer, MenuComponent } from '@alfresco-dbp/playwright/shared';
import { HxpEditVersionDialogComponent } from './hxp-edit-version-dialog.component';

export class HxpManageVersionsSidebarComponent extends BaseComponent {
    static rootElement = 'hxp-manage-versions-sidebar';

    matDialogContainer = new MatDialogContainer(this.page);
    matMenuComponent = new MenuComponent(this.page);
    editVersionDialog = new HxpEditVersionDialogComponent(this.page);

    constructor(page: Page) {
        super(page, HxpManageVersionsSidebarComponent.rootElement);
    }

    allVersionItems = this.getChild('.hxp-version-item');
    editVersionInfoButton = this.matMenuComponent.getButtonByNameLocator('Edit Version Info');
    downloadButton = this.matMenuComponent.getButtonByNameLocator('Download');
    shareButton = this.matMenuComponent.getButtonByNameLocator('Share');
    restoreButton = this.matMenuComponent.getElementByAutomationId('context-Restore');

    getNthVersion = (index: number): Locator => this.allVersionItems.nth(index);
    getMoreActionsButtonForNthVersion = (index: number): Locator => this.getNthVersion(index).locator('[data-automation-id*="version-context-menu-button"]');
    getNthVersionTitle = (index: number): Locator => this.getNthVersion(index).locator('.hxp-version-title');
    getNthVersionDescription = (index: number): Locator => this.getNthVersion(index).locator('.hxp-version-description');

    async editVersionInfo(versionTitle: string, versionDescription: string): Promise<void> {
        await this.editVersionInfoButton.click();
        await this.editVersionDialog.versionTitleInput.fill(versionTitle);
        await this.editVersionDialog.versionDescriptionInput.fill(versionDescription);
        await this.editVersionDialog.saveButton.click();
    }
}

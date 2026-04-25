/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator } from '@playwright/test';
import { MatDialogContainer, materialLocators } from '@alfresco-dbp/playwright/shared';

export class FileActionDialog extends MatDialogContainer {
    copyToClipboardButton = this.getElementByAutomationId('hxp-share-link-copy-button');
    backButton = this.getElementByAutomationId('folder-breadcrumb-back-button');
    selectedFolderName = this.getChild('[data-automation-id="folder-breadcrumb-current-folder"]');
    subFoldersList = this.getChild('.hxp-sub-folder').first();

    getFolderByName = (folder: string) => this.getChild('.hxp-sub-folder').filter({ hasText: folder }).locator('span');
    getDocByTestId = (dataTestId: string): Locator => this.getRootLocator.getByTestId(`text_${dataTestId}`);
    getDialogTitle = (text: string): Locator => this.getDialogTitleLocator.locator('h1', { hasText: text });

    async selectDestinationFolderAndConfirmCopy(destinationFolder: string): Promise<void> {
        await this.backButton.click();
        await this.getFolderByName(destinationFolder).click();
        await this.getButtonByText('Copy').click();
    }

    async createFolder(folderName: string, folderCategory: string): Promise<void> {
        await this.getChild('#hxp-new-folder-name').fill(folderName);
        await this.getChild(materialLocators.Select.value.class).click();
        await this.dropdownListComponent.getOptionLocator(folderCategory).click();
        await this.getButtonByExactText('Create Folder').click();
    }

    async performAction(documentTitle: string, actionName: string): Promise<void> {
        await this.getFolderByName(documentTitle).click();
        await this.getButtonByText(actionName).click();
    }
}

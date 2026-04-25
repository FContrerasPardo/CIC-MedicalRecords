/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page, Response } from '@playwright/test';
import {
    HxpToolbarComponent,
    DataTableComponent,
    DropdownListComponent,
    MatDialogContainer,
    materialLocators,
    timeouts,
} from '@alfresco-dbp/playwright/shared';

type TabLabels = 'Repository' | 'Local storage';

export class HxpAttachFileDialogComponent extends MatDialogContainer {
    static rootElement = 'hxp-attach-file-dialog';

    dataTable = new DataTableComponent(this.page);
    toolbar = new HxpToolbarComponent(this.page);
    breadcrumbDropdown = new DropdownListComponent(this.page, materialLocators.Select.panel.class);

    constructor(page: Page) {
        super(page, HxpAttachFileDialogComponent.rootElement);
    }

    uploadedFilesNumber = this.getChild('.adf-upload-dialog__title');
    breadcrumbs = this.getChild('.hxp-attach-file-dialog-navigation');
    attachButton = this.getChild('[data-automation-id="attach-file-dialog-attach-button"]');
    cancelButton = this.getChild('[data-automation-id="attach-file-dialog-cancel-button"]');
    uploadButton = this.getButtonByExactText('UPLOAD');

    override async switchToTab(tabName: TabLabels): Promise<void> {
        await super.switchToTab(tabName);
        await this.page.waitForTimeout(timeouts.normal);
    }

    async uploadFile(filePath: string | string[]): Promise<void> {
        const [fileChooser] = await Promise.all([this.page.waitForEvent('filechooser'), this.uploadButton.click()]);
        await fileChooser.setFiles(filePath);
    }

    async waitForDialogContent(): Promise<void> {
        await this.getChild('.hxp-attach-file-dialog-content').waitFor({ state: 'visible' });
    }

    async attachFileFromLocal(filePath: string | string[]): Promise<void> {
        await this.waitForDialogContent();
        await this.switchToTab('Local storage');
        await this.uploadFile(filePath);
        await this.attachButton.isEnabled();
        await this.attachButton.click();
        await this.page.locator(HxpAttachFileDialogComponent.rootElement).waitFor({ state: 'detached' });
    }

    waitForDocumentCreation(): Promise<Response> {
        return this.page.waitForResponse(
            (resp) => resp.request().method() === 'POST' && resp.url().includes('/documents/') && resp.url().includes('enforceSysName')
        );
    }

    async waitForBinaryUploadsComplete(count = 1): Promise<void> {
        for (let i = 0; i < count; i++) {
            await this.page.waitForResponse(
                (resp) => resp.request().method() === 'POST' && resp.url().includes('/upload'),
                { timeout: timeouts.large }
            );
        }
    }

    async cancelAndCountUploadDeletions(expectedCount?: number): Promise<{ deletedCount: number; allDeleted: boolean }> {
        let deletedCount = 0;
        const responseHandler = (response: Response) => {
            if (response.request().method() === 'DELETE' && response.url().includes('/upload/')) {
                deletedCount++;
            }
        };
        this.page.on('response', responseHandler);
        await this.cancelButton.click();
        await this.getRootLocator.waitFor({ state: 'detached', timeout: timeouts.large });

        if (expectedCount !== undefined) {
            while (deletedCount < expectedCount) {
                try {
                    await this.page.waitForResponse(
                        (resp) => resp.request().method() === 'DELETE' && resp.url().includes('/upload/'),
                        { timeout: timeouts.medium }
                    );
                } catch {
                    break;
                }
            }
        }

        this.page.off('response', responseHandler);
        return {
            deletedCount,
            allDeleted: expectedCount ? deletedCount === expectedCount : deletedCount > 0,
        };
    }

    async attachFileFromLocalAndWaitForDocCreation(filePath: string | string[]): Promise<string> {
        const docCreatedPromise = this.page.waitForResponse(
            (resp) => resp.request().method() === 'POST' && resp.url().includes('/documents/') && resp.url().includes('enforceSysName')
        );
        await this.attachFileFromLocal(filePath);
        const docCreatedResp = await docCreatedPromise;
        const docBody = await docCreatedResp.json();
        const denyPermission = docBody.sys_acl.find(ace => ace.user.id === '__Everyone__' && ace.permission === 'Everything' && ace.granted === false);
        if (!denyPermission) {
            throw new Error('Deny permission not found for __Everyone__ on document creation');
        }
        return docBody.data?.sys_id ?? docBody.sys_id;
    }
}

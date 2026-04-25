/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HxpToolbarComponent, DataTableComponent, DropdownListComponent, FileProperties, ROOT_DOCUMENT, timeouts } from '@alfresco-dbp/playwright/shared';
import { Page } from '@playwright/test';
import {
    HomePage,
    AdfContextMenuComponent,
    HxpFileUploadDialogComponent,
    HxpContextMenuComponent,
    HxpApplicationChromeComponent,
} from '@hxp/playwright/workspace-hxp/shared';
import {
    MainContentContainer,
    HxpDocumentViewerComponent,
    MainContentHeaderComponent,
    HxpFileUploadSnackbarComponent,
    HxpUploadDialogComponent,
    HxpPermissionsManagementDialogContainer,
    FileActionDialog,
    HxpDocumentMoreMenuPanelComponent,
    HxpManageVersionsSidebarComponent,
    HxpEditVersionDialogComponent,
} from '../components';

import fs from 'node:fs';

type ActionType = 'Copy' | 'Move' | 'Delete' | 'Share' | 'Info' | 'Download' | 'Permissions' | 'Replace file';

export class ContentBrowserPage extends HomePage {
    private static readonly defaultRepositoryId = 'default';
    private static readonly pageUrl = `/${ContentBrowserPage.defaultRepositoryId}/documents`;

    constructor(page: Page) {
        super(page, ContentBrowserPage.pageUrl);
    }

    mainContentContainer = new MainContentContainer(this.page);
    hxpDatatableBody = new DataTableComponent(this.page);
    hxpToolbar = new HxpToolbarComponent(this.page);
    adfContextMenu = new AdfContextMenuComponent(this.page);
    fileActionDialog = new FileActionDialog(this.page);
    documentViewer = new HxpDocumentViewerComponent(this.page);
    mainContentHeader = new MainContentHeaderComponent(this.page);
    fileUploadDialog = new HxpFileUploadDialogComponent(this.page);
    uploadDialog = new HxpUploadDialogComponent(this.page);
    fileUploadSnackbar = new HxpFileUploadSnackbarComponent(this.page);
    permissionDialog = new HxpPermissionsManagementDialogContainer(this.page);
    dropdownListComponent = new DropdownListComponent(this.page, '.cdk-overlay-container');
    documentMoreMenuPanelComponent = new HxpDocumentMoreMenuPanelComponent(this.page);
    hxpContextMenuComponent = new HxpContextMenuComponent(this.page);
    manageVersionsSidebar = new HxpManageVersionsSidebarComponent(this.page);
    editVersionDialog = new HxpEditVersionDialogComponent(this.page);
    hxpApplicationChromeComponent = new HxpApplicationChromeComponent(this.page);

    private readonly dropzoneLocator = '.hxp-upload-drag-area [dropzone]';

    getUploadMenuButtonByText = (text: string) => this.dropdownListComponent.getChild('button', { hasText: text });

    async navigateToDocument(documentId: string): Promise<void> {
        await this.navigate({ query: `/${documentId}` });
    }

    async navigateToRoot(): Promise<void> {
        await this.navigateToDocument(ROOT_DOCUMENT.sys_id ?? '');
    }

    async switchLanguageTo(language: string): Promise<void> {
        await this.navigate();
        await this.mainContentContainer.waitForRootElement();
        await this.headerComponent.appHeaderActionsButton.click();
        await this.matMenuComponent.getLanguageMenu.hover();
        await this.matMenuComponent.getLanguageMenuItem(language).click();
        await this.page.waitForLoadState('load');
    }

    async clickFileCheckbox(fileName: string): Promise<void> {
        await this.hxpDatatableBody.getCheckboxForElement(fileName).waitFor({ state: 'attached', timeout: timeouts.large });
        await this.hxpDatatableBody.getCheckboxForElement(fileName).click();
        let isSelected = (await this.hxpDatatableBody.getCheckboxForElement(fileName).getAttribute('class', { timeout: timeouts.default })) ?? '';
        let retries = 0;
        const maxRetries = 3;

        do {
            if (retries >= maxRetries) {
                throw new Error(`Failed to select ${fileName} after ${maxRetries} retries`);
            }

            await this.page.reload();
            await this.mainContentContainer.waitForSkeletonLoader();
            await this.hxpDatatableBody.getCheckboxForElement(fileName).waitFor({ state: 'attached', timeout: timeouts.large });
            await this.hxpDatatableBody.getCheckboxForElement(fileName).click();
            isSelected = await this.hxpDatatableBody.getCheckboxForElement(fileName).getAttribute('class', { timeout: timeouts.default });

            retries++;
        } while (!isSelected.includes('adf-datatable-checkbox-selected'));
    }

    async performToolbarAction(fileName: string, action: ActionType, clickCheckbox = true): Promise<void> {
        if (clickCheckbox) {
            await this.clickFileCheckbox(fileName);
        }

        const isVisible = await this.hxpToolbar.getToolbarActionByTitle(action).isVisible();
        if (isVisible) {
            await this.hxpToolbar.getToolbarActionByTitle(action).click();
        } else {
            await this.hxpToolbar.moreActionsMenuButton.click();
            await this.documentMoreMenuPanelComponent.getButtonByNameLocator(action).click();
        }
    }

    async performContextMenuAction(fileName: string, action: ActionType): Promise<void> {
        await this.hxpDatatableBody
            .getRowByName(fileName)
            .waitFor({ state: 'visible'});
        await this.hxpDatatableBody.getRowByName(fileName).click({ button: 'right' });
        await (action === 'Download'
            ? this.adfContextMenu.downloadFileFromContextMenu()
            : this.adfContextMenu.getButtonByNameLocator(action).click());
    }

    async selectFileForUpload(filePath: string): Promise<void> {
        const [fileChooser] = await Promise.all([this.page.waitForEvent('filechooser'), this.getUploadMenuButtonByText('Upload').click()]);
        await fileChooser.setFiles(filePath);
    }

    async dragAndDropFilesToUpload(files: FileProperties[]) {
        const filesData = files.map((file) => ({
            buffer: fs.readFileSync(file.path),
            fileName: file.title,
            mimeType: file.mimeType,
        }));

        await this.page.locator(this.dropzoneLocator).waitFor();

        const dataTransfer = await this.page.evaluateHandle((data) => {
            /*
             * `DataTransfer` objects hold the data that is being dragged during a drag and drop operation, and they
             * provide two properties to access the data being transferred:
             * - `DataTransfer.items` - contains a list of all of the drag data (more generic)
             * - `DataTransfer.files` - contains a list of all the local files available on the data transfer
             * More information at https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
             *
             * The `HxpFileDraggableDirective` tries to access the data being transferred using both methods in the
             * `drop` event handler, getting the transferred files through the items property (if they exist),
             * and if not, it falls back to the files property.
             * For an unknown reason, the first method fails in e2e tests, but the second works as expected.
             * In the event handler, accessing `DataTransfer.items[x].webkitGetAsEntry()` returns null, instead of the
             * expected file. Notice that this is not consistent with what the documentation says, as the method should
             * only return null if the item is not a File.
             *
             * So, this hack consists in bypassing the access to the `DataTransfer.items` property, returning
             * an `undefined` value, leading the draggable directive to rely on the `DataTransfer.files` instead.
             *
             * Notice that we need a proper `DataTransfer` object, otherwise it will fail on `DragEventInit`,
             * trying to convert the value to a 'DataTransfer' object (it can't be a proxy or a vanilla object).
             */
            class NoItemsDataTransfer extends DataTransfer {
                addItem(item: File) {
                    super.items.add(item);
                }
                /*
                 * Returning undefined means we should use the `files` property instead of the `items` one.
                 * `this.files` contains the item added through `addItem`, but not `this.items`.
                 */
                override get items(): DataTransferItemList {
                    return undefined as any;
                }
            }

            const dt = new NoItemsDataTransfer();
            for (const file of data) {
                dt.addItem(new File([file.buffer.toString()], file.fileName, { type: file.mimeType }));
            }
            return dt;
        }, filesData);

        await this.page.dispatchEvent(this.dropzoneLocator, 'drop', { dataTransfer });
    }
}

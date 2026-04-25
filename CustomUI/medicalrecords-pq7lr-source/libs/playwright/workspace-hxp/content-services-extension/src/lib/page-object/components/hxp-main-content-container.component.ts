/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';
import { HxpDocumentListPaginatorComponent } from './hxp-document-list-paginator';

export class MainContentContainer extends BaseComponent {
    static rootElement = '.hxp-document-list-container';

    paginator = new HxpDocumentListPaginatorComponent(this.page);

    constructor(page: Page) {
        super(page, MainContentContainer.rootElement);
    }

    datatableRowHeader = this.getElementByAutomationId('datatable-row-header');
    columnHeaders = this.datatableRowHeader.locator('[role="columnheader"]');
    dataRow = this.getRootLocator.getByTestId(/datatable-row-(0|[1-9]\d*)/);

    getDocByTestId = (dataTestId: string): Locator => this.getRootLocator.getByTestId(`text_${dataTestId}`);
    getColumnHeaderByTitle = (columnName: string) => this.columnHeaders.filter({ hasText: columnName });
    getColumnResizeArea = (columnName: string) => this.getColumnHeaderByTitle(columnName).locator('.adf-datatable__resize-handle');

    async resizeColumn(columnNameToResize: string, pixels: number, direction: string): Promise<void> {
        await this.mouseDragAndDropByPixels(this.getColumnResizeArea(columnNameToResize), 'middle', pixels, direction);
    }

    async getColumnWidth(columnName: string): Promise<number> {
        const columnBounding = await this.getColumnHeaderByTitle(columnName).boundingBox();
        if (columnBounding !== null) {
            return columnBounding.width;
        }
        throw new Error('Column bounding is null.');
    }
}

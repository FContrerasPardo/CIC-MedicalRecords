/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpSearchManageColumnsComponent extends BaseComponent {
    static rootElement = 'hxp-manage-column-dialog';

    constructor(page: Page) {
        super(page, HxpSearchManageColumnsComponent.rootElement);
    }

    private availableColumns = this.getChild('.hxp-manage-columns-available-columns');
    private selectedColumn = this.getChild('.hxp-manage-columns-selected-columns');

    availableColumnSearchContainer = this.availableColumns.locator('.hxp-manage-columns-search-container [aria-label="Search Input"]');

    draggableButton = (columnName: string) =>
        this.selectedColumn
            .locator('.hxp-manage-columns-column-item', { hasText: columnName })
            .locator('button[aria-label="Drag Column"]');

    async removeColumns(columnNames: string[]): Promise<void> {
        for (const column of columnNames) {
            const removeButton = this.selectedColumn
                .locator('.hxp-manage-columns-column-item', { hasText: column })
                .locator('button[aria-label="Remove Column"]');
            await removeButton.click();
        }
    }

    async addColumns(columnNames: string[]): Promise<void> {
        for (const column of columnNames) {
            const addButton = this.availableColumns
                .locator('.hxp-manage-columns-column-item', { hasText: column })
                .locator('button[aria-label="Add Column"]');
            await addButton.click();
        }
    }

    async dragColumnOverColumn(columnNameToMove: string, columnNameToGoOver: string): Promise<void> {
        const columnToMove = this.draggableButton(columnNameToMove);
        const columnToGoOver = this.draggableButton(columnNameToGoOver);

        await columnToMove.waitFor({ state: 'visible' });
        await this.mouseDragAndDrop(columnToMove, columnToGoOver);
    }
}

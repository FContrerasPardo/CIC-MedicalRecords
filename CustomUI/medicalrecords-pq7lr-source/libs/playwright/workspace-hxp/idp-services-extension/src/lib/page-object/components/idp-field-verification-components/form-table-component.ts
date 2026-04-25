/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page, Locator, expect } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpIdpFormTable extends BaseComponent {
    static readonly rootElement: string = '.hxp-table-reference-widget';

    private static readonly fillOptionToAutomationId: Record<string, string> = {
        'all-below': 'cell-menu-fill-all-below',
        'all-above': 'cell-menu-fill-all-above',
        'to-below': 'cell-menu-fill-to-below',
        'to-above': 'cell-menu-fill-to-above',
    };

    private static readonly DELETE_ROW_MENU_TEXT = 'Delete this row';
    private static readonly CLEAR_ROW_MENU_TEXT = 'Clear this row';

    constructor(page: Page) {
        super(page, HxpIdpFormTable.rootElement);
    }

    tableButtonByName = (tableName: string) => this.getRootLocator.filter({ hasText: tableName });

    /**
     * Gets query used to locate a specific table row based on row index (0-indexed)
     * @param rowIndex - Row number (0-indexed)
     */
    private getTableRowQuery(rowIndex: number): string {
        return `table tbody tr[data-row-index="${rowIndex}"]`;
    }

    /**
     * Gets a table row locator by row index
     * @param rowIndex - Row number (0-indexed)
     */
    formTableRow(rowIndex: number): Locator {
        return this.page.locator(this.getTableRowQuery(rowIndex));
    }

    /**
     * Gets a table cell input by row index and column name
     * @param rowIndex - Row number (0-indexed)
     * @param columnName - Name of the column
     */
    formTableCellInput(rowIndex: number, columnName: string): Locator {
        return this.page.locator(`${this.getTableRowQuery(rowIndex)} td[role="cell"] .idp-cell-edit-input[aria-label*="${columnName}"]`);
    }

    /**
     * Right-clicks a table cell and selects a fill option from the context menu
     * @param rowIndex - Row number (0-indexed)
     * @param columnName - Name of the column
     * @param fillOption - Fill operation type
     */
    async rightClickAndFill(rowIndex: number, columnName: string, fillOption: 'all-below' | 'all-above' | 'to-below' | 'to-above'): Promise<void> {
        const cellInput = this.formTableCellInput(rowIndex, columnName);
        await cellInput.click({ button: 'right' });

        const menuLocator = this.page.locator(`[data-automation-id="${HxpIdpFormTable.fillOptionToAutomationId[fillOption]}"]`);
        await menuLocator.waitFor({ state: 'visible' });
        await menuLocator.click();
    }

    /**
     * Verifies that cells in a range have the expected value
     * @param startRow - Starting row number (0-indexed)
     * @param endRow - Ending row number (0-indexed)
     * @param columnName - Name of the column
     * @param expectedValue - Expected value in the cells
     */
    async verifyCellsHaveValue(startRow: number, endRow: number, columnName: string, expectedValue: string): Promise<void> {
        for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
            const cellToCheck = this.formTableCellInput(rowIndex, columnName);
            await expect(cellToCheck).toHaveValue(expectedValue);
        }
    }

    /**
     * Reads values from specific rows in a column
     * @param rows - Array of row indices (0-indexed)
     * @param columnName - Name of the column
     */
    async readColumnValues(rows: number[], columnName: string): Promise<string[]> {
        const values: string[] = [];
        for (const rowIndex of rows) {
            const cellToRead = this.formTableCellInput(rowIndex, columnName);
            values.push(await cellToRead.inputValue());
        }
        return values;
    }

    /**
     * Checks if a fill menu option is disabled
     * @param fillOption - Fill operation type
     */
    async isFillOptionDisabled(fillOption: 'all-below' | 'all-above' | 'to-below' | 'to-above'): Promise<boolean> {
        const menuOption = this.page.locator(`[data-automation-id="${HxpIdpFormTable.fillOptionToAutomationId[fillOption]}"]`);
        return menuOption.isDisabled();
    }

    /**
     * Clicks a cell, selects all text, and opens the context menu via right-click
     * @param rowIndex - Row number (0-indexed)
     * @param columnName - Name of the column
     */
    private async selectAllAndOpenContextMenu(rowIndex: number, columnName: string): Promise<void> {
        const cellInput = this.formTableCellInput(rowIndex, columnName);
        await cellInput.click();
        await this.page.keyboard.press('Control+a');
        await cellInput.click({ button: 'right' });
    }

    /**
     * Waits for a context menu item to be visible and clicks it
     * @param automationId - The data-automation-id of the menu item
     */
    private async clickContextMenuItem(automationId: string): Promise<void> {
        const menuLocator = this.page.locator(`[data-automation-id="${automationId}"]`);
        await menuLocator.waitFor({ state: 'visible' });
        await menuLocator.click();
    }

    /**
     * Right-clicks a table cell and selects Cut from the context menu
     * @param rowIndex - Row number (0-indexed)
     * @param columnName - Name of the column
     */
    async rightClickAndCut(rowIndex: number, columnName: string): Promise<void> {
        await this.selectAllAndOpenContextMenu(rowIndex, columnName);
        await this.clickContextMenuItem('cell-menu-cut');
    }

    /**
     * Right-clicks a table cell and selects Copy from the context menu
     * @param rowIndex - Row number (0-indexed)
     * @param columnName - Name of the column
     */
    async rightClickAndCopy(rowIndex: number, columnName: string): Promise<void> {
        await this.selectAllAndOpenContextMenu(rowIndex, columnName);
        await this.clickContextMenuItem('cell-menu-copy');
    }

    /**
     * Right-clicks a table cell and selects Paste from the context menu
     * @param rowIndex - Row number (0-indexed)
     * @param columnName - Name of the column
     */
    async rightClickAndPaste(rowIndex: number, columnName: string): Promise<void> {
        await this.selectAllAndOpenContextMenu(rowIndex, columnName);
        await this.clickContextMenuItem('cell-menu-paste');
    }

    async deleteRowViaContextMenu(rowIndex: number): Promise<void> {
        const rowCell = this.formTableRow(rowIndex).getByRole('cell').first();
        await rowCell.click({ button: 'right', force: true });
        const deleteMenuItem = this.page.getByRole('menuitem', { name: HxpIdpFormTable.DELETE_ROW_MENU_TEXT });
        await deleteMenuItem.waitFor({ state: 'visible' });
        await deleteMenuItem.click();
        await deleteMenuItem.waitFor({ state: 'detached' });
    }

    formTableRowNumberCell(rowIndex: number): Locator {
        return this.formTableRow(rowIndex).locator('td.idp-table-row-number-cell');
    }

    async selectRowByRowNumber(rowIndex: number): Promise<void> {
        await this.formTableRowNumberCell(rowIndex).click();
    }

    async ctrlClickRowNumber(rowIndex: number): Promise<void> {
        await this.formTableRowNumberCell(rowIndex).click({ modifiers: ['Control'] });
    }

    async shiftClickRowNumber(rowIndex: number): Promise<void> {
        await this.formTableRowNumberCell(rowIndex).click({ modifiers: ['Shift'] });
    }

    async deleteSelectedRowsViaContextMenu(rowIndex: number): Promise<void> {
        await this.formTableRowNumberCell(rowIndex).click({ button: 'right' });
        const deleteMenuItem = this.page.getByRole('menuitem', { name: HxpIdpFormTable.DELETE_ROW_MENU_TEXT });
        await deleteMenuItem.waitFor({ state: 'visible' });
        await deleteMenuItem.click();
        await deleteMenuItem.waitFor({ state: 'detached' });
    }

    async clearRowViaContextMenu(rowIndex: number): Promise<void> {
        const rowCell = this.formTableRow(rowIndex).getByRole('cell').first();
        await rowCell.click({ button: 'right', force: true });
        const clearMenuItem = this.page.getByRole('menuitem', { name: HxpIdpFormTable.CLEAR_ROW_MENU_TEXT });
        await clearMenuItem.waitFor({ state: 'visible' });
        await clearMenuItem.click();
        await clearMenuItem.waitFor({ state: 'detached' });
    }

    async clearSelectedRowsViaContextMenu(rowIndex: number): Promise<void> {
        await this.formTableRowNumberCell(rowIndex).click({ button: 'right' });
        const clearMenuItem = this.page.getByRole('menuitem', { name: HxpIdpFormTable.CLEAR_ROW_MENU_TEXT });
        await clearMenuItem.waitFor({ state: 'visible' });
        await clearMenuItem.click();
        await clearMenuItem.waitFor({ state: 'detached' });
    }
}

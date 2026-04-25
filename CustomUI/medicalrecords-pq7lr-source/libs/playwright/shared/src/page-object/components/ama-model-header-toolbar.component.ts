/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { MatDialogContainer, MenuComponent, BaseComponent } from './';
import { Page } from '@playwright/test';

export const AmaModelTooltipButtons = {
    Save: 'Save',
    Validate: 'Validate',
    EditorsMenu: 'Editors Menu',
    MoreMenu: 'More Menu',
} as const;

export type AmaModelTooltipButtons = typeof AmaModelTooltipButtons[keyof typeof AmaModelTooltipButtons];

export class AmaModelHeaderToolbar extends BaseComponent {
    private static rootElement = '.ama-model-header-toolbar';

    matMenu = new MenuComponent(this.page);
    matDialog = new MatDialogContainer(this.page);

    constructor(page: Page) {
        super(page, AmaModelHeaderToolbar.rootElement);
    }

    getUndoButtonLocator = this.getElementByAutomationId('process-editor-undo-button');
    getRedoButtonLocator = this.getElementByAutomationId('process-editor-redo-button');
    getButtonByTitleLocator = (title: AmaModelTooltipButtons) => this.getChild(`button[title*='${title}']`);
    getEnabledButtonLocator = (title: AmaModelTooltipButtons) => this.getChild(`button[title*='${title}']:not([disabled='true'])`);
}

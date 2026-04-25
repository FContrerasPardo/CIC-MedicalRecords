/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '..';
import { materialLocators } from '.';

export class MatCard extends BaseComponent {
    constructor(page: Page, parentRootElement?: string, cardName?: string) {
        const rootElement = cardName ? `${materialLocators.Card.root}[data-automation-id*='${cardName}']` : materialLocators.Card.root;
        const finalRootElement = parentRootElement ? `${parentRootElement} ${rootElement}` : rootElement;
        super(page, finalRootElement);
    }

    getCardLocator = this.getRootLocator;
    getFieldByNameLocator = (name: string) => this.getChild(materialLocators.Form.field, { hasText: name });
    getInputByFieldNameLocator = (name: string) => this.getFieldByNameLocator(name).locator('input');
    getTextareaByFieldNameLocator = (name: string) => this.getFieldByNameLocator(name).locator('textarea');
    getCheckboxByNameLocator = (name: string) =>
        this.getChild(materialLocators.Checkbox.root, { hasText: name }).locator(materialLocators.Checkbox.layout);
    getFieldByRoleLocator = (role: string) => this.getChild(`[role="${role}"]`);
    getCustomWidgetMenuOptionLocator = (customWidgetName: string) =>
        this.getChild('.overlay-palette-item-container').filter({ hasText: customWidgetName });
}

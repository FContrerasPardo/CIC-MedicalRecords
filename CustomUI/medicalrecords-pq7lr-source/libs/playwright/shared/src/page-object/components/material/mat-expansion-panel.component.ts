/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { materialLocators } from '.';
import { BaseComponent } from '..';

export class MatExpansionPanel extends BaseComponent {
    constructor(page: Page, parentRootElement?: string) {
        const finalRootElement = parentRootElement
            ? `${parentRootElement} ${materialLocators.Expansion.panel.root}`
            : materialLocators.Expansion.panel.root;
        super(page, finalRootElement);
    }

    getPanelTitleLocator = this.getChild(`${materialLocators.Panel.title} span`);
    getPanelByNameLocator = (name: string) => this.getChild(`${materialLocators.Expansion.panel.header}[data-automation-id*='${name}']`);
    getFieldByNameLocator = (name: string) => this.getChild(materialLocators.Form.field, { hasText: name });
    getInputByFieldNameLocator = (name: string) => this.getFieldByNameLocator(name).locator('input');
    getTextareaByFieldNameLocator = (name: string) => this.getFieldByNameLocator(name).locator('textarea');

    private getPanelHeaderLocator = (headerText?: string) => this.getChild(materialLocators.Expansion.panel.header, { hasText: headerText });

    async expandPanel(headerText?: string): Promise<void> {
        if (!(await this.isPanelExpanded(headerText))) {
            await this.getPanelHeaderLocator(headerText).click();
        }
    }

    private async isPanelExpanded(headerText?: string): Promise<boolean> {
        const isExpanded = (await this.getPanelHeaderLocator(headerText).getAttribute('aria-expanded')) || false;
        return [true, 'true'].includes(isExpanded);
    }
}

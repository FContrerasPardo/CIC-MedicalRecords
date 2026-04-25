/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { materialLocators } from '.';

export type Languages = 'en' | 'fr' | 'de' | 'it' | 'es' | 'pl' | 'pt';

export class MenuComponent extends BaseComponent {
    constructor(page: Page, rootElement = materialLocators.Menu.class) {
        super(page, rootElement);
    }

    getMoveButtonLocator = this.getChild('.hxp-move-button');
    getMenuItemTextLocator = this.getChild('[data-automation-id="menu-item-title"]');
    getViewDetailsButtonLocator = this.getElementByAutomationId('context-View Details');
    getMenuItemByIndexLocator = (number: number) => this.getChild('[role=\'menuitem\']').nth(number);
    getMenuItemsLocator = (locatorType = 'button') => this.getChild(`${locatorType} span span`);
    getMenuOptionButtonByText = (text: string) => this.getChild(`button ${materialLocators.Option.text}`, { hasText: text });
    getListOption = () => this.getChild(materialLocators.List.option);
    getMenuItemByText = (text: string) => this.getChild('[role=\'menuitem\']', { hasText: text });
    getMenuItemByAutomationId = (automationId: string) => this.getChild(`[data-automation-id="${automationId}"]`);
    getApplyButton = () => this.getChild('[data-automation-id=\'adf-columns-selector-apply-button\']', { hasText: 'Apply' });
    getMenuItemByTextExact = (text: string) =>
        this.getChild('[role=\'menuitem\']', { hasText: new RegExp(`^${text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
    getLanguageMenu = this.getChild('[data-automation-id="hxp-user-language-menu"]');
    getLanguageMenuItem = (langValue: any) => this.getChild(`[lang='${langValue}']`);
    getOptionByText = (text: string) => this.getChild('[role=\'option\']', { hasText: text });

    async setHierarchicalSelectorOption(option: string, menuPath: string[]): Promise<void> {
        for (const menuOption of menuPath) {
            await this.getMenuItemByText(menuOption).hover();
        }
        await this.getMenuItemByText(option).click();
    }

    async getHierarchicalSelectorOptions(menuPath: string[]): Promise<string[]> {
        for (const menuOption of menuPath) {
            await this.getMenuItemByText(menuOption).hover();
        }
        return this.getMenuItemsLocator().allInnerTexts();
    }
}

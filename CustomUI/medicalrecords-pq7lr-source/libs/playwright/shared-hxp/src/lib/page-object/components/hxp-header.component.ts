/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, Languages, MenuComponent } from '@alfresco-dbp/playwright/shared';

export const AppSwitcherList = {
    JsonEditor: 'JSON Editor',
    SecurityPolicyEditor: 'Security Policy Editor',
} as const;

export type AppSwitcherList = typeof AppSwitcherList[keyof typeof AppSwitcherList];


export class HxpHeader extends BaseComponent {
    private static rootElement = '.hxp-header';

    private matMenu = new MenuComponent(this.page);

    constructor(page: Page) {
        super(page, HxpHeader.rootElement);
    }

    private readonly appSwitcher = this.getElementByAutomationId('hxp-header-app-switcher-icon');
    private userMenuButton = this.getElementByAutomationId('hxp-header-menu-button');
    private userMenuLanguageOption = this.matMenu.getElementByAutomationId('hxp-user-language-menu');
    appTitle = this.getElementByAutomationId('app-header');

    async switchToApp(appName: AppSwitcherList): Promise<void> {
        await this.appSwitcher.click();
        await this.matMenu.getMenuItemByText(appName).click();
        await this.spinnerWaitForReload({ locator: '.loader-spinner' });
    }

    async switchLanguageTo(language: Languages): Promise<void> {
        await this.userMenuButton.click();
        await this.userMenuLanguageOption.hover();
        await this.matMenu.getLanguageMenuItem(`${language}`).click();
    }
}

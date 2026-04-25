/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, Languages, MenuComponent } from '.';
export class HxpViewerHeaderComponent extends BaseComponent {
    static rootElement = '.hxp-viewer-header';

    matMenu = new MenuComponent(this.page);

    constructor(page: Page) {
        super(page, HxpViewerHeaderComponent.rootElement);
    }

    appTitleLocator = this.getChild('.hxp-viewer-header-title');
    appLogoLocator = this.getChild('.hxp-sat-header-logo');
    moreActionsMenuButton = this.getChild('[data-automation-id="toolbar-more-menu-button"]');
    userInfoLocator = this.getChild('.adf-userinfo-name');
    getUserMenuLanguageOptionLocator = this.matMenu.getElementByAutomationId('hxp-user-language-menu');

    async switchLanguageTo(language: Languages): Promise<void> {
        await this.moreActionsMenuButton.click();
        await this.getUserMenuLanguageOptionLocator.hover();
        await this.matMenu.getLanguageMenuItem(`${language}`).click();
    }
}

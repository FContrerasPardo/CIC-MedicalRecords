/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '../base.component';
import { MenuComponent } from '../material';

export class HxpToolbarComponent extends BaseComponent {
    private static rootElement = '[data-automation-id="hxp-mat-toolbar"]';

    constructor(page: Page, rootElement = HxpToolbarComponent.rootElement) {
        super(page, rootElement);
    }

    list = new MenuComponent(this.page);

    getMultiSelectCheckboxLocator = this.getElementByAutomationId('application-releases-multi-select-checkbox');
    getActionsMenuLocator = this.getChild('[data-automation-id="toolbar-group-menu-button"]');

    moreActionsMenuButton = this.getChild('.hxp-more-action-button');
    infoButton = this.getChild('#document-properties-viewer-button');
    downloadButton = this.getChild('button[title="Download"]');
    manageColumnsButton = this.getChild('hxp-manage-column-button');

    getToolbarActionByTitle = (action: string) => this.getChild(`button[title="${action}"]`);

    async downloadFileFromToolbar(): Promise<null | string> {
        const [download] = await Promise.all([this.page.waitForEvent('download'), this.downloadButton.click()]);
        return download.path();
    }
}

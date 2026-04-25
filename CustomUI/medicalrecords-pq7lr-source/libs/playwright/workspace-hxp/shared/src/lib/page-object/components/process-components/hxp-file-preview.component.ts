/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';
import { AdfToolbarComponent } from '../adf-toolbar.component';

export class HxpFilePreviewComponent extends BaseComponent {
    private static rootElement = 'adf-viewer';

    toolbar = new AdfToolbarComponent(this.page);

    constructor(page: Page, rootElement = HxpFilePreviewComponent.rootElement) {
        super(page, rootElement);
    }

    fileName = this.toolbar.getChild('#adf-viewer-title-display-name .adf-viewer__display-name-value');
    closeButton = this.toolbar.getElementByAutomationId('adf-toolbar-left-back');
}

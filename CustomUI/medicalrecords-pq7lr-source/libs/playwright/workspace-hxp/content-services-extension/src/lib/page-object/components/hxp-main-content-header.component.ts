/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';
import { AdfBreadcrumbComponent } from '@hxp/playwright/workspace-hxp/shared';
import { HxpSearchInputComponent } from './hxp-search-input.component';

export class MainContentHeaderComponent extends BaseComponent {
    static readonly rootElement = '.hxp-main-content-header';

    breadcrumb = new AdfBreadcrumbComponent(this.page);
    searchInput = new HxpSearchInputComponent(this.page);

    constructor(page: Page) {
        super(page, MainContentHeaderComponent.rootElement);
    }

    newFileUploadButton = this.getChild('.hxp-create-document-menu-button', { hasText: ' File Upload ' });
    switchToFileViewButton = this.getChild('[data-automation-id="switch-to-file-view-button"]');
}

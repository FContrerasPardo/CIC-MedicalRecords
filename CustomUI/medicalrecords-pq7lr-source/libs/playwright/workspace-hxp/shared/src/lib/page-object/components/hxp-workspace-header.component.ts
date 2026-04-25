/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpWorkspaceHeaderComponent extends BaseComponent {
    private static rootElement = 'hxp-workspace-header';

    constructor(page: Page, rootElement = HxpWorkspaceHeaderComponent.rootElement) {
        super(page, rootElement);
    }

    logo = this.getChild('.hxp-header-logo img');
    appTitle = this.getChild('adf-layout-header h1');
    appHeaderContainer = this.getChild('.hxp-header');
}

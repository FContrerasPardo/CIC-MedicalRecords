/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from './base.component';

export class SatoriHeaderComponent extends BaseComponent {
    private static rootElement = 'sat-app-header';

    constructor(page: Page) {
        super(page, SatoriHeaderComponent.rootElement);
    }

    appHeaderTitle = this.getChild('.sat-app-header-title');
    appHeaderLogo = this.getChild('.sat-app-header-logo');
    appHeaderActionsButton = this.getChild('.sat-app-header-actions button');
    moreActionsMenuButton = this.getChild('hxp-more-menu button');
}

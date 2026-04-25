/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class SatPlatformNavPanelComponent extends BaseComponent {
    private static rootElement = '.sat-platform-nav-panel';

    constructor(page: Page) {
        super(page, SatPlatformNavPanelComponent.rootElement);
    }

    envSwitcherButton = this.getChild('#sat-platform-nav-env-switcher-button');
    envSwitcherButtonValue = this.getChild('#sat-platform-nav-env-switcher-button-value');
    expandButton = this.getElementByAutomationId('platform-nav-expand-button');
    collapseButton = this.getElementByAutomationId('platform-nav-collapse-button');
    appsList = this.getChild('.sat-platform-nav-list');
    homeButton = this.appsList.locator('a:has(p.sat-platform-nav-item-label:has-text("Home"))');
    adminPortalLabel = this.getChild('p.sat-platform-nav-item-label', { hasText: 'Administration Portal' });
    studioAdminLabel = this.getChild('p.sat-platform-nav-item-label', { hasText: 'Studio Admin' });
    studioModelerLabel = this.getChild('p.sat-platform-nav-item-label', { hasText: 'Studio Modeler' });
}

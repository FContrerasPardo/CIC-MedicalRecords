/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpIdpFloaterToolbarComponent extends BaseComponent {
    static rootElement = '#footerToolbar';

    constructor(page: Page) {
        super(page, HxpIdpFloaterToolbarComponent.rootElement);
    }

    rejectButton = this.getElementByAutomationId('idp-footer-toolbar-flag');
    changeClassButton = this.getElementByAutomationId('idp-footer-toolbar-compare');
    deleteButton = this.getElementByAutomationId('idp-footer-toolbar-trash');
    splitButton = this.getElementByAutomationId('idp-footer-toolbar-split');
    mergeButton = this.getElementByAutomationId('idp-footer-toolbar-merge');
    copyButton = this.getElementByAutomationId('idp-footer-toolbar-duplicate');
}

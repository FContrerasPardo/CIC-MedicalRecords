/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpIdpFooterContainer extends BaseComponent {
    static rootElement = '.idp-footer-container';

    constructor(page: Page) {
        super(page, HxpIdpFooterContainer.rootElement);
    }

    submitButton = this.getElementByAutomationId('idp-class-submit-button');
    saveButton = this.getElementByAutomationId('idp-class-save-button');
    unclaimButton = this.getElementByAutomationId('idp-class-unclaim-button');
    nextTaskCheckbox = this.getChild('[data-automation-id=\'idp-class-open-next-task-checkbox\']').getByRole('checkbox');
}

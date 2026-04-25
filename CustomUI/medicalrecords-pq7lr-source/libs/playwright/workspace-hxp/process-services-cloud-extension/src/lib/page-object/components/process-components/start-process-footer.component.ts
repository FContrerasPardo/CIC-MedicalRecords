/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class StartProcessFooterComponent extends BaseComponent {
    private static rootElement = '.adf-start-process-cloud-actions';

    constructor(page: Page) {
        super(page, StartProcessFooterComponent.rootElement);
    }

    startProcessButton = this.getElementByAutomationId('btn-start');
    cancelProcessButton = this.getChild('#cancel_process');
}

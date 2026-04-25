/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BaseComponent } from '@alfresco-dbp/playwright/shared';
import { Page } from '@playwright/test';

export class AdfInfoDrawer extends BaseComponent {
    private static rootElement = 'adf-info-drawer';

    constructor(page: Page, rootElement = AdfInfoDrawer.rootElement) {
        super(page, rootElement);
    }

    dueDateValue = this.getElementByAutomationId('card-datetime-value-dueDate');
    changeAssigneeButton = this.getElementByAutomationId('card-textitem-clickable-icon-assignee');
    processInstanceIdValue = this.getElementByAutomationId('card-textitem-label-processInstanceId');

    getTabByTitle = (title: string) => this.getChild('[role="tablist"] [role="tab"]', { hasText: title });
    getInputByTitle = (title: string) => this.getChild(`input[title="${title}"]`);
}

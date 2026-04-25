/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpEditVersionDialogComponent extends BaseComponent {
    static rootElement = 'hxp-version-edit-dialog';

    constructor(page: Page) {
        super(page, HxpEditVersionDialogComponent.rootElement);
    }

    versionTitleInput = this.getElementByAutomationId('hxp-document-version-edit-title').locator('input');
    versionDescriptionInput = this.getElementByAutomationId('hxp-document-version-edit-description').locator('textarea');
    saveButton = this.getChild('button .hxp-version-edit-dialog-save-btn-title');
}

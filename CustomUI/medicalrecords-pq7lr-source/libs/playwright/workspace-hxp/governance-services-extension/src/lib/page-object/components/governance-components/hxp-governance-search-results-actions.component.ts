/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, MatDialogContainer } from '@alfresco-dbp/playwright/shared';

export class HxpGovernanceSearchResultsActionsComponent extends BaseComponent {
    static readonly rootElement = 'hxp-action-toolbar';
    matDialog = new MatDialogContainer(this.page);

    constructor(page: Page) {
        super(page, HxpGovernanceSearchResultsActionsComponent.rootElement);
    }

    recordPropertiesButton = this.getChild('hxp-record-properties-button');
    recordDeleteButton = this.getChild('hxp-record-delete-button');
    deleteConfirmationButton = this.matDialog.dialog.locator('.hxp-record-delete-btn-label');
}

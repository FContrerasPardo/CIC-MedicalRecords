/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '../';

export class HxpCancelEditDialogComponent extends BaseComponent {
    static readonly rootElement = '.hxp-cancel-edit-dialog';

    constructor(page: Page) {
        super(page, HxpCancelEditDialogComponent.rootElement);
    }

    continueEditingButton = this.getChild('[data-automation-id="continue-editing-button"]');
    discardButton = this.getChild('[data-automation-id="discard-button"]');
    saveButton = this.getChild('[data-automation-id="save-and-exit-button"]');
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpIdpRejectClassDialog extends BaseComponent {
    static readonly rootElement = '.idp-reject-document-dialog';

    constructor(page: Page) {
        super(page, HxpIdpRejectClassDialog.rootElement);
    }

    cancelButton = this.getElementByAutomationId('idp-reject-dialog__cancel-button');
    submitChangeButton = this.getElementByAutomationId('idp-reject-dialog__save-button');
    classSearchField = this.getElementByAutomationId('idp-reject-reason-search');
    fadedRejectReason = this.getElementByAutomationId('idp-dialog-list-item-1---faded');
    rejectNoteInputField = this.getElementByAutomationId('idp-reject-dialog__input__reject-note');
    removeRejectFlagButton = this.getElementByAutomationId('idp-reject-dialog__remove-button');
}

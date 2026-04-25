/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpIdpRejectFieldDialog extends BaseComponent {
    static rootElement = '.cdk-overlay-pane';

    constructor(page: Page) {
        super(page, HxpIdpRejectFieldDialog.rootElement);
    }

    cancelRejectButton = this.getElementByAutomationId('idp-reject-dialog__cancel-button');
    classSearchField = this.getElementByAutomationId('idp-reject-reason-search');
    fadedRejectReason = this.getElementByAutomationId('idp-dialog-list-item-1---faded');
    incorrectClassRejectReason =  this.getElementByAutomationId('idp-dialog-list-item-2---incorrect-document-class');
    missingPageRejectReason = this.getElementByAutomationId('idp-dialog-list-item-2---missing-page');
    rejectReasonNote = this.getElementByAutomationId('idp-reject-dialog__input__reject-note');
    submitChangeButton = this.getElementByAutomationId('idp-reject-dialog__save-button');
}

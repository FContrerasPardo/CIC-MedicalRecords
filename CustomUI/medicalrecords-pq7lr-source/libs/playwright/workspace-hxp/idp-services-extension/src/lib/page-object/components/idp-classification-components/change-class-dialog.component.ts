/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpIdpChangeClassDialog extends BaseComponent {
    public static readonly rootElement = '.idp-class-change-dialog';

    constructor(page: Page) {
        super(page, HxpIdpChangeClassDialog.rootElement);
    }

    submitChangeButton = this.getElementByAutomationId('idp-change-class-button');
    classSearchField = this.getElementByAutomationId('idp-filterable-selection-list__search-field-input');
    payslipClass = this.getElementByAutomationId('idp-dialog-list-item-2---payslip');
    invoiceClass = this.getElementByAutomationId('idp-dialog-list-item-3---invoice');
    classOptionByName = (className: string) => this.getChild('[data-automation-id^="idp-dialog-list-item-"]', { hasText: className });

    async selectClassByName(className: string): Promise<void> {
        await this.classSearchField.fill(className);
        const option = this.classOptionByName(className).first();
        await option.waitFor({ state: 'visible' });
        await option.click();
    }
}

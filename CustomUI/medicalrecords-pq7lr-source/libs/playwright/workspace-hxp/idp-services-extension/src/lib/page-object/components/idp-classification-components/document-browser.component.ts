/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';
import { HxpIdpClassListItemComponent } from './class-list-item.component';

export class HxpIdpDocumentBrowserComponent extends BaseComponent {
    static readonly rootElement = '.idp-content-container__document-browser';

    constructor(page: Page) {
        super(page, HxpIdpDocumentBrowserComponent.rootElement);
    }

    getClass(classIndex: number) {
        return new HxpIdpClassListItemComponent(this.page, classIndex);
    }

    className = this.getElementByAutomationId('idp-class-name');
    pageName = this.getElementByAutomationId('idp-page-name');
    documentName = this.getElementByAutomationId('idp-document-name');
    classDropdownButton = this.getElementByAutomationId('idp-class-list-dropdown');
    documentDropdownButton = this.getElementByAutomationId('idp-list-item-document-toggle-button');
    invoiceItem = this.getElementByNameLocator('idp-class-name', 'Invoice');
    payslipItem = this.getElementByNameLocator('idp-class-name', 'Payslip');
    issueToggle = this.getElementByAutomationId('show-issue-toggle');
    sortByOption = this.getElementByAutomationId('idp-header-toolbar-sort');
    undoButton = this.getElementByAutomationId('idp-undo-button');
    redoButton = this.getElementByAutomationId('idp-redo-button');
    classConfidenceTag = this.getChild('.idp-classification-confidence-tag-green');
}

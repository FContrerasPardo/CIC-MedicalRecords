/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class HxpIdpFieldVerificationElements extends BaseComponent {
    public static readonly rootElement = 'body';

    constructor(page: Page) {
        super(page, HxpIdpFieldVerificationElements.rootElement);
    }

    bodyLocator = this.page.locator('body');

    discardDialogButton = this.page.locator('[data-automation-id^="idp-discard-dialog__discard-button"]');
    discardDialogCancelButton = this.page.locator('[data-automation-id^="idp-discard-dialog__cancel-button"]');
    taskNameLocator = this.page.locator('[data-automation-id="auto_id_name"]');
    pageNavigation = this.page.locator('hyland-idp-viewer-page-navigation');

    fieldIgnoredForAutoIcon = this.page.locator('[data-automation-id="field-ignored-for-auto-icon"]');
    cellEditOrFocusedInput = this.page.locator('.idp-cell-edit-input, input:focus');

    organizationField = this.page.locator('[data-automation-id^="idp-field-Organization"]');
    cityField = this.page.locator('[data-automation-id^="idp-field-City"]');
    arenaField = this.page.locator('[data-automation-id^="idp-field-Arena"]');
    divisionField = this.page.locator('[data-automation-id^="idp-field-Division"]');
    conferenceField = this.page.locator('[data-automation-id^="idp-field-Conference"]');
    companyField = this.page.locator('[data-automation-id^="idp-field-Company"]');
    invoiceNumberField = this.page.locator('[data-automation-id^="idp-field-InvoiceNumber"]');
    dateField = this.page.locator('[data-automation-id^="idp-field-Date"]');
    totalLineItemsField = this.page.locator('[data-automation-id^="idp-field-TotalLineItems"]');
    totalAmountField = this.page.locator('[data-automation-id^="idp-field-TotalAmount"]');
    freeThrowsFieldIssue = this.page.locator('[data-automation-id^="field-has-issueFreeThrows"]');
    educationField = this.page.locator('[data-automation-id^="idp-field-Education"]');
    signedField = this.page.locator('[data-automation-id^="idp-field-Signed"]');

    companyFormInput = this.page.locator('input[id^="idp_Company"]');
    employeeNameFormInput = this.page.getByRole('textbox', { name: 'Employee Name' });
    workedDaysFormInput = this.page.getByRole('textbox', { name: 'Worked Days' });
    netPayFormInput = this.page.getByRole('textbox', { name: 'Net Pay' });
    invoiceNumberFormInput = this.page.locator('input[id^="idp_InvoiceNumber"]');
    dateFormInput = this.page.locator('input[id^="idp_Date"]');
    totalLineItemsFormInput = this.page.locator('input[id^="idp_TotalLineItems"]');
    totalAmountFormInput = this.page.locator('input[id^="idp_TotalAmount"]');
    textField01FormInput = this.page.locator('input[id^="idp_TextField01"]');
    textField02FormInput = this.page.locator('input[id^="idp_TextField02"]');
    textField03FormInput = this.page.locator('input[id^="idp_TextField03"]');
    textField04FormInput = this.page.locator('input[id^="idp_TextField04"]');
    textField05FormInput = this.page.locator('input[id^="idp_TextField05"]');
    textField06FormInput = this.page.locator('input[id^="idp_TextField06"]');
    educationFormInput = this.page.locator('input[id^="idp_Education"]');
    signedFormInput = this.page.locator('input[id^="idp_Signed"]');
    reasoningField01FormInput = this.page.locator('input[id^="idp_ReasoningField01"]');
    reasoningField02FormInput = this.page.locator('input[id^="idp_ReasoningField02"]');

    eraFormInput = this.page.getByRole('textbox', { name: 'ERA' });
    strikeoutsFormInput = this.page.getByRole('textbox', { name: 'Strikeouts' });
    playerNameFormInput = this.page.getByRole('textbox', { name: 'Player Name' });
    divisionFormInput = this.page.getByRole('textbox', { name: 'Division' });

    validationProgressSpinner = this.page.locator('[data-automation-id="idp-validation-progress-spinner"]');

    issueCountLocator = this.page.locator('[data-automation-id^="idp-issue-count"]');

    extractionTableContainer = this.page.locator('#extraction-table-container');
    extractionTable = this.page.locator('hyland-idp-extraction-table');
    noDataOverlay = this.page.locator('.idp-no-data-overlay');
    noDataOverlayMessage = this.page.locator('.idp-no-data-overlay-table-message');
    tableReferenceWidget = this.page.locator('.hxp-table-reference-widget[role="button"]');
    basketballTableReferenceWidget = this.page.locator('.hxp-table-reference-widget[id^="idp_ba17ad87"]');
    basketballAddTableButton = this.page.locator('[data-automation-id^="idp-add-table-button-ba17ad87"]');
    basketballTableRowCount = this.page.locator('[data-automation-id^="idp-table-row-count-ba17ad87"]');
    tableCellInput = this.page.locator('table input.idp-cell-edit-input');
    tableColumnHeader = this.page.locator('th[role="columnheader"]');
    tableRowNumberCell = this.page.locator('td.idp-table-row-number-cell');
    tableCell = this.page.locator('td.idp-cell');
    tableFieldNameHeader = this.page.locator('th[role="columnheader"]:has-text("TableFieldName")');
    tableIconCell = this.page.locator('.idp-table-icon-cell, th:first-child');
    tableExtractionLabel = this.page.locator('.hxp-table-reference-widget .sat-tag-label');
    addTableButton = this.page.locator('[data-automation-id^="idp-add-table-button"]');
    validationTableReferenceWidget = this.page.locator('.hxp-table-reference-widget[id^="idp_fd421db0"]');
    validationTableRowCount = this.page.locator('[data-automation-id^="idp-table-row-count-fd421db0"]');

    /** Returns locator for a metadata panel field by its automation ID suffix */
    getMetadataPanelField(fieldId: string) {
        return this.page.locator(`[data-automation-id^="idp-field-${fieldId}"]`);
    }

    /** Returns locator for a dynamic form field input by 1-based index */
    getFormFieldInput(index: number) {
        return this.page.locator(`input[id^="idp_Field${String(index).padStart(2, '0')}"]`);
    }

    /** Returns locator for a form field input by its ID prefix */
    getFormFieldInputById(idPrefix: string) {
        return this.page.locator(`input[id^="${idPrefix}"]`);
    }

    /** Returns the cell edit error icon for a given input ID */
    getCellEditErrorIcon(inputId: string) {
        return this.page.locator(`[data-automation-id="idp-cell-edit-icon-${inputId}"]`);
    }
}

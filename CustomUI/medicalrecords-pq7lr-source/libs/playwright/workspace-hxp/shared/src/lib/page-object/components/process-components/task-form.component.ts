/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AdfConfirmDialog, BaseComponent, materialLocators, OverlayPaneComponent } from '@alfresco-dbp/playwright/shared';
import { DropdownComponent } from '../generic-components';

export abstract class TaskFormComponent extends BaseComponent {
    dropdown = new DropdownComponent(this.page);
    overlayPaneComponent = new OverlayPaneComponent(this.page);

    allTabHeaderElements = this.getChild(`${materialLocators.Tab.header} [id*=${materialLocators.Tab.id}]`);

    getFieldByLabel = (labelText: string) => this.getChild('adf-form-field', { hasText: labelText });
    getActionButton = (buttonName: string) => this.getChild(`${materialLocators.Card.actions} button`, { hasText: buttonName });
    getFieldContainerById = (id: string) => this.getChild(`#field-${id}-container`);
    getFieldValidationStatusTag = (id: string) => this.getFieldContainerById(id).locator(`[data-automation-id="idp-field-validation-status-${id}"]`);
    getFieldById = (id: string) => this.getChild(`#${id}`);
    getFieldButton = (fieldLabelText: string, buttonLabel: string) =>
        this.getFieldByLabel(fieldLabelText).locator('button', { hasText: buttonLabel });
    getFieldInputById = (id: string) => this.getFieldContainerById(id).locator('input');
    getDatePickerByWidgetId = (id: string) => this.getFieldContainerById(id).locator(materialLocators.DatePicker.toggle);
    getHeaderById = (id: string) => this.getFieldContainerById(id).locator('.adf-container-widget-header');
    getSectionFieldById = (sectionId: string, fieldId: string) => this.getFieldContainerById(sectionId).locator(`#field-${fieldId}-container`);
    getSectionFieldInputById = (sectionId: string, fieldId: string) => this.getSectionFieldById(sectionId, fieldId).locator('input');
    getHeaderLabelById = (id: string) => this.getHeaderById(id).locator(`#container-header-label-${id}`);
    getFieldColumnById = (id: string) => this.getFieldContainerById(id).locator('> div');
    getFieldNthColumnById = (id: string, nth: number) => this.getFieldColumnById(id).nth(nth);
    getSectionFieldInNthColumnById = (sectionId: string, fieldId: string, nth: number) =>
        this.getFieldNthColumnById(sectionId, nth).locator(`#field-${fieldId}-container`);
    getErrorMessage = (id?: string) => (id ? this.getChild(`adf-error-text-${id}`) : this.getChild('.adf-error-text'));
    getTabHeaderElement = (tabName: string) => this.getChild(`${materialLocators.Tab.header} [id*=${materialLocators.Tab.id}]`, { hasText: tabName });
    getFormOutcomeButtonByName = (outcomeName: string) => this.getChild(`#adf-form-${outcomeName}`);
    getFieldButtonById = (id: string) => this.getFieldContainerById(id).locator('button');

    getRepeatableSectionRowContainersById = (id: string) => this.getFieldContainerById(id).locator('.adf-grid-list-container');

    getDropdownInRepeatableSectionRow = async (sectionId: string, rowNumber: number, dropdownIdPrefix: string) => {
        await this.page.locator('.cdk-overlay-backdrop').waitFor({ state: 'detached' });
        const rowContainer = this.getRepeatableSectionRowContainerByNumber(sectionId, rowNumber);
        const fieldContainer = rowContainer.locator(`div[id^="field-${dropdownIdPrefix}-Row"]`);
        return fieldContainer.locator('[role="combobox"]');
    };

    getRadioButtonInRepeatableSectionRow = (sectionId: string, rowNumber: number, radioButtonId: string, radioValue?: string) => {
        const rowContainer = this.getRepeatableSectionRowContainerByNumber(sectionId, rowNumber);
        const radioGroup = rowContainer.locator(`[id^="${radioButtonId}-Row"]`).locator('[role="radiogroup"]');
        return radioValue ? radioGroup.locator(`input[type="radio"][value="${radioValue}"]`) : radioGroup;
    };

    getFieldInRepeatableSectionRow = (sectionId: string, rowNumber: number, fieldId: string) => {
        const rowContainer = this.getRepeatableSectionRowContainerByNumber(sectionId, rowNumber);
        return rowContainer.locator(`div[id^="field-${fieldId}-Row"]`);
    };

    private getRepeatableSectionRowContainerByNumber = (id: string, rowNumber: number) =>
        this.getRepeatableSectionRowContainersById(id).nth(rowNumber - 1);

    private getRepeatableSectionAddRowButton = (id: string) => this.getFieldContainerById(id).locator('button.adf-container-widget-row-action');
    private getRepeatableSectionRemoveRowButton = (id: string, rowNumber: number) =>
        this.getRepeatableSectionRowContainerByNumber(id, rowNumber).locator('button.adf-grid-list-row-remove-button');

    async addRepeatableSectionRows(sectionId: string, numberOfRows: number): Promise<void> {
        for (let i = 0; i < numberOfRows; i++) {
            await this.getRepeatableSectionAddRowButton(sectionId).click();
        }
    }

    async removeRepeatableSectionRowsWithConfirmation(
        repeatableSectionId: string,
        fromRowNumber: number,
        toRowNumber: number,
        confirmDialog: AdfConfirmDialog
    ): Promise<void> {
        for (let rowNumber = fromRowNumber; rowNumber > toRowNumber; rowNumber--) {
            await this.getRepeatableSectionRemoveRowButton(repeatableSectionId, rowNumber).click();
            await confirmDialog.confirmButton.click();
            await confirmDialog.waitForDialogToClose();
        }
    }

    async clickFormOutcomeAndWaitForSubmitResponse(formOutcome: string): Promise<any> {
        const [apiResponse] = await Promise.all([
            this.page.waitForResponse((response) => response.url().match(/\/form\/v1\/forms\/.*?\/submit/) && response.status() === 200),
            this.getFormOutcomeButtonByName(formOutcome).click(),
        ]);
        return apiResponse.json();
    }
}

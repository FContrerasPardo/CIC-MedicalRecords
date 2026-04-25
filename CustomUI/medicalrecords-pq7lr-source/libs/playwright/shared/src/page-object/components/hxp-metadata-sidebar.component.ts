/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, materialLocators } from '.';
import { HxpCancelEditDialogComponent } from './modals/hxp-cancel-edit-dialog.component';
import { timeouts } from '../../utils';

/**
 * Names used for custom Content Type properties.
 */
export const CustomFieldNames = {
    // metadata-layout schema fields
    nmlBooleanValue: 'nml_booleanValue',
    nmlDateValue: 'nml_dateValue',
    nmlIntValue: 'nml_intValue',
    nmlStringValue: 'nml_stringValue',

    // two-string schema fields
    twsStringOne: 'tws_stringOne',
    twsStringTwo: 'tws_stringTwo',

    // required-metadata-layout fields
    reqiInteger: 'reqi_integer',
    reqsString: 'reqs_string',

    // inherit-metadata-layout fields
    imsDateTimeValue: 'ims_dateTimeValue',
    imsFloatingValue: 'ims_floatingValue',
} as const;

export type CustomFieldName = typeof CustomFieldNames[keyof typeof CustomFieldNames];

export class HxpMetadataSidebarComponent extends BaseComponent {
    static readonly rootElement = 'hxp-metadata-sidebar';

    constructor(page: Page) {
        super(page, HxpMetadataSidebarComponent.rootElement);
    }

    confirmationDialog = new HxpCancelEditDialogComponent(this.page);

    getButtonByText = (text: string) => this.getChild('.hxp-accordion-controls-button').filter({ hasText: text });
    getSchemaByTitle = (title: string) => this.getChild(materialLocators.Expansion.panel.header).filter({ hasText: title });
    getPropertiesByLabel = (label: string) => this.getChild(`[data-automation-id="header-${label}"]`);

    toggleAllButton = this.getChild('[data-automation-id="metadata-accordion-toggle-all"]');
    categoryField = this.getChild('[data-automation-id="header-sys_primaryType"]');
    categoryValue = this.categoryField.locator('[data-automation-id="select-box"]');
    fileNameField = this.getChild('[data-automation-id="card-textitem-value-sysfile_blob.filename"]');
    titleField = this.getChild('[data-automation-id="card-textitem-value-sys_title"]');

    // Additional Info tab fields
    private getAdditionalInfoValue(name: string) {
        return this.getChild(`[data-automation-id="hxp-metadata-additional-info-value-${name}"]`);
    }

    createdDate = this.getAdditionalInfoValue('sys_created');
    lastModifiedDate = this.getAdditionalInfoValue('sys_modified');
    docCreator = this.getAdditionalInfoValue('sys_creator');
    lastContributor = this.getAdditionalInfoValue('sys_lastContributor');
    docContributors = this.getAdditionalInfoValue('sys_contributors');
    docSize = this.getAdditionalInfoValue('sysfile_blob.length');
    mimeType = this.getAdditionalInfoValue('sysfile_blob.mimeType');
    docPath = this.getAdditionalInfoValue('sys_path');

    private getMetadataSidebarElement(name: string) {
        return this.getChild(`[data-automation-id="hxp-metadata-sidebar-${name}"]`);
    }

    sidebarTitleValue = this.getMetadataSidebarElement('title');
    additionalInfoTab = this.getMetadataSidebarElement('additional-info-tab');
    propertiesTab = this.getMetadataSidebarElement('properties-tab');
    editButton = this.getMetadataSidebarElement('edit-button');
    saveButton = this.getMetadataSidebarElement('save-button');
    cancelButton = this.getMetadataSidebarElement('cancel-button');
    closeButton = this.getMetadataSidebarElement('close-button');

    // Properties tab custom fields
    private getCustomMetadataLayoutField(
        type: 'boolean' | 'date' | 'datetime' | 'int' | 'float' | 'string',
        part: 'label' | 'value' | 'input' | 'toggle' | 'header' | 'clear',
        name: string
    ) {
        const selectors: Record<string, string> = {
            'boolean.label': `card-boolean-label-${name}`,
            'boolean.value': `card-boolean-${name}`,
            'date.label': `card-dateitem-label-${name}`,
            'date.value': `card-date-value-${name}`,
            'date.toggle': `datepickertoggle-${name}`,
            'datetime.label': `card-dateitem-label-${name}`,
            'datetime.value': `card-dateitem-value-${name}`,
            'int.label': `card-textitem-label-${name}`,
            'int.value': `card-textitem-value-${name}`,
            'int.input': `card-textitem-editchipinput-${name}`,
            'float.label': `card-textitem-label-${name}`,
            'float.value': `card-textitem-value-${name}`,
            'string.label': `card-textitem-label-${name}`,
            'string.value': `card-textitem-value-${name}`,
        };

        const selector = selectors[`${type}.${part}`];
        if (!selector) {
            throw new Error(`Unsupported metadata layout combination: ${type}.${part}`);
        }

        const locator = this.getChild(`[data-automation-id="${selector}"]`);
        return part === 'toggle' ? locator.locator('button') : locator;
    }

    boolLabel(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('boolean', 'label', name);
    }

    boolValue(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('boolean', 'value', name);
    }

    dateLabel(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('date', 'label', name);
    }

    dateValue(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('date', 'value', name);
    }

    dateToggleButton(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('date', 'toggle', name);
    }

    dateTimeLabel(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('datetime', 'label', name);
    }

    dateTimeValue(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('datetime', 'value', name);
    }

    intLabel(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('int', 'label', name);
    }

    intValue(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('int', 'value', name);
    }

    intInput(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('int', 'input', name);
    }

    stringLabel(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('string', 'label', name);
    }

    stringValue(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('string', 'value', name);
    }

    floatLabel(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('float', 'label', name);
    }

    floatValue(name: CustomFieldName) {
        return this.getCustomMetadataLayoutField('float', 'value', name);
    }

    intChipText = this.getChild('.adf-textitem-chip-list');

    /*
    We need a waitForTimeout to wait for the async cardViewUpdateService subscription
    to process the field change and set hasPendingChanges=true in the component
    before clicking Cancel. Only then the confirmation dialog will appear.
    This delay is imperceptible to users but necessary for test reliability.
    */

    clickCancelButton = async (): Promise<void> => {
        await this.page.waitForTimeout(timeouts.typingDelay);
        await this.cancelButton.click();
    };

    clickSaveButton = async (): Promise<void> => {
        await this.page.waitForTimeout(timeouts.typingDelay);
        await this.saveButton.click();
    };

    ensureEditMode = async (): Promise<void> => {
        const isEditMode = await this.saveButton.isVisible().catch(() => false);
        if (!isEditMode) {
            await this.editButton.nth(0).click();
        }
    };

    async editTitle(fileTitle: string): Promise<void> {
        await this.ensureEditMode();
        await this.titleField.fill(fileTitle);
    }

    async editFileName(fileName: string): Promise<void> {
        await this.ensureEditMode();
        await this.fileNameField.fill(fileName);
    }

    async editCategory(category: string): Promise<void> {
        await this.ensureEditMode();
        await this.categoryValue.waitFor({ state: 'visible' });
        await this.page.waitForFunction(
            (element) => element.textContent?.trim().length > 0,
            await this.categoryValue.elementHandle()
        );

        await this.categoryField.click();
        const categoryOption = this.page.getByRole('option', { name: category, exact: true }).filter({ hasText: category });
        await categoryOption.scrollIntoViewIfNeeded();
        await categoryOption.click();
        await this.page.waitForLoadState();
    }

    async editDateDayValue(name: CustomFieldName, day: number): Promise<void> {
        await this.ensureEditMode();
        await this.dateToggleButton(name).click();
        await this.pickDateDayValue(day);
        await this.page.waitForTimeout(timeouts.typingDelay);
    }

    private async pickDateDayValue(day: number): Promise<void> {
        const pickerRoot = this.page.locator(materialLocators.DatetimePicker.root);
        await pickerRoot.waitFor({ state: 'visible' });
        await pickerRoot.locator(materialLocators.DatetimePicker.calendar.bodyCellContent).getByText(String(day), { exact: true }).first().click();
    }

    async getDateDisplay(name: CustomFieldName): Promise<string> {
        const text = await this.dateValue(name).textContent();
        return (text ?? '').trim();
    }

    async expandAllIfNeeded(): Promise<void> {
        await this.toggleAllButton.waitFor({ state: 'visible' });
        const buttonText = await this.toggleAllButton.textContent();
        if (buttonText?.trim() === 'Expand All') {
            await this.toggleAllButton.click();
        }
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BaseComponent, DropdownStandardComponent } from '@alfresco-dbp/playwright/shared';
import { Page } from '@playwright/test';

export class PublicFormComponent extends BaseComponent {
    dropdown = new DropdownStandardComponent(this.page);

    constructor(page: Page) {
        super(page, 'hxp-public-form');
    }

    cancelProcessButton = this.getElementByAutomationId('hxp-public-process-cancel-button');
    // eslint-disable-next-line @cspell/spellchecker
    captcha = this.getChild('awswaf-captcha');
    outcomeButtons = this.getChild('.adf-cloud-form-content-card-actions adf-cloud-form-custom-outcomes');
    getProcessButton = (action: 'start' | 'cancel') => this.getElementByAutomationId(`hxp-public-process-${action}-button`);
    getFormFieldByLabel = (label: string) => this.getChild('adf-form-field', { hasText: label });
    getInvalidFieldByLabel = (label: string) => this.getFormFieldByLabel(label).locator('.adf-invalid');

    async fillFormInputsByLabel(fieldsData: { label: string; value: string }[]): Promise<void> {
        for (const field of fieldsData) {
            await this.getFormFieldByLabel(field.label).locator('input').fill(field.value);
        }
    }

    async setDropdownValueByLabel(label: string, value: string): Promise<void> {
        await this.getFormFieldByLabel(label).getByRole('combobox').click();
        await this.dropdown.getOptionByValue(value).click();
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { expect, Page } from '@playwright/test';
import { BaseComponent, materialLocators } from '@alfresco-dbp/playwright/shared';

export class HxpUploadPropertiesEditor extends BaseComponent {
    static readonly rootElement = 'hxp-workspace-upload-properties-editor';

    constructor(page: Page) {
        super(page, HxpUploadPropertiesEditor.rootElement);
    }

    locationPicker = this.getChild('#hxp-document-location-picker-input');
    categoryPicker = this.getChild(`hxp-document-category-picker ${materialLocators.Select.value.class}`);
    saveButton = this.getChild('button');
    toastMessage = this.page.locator('span.hxp-workspace-upload-properties-editor__toast__message');

    getLocationOption = (optionName: string) => this.page.locator('div.hxp-document-location-picker-overlay').getByText(optionName);
    getCategoryOption = (optionName: string) => this.page.locator('#hxp-document-category-picker-select-panel').getByText(optionName);

    expandLocationChevron = async (): Promise<void> => {
        const overlay = this.page.locator('.hxp-document-location-picker-overlay');
        await overlay.waitFor({ state: 'visible' });

        const chevronButton = overlay.locator('.hxp-selected button[data-automation-id="document-tree-toggle-button"]');
        const isExpanded = await chevronButton.getAttribute('aria-expanded');

        if (isExpanded === 'false') {
            await chevronButton.click();
            await chevronButton.waitFor({ state: 'attached' });
            await expect(chevronButton).toHaveAttribute('aria-expanded', 'true');
        }
    };
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent, materialLocators } from '@alfresco-dbp/playwright/shared';
import { HxpUploadPropertiesEditor } from './hxp-upload-properties-editor.component';

export class HxpUploadDialogComponent extends BaseComponent {
    static rootElement = '.hxp-workspace-upload-dialog';

    propertiesEditor = new HxpUploadPropertiesEditor(this.page);

    constructor(page: Page) {
        super(page, HxpUploadDialogComponent.rootElement);
    }

    tableRow = this.getChild('hxp-workspace-upload-list adf-datatable-row');
    checkbox = this.getChild(`.hxp-workspace-upload-dialog__content ${materialLocators.Checkbox.root}`);
    submitButton = this.getChild('#hxp-workspace-upload-dialog-upload');
    clearSelectionButton = this.getChild('.hxp-workspace-upload-list__toolbar__selection_reset_button');
    deleteButton = this.getChild('.hxp-workspace-upload-list__toolbar__delete_button');
    uploadListRetryButton = this.getChild('.hxp-workspace-upload-list__toolbar__retry_button');
    getUploadListFileError = (fileName: string) => this.getChild('.hxp-workspace-upload-list__container__table__error', { hasText: fileName });
    getTableRowFileTitle = (fileName: string) => this.getChild('hxp-workspace-upload-list adf-datatable-row', { hasText: fileName });
    getUploadListSelectedRowByName = (name: string | number) =>
        this.getChild('adf-datatable-row[aria-selected="true"]', { hasText: name.toString() });
}

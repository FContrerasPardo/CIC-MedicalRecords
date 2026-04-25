/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { RadioButtonComponent, DropdownComponent } from '../generic-components';
import { TaskFormComponent } from './task-form.component';
import { DatePicker, OverlayPaneComponent } from '@alfresco-dbp/playwright/shared';

export class UserTaskFormComponent extends TaskFormComponent {
    private static rootElement = 'adf-cloud-user-task';

    dropdownComponent = new DropdownComponent(this.page);
    radioButtonComponent = new RadioButtonComponent(this.page);
    overlayPaneComponent = new OverlayPaneComponent(this.page);
    datepicker = new DatePicker(this.page);

    constructor(page: Page) {
        super(page, UserTaskFormComponent.rootElement);
    }

    completeButton = this.getChild('#adf-form-complete');
    cancelButton = this.getChild('#adf-cloud-cancel-task');
    saveButton = this.getChild('#adf-form-save');
    formContainer = this.getChild('.adf-cloud-form-container');
    peopleWidgetProgressBar = this.getChild('[role="progressbar"] div').nth(1);
    metadataProperties = this.getChild('hxp-properties-viewer-content');

    getPdfViewerDocument = (widgetId: string) => this.getFieldContainerById(widgetId).locator('adf-pdf-viewer [role="document"]');
    getPdfViewerControlPanel = (widgetId: string) => this.getFieldContainerById(widgetId).locator('.adf-pdf-viewer__toolbar');
    getPdfViewerControlPanelScale = (widgetId: string) => this.getFieldContainerById(widgetId).locator('.adf-pdf-viewer__toolbar-page-scale');
    getPdfViewerControlPanelScaleButton = (widgetId: string) => this.getFieldContainerById(widgetId).locator('#viewer-scale-page-button');
    getMetadataViewer = (widgetId: string) => this.getFieldContainerById(widgetId).locator('hxp-properties-viewer-widget [role="region"]');
}

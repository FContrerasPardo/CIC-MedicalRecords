/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HxpIdpShortcutDialogComponent, HxpIdpStickyButtonsComponent } from '../components/idp-classification-components';
import {
    // uncomment as we need to use them
    // FieldVerificationRootContainer,
    HxpIdpExtractionResultContainer,
    HxpIdpFieldVerificationDocumentViewerComponent,
    HxpIdpFieldVerificationElements,
    HxpIdpFieldVerificationHeaderComponent,
    HxpIdpFieldVerificationViewerTextLayer,
    HxpIdpFooterContainer,
    HxpIdpMetadataPanelComponent,
    HxpIdpRejectFieldDialog,
    HxpIdpFormTable,
} from '../components/idp-field-verification-components';
import { TaskDetailsPage } from '@hxp/playwright/workspace-hxp/shared';

export class FieldVerificationPage extends TaskDetailsPage {
    shortcutDialog = new HxpIdpShortcutDialogComponent(this.page);
    stickyButtons = new HxpIdpStickyButtonsComponent(this.page);
    documentViewer = new HxpIdpFieldVerificationDocumentViewerComponent(this.page);
    fieldVerificationFooter = new HxpIdpFooterContainer(this.page);
    fieldVerificationDocumentViewer = new HxpIdpFieldVerificationDocumentViewerComponent(this.page);
    fieldVerificationExtractionResult = new HxpIdpExtractionResultContainer(this.page);
    fieldVerificationHeader = new HxpIdpFieldVerificationHeaderComponent(this.page);
    fieldVerificationViewerTextLayer = new HxpIdpFieldVerificationViewerTextLayer(this.page);
    metadataPanel = new HxpIdpMetadataPanelComponent(this.page);
    rejectFieldDialog = new HxpIdpRejectFieldDialog(this.page);
    formTable = new HxpIdpFormTable(this.page);
    idpElements = new HxpIdpFieldVerificationElements(this.page);
    // uncomment as we need to use them
    // fieldVerificationContainer = new FieldVerificationRootContainer(this.page);

    tableReferenceWidget = this.page.locator('.hxp-table-reference-widget[role="button"]');
}

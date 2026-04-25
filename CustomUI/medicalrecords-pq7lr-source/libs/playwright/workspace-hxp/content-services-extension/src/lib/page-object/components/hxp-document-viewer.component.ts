/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { BaseComponent, HxpMetadataSidebarComponent, timeouts } from '@alfresco-dbp/playwright/shared';
import { AdfBreadcrumbComponent } from '@hxp/playwright/workspace-hxp/shared';

export const ViewerTypes = {
    Pdf: 'adf-pdf-viewer',
    Img: 'adf-img-viewer',
    Word: 'adf-pdf-viewer',
    Excel: 'adf-pdf-viewer',
    Powerpoint: 'adf-pdf-viewer',
    Tiff: 'adf-pdf-viewer',
    Txt: 'adf-txt-viewer',
    UnknownFormat: 'adf-viewer-unknown-format',
    Loader: 'div.adf-viewer-render__loading-screen',
} as const;

export type ViewerTypes = typeof ViewerTypes[keyof typeof ViewerTypes];

export class HxpDocumentViewerComponent extends BaseComponent {
    static readonly rootElement = 'hxp-document-viewer';
    breadcrumb = new AdfBreadcrumbComponent(this.page);
    metadataSidebar = new HxpMetadataSidebarComponent(this.page);

    constructor(page: Page) {
        super(page, HxpDocumentViewerComponent.rootElement);
    }

    adfViewer = this.getChild('.adf-viewer');
    viewerRender = this.getChild('adf-viewer-render');
    closeButton = this.getChild('#document-viewer-close-button');
    infoButton = this.getElementByAutomationId('document-properties-viewer-button');
    moreActionsButton = this.getChild('hxp-document-more-action button');
    unknownFormatErrorMessage = this.getChild('.adf-viewer__unknown-label');
    versionSelector = this.getChild('hxp-document-version-selector [role="combobox"]');
    documentContent = this.getChild('span[role=\'presentation\']').first();
    deleteDocumentButton = this.getChild('hxp-content-delete');
    versionDropdownList = this.getChild('.hxp-document-version-option').getByRole('option');
    downloadButton = this.getChild('#document-viewer-single-download-button');
    switchToFolderViewButton = this.getChild('[data-automation-id="switch-to-folder-view-button"]');

    getBreadcrumbArray = async () => this.breadcrumb.getBreadcrumbArray(this.rootElementString);
    getViewerByType = (viewerType: ViewerTypes): Locator => this.getChild(viewerType);
    waitForReload = async () => this.spinnerWaitForReload({ locator: ViewerTypes.Loader, appearTimeout: timeouts.default });

    async getDocumentContent(): Promise<string> {
        const generatedDocumentContent = await this.viewerRender.allInnerTexts();
        const formattedContent = generatedDocumentContent.map((item) => item.replaceAll('\n', ' ').trim()).join(' ');
        const normalizedContent = formattedContent.replaceAll(/\s+/g, ' ');
        return normalizedContent;
    }
}

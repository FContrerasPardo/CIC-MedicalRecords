/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page, Locator } from '@playwright/test';
import { BaseComponent, timeouts } from '@alfresco-dbp/playwright/shared';

export class HxpIdpExtractionResultContainer extends BaseComponent {
    public static readonly rootElement = '.idp-extraction-view';

    readonly thumbnailViewerButton: Locator;
    readonly previousPage: Locator;
    readonly nextPage: Locator;
    readonly pageNavInput: Locator;
    readonly viewImageButton: Locator;
    readonly viewExtractedTextButton: Locator;
    readonly zoomImageIn: Locator;
    readonly zoomImageOut: Locator;
    readonly zoomInput: Locator;
    readonly rotateImageClockwise: Locator;
    readonly redactionToggleButton: Locator;
    readonly viewerFullScreen: Locator;
    readonly thumbnailViewerClose: Locator;
    readonly thumbnail1: Locator;
    readonly thumbnail2: Locator;
    readonly thumbnail3: Locator;

    constructor(page: Page) {
        super(page, HxpIdpExtractionResultContainer.rootElement);
        this.thumbnailViewerButton = this.getElementByAutomationId('ThumbnailViewerButton');
        this.previousPage = this.getElementByAutomationId('PageNavigationButton1');
        this.nextPage = this.getElementByAutomationId('PageNavigationButton2');
        this.pageNavInput = this.getElementByAutomationId('idp-page-nav-input');
        this.viewImageButton = this.getElementByAutomationId('LayerSelectionButton1');
        this.viewExtractedTextButton = this.getElementByAutomationId('LayerSelectionButton2');
        this.zoomImageIn = this.getElementByAutomationId('ZoomButton1');
        this.zoomImageOut = this.getElementByAutomationId('ZoomButton2');
        this.zoomInput = this.getElementByAutomationId('idp-zoom-input');
        this.rotateImageClockwise = this.getElementByAutomationId('RotateButton');
        this.redactionToggleButton = this.getElementByAutomationId('RedactionToggleButton');
        this.viewerFullScreen = this.getElementByAutomationId('FullScreenButton');
        this.thumbnailViewerClose = this.getElementByAutomationId('thumbnail-viewer-close-button');
        this.thumbnail1 = this.getElementByAutomationId('thumbnail-1');
        this.thumbnail2 = this.getElementByAutomationId('thumbnail-2');
        this.thumbnail3 = this.getElementByAutomationId('thumbnail-3');
    }

    getExtractionResultIcon(status: string) {
        return this.getElementByAutomationId(`idp-field-extraction-result-icon-${status}`);
    }

    getExtractionResultText(status: string) {
        return this.getElementByAutomationId(`idp-field-extraction-result-text-${status}`);
    }

    async ensureRedactionViewIsActive(): Promise<void> {
        await this.redactionToggleButton.waitFor({ state: 'visible', timeout: timeouts.short });

        const isRedactionEnabled = await this.redactionToggleButton.evaluate((buttonElement) => {
            const containerElement = buttonElement.closest('.idp-toolbar-button');
            return containerElement?.classList.contains('idp-selected') ?? false;
        });

        if (!isRedactionEnabled) {
            await this.redactionToggleButton.click();
        }
    }
}

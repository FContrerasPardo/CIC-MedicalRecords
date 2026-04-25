/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page, Locator } from '@playwright/test';
import { BaseComponent, timeouts } from '@alfresco-dbp/playwright/shared';

export interface NormalizedCanvasRegion {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface CanvasDarkPixelRatioOptions {
    region?: NormalizedCanvasRegion;
    darkThreshold?: number;
    minAlpha?: number;
}

export interface AbsoluteCanvasRegion {
    left: number;
    top: number;
    width: number;
    height: number;
}

export class HxpIdpFieldVerificationDocumentViewerComponent extends BaseComponent {
    static readonly rootElement = '.idp-viewer';

    readonly idpViewer: Locator;
    readonly idpViewerRotationDiv: Locator;
    readonly singlePageView: Locator;
    readonly textLayoutSpanElement: Locator;
    readonly activeHighlightLocator: Locator;
    readonly redactionActiveLocator: Locator;
    readonly redactionInactiveLocator: Locator;
    readonly redactionOverlayLocator: Locator;

    constructor(page: Page) {
        super(page, HxpIdpFieldVerificationDocumentViewerComponent.rootElement);
        this.idpViewer = this.getElementByAutomationId('idp-viewer');
        this.singlePageView = this.getElementByAutomationId('idp-single-page-view');
        this.textLayoutSpanElement = this.getElementByAutomationId('idp-viewer-text-only-layer__text-layout');
        this.activeHighlightLocator = this.getChild('.idp-layout-background-text__valid').first();
        this.redactionActiveLocator = this.getChild('.idp-layout-background-text__redaction');
        this.redactionInactiveLocator = this.getChild('.idp-layout-background-text__redaction-inactive');
        this.redactionOverlayLocator = this.getChild('.idp-layout-background-text__redaction, .idp-layout-background-text__redaction-inactive');
    }

    rotateButtonLocator = this.getChild('.idp-toolbar-button:has-text("rotate_right")');
    canvasLocator = this.getChild('.idp-viewer-text-layer__container-canvas');
    imageViewerLocator = this.getElementByAutomationId('image-layer-rotation');
    pageImageLocator = this.getElementByAutomationId('idp-viewer-page-image');

    async getRotationValue(): Promise<number | null> {
        const imageViewer = this.imageViewerLocator;
        const style = await imageViewer.getAttribute('style');
        const str = style ? style.match(/rotate:\s*(-?\d+)deg/) : null;
        return str ? Number(str[1]) : null;
    }

    async rotatePage(direction: 'Right', times = 1) {
        while (times-- > 0) {
            await this.rotateButtonLocator.click();
        }
    }

    async clickOnDocument(): Promise<void> {
        await this.canvasLocator.click();
    }

    async getTextLayerCanvasDarkPixelRatio(options: CanvasDarkPixelRatioOptions = {}): Promise<number> {
        const { region, darkThreshold = 60, minAlpha = 8 } = options;

        await this.canvasLocator.waitFor({ state: 'visible', timeout: timeouts.short });

        const ratio = await this.canvasLocator.evaluate(
            (element, evaluateOptions: CanvasDarkPixelRatioOptions) => {
                const canvas = element as HTMLCanvasElement;
                const context = canvas.getContext('2d');

                if (!context) {
                    return 0;
                }

                const pixelWidth = canvas.width;
                const pixelHeight = canvas.height;

                if (!pixelWidth || !pixelHeight) {
                    return 0;
                }

                const optionRegion = evaluateOptions.region;
                const safeLeft = Math.max(0, Math.min(1, optionRegion?.left ?? 0));
                const safeTop = Math.max(0, Math.min(1, optionRegion?.top ?? 0));
                const safeWidth = Math.max(0, Math.min(1 - safeLeft, optionRegion?.width ?? 1));
                const safeHeight = Math.max(0, Math.min(1 - safeTop, optionRegion?.height ?? 1));

                const startX = Math.floor(pixelWidth * safeLeft);
                const startY = Math.floor(pixelHeight * safeTop);
                const sampleWidth = Math.max(1, Math.floor(pixelWidth * safeWidth));
                const sampleHeight = Math.max(1, Math.floor(pixelHeight * safeHeight));

                const imageData = context.getImageData(startX, startY, sampleWidth, sampleHeight).data;
                let consideredPixels = 0;
                let darkPixels = 0;

                for (let index = 0; index < imageData.length; index += 4) {
                    const red = imageData[index];
                    const green = imageData[index + 1];
                    const blue = imageData[index + 2];
                    const alpha = imageData[index + 3];

                    if (alpha < (evaluateOptions.minAlpha ?? 8)) {
                        continue;
                    }

                    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
                    consideredPixels++;

                    if (luminance <= (evaluateOptions.darkThreshold ?? 60)) {
                        darkPixels++;
                    }
                }

                if (!consideredPixels) {
                    return 0;
                }

                return darkPixels / consideredPixels;
            },
            { region, darkThreshold, minAlpha }
        );

        return ratio;
    }

    async getTextLayerCanvasDarkPixelRatioForAbsoluteRegion(
        absoluteRegion: AbsoluteCanvasRegion,
        pageSize: { width: number; height: number },
        options: Omit<CanvasDarkPixelRatioOptions, 'region'> = {}
    ): Promise<number> {
        const normalizedRegion: NormalizedCanvasRegion = {
            left: absoluteRegion.left / pageSize.width,
            top: absoluteRegion.top / pageSize.height,
            width: absoluteRegion.width / pageSize.width,
            height: absoluteRegion.height / pageSize.height,
        };

        return this.getTextLayerCanvasDarkPixelRatio({
            ...options,
            region: normalizedRegion,
        });
    }

    async waitForSpinnerHidden(): Promise<void> {
        await this.delay(timeouts.short);
        await this.idpViewer.waitFor({ state: 'visible', timeout: timeouts.short });

        const imageSpinner = this.getChild('.idp-image-spinner');

        try {
            await imageSpinner.waitFor({ state: 'visible', timeout: timeouts.short });
        } catch {
            // Ignore timeout: spinner may never become visible for very fast loads.
        }

        await imageSpinner.waitFor({ state: 'hidden' });
    }
}

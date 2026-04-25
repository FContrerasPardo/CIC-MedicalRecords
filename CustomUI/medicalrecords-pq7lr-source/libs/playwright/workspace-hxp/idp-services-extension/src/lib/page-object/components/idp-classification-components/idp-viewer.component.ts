/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Page } from '@playwright/test';
import { BaseComponent } from '@alfresco-dbp/playwright/shared';

export class IdpViewer extends BaseComponent {
    static readonly rootElement = '.idp-viewer';

    constructor(page: Page) {
        super(page, IdpViewer.rootElement);
    }

    viewer = this.getElementByAutomationId('idp-single-scrollable-view');
    rotation_div = this.getElementByAutomationId('image-layer-rotation');
    single_view = this.getElementByAutomationId('idp-single-scrollable-view');
    zoomInButton = this.getElementByAutomationId('ZoomButton1');
    zoomOutButton = this.getElementByAutomationId('ZoomButton2');
    zoomInput = this.getElementByAutomationId('idp-zoom-input');
    rotateClockwiseButton = this.getElementByAutomationId('RotateButton');

    async getRotationValue(): Promise<number> {
        const style = await this.rotation_div.getAttribute('style');
        const match = style?.match(/rotate:\s*(-?\d+)deg/);
        return match ? Number.parseInt(match[1], 10) : 0;
    }

    async getScaleValue(): Promise<number | null> {
        const style = await this.single_view.getAttribute('style');
        const match = style?.match(/scale\(([\d.]+)\)/);
        return match ? Number.parseFloat(match[1]) : null;
    }

    async zoomInUntilDisabled(): Promise<void> {
        while (await this.zoomInButton.isEnabled()) {
            await this.zoomInButton.click();
        }
    }

    async zoomOutUntilDisabled(): Promise<void> {
        while (await this.zoomOutButton.isEnabled()) {
            await this.zoomOutButton.click();
        }
    }
}

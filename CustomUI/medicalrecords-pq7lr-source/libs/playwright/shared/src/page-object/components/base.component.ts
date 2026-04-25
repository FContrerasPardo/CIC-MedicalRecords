/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Locator, Page } from '@playwright/test';
import { PlaywrightBase } from '../playwright-base';
import { timeouts } from '../../utils/timeouts';

export interface LocatorBounding {
    x: number;
    y: number;
    width: number;
    height: number;
}
export type ElementPositionOffset = 'middle' | 'bottom' | 'top' | 'left' | 'right';
export interface PixelMoveOptions {
    direction: string;
    pixels: number;
}
export interface DragAndDropOptions {
    elementToMoveOffset?: ElementPositionOffset;
    elementToDropOnOffset?: ElementPositionOffset;
    additionalPixelOffset?: PixelMoveOptions;
}

export interface PeopleOrGroupComponentDetails {
    page: Page;
    parentRootElement?: string;
    role?: string;
}

export interface SpinnerOptions {
    locator?: string;
    appearTimeout?: number;
    disappearTimeout?: number;
}

export abstract class BaseComponent extends PlaywrightBase {
    private rootElement: string;
    private overlayElement = this.page.locator('.cdk-overlay-backdrop-showing');
    overlayBoxElement = this.page.locator('.cdk-overlay-connected-position-bounding-box');

    constructor(page: Page, rootElement: string) {
        super(page);
        this.rootElement = rootElement;
    }

    get getRootLocator(): Locator {
        return this.page.locator(this.rootElement);
    }

    get rootElementString() {
        return this.rootElement;
    }

    getButtonByExactText = (text: string) => this.getChild('button').getByText(`${text}`, { exact: true });
    getButtonByText = (text: string) => this.getChild('button').getByText(`${text}`);
    getElementByAutomationId = (id: string) => this.getChild(`[data-automation-id='${id}']`);
    getElementByPartialAutomationId = (id: string) => this.getChild(`[data-automation-id*='${id}']`);
    getElementByFormControlName = (name: string) => this.getChild(`[formControlName='${name}']`);
    getElementByIdAndLocator = (id: string, locator: Locator) => this.getChild(`[data-automation-id='${id}']`, { has: locator });
    getButtonByNameLocator = (name: string) => this.getChild('button', { hasText: name });
    getElementByNameLocator = (id: string, name: string) => this.getChild(`[data-automation-id='${id}']`, { hasText: name });
    getFormFieldByIdLocator = (id: string) => this.getChild(`#${id}`);
    getGlobalOverlayElementByAutomationId = (id: string, dialogTitle: string) =>
        this.page
            .locator('.cdk-global-overlay-wrapper', { has: this.page.locator(`h2:text("${dialogTitle}")`) })
            .locator(`[data-automation-id="${id}"]`);
    /**
     * Method which should be used across the repository, while creating
     * reference to elements, which are in root element of component.
     * @param cssLocator css selector as String. Need to be in the tree under the root element
     * @param options if you want to localize it by text, then provide an optional hasText
     * @returns Locator object
     */
    getChild(cssLocator: string = '', options?: { hasText?: string | RegExp; has?: Locator }): Locator {
        return this.page.locator(`${this.rootElement} ${cssLocator}`, options);
    }

    async waitForRootElement(): Promise<void> {
        await this.getChild().waitFor({ state: 'visible' });
    }

    protected async delay(timeout = 500) {
        await this.page.waitForTimeout(timeout);
    }

    async closeAdditionalOverlayElementIfVisible(): Promise<void> {
        if (await this.overlayElement.isVisible()) {
            await this.page.keyboard.press('Escape');
            await this.overlayElement.waitFor({ state: 'detached', timeout: timeouts.medium });
        }
    }

    async spinnerWaitForReload(options?: SpinnerOptions): Promise<void> {
        const spinnerLocator = options?.locator ?? '.mat-mdc-progress-spinner';
        const appearTimeout = options?.appearTimeout ?? timeouts.short;
        const disappearTimeout = options?.disappearTimeout ?? timeouts.large;

        try {
            await this.page.locator(spinnerLocator).last().waitFor({ state: 'attached', timeout: appearTimeout });
            await this.page.locator(spinnerLocator).last().waitFor({ state: 'detached', timeout: disappearTimeout });
        } catch {
            /* do nothing */
        }
    }

    async waitForSkeletonLoader(): Promise<void> {
        const skeletonTableLocator = `${this.rootElementString} table[class$=-skeleton-table]`;
        await this.spinnerWaitForReload({ locator: skeletonTableLocator, appearTimeout: timeouts.default });
    }

    async mouseDragAndDrop(elementToMove: Locator, elementToDropOn: Locator, dragAndDropOptions?: DragAndDropOptions): Promise<void> {
        const params: DragAndDropOptions = {
            elementToMoveOffset: 'middle',
            elementToDropOnOffset: 'middle',
            ...dragAndDropOptions,
        };
        const elementToMoveBounding = await elementToMove.boundingBox();
        const elementToMovePosition = this.getElementPosition(elementToMoveBounding, params.elementToMoveOffset);
        await this.page.mouse.move(elementToMovePosition.x, elementToMovePosition.y);
        await this.page.mouse.down();
        await this.page.mouse.move(elementToMovePosition.x + 5, elementToMovePosition.y + 5);

        const elementToDropOnBounding = await elementToDropOn.boundingBox();
        const elementToDropOnPosition = this.getElementPosition(elementToDropOnBounding, params.elementToDropOnOffset);
        await this.page.mouse.move(elementToDropOnPosition.x, elementToDropOnPosition.y);

        if (params.additionalPixelOffset) {
            const position = this.getOffsetPosition(
                elementToDropOnPosition,
                params.additionalPixelOffset.pixels,
                params.additionalPixelOffset.direction
            );
            await this.page.mouse.move(position.x, position.y);
        }
        await this.page.mouse.up();
    }

    async mouseDragAndDropByPixels(elementToMove: Locator, offset: ElementPositionOffset, pixels: number, direction: string): Promise<void> {
        const elementToMoveBounding = await elementToMove.boundingBox();
        const elementToMovePosition = this.getElementPosition(elementToMoveBounding, offset);
        const position = this.getOffsetPosition(elementToMovePosition, pixels, direction);
        await this.page.mouse.move(elementToMovePosition.x, elementToMovePosition.y);
        await this.page.mouse.down();
        await this.page.mouse.move(position.x, position.y);
        await this.page.mouse.up();
    }

    private getOffsetPosition(elementToMove: { x: number; y: number }, pixels: number, direction: string): { x: number; y: number } {
        const destinationPosition = {
            x: elementToMove.x,
            y: elementToMove.y,
        };
        switch (direction) {
            case 'up': {
                destinationPosition.y = elementToMove.y - pixels;
                break;
            }
            case 'down': {
                destinationPosition.y = elementToMove.y + pixels;
                break;
            }
            case 'left': {
                destinationPosition.x = elementToMove.x - pixels;
                break;
            }
            case 'right': {
                destinationPosition.x = elementToMove.x + pixels;
                break;
            }
        }
        return destinationPosition;
    }

    getElementPosition(locatorBounding: LocatorBounding, position: ElementPositionOffset): { x: number; y: number } {
        const middleOfElement = this.getMiddleOfTheElementPosition(locatorBounding);
        switch (position) {
            case 'top': {
                return { x: middleOfElement.x, y: middleOfElement.y - Math.floor(locatorBounding.height / 2) };
            }
            case 'bottom': {
                return { x: middleOfElement.x, y: middleOfElement.y + Math.floor(locatorBounding.height / 2) };
            }
            case 'left': {
                return { x: middleOfElement.x - Math.floor(locatorBounding.width / 2), y: middleOfElement.y };
            }
            case 'right': {
                return { x: middleOfElement.x + Math.floor(locatorBounding.width / 2), y: middleOfElement.y };
            }
            default: {
                return middleOfElement;
            }
        }
    }

    getMiddleOfTheElementPosition(locatorBounding: LocatorBounding): { x: number; y: number } {
        return { x: locatorBounding.x + Math.floor(locatorBounding.width / 2), y: locatorBounding.y + Math.floor(locatorBounding.height / 2) };
    }

    async closeOverlays(numberOfOverlays: number = 1): Promise<void> {
        for (let i = 0; i < numberOfOverlays; i++) {
            await this.page.keyboard.press('Escape');
        }
    }

    async getBody() {
        return this.page.locator('body');
    }

    async setCheckboxState(checkbox: Locator, shouldBeChecked: boolean): Promise<void> {
        const isChecked = await checkbox.isChecked();
        if (isChecked !== shouldBeChecked) {
            await checkbox.click();
        }
    }

    async scrollContainerToBottom(containerLocator: Locator): Promise<void> {
        await containerLocator.evaluate((container) => {
            container.scrollTop = container.scrollHeight;
        });
    }

    /**
     * Method will wait for file to be downloaded and return the path in case of successful download.
     * @downloadTriggerLocator is a locator for action that will trigger the download event.
     */
    async download(downloadTriggerLocator: Locator): Promise<string | null> {
        const [download] = await Promise.all([this.page.waitForEvent('download'), downloadTriggerLocator.click()]);
        return download.path();
    }
}

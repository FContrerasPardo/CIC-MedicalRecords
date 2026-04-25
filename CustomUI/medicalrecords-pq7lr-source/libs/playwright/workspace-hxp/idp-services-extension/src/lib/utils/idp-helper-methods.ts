/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import type { Document } from '@hylandsoftware/hxcs-js-client/typings';
import { Page, Locator } from '@playwright/test';

import {
    assertSuccessfulEntryResponse,
    ProcessInstanceData,
    RequestResponse,
    RuntimeBundleService,
    HxprApi,
    FileProperties,
    QueryService,
    ProcessInstanceResponse,
} from '@alfresco-dbp/playwright/shared';
import type { IdpRuntimeBundleService } from '../services';

import { test, expect } from '../fixtures';
import { FieldVerificationPage } from '../page-object/pages';

interface TestProcess {
    processDefinitionKey: string;
    variables: { [key: string]: any };
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Point {
    x: number;
    y: number;
}

export async function createFolder(hxprApi: HxprApi, files: FileProperties[]) {
    let uploadFolder: Readonly<Document>;
    const uploadedFiles: Readonly<Document>[] = [];

    await test.step('Create temporary folder and upload files', async () => {
        uploadFolder = await hxprApi.documentServiceApi.createFolder('pw-run', 'temporary files uploaded during an e2e test');
        expect(uploadFolder).toBeDefined();
        expect(uploadFolder).not.toHaveProperty('status');

        for (const file of files) {
            const uploadedFile = await hxprApi.uploadServiceApi.uploadFile(file, uploadFolder.sys_id);
            expect(uploadedFile).toBeDefined();
            expect(uploadedFile).not.toHaveProperty('status');
            uploadedFiles.push(uploadedFile);
        }
    });

    return { uploadFolder, uploadedFiles };
}

export async function startProcess(
    runtimeBundleService: RuntimeBundleService,
    testFile: any,
    testProcess: TestProcess
): Promise<ProcessInstanceData> {
    const processInstance = await runtimeBundleService.processInstance.startProcess(testProcess.processDefinitionKey, {
        variables: { [testProcess.variables.attachedFiles.name as string]: testFile },
    });
    // Confirm we have a process instance instead of an HTTP response or other error object
    assertSuccessfulEntryResponse(processInstance);
    expect(processInstance).toHaveProperty('entry.id');
    return processInstance;
}

export async function findProcess(queryService: QueryService): Promise<ProcessInstanceResponse | RequestResponse> {
    test.slow(true, 'Nested process creation can take some time.');
    return queryService.processInstance.getProcessInstanceByFilters({
        processDefinitionKey: 'Process_qqh3i99C',
        initiator: 'hruser',
    });
}

/** @deprecated Use `runtimeBundleService.waitForUserTask()` from `IdpRuntimeBundleService` instead. */
export async function waitForUserTask(
    runtimeBundleService: RuntimeBundleService,
    processInstance: ProcessInstanceData | RequestResponse
): Promise<any> {
    test.slow(true, 'Classification can take some time.');
    const tasks = await runtimeBundleService.processInstance.waitAndGetTasksByProcessInstanceId(processInstance.entry.id, { retry: 30 });
    return tasks;
}

export async function cleanupFiles(hxprApi: HxprApi, uploadFolder: Readonly<Document>) {
    await test.step('Delete temporary folder/files', async () => {
        await hxprApi.documentServiceApi.deleteDocumentById(uploadFolder.sys_id);
    });
}

export async function deleteTestFolder(hxprApi: HxprApi, folder: Document) {
    await test.step('Delete temporary folder/files', async () => {
        await hxprApi.documentServiceApi.deleteDocumentById(folder.sys_id);
    });
}

/**
 * Find tooltip coordinates based on expected text (with error handling)
 * This function searches for a tooltip with the specified text within a defined area on the page
 * and returns the coordinates if found.
 */
export async function findTooltipCoordinates(page: Page, searchArea: Rectangle, expectedText: string) {
    const { x, y, width, height } = searchArea;
    const step = 5; // Adjust for finer or coarser search

    for (let offsetX = 0; offsetX < width; offsetX += step) {
        for (let offsetY = 0; offsetY < height; offsetY += step) {
            await page.mouse.move(x + offsetX, y + offsetY);
            await page.waitForTimeout(100);

            const tooltip = page.locator('[data-automation-id="ocr-tooltip"]');
            if (await tooltip.isVisible()) {
                const tooltipText = await tooltip.textContent();
                if (tooltipText?.trim() === expectedText) {
                    return { x: x + offsetX, y: y + offsetY };
                }
            }
        }
    }
    return null;
}

/**
 * Find OCR tooltip and value based on expected text (with error handling)
 * This function uses the findTooltipCoordinates function to locate the tooltip and then retrieves its text content
 */
export async function findOcrTooltip(page: Page, searchArea: Rectangle, expectedText: string, ocrToolTip: Locator) {
    const coords = await findTooltipCoordinates(page, searchArea, expectedText);
    if (!coords) {
        throw new Error(`Tooltip with text "${expectedText}" not found in the specified area.`);
    }
    const value = await ocrToolTip.textContent();
    if (!value) {
        throw new Error('Failed to retrieve OCR value from tooltip.');
    }
    return { coords, value };
}

/**
 * This function simulates a drag action on the canvas
 * It moves the mouse to the starting point, presses down, moves to the end point, and then releases the mouse
 */
export async function dragOnCanvas(page: Page, start: Point, end: Point): Promise<void> {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.mouse.up();
}

/**
 * This function retrieves the bounding box of a canvas element
 * It checks if the canvas element is present and visible, then retrieves its bounding box
 * If the canvas element is not found or if the bounding box cannot be retrieved, it throws an error
 */
export async function getCanvasBoundingBox(canvas: Locator) {
    if (!canvas) {
        throw new Error('Canvas element not found.');
    }
    await expect(canvas).toBeVisible();
    const boundingBox = await canvas.boundingBox();
    if (!boundingBox) {
        throw new Error('Failed to retrieve the bounding box of the canvas.');
    }
    return boundingBox;
}

export async function clickAndExpectPageChange(page: Page, direction: 'previous' | 'next', expectedPage: number) {
    const button = page.locator(`#${direction}`);
    await expect(button).toBeEnabled();
    await button.click();

    const pageCounter = page.locator('hyland-idp-viewer-page-navigation').getByRole('spinbutton');
    const currentPage = Number.parseInt(await pageCounter.inputValue(), 10);
    expect(currentPage).toBe(expectedPage);
}

/**
 * This function retrieves the ID for a table field based on its name.
 * It searches through a predefined list of basketball table fields and returns the ID for the specified field name.
 */
export const basketballTableFields = [
    // eslint-disable-next-line @cspell/spellchecker
    { name: 'Minutes Played', id: 'MinutesPlayed0ikpdt' },
    { name: '3Pt Field Goals', id: '3PtFieldGoals0crx8m' },
    // eslint-disable-next-line @cspell/spellchecker
    { name: 'Free Throws', id: 'FreeThrows0tkzyc' },
    { name: 'Rebounds', id: 'Rebounds0w7qjk' },
];

/**
 * This function returns a locator for a specific table field by its name.
 */
export function getTableFieldLocator(page: Page, name: string) {
    const field = basketballTableFields.find((f) => f.name === name);
    if (!field) {
        throw new Error(`${name} field not found in basketballTableFields`);
    }
    return page.locator(`[data-automation-id^="field-has-issue${field.id}"]`);
}

/**
 * This function checks if a table field is selected by verifying the presence of the 'idp-is-selected' class.
 * It uses the getTableFieldLocator function to find the field and then checks for the class.
 */
export async function expectTableFieldSelected(page: Page, name: string, expectFn: typeof import('@playwright/test').expect) {
    const locator = getTableFieldLocator(page, name);
    await expectFn(locator).toHaveClass(/idp-is-selected/);
}

/**
 * Verifies that a field is focused and its parent form field has the selected state class.
 *
 * This function performs two checks:
 * 1. Asserts that the field element has focus using Playwright's toBeFocused matcher
 * 2. Verifies that the parent adf-form-field element has the 'idp-is-selected' CSS class
 *
 * @param fieldLocator - The Playwright locator for the field element to check
 * @param expectFn - The Playwright expect function for making assertions
 * @returns Promise that resolves when both assertions pass
 */
export async function expectFieldFocused(fieldLocator: Locator, expectFn: typeof import('@playwright/test').expect) {
    await expectFn(fieldLocator).toBeFocused();
    // Check the parent adf-form-field for the class
    const parentFormField = fieldLocator.locator('xpath=ancestor::adf-form-field[1]');
    await expectFn(parentFormField).toHaveClass(/idp-is-selected/);
}

/**
 * Verifies that a table field is selected by checking its parent form field for the selected state class.
 *
 * This function checks that the parent adf-form-field element of the specified field locator
 * has the 'idp-is-selected' CSS class, indicating that the table field is selected.
 *
 * @param fieldLocator - The Playwright locator for the table field element to check
 * @param expectFn - The Playwright expect function for making assertions
 * @returns Promise that resolves when the assertion passes
 */
export async function expectTableSelected(fieldLocator: Locator, expectFn: typeof import('@playwright/test').expect) {
    // Check the parent adf-form-field for the class
    const parentFormField = fieldLocator.locator('xpath=ancestor::adf-form-field[1]');
    await expectFn(parentFormField).toHaveClass(/idp-is-selected/);
}

/**
 * Verifies that a specific table cell is selected (focused).
 *
 * This function asserts that the provided field locator, representing a table cell,
 * is currently focused, indicating that it is selected.
 *
 * @param fieldLocator - The Playwright locator for the table cell element to check
 * @param expectFn - The Playwright expect function for making assertions
 * @returns Promise that resolves when the assertion passes
 */
export async function expectTableCellSelected(fieldLocator: Locator, expectFn: typeof import('@playwright/test').expect) {
    await expectFn(fieldLocator).toBeFocused();
}

/**
 * Interact with a table field: open, verify splitter bar presence, type value, navigate, and close.
 */
export async function interactWithTableField(
    metadataPanel: {
        openTableForField: (fieldId: string) => Promise<void>;
        typeIntoFirstTableCell: (fieldId: string, value: string) => Promise<void>;
        navigateTableWithKeys: () => Promise<void>;
        closeTableView: () => Promise<void>;
    },
    splitterBar: Locator,
    fieldId: string,
    value: string
) {
    await metadataPanel.openTableForField(fieldId);
    await expect(splitterBar).toBeVisible(); // Verify that the splitter bar is visible for table fields
    await metadataPanel.typeIntoFirstTableCell(fieldId, value);
    await metadataPanel.navigateTableWithKeys();
    await metadataPanel.closeTableView();
}

/**
 * Helper to validate page navigation button and input state.
 */
export async function validatePageNavigationState(
    previousPage: Locator,
    nextPage: Locator,
    pageNavInput: Locator,
    prevDisabled: boolean,
    nextDisabled: boolean,
    pageValue: string
) {
    // Check if buttons are enabled/disabled using standard approach
    await expect(previousPage, `Previous page button should be ${prevDisabled ? 'disabled' : 'enabled'}`).toBeEnabled({ enabled: !prevDisabled });
    await expect(nextPage, `Next page button should be ${nextDisabled ? 'disabled' : 'enabled'}`).toBeEnabled({ enabled: !nextDisabled });
    await expect(pageNavInput, 'Page navigation input value mismatch').toHaveValue(pageValue);
}

/**
 * Helper to test page navigation input and validate state.
 */
export async function testPageInput(
    pageNavInput: Locator,
    previousPage: Locator,
    nextPage: Locator,
    inputValue: string,
    expectedPrevDisabled: boolean,
    expectedNextDisabled: boolean
) {
    await pageNavInput.fill(inputValue);
    await pageNavInput.press('Enter');
    await validatePageNavigationState(previousPage, nextPage, pageNavInput, expectedPrevDisabled, expectedNextDisabled, inputValue);
}

/**
 * Helper to validate which thumbnail is selected - supports any number of thumbnails *
 * @example
 * For a 3-page document
 * const thumbnails = [thumbnail1, thumbnail2, thumbnail3];
 * await validateThumbnailNavigation(thumbnails, [true, false, false]); // Page 1 selected
 * await validateThumbnailNavigation(thumbnails, [false, true, false]); // Page 2 selected
 */
export async function validateThumbnailNavigation(thumbnails: Locator[], selectedStates: boolean[]) {
    if (thumbnails.length !== selectedStates.length) {
        throw new Error(`Thumbnail count (${thumbnails.length}) must match selected states count (${selectedStates.length})`);
    }
    for (const [index, thumbnail] of thumbnails.entries()) {
        const isSelected = selectedStates[index];

        if (isSelected) {
            // For selected thumbnails, check for the presence of the selected class
            await expect(thumbnail, `Thumbnail ${index + 1} should be selected`).toHaveClass(/idp-selected/);
        } else {
            // For non-selected thumbnails, ensure they don't have the selected class
            await expect(thumbnail, `Thumbnail ${index + 1} should not be selected`).not.toHaveClass(/idp-selected/);
        }
    }
}

/**
 * Helper to generate thumbnail navigation test data for any number of pages
 */
export function generateThumbnailSelectionStates(pageCount: number, selectedPageIndex: number): boolean[] {
    if (selectedPageIndex < 0 || selectedPageIndex >= pageCount) {
        throw new Error(`Selected page index ${selectedPageIndex} is out of range for ${pageCount} pages`);
    }
    return Array.from({ length: pageCount }, (_, index) => index === selectedPageIndex);
}

/**
 * Helper function to clear red status on a field by pressing Enter with retry mechanism
 * This handles the race condition where Enter might be pressed before the page is ready
 * @param page - The Playwright page object
 * @param submitButton - The submit button locator that should become enabled after clearing red status
 * @param options - Optional configuration for retry behavior
 * @param options.retryIntervals - Array of millisecond delays between retry attempts (default: [1000, 2000, 3000])
 * @param options.timeout - Maximum time to wait for success in milliseconds (default: 15000)
 * @param options.checkTimeout - Timeout for checking if submit button is enabled (default: 2000)
 */
export async function clearRedStatusWithEnter(
    page: Page,
    submitButton: Locator,
    options?: {
        retryIntervals?: number[];
        timeout?: number;
        checkTimeout?: number;
    }
): Promise<void> {
    const { retryIntervals = [1000, 2000, 3000], timeout = 15000, checkTimeout = 2000 } = options || {};

    await test.step('Clear red status with Enter key', async () => {
        // Retry the Enter key press until the submit button becomes enabled
        await expect(async () => {
            await page.keyboard.press('Enter');

            // Check if the submit button is enabled within a short timeout
            await expect(submitButton).toBeEnabled({ timeout: checkTimeout });
        }).toPass({
            intervals: retryIntervals,
            timeout,
        });
    });
}

/**
 * Helper to get thumbnail locators by data automation ID pattern
 */
export function getThumbnailLocators(page: Page, pageCount: number, thumbnailPrefix = 'thumbnail-'): Locator[] {
    return Array.from({ length: pageCount }, (_, index) => page.locator(`[data-automation-id="${thumbnailPrefix}${index + 1}"]`));
}

/**
 * Helper to validate thumbnail navigation for documents with any number of pages
 */
export async function validateThumbnailNavigationForDocument(
    page: Page,
    pageCount: number,
    selectedPageIndex: number,
    thumbnailPrefix = 'thumbnail-'
) {
    const thumbnails = getThumbnailLocators(page, pageCount, thumbnailPrefix);
    const selectedStates = generateThumbnailSelectionStates(pageCount, selectedPageIndex);
    await validateThumbnailNavigation(thumbnails, selectedStates);
}

export async function typeRow(page: Page, values: string[]) {
    for (const value of values) {
        await page.keyboard.type(value);
        await page.keyboard.press('Tab');
    }
}

/**
 * Helper function to poll batchState for extraction status
 */
export async function waitForExtractionStatus(
    runtimeBundleService: RuntimeBundleService,
    processInstance: ProcessInstanceData,
    targetStatus: string,
    maxWaitTime = 30000
) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
        const currentBatchState = await runtimeBundleService.processInstance.getProcessVariable(processInstance.entry.id, 'batchState');
        if (currentBatchState.extractionStatus === targetStatus) {
            return currentBatchState;
        }
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms before next check
    }
    throw new Error(`Timeout: extractionStatus did not become '${targetStatus}' within ${maxWaitTime}ms`);
}

/**
 * Unchecks the "Open next task automatically" checkbox if it's currently checked.
 * Targets the mat-checkbox host element because MDC renders the native input with opacity:0.
 * @param page - The Playwright page object
 */
export async function uncheckOpenNextTaskAutomatically(page: Page): Promise<void> {
    const checkboxHost = page.locator('[data-automation-id="idp-class-open-next-task-checkbox"]');
    await expect(checkboxHost).toBeVisible();

    const checkbox = checkboxHost.getByRole('checkbox');
    const isChecked = await checkbox.isChecked();

    if (isChecked) {
        await checkbox.uncheck();
        await expect(checkbox).not.toBeChecked();
    }
}

/** Waits for the validation spinner to disappear, indicating validation is complete.
 * The spinner appearance check is a soft assertion: if it's missed (validation didn't
 * trigger, or the spinner cleared before the 5s window) the failure is recorded in the
 * report but execution continues to the authoritative toBeHidden check. This means a
 * missed spinner surfaces alongside the real failure in the calling test rather than
 * masking it with an early hard stop here.
 * @param page - The Playwright page object
 */
export async function waitForValidationComplete(page: any) {
    const spinner = page.locator('[data-automation-id="idp-validation-progress-spinner"]');
    // Soft: records a miss but lets the test continue to the field status assertion.
    await expect.soft(spinner).toBeVisible({ timeout: 5000 });
    // Hard: authoritative completion signal — validation must be fully done before proceeding.
    await expect(spinner).toBeHidden({ timeout: 30000 });
}

/**
 * Helper function to verify submit button accessibility
 * @param submitButton - The submit button locator
 * @param context - Optional context description for the verification step
 */
export async function verifySubmitButtonAccessible(submitButton: Locator, context?: string): Promise<void> {
    const stepName = context ? `Verify submit button accessibility: ${context}` : 'Verify submit button accessibility';
    await test.step(stepName, async () => {
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeInViewport();
        await expect(submitButton).toBeEnabled();
    });
}

/**
 * Helper function to get scroll and field visibility information
 * @param page - The Playwright page object
 * @param fieldSelectors - Object containing field selector configurations
 * @param stepName - Description for the test step
 */
export async function getScrollInfo(page: Page, fieldSelectors: { FIRST: string; LAST: string; CONTAINER: string }, stepName: string) {
    return test.step(`Get scroll information: ${stepName}`, async () => {
        return page.evaluate((selectors) => {
            const container = document.querySelector(selectors.CONTAINER);
            const firstField = document.querySelector(selectors.FIRST);
            const lastField = document.querySelector(selectors.LAST);

            const isElementVisible = (element: Element | null) => {
                if (!element) {
                    return false;
                }
                const rect = element.getBoundingClientRect();
                return rect.top < window.innerHeight && rect.bottom > 0;
            };

            return {
                scrollTop: window.pageYOffset || document.documentElement.scrollTop,
                scrollHeight: document.documentElement.scrollHeight,
                viewportHeight: window.innerHeight,
                maxScrollTop: (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight,
                containerTop: container?.getBoundingClientRect().top ?? null,
                firstFieldVisible: isElementVisible(firstField),
                lastFieldVisible: isElementVisible(lastField),
                firstFieldExists: !!firstField,
                lastFieldExists: !!lastField,
            };
        }, fieldSelectors);
    });
}

/**
 * Helper function to scroll to a specific field element
 * @param page - The Playwright page object
 * @param fieldSelector - CSS selector for the target field
 * @param scrollOptions - Optional scroll behavior configuration
 */
export async function scrollToField(page: Page, fieldSelector: string, scrollOptions?: ScrollIntoViewOptions): Promise<void> {
    const defaultOptions: ScrollIntoViewOptions = {
        behavior: 'instant',
        block: 'end',
        inline: 'nearest',
    };

    await page.evaluate(
        ({ selector, options }) => {
            const field = document.querySelector(selector);
            if (field) {
                field.scrollIntoView(options);
            }
        },
        { selector: fieldSelector, options: scrollOptions ?? defaultOptions }
    );
}

/**
 * Helper function to initialize test, navigate to user task, and uncheck the "Open next task automatically" option
 * Initializes a test by starting a process, waiting for user task creation, and navigating to the task details page.
 *
 * This helper function streamlines common test setup by:
 * 1. Starting a new process instance using the provided batch runner
 * 2. Waiting for exactly one user task to be created from the process
 * 3. Navigating to the task details page using the first user task's ID
 * 4. Unchecking the "Open next task automatically" option to prevent automatic navigation after submission
 *
 * @param batchRunner - Object with startProcess method to initiate the workflow process
 * @param runtimeBundleService - Service for interacting with process instances and tasks
 * @param taskDetailsPage - Page object with navigation capabilities for task details
 * @param page - Playwright page object for UI interactions
 * @returns Promise resolving to the created ProcessInstanceData for further test operations
 *
 * @throws Will throw an error if the process fails to start or if no user tasks are created
 */
export async function initializeTestAndNavigateToTask(
    batchRunner: { startProcess: (service: IdpRuntimeBundleService) => Promise<ProcessInstanceData> },
    runtimeBundleService: IdpRuntimeBundleService,
    taskDetailsPage: { navigate: (options: { query: string }) => Promise<void> },
    page: Page
): Promise<ProcessInstanceData> {
    const processInstance = await batchRunner.startProcess(runtimeBundleService);
    const userTasks = await runtimeBundleService.waitForUserTask(processInstance);
    expect.soft(userTasks, 'Expected exactly one user task').toHaveLength(1);
    await taskDetailsPage.navigate({ query: `/${userTasks[0].entry.id}` });
    await uncheckOpenNextTaskAutomatically(page);
    return processInstance;
}

/**
 * Helper function to set up a form table for testing.
 * Initializes a test, navigates to the user task, waits for the form container to be visible,
 * and clicks the table reference widget.
 *
 * @param batchRunner - Object with startProcess method to initiate the workflow process
 * @param page - Playwright page object for UI interactions
 * @param fieldVerificationPage - Page object containing form table locators
 * @param runtimeBundleService - Service for interacting with process instances and tasks
 * @param taskDetailsPage - Page object with navigation capabilities for task details
 * @returns Promise resolving to the created ProcessInstanceData for further test operations
 */
export async function setupFormTableForTest(
    batchRunner: { startProcess: (service: IdpRuntimeBundleService) => Promise<ProcessInstanceData> },
    page: Page,
    fieldVerificationPage: FieldVerificationPage,
    runtimeBundleService: IdpRuntimeBundleService,
    taskDetailsPage: { navigate: (options: { query: string }) => Promise<void> }
): Promise<ProcessInstanceData> {
    const processInstanceData = await initializeTestAndNavigateToTask(batchRunner, runtimeBundleService, taskDetailsPage, page);
    await expect(fieldVerificationPage.taskForm.formContainer).toBeVisible();
    await fieldVerificationPage.tableReferenceWidget.click();
    return processInstanceData;
}

// ------------------------ Navigation Step Helper -----------------------
export type NavigationStep =
    | { action: 'focus'; target: Locator; verify: () => Promise<void>; description: string }
    | { action: 'enter'; verify: () => Promise<void>; description: string };

export async function executeNavigationSteps(steps: NavigationStep[], page: Page): Promise<void> {
    for (const step of steps) {
        await (step.action === 'focus' ? step.target.focus() : page.keyboard.press('Enter'));
        await test.step(`Verify ${step.description}`, step.verify);
    }
}

// Batch State Interfaces
export interface BatchStateDocument {
    fields: BatchStateField[];
}

export interface BatchStateField {
    id: string;
    name: string;
    value: string;
}

export interface BatchState {
    documents: BatchStateDocument[];
}

export interface BatchStateMetadata {
    fieldsCount: number;
    fieldIds: string[];
}

/**
 * Helper function to extract batch state metadata for comparison
 */
export const extractBatchStateMetadata = (batchState: BatchState): BatchStateMetadata => {
    const fieldsCount = batchState.documents.reduce((total, doc) => total + doc.fields.length, 0);
    const fieldIds = batchState.documents.flatMap((doc) => doc.fields.map((field) => field.id)).sort((a, b) => a.localeCompare(b));
    return { fieldsCount, fieldIds };
};

/**
 * Helper function to find field by name in batch state
 */
export const findFieldInBatchState = (batchState: BatchState, fieldName: string): BatchStateField | undefined => {
    return batchState.documents.flatMap((doc) => doc.fields).find((field) => field.name === fieldName);
};

/**
 * Helper function to submit document and verify navigation
 */
export const submitDocumentAndVerifyNavigation = async (
    fieldVerificationPage: { fieldVerificationFooter: { submitButton: Locator } },
    page: Page
): Promise<void> => {
    await fieldVerificationPage.fieldVerificationFooter.submitButton.click();
    await expect(page).toHaveURL(/task-list/);
};

/**
 * Helper function to verify field values in batch state
 */
export const verifyFieldValuesInBatchState = async (updatedBatchState: BatchState, expectedValues: Record<string, string>): Promise<void> => {
    for (const [fieldName, expectedValue] of Object.entries(expectedValues)) {
        const field = findFieldInBatchState(updatedBatchState, fieldName);
        expect(field, `Field '${fieldName}' not found in batch state`).toBeDefined();
        if (!field) {
            throw new Error(`Field '${fieldName}' not found in batch state`);
        }
        expect(field.value, `Field '${fieldName}' value mismatch`).toBe(expectedValue);
    }
};

/**
 * Wait for image to be fully loaded with comprehensive validation
 * @param page - The Playwright page object
 * @param fieldVerificationPage - The field verification page object
 * @param imageSelector - Optional custom selector for the image element
 */
export async function waitForImageToLoad(
    page: Page,
    fieldVerificationPage: FieldVerificationPage,
    imageSelector = '[data-automation-id="idp-viewer-page-image"]'
): Promise<void> {
    await test.step('Wait for image to be fully loaded', async () => {
        const issuePageImage = fieldVerificationPage.fieldVerificationDocumentViewer.idpViewer.locator(imageSelector);

        // Wait for image to be visible first with a reasonable timeout
        await expect(issuePageImage, 'Image should be visible in DOM').toBeVisible({ timeout: 15000 });

        // Wait for image to be completely loaded using JavaScript with better error handling
        await page.waitForFunction(
            (selector) => {
                const img = document.querySelector(selector) as HTMLImageElement;
                if (!img) {
                    return false;
                }

                // Check if image is loaded and has valid dimensions
                return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
            },
            imageSelector,
            { timeout: 15000 }
        );

        // Additional validation: ensure image has reasonable dimensions
        const boundingBox = await issuePageImage.boundingBox();
        if (!boundingBox || boundingBox.width <= 0 || boundingBox.height <= 0) {
            throw new Error(`Image loaded but has invalid dimensions: ${boundingBox?.width}x${boundingBox?.height}`);
        }
    });
}

/**
 * Validate canvas element and retrieve its bounding box with comprehensive error handling
 * @param fieldVerificationPage - The field verification page object containing the canvas
 * @returns Promise resolving to canvas locator and bounding box
 */
export async function validateCanvasAndGetBoundingBox(fieldVerificationPage: any): Promise<{
    canvas: Locator;
    boundingBox: { x: number; y: number; width: number; height: number };
}> {
    return test.step('Validate canvas and get bounding box', async () => {
        const canvas = fieldVerificationPage.fieldVerificationViewerTextLayer.textLayerCanvas;

        // Add null check with more descriptive error
        if (!canvas) {
            throw new Error('Canvas element not found. Ensure fieldVerificationViewerTextLayer.textLayerCanvas is properly initialized.');
        }

        // Wait for canvas to be visible with timeout
        await expect(canvas, 'Canvas should be visible').toBeVisible({ timeout: 10000 });
        const boundingBox = await canvas.boundingBox();

        // More descriptive error with troubleshooting info
        if (!boundingBox) {
            throw new Error(
                'Failed to retrieve the bounding box of the canvas. ' +
                    'This may indicate the canvas is not properly rendered or is outside the viewport.'
            );
        }

        // Validate bounding box has reasonable dimensions
        if (boundingBox.width <= 0 || boundingBox.height <= 0) {
            throw new Error(
                `Canvas has invalid dimensions: width=${boundingBox.width}, height=${boundingBox.height}. ` +
                    'Ensure the canvas is properly loaded and visible.'
            );
        }

        return { canvas, boundingBox };
    });
}

// ------------------------ Table Column Resize Helpers -----------------------

/**
 * Makes the table visible and retrieves header locators and their initial widths.
 * Intended for use with pw-e2e-FocusFlowFormsWithTable.pdf.
 * @param page Playwright Page object
 * @returns Object containing header locators and their initial widths
 */
export async function setupTableAndGetHeaders(page: import('@playwright/test').Page): Promise<{
    tableFieldNameHeader: import('@playwright/test').Locator;
    tableFieldValueHeader: import('@playwright/test').Locator;
    rowNumberHeader: import('@playwright/test').Locator;
    initialTableFieldNameWidth: string;
    initialTableFieldValueWidth: string;
}> {
    const tableFieldWidget = page.locator('.hxp-table-reference-widget[role="button"]');
    await tableFieldWidget.click();
    const tableFieldNameHeader = page.locator('th[role="columnheader"]:has-text("TableFieldName")');
    const tableFieldValueHeader = page.locator('th[role="columnheader"]:has-text("TableFieldValue")');
    const rowNumberHeader = page.locator('th.idp-table-row-number-header');
    const initialTableFieldNameWidth = await tableFieldNameHeader.evaluate((el: HTMLElement) => el.style.width);
    const initialTableFieldValueWidth = await tableFieldValueHeader.evaluate((el: HTMLElement) => el.style.width);
    return {
        tableFieldNameHeader,
        tableFieldValueHeader,
        rowNumberHeader,
        initialTableFieldNameWidth,
        initialTableFieldValueWidth,
    };
}

/**
 * Simulates dragging a column resize handle by a specified pixel distance.
 * @param page Playwright Page object
 * @param headerLocator Locator for the column header
 * @param dragDistance Number of pixels to drag
 * @param columnName Name of the column (for error reporting)
 */
export async function dragColumnResizeHandle(
    page: import('@playwright/test').Page,
    headerLocator: import('@playwright/test').Locator,
    dragDistance: number,
    columnName: string
) {
    const resizeHandle = headerLocator.locator('.idp-resize-handle');
    const handleBox = await resizeHandle.boundingBox();
    if (!handleBox) {
        throw new Error(`Resize handle bounding box not found for column: ${columnName}`);
    }
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + dragDistance, handleBox.y + handleBox.height / 2, { steps: 5 });
    await page.mouse.up();
}

/**
 * Asserts that a column width changed by the expected adjustment amount (with tolerance), or did not change.
 * @param before Initial width
 * @param after Final width
 * @param adjustAmount Expected adjustment amount (pixels)
 * @param direction 'increase', 'decrease', or 'none'
 */
export function verifyColumnWidthChange(before: number, after: number, adjustAmount: number, direction: 'increase' | 'decrease' | 'none') {
    switch (direction) {
        case 'increase': {
            expect(after).toBeGreaterThan(before);
            expect(after - before).toBeGreaterThanOrEqual(adjustAmount - 10);
            break;
        }
        case 'decrease': {
            expect(after).toBeLessThan(before);
            expect(before - after).toBeGreaterThanOrEqual(Math.abs(adjustAmount) - 10);
            break;
        }
        case 'none': {
            expect(after).toBe(before);
            break;
        }
    }
}

/**
 * Resets a column width using the context menu on the header.
 * @param page Playwright Page object
 * @param headerLocator Locator for the column header
 */
export async function resetColumnWidth(page: import('@playwright/test').Page, headerLocator: import('@playwright/test').Locator) {
    const resetColumnWidthOption = page.locator('[data-automation-id="reset-column-width"]');
    await headerLocator.click();
    await headerLocator.click({ button: 'right' });
    await resetColumnWidthOption.click();
}

/**
 * Resets all column widths using the context menu on the row number header.
 * @param page Playwright Page object
 * @param rowNumberHeader Locator for the row number header
 */
export async function resetAllColumnWidths(page: import('@playwright/test').Page, rowNumberHeader: import('@playwright/test').Locator) {
    const resetAllColumnWidthOption = page.locator('[data-automation-id="reset-all-column-widths"]');
    await rowNumberHeader.click({ button: 'right' });
    await resetAllColumnWidthOption.click();
}

/**
 * Selects a table column header using CTRL+Space keyboard shortcut.
 * @param page Playwright Page object
 */
export async function selectColumnHeader(page: import('@playwright/test').Page) {
    await page.keyboard.down('Control');
    await page.keyboard.press('Space');
    await page.keyboard.up('Control');
}

/**
 * Resizes a column by holding CTRL and pressing an arrow key multiple times.
 * @param page Playwright Page object
 * @param direction Arrow key direction ('ArrowLeft' or 'ArrowRight')
 * @param times Number of key presses
 */
export async function resizeColumnWithKeyboard(page: import('@playwright/test').Page, direction: 'ArrowLeft' | 'ArrowRight', times: number) {
    await page.keyboard.down('Control');
    for (let i = 0; i < times; i++) {
        await page.keyboard.press(direction);
    }
    await page.keyboard.up('Control');
}

/**
 * Tabs through table cells, focusing the first editable cell before tabbing.
 * @param page Playwright Page object
 * @param times Number of Tab key presses
 */
export async function tabThroughTable(page: import('@playwright/test').Page, times: number) {
    const tableCellInput = page.locator('table input.idp-cell-edit-input').first();
    if (await tableCellInput.isVisible()) {
        await tableCellInput.click();
    }
    for (let i = 0; i < times; i++) {
        await page.keyboard.press('Tab');
    }
}

/**
 * Opens the table context menu using CTRL+SHIFT+~ keyboard shortcut.
 * @param page Playwright Page object
 */
export async function openTableContextMenu(page: import('@playwright/test').Page) {
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('~');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
}

/**
 * Selects the reset column widths option in the context menu (assumes menu is open and first option is highlighted).
 * @param page Playwright Page object
 */
export async function selectResetColumnWidths(page: import('@playwright/test').Page) {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
}

/**
 * Selects the entire table using CTRL+SHIFT+SPACE keyboard shortcut.
 * @param page Playwright Page object
 */
export async function selectEntireTable(page: import('@playwright/test').Page) {
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Space');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
}

// ------------------------ Save and Reload Helpers -----------------------

/**
 * Saves the form by clicking the save button, waits for the snackbar confirmation message,
 * and reloads the page.
 * Use this after modifying form values to verify persistence across page reloads.
 *
 * @param page Playwright Page object
 * @param saveButton Locator for the save button to click
 * @param snackBarMessage Locator for the snackbar message element to wait for
 */
export async function saveFormAndReload(page: Page, saveButton: Locator, snackBarMessage: Locator): Promise<void> {
    await test.step('Save the form and wait for confirmation', async () => {
        await saveButton.click();
        await expect(snackBarMessage).toHaveText('The form has been saved');
    });

    await test.step('Reload the page', async () => {
        await page.reload({ waitUntil: 'load' });
    });
}

// ------------------------ Table (FORM) Validation Helpers -----------------------

/**
 * Returns locator for a table cell input by row and column label.
 */
export function getTableCellInput(pageObj: Page, rowIndex: number, columnAriaLabel: string) {
    return pageObj.locator(
        `table tbody tr[data-row-index="${rowIndex}"] td[role="cell"] .idp-cell-edit-input[aria-label='${columnAriaLabel}']`
    );
}

/**
 * Fills a table cell with a value and blurs, then asserts error state.
 */
export async function fillCellAndAssert(page: Page, row: number, col: string, value: string, shouldError: boolean) {
    const cellInput = getTableCellInput(page, row, col);
    await cellInput.focus();
    await cellInput.fill('');
    await cellInput.fill(value);
    await cellInput.evaluate((el: HTMLInputElement) => el.blur());
    await (shouldError ? expect(cellInput).toHaveClass(/idp-cell-edit-input-error/) : expect(cellInput).not.toHaveClass(/idp-cell-edit-input-error/));
}

/**
 * Helper to assert all thumbnails have expected visibility state.
 */
export async function assertThumbnailsVisibility(thumbnails: Locator[], visible: boolean, context?: string) {
    for (const [i, thumbnail] of thumbnails.entries()) {
        const msg = context
            ? `Thumbnail ${i + 1} should be ${visible ? 'visible' : 'hidden'} ${context}`
            : `Thumbnail ${i + 1} should be ${visible ? 'visible' : 'hidden'}`;
        await (visible ? expect(thumbnail, msg).toBeVisible() : expect(thumbnail, msg).not.toBeVisible());
    }
}

/**
 * Helper for OCR double-click with position retry offsets.
 * Tries the original position first, then adjusts vertically to account for slight misalignment.
 */
export async function applyOcrValueWithRetry(
    canvas: Locator,
    hoverPosition: Point,
    fieldLocator: Locator,
    expectedValue: string,
    yOffsets = [0, -5, 5]
) {
    for (const offset of yOffsets) {
        const retryPosition = {
            x: hoverPosition.x,
            y: hoverPosition.y + offset,
        };
        await canvas.hover({ position: retryPosition });
        await canvas.dblclick({ position: retryPosition });
        try {
            await expect(fieldLocator).toHaveValue(expectedValue);
            break;
        } catch {
            // continue to next offset
        }
    }
    await expect(fieldLocator).toHaveValue(expectedValue);
    await expect(fieldLocator).toBeFocused();
}

/**
 * Helper to verify required shortcuts exist in the shortcut dialog.
 */
export async function verifyShortcutsExist(page: Page, shortcuts: string[]) {
    for (const shortcut of shortcuts) {
        const shortcutExists = (await page.getByText(new RegExp(shortcut, 'i')).count()) > 0;
        expect(shortcutExists).toBeTruthy();
    }
}

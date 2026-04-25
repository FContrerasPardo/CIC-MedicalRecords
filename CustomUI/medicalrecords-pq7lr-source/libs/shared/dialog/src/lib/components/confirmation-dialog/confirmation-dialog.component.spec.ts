/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ButtonHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { firstValueFrom, Subject } from 'rxjs';
import { ConfirmationDialogComponent, ConfirmDialogPayload } from './confirmation-dialog.component';

describe('ConfirmationDialog Component', () => {
    let fixture: ComponentFixture<ConfirmationDialogComponent>;
    let component: ConfirmationDialogComponent;

    const mockDialog = {
        close: jest.fn(),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, MatDialogModule, NoopTranslateModule, ConfirmationDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialog },
                { provide: MAT_DIALOG_DATA, useValue: {} },
            ],
        });
    });

    describe('For tests with no injected value for title and subtitle', () => {
        beforeEach(() => {
            fixture = TestBed.createComponent(ConfirmationDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('check if there are no custom title/errors added the default values are set', () => {
            expect(component.title).toBeDefined();
            expect(component.title).toEqual('APP.DIALOGS.CONFIRM.TITLE');
            expect(component.messages).toEqual([]);
        });
    });

    describe('For tests with injected value for title and subtitle', () => {
        beforeEach(() => {
            const dialogData: ConfirmDialogPayload = {
                subject: new Subject<boolean>(),
                title: 'Test title',
                subtitle: 'Are you sure?',
                messages: ['error'],
            };
            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });

            fixture = TestBed.createComponent(ConfirmationDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('check if a custom title subtitle, errors are added the right value are set in the confirmation dialog component ', () => {
            expect(component.title).toEqual('Test title');
            expect(component.subtitle).toEqual('Are you sure?');
            expect(component.messages).toEqual(['error']);
        });

        it('subject should next true when confirmed, then complete, and dialog should close', async () => {
            const dialogRef = firstValueFrom(component.data.subject);

            await ButtonHarnessUtils.clickButton({
                fixture,
                buttonFilters: {
                    selector: '[data-automation-id="dialog-confirm"]',
                },
            });

            const value = await dialogRef;

            expect(value).toBe(true);
            expect(mockDialog.close).toHaveBeenCalled();
        });

        it('subject should next false when canceled, then complete and dialog should close', async () => {
            const dialogRef = firstValueFrom(component.data.subject);

            await ButtonHarnessUtils.clickButton({
                fixture,
                buttonFilters: {
                    selector: '[data-automation-id="dialog-close"]',
                },
            });

            const value = await dialogRef;

            expect(value).toBe(false);
            expect(mockDialog.close).toHaveBeenCalled();
        });
    });

    describe('For tests with injected value for buttons', () => {
        beforeEach(() => {
            const dialogData: ConfirmDialogPayload = {
                subject: new Subject<boolean>(),
                confirmButton: {
                    label: 'Custom confirm',
                    theme: 'primary',
                },
                cancelButton: {
                    label: 'Custom cancel',
                },
            };

            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });

            fixture = TestBed.createComponent(ConfirmationDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('buttons should have custom labels', () => {
            expect(component.confirmButton).toEqual({
                label: 'Custom confirm',
                theme: 'primary',
            });
            expect(component.cancelButton).toEqual({
                label: 'Custom cancel',
            });
        });

        it('should render custom label on cancel button', () => {
            const cancelButton = fixture.nativeElement.querySelector('[data-automation-id="dialog-close"]');
            expect(cancelButton).toBeTruthy();
            expect(cancelButton.textContent.trim()).toBe('Custom cancel');
        });

        it('should render custom label on confirm button', () => {
            const confirmButton = fixture.nativeElement.querySelector('[data-automation-id="dialog-confirm"]');
            expect(confirmButton).toBeTruthy();
            expect(confirmButton.textContent.trim()).toBe('Custom confirm');
        });
    });

    describe('For tests with injected value for title and htmlContent', () => {
        beforeEach(() => {
            const dialogData: ConfirmDialogPayload = {
                subject: new Subject<boolean>(),
                title: 'Test title',
                htmlContent: '<div> This is a custom <b>HTML</b> content & needs to be sanitized </div>',
            };

            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });

            fixture = TestBed.createComponent(ConfirmationDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('should render the custom html', () => {
            const expectedHtml = '<div> This is a custom <b>HTML</b> content &amp; needs to be sanitized </div>';

            expect(component.htmlContent).toEqual(expectedHtml);

            const customElement = fixture.nativeElement.querySelector('[data-automation-id="confirm-dialog-html-content"]');
            expect(customElement).toBeTruthy();
            expect(customElement.innerHTML).toBe(expectedHtml);
        });
    });

    describe('validation errors', () => {
        beforeEach(() => {
            const mockDialogData: Partial<ConfirmDialogPayload> = {};
            mockDialogData.isValidationErrors = true;
            mockDialogData.messageGroups = [
                { description: 'errorDescription1', key: 'key1', params: { param1: 'value1' } },
                { description: 'errorDescription2', key: 'key2', params: { param2: 'value2' } },
            ];

            TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: mockDialogData });
            fixture = TestBed.createComponent(ConfirmationDialogComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        });

        it('should render validation error translations', () => {
            const validationErrors = fixture.nativeElement.querySelectorAll('li');
            expect(validationErrors.length).toBe(2);
            expect(validationErrors[0].textContent.trim()).toBe('key1');
            expect(validationErrors[1].textContent.trim()).toBe('key2');
        });
    });

    describe('destructive confirmation', () => {
        const confirmationText = 'My Application';

        describe('when confirmationText is set', () => {
            beforeEach(() => {
                const dialogData: ConfirmDialogPayload = {
                    subject: new Subject<boolean>(),
                    actionType: 'undeploy',
                    destructiveOptions: {
                        confirmationText,
                        confirmationTextInputLabel: 'CONFIRM_LABEL',
                    },
                };

                TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });
                fixture = TestBed.createComponent(ConfirmationDialogComponent);
                component = fixture.componentInstance;
                fixture.detectChanges();
            });

            it('should render the confirmation message', () => {
                const message = fixture.nativeElement.querySelector('[data-automation-id="destructive-name-confirmation-message"]');
                expect(message).toBeTruthy();
            });

            it('should render the name confirmation input', () => {
                const input = fixture.nativeElement.querySelector('[data-automation-id="destructive-name-confirmation-input"]');
                expect(input).toBeTruthy();
            });

            it('should have confirm button disabled when input is empty', async () => {
                const confirmButton = fixture.nativeElement.querySelector('[data-automation-id="dialog-confirm"]');
                expect(confirmButton.disabled).toBe(true);
            });

            it('should have confirm button disabled when input does not match confirmationText', () => {
                component.nameConfirmationControl.setValue('wrong value');
                fixture.detectChanges();

                const confirmButton = fixture.nativeElement.querySelector('[data-automation-id="dialog-confirm"]');
                expect(confirmButton.disabled).toBe(true);
            });

            it('should have confirm button enabled when input matches confirmationText', () => {
                component.nameConfirmationControl.setValue(confirmationText);
                fixture.detectChanges();

                const confirmButton = fixture.nativeElement.querySelector('[data-automation-id="dialog-confirm"]');
                expect(confirmButton.disabled).toBe(false);
            });

            it('should disable confirm button again when input changes away from matching value', () => {
                component.nameConfirmationControl.setValue(confirmationText);
                fixture.detectChanges();

                const confirmButton = fixture.nativeElement.querySelector('[data-automation-id="dialog-confirm"]');
                expect(confirmButton.disabled).toBe(false);

                component.nameConfirmationControl.setValue('changed');
                fixture.detectChanges();
                expect(confirmButton.disabled).toBe(true);
            });

            it('should apply hxp-primary-warn-button class to confirm button for undeploy action', () => {
                const confirmButton = fixture.nativeElement.querySelector('[data-automation-id="dialog-confirm"]');
                expect(confirmButton.classList).toContain('hxp-primary-warn-button');
            });
        });

        describe('when confirmationText is not set', () => {
            beforeEach(() => {
                const dialogData: ConfirmDialogPayload = {
                    subject: new Subject<boolean>(),
                };

                TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: dialogData });
                fixture = TestBed.createComponent(ConfirmationDialogComponent);
                component = fixture.componentInstance;
                fixture.detectChanges();
            });

            it('should not render the confirmation message', () => {
                const message = fixture.nativeElement.querySelector('[data-automation-id="destructive-name-confirmation-message"]');
                expect(message).toBeFalsy();
            });

            it('should not render the name confirmation input', () => {
                const input = fixture.nativeElement.querySelector('[data-automation-id="destructive-name-confirmation-input"]');
                expect(input).toBeFalsy();
            });

            it('should have confirm button enabled', () => {
                const confirmButton = fixture.nativeElement.querySelector('[data-automation-id="dialog-confirm"]');
                expect(confirmButton.disabled).toBe(false);
            });
        });
    });
});

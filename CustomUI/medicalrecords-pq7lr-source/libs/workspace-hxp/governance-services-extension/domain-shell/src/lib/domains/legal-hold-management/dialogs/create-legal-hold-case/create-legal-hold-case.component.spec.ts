/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { CreateLegalHoldCaseComponent } from './create-legal-hold-case.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GovernanceLegalCaseService } from '../../services/governance-legal-case.service';
import { of, Subject, throwError } from 'rxjs';
import { LegalHoldCaseDialogData, LegalHoldCase } from '../../definitions/legal-hold.interface';
import { LegalHoldInitiator } from '../../definitions/legal-hold.constants';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('CreateLegalHoldCaseComponent', () => {
    let component: CreateLegalHoldCaseComponent;
    let fixture: ComponentFixture<CreateLegalHoldCaseComponent>;
    let loader: HarnessLoader;
    let notificationServiceMock: jest.Mocked<HxpNotificationService>;
    let governanceLegalCaseServiceMock: jest.Mocked<GovernanceLegalCaseService>;
    let dialogRefMock: jest.Mocked<MatDialogRef<CreateLegalHoldCaseComponent>>;
    let keydownEvents$: Subject<KeyboardEvent>;
    let backdropClick$: Subject<MouseEvent>;

    const dialogDataMock: LegalHoldCaseDialogData = {
        clickedFrom: LegalHoldInitiator.Legal,
    };

    const newLegalCase: LegalHoldCase = {
        legalCaseId: 'case-001',
        legalCaseName: 'Test Legal Hold Case',
        legalCaseReason: 'Test Reason',
        legalCaseDescription: 'Test Description',
    };

    const editDialogDataMock: LegalHoldCaseDialogData = {
        clickedFrom: LegalHoldInitiator.Legal,
        legalHoldCases: [newLegalCase],
    };

    function setupTestBed(dialogData: LegalHoldCaseDialogData) {
        TestBed.configureTestingModule({
            imports: [CreateLegalHoldCaseComponent, MatDialogModule, NoopTranslateModule, NoopAnimationsModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: HxpNotificationService, useValue: notificationServiceMock },
                { provide: GovernanceLegalCaseService, useValue: governanceLegalCaseServiceMock },
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: MAT_DIALOG_DATA, useValue: dialogData },
            ],
        });
    }

    beforeEach(() => {
        notificationServiceMock = {
            showSuccess: jest.fn(),
            showError: jest.fn(),
        } as unknown as jest.Mocked<HxpNotificationService>;

        governanceLegalCaseServiceMock = {
            createLegalHoldCase: jest.fn(),
            editLegalHoldCase: jest.fn(),
            emitRefreshList: jest.fn(),
        } as unknown as jest.Mocked<GovernanceLegalCaseService>;

        keydownEvents$ = new Subject<KeyboardEvent>();
        backdropClick$ = new Subject<MouseEvent>();

        dialogRefMock = {
            close: jest.fn(),
            keydownEvents: jest.fn(() => keydownEvents$.asObservable()),
            backdropClick: jest.fn(() => backdropClick$.asObservable()),
        } as unknown as jest.Mocked<MatDialogRef<CreateLegalHoldCaseComponent>>;
    });

    describe('Create legal case', () => {
        beforeEach(() => {
            setupTestBed(dialogDataMock);

            fixture = TestBed.createComponent(CreateLegalHoldCaseComponent);
            loader = TestbedHarnessEnvironment.loader(fixture);
            component = fixture.componentInstance;
            component.existingLegalHoldCase = false;
            fixture.detectChanges();
        });

        it('should show max length error for name when input exceeds 64 characters', fakeAsync(() => {
            const longName = 'x'.repeat(70);
            component.legalHoldCaseForm.get('legal_name')?.setValue(longName);
            component.legalHoldCaseForm.get('legal_name')?.markAsTouched();
            fixture.detectChanges();

            const nameControl = component.legalHoldCaseForm.get('legal_name');
            expect(nameControl?.hasError('maxlength')).toBe(true);
        }));

        it('should show max length error for reason when input exceeds 512 characters', fakeAsync(() => {
            const longReason = 'x'.repeat(520);
            component.legalHoldCaseForm.get('legal_reason')?.setValue(longReason);
            component.legalHoldCaseForm.get('legal_reason')?.markAsTouched();
            fixture.detectChanges();

            const reasonControl = component.legalHoldCaseForm.get('legal_reason');
            expect(reasonControl?.hasError('maxlength')).toBe(true);
        }));

        it('should show max length error for description when input exceeds 512 characters', fakeAsync(() => {
            const longDesc = 'x'.repeat(520);
            component.legalHoldCaseForm.get('legal_description')?.setValue(longDesc);
            component.legalHoldCaseForm.get('legal_description')?.markAsTouched();
            fixture.detectChanges();

            const descControl = component.legalHoldCaseForm.get('legal_description');
            expect(descControl?.hasError('maxlength')).toBe(true);
        }));

        it('should show required message when name is empty and touched', async () => {
            const nameField = await loader.getHarness(
                MatFormFieldHarness.with({ floatingLabelText: 'GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.NAME' })
            );
            const nameControl = component.legalHoldCaseForm.get('legal_name');

            expect(await nameField.getTextErrors()).toHaveLength(0);

            nameControl?.setValue('');
            nameControl?.markAsTouched();
            fixture.detectChanges();

            expect(nameControl?.hasError('required')).toBe(true);
            expect(await nameField.getTextErrors()).toContain('GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.ERRORS.REQUIRED');
        });

        it('should show only max length error when whitespace-only name also exceeds max length', async () => {
            const nameControl = component.legalHoldCaseForm.get('legal_name');

            component.legalHoldCaseForm.patchValue({
                legal_name: ' '.repeat(65),
                legal_reason: 'Valid reason',
                legal_description: '',
            });
            nameControl?.markAsTouched();
            fixture.detectChanges();

            const nameField = await loader.getHarness(
                MatFormFieldHarness.with({ floatingLabelText: 'GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.NAME' })
            );
            const errorMessages = await nameField.getTextErrors();

            expect(nameControl?.hasError('maxlength')).toBe(true);
            expect(nameControl?.hasError('pattern')).toBe(true);
            expect(errorMessages).toContain('GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.ERRORS.MAX_LENGTH_EXCEEDED');
            expect(errorMessages).not.toContain('GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.ERRORS.REQUIRED');
            expect(errorMessages).toHaveLength(1);
        });

        it('should close the dialog when Cancel is clicked from Legal tab', async () => {
            component.dialogData.clickedFrom = 'Legal';
            fixture.detectChanges();

            const cancelBtn = await loader.getHarness(MatButtonHarness.with({ text: /CANCEL/i }));
            await cancelBtn.click();

            expect(dialogRefMock.close).toHaveBeenCalled();
            expect(governanceLegalCaseServiceMock.emitRefreshList).not.toHaveBeenCalled();
        });

        it('should close the dialog and refresh the list when Cancel is clicked from Record flow', async () => {
            component.dialogData.clickedFrom = 'Record';
            fixture.detectChanges();

            const cancelBtn = await loader.getHarness(MatButtonHarness.with({ text: /CANCEL/i }));
            await cancelBtn.click();

            expect(dialogRefMock.close).toHaveBeenCalled();
            expect(governanceLegalCaseServiceMock.emitRefreshList).toHaveBeenCalled();
        });

        it('should create legal hold case and show success notification on success', fakeAsync(async () => {
            governanceLegalCaseServiceMock.createLegalHoldCase.mockImplementation(() => of(newLegalCase));

            component.legalHoldCaseForm.setValue({
                legal_name: 'Test Legal Hold Case',
                legal_reason: 'Test Reason',
                legal_description: 'Test Description',
            });
            fixture.detectChanges();

            const createBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.CREATE/i }));
            await createBtn.click();

            tick();
            fixture.detectChanges();
            flush();

            expect(dialogRefMock.close).toHaveBeenCalled();
            expect(notificationServiceMock.showSuccess).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_CREATE_SUCCESS');
        }));

        it('should create legal hold case, emitReOpenList is called when dialog opened from Record and show success notification on success', fakeAsync(async () => {
            governanceLegalCaseServiceMock.createLegalHoldCase.mockImplementation(() => of(newLegalCase));

            component.dialogData.clickedFrom = 'Record';
            component.legalHoldCaseForm.setValue({
                legal_name: 'Test Legal Hold Case',
                legal_reason: 'Test Reason',
                legal_description: 'Test Description',
            });
            fixture.detectChanges();

            const createBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.CREATE/i }));
            await createBtn.click();

            tick();
            fixture.detectChanges();
            flush();

            expect(dialogRefMock.close).toHaveBeenCalled();
            expect(notificationServiceMock.showSuccess).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_CREATE_SUCCESS');
            expect(governanceLegalCaseServiceMock.emitRefreshList).toHaveBeenCalled();
        }));

        it('should show error message as failure and keep open the dialog', fakeAsync(async () => {
            governanceLegalCaseServiceMock.createLegalHoldCase.mockImplementation(() => throwError(() => new Error('boom')));

            component.legalHoldCaseForm.setValue({
                legal_name: 'Test Legal Hold Case',
                legal_reason: 'Test Reason',
                legal_description: 'Test Description',
            });
            fixture.detectChanges();

            const createBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.CREATE/i }));
            await createBtn.click();

            tick();
            fixture.detectChanges();
            flush();

            expect(dialogRefMock.close).not.toHaveBeenCalled();
            expect(notificationServiceMock.showError).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_CREATE_ERROR');
        }));

        it('should disabled Create button if form is invalid', fakeAsync(async () => {
            component.legalHoldCaseForm.markAsDirty();
            fixture.detectChanges();

            const createBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.CREATE/i }));
            expect(await createBtn.isDisabled()).toBe(true);
        }));

        it('should treat whitespace-only required fields as invalid', () => {
            component.legalHoldCaseForm.setValue({
                legal_name: '   ',
                legal_reason: '   ',
                legal_description: '',
            });
            fixture.detectChanges();

            expect(component.legalHoldCaseForm.get('legal_name')?.invalid).toBe(true);
            expect(component.legalHoldCaseForm.get('legal_reason')?.invalid).toBe(true);
            expect(component.canPerformAction()).toBe(false);
        });

        it('should disabled Create button when legal case is creating', fakeAsync(async () => {
            component.legalHoldCaseForm.patchValue({
                legal_name: 'Test Legal Hold Case',
                legal_reason: 'Test Reason',
            });
            (component as any).isProcessing = true;
            fixture.detectChanges();

            const createBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.CREATE/i }));
            expect(await createBtn.isDisabled()).toBe(true);
        }));

        it('should run cancel effects on ESC key when opened from Record', () => {
            component.dialogData.clickedFrom = 'Record';
            fixture.detectChanges();

            keydownEvents$.next(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(governanceLegalCaseServiceMock.emitRefreshList).toHaveBeenCalled();
        });

        it('should run cancel effects on backdrop click when opened from Record', () => {
            component.dialogData.clickedFrom = 'Record';
            fixture.detectChanges();

            backdropClick$.next(new MouseEvent('click'));

            expect(governanceLegalCaseServiceMock.emitRefreshList).toHaveBeenCalled();
        });

        it('should NOT run cancel effects on ESC/backdrop when opened from Legal', () => {
            component.dialogData.clickedFrom = 'Legal';
            fixture.detectChanges();

            keydownEvents$.next(new KeyboardEvent('keydown', { key: 'Escape' }));
            backdropClick$.next(new MouseEvent('click'));

            expect(governanceLegalCaseServiceMock.emitRefreshList).not.toHaveBeenCalled();
        });

        it('should show duplicate name error when backend returns 409', fakeAsync(async () => {
            governanceLegalCaseServiceMock.createLegalHoldCase.mockImplementation(() => throwError(() => ({ status: 409 })));

            component.legalHoldCaseForm.setValue({
                legal_name: 'Duplicate Case',
                legal_reason: 'Some reason',
                legal_description: 'Optional desc',
            });
            fixture.detectChanges();

            const createBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.CREATE_LEGAL_HOLD_CASE_DIALOG.CREATE/i }));
            await createBtn.click();

            tick();
            fixture.detectChanges();
            flush();

            expect(dialogRefMock.close).not.toHaveBeenCalled();
            expect(notificationServiceMock.showError).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_NAME_EXISTS');
        }));
    });

    describe('Edit legal case', () => {
        beforeEach(() => {
            setupTestBed(editDialogDataMock);

            fixture = TestBed.createComponent(CreateLegalHoldCaseComponent);
            loader = TestbedHarnessEnvironment.loader(fixture);
            component = fixture.componentInstance;
            component.existingLegalHoldCase = true;
            component.legalHoldCaseForm.setValue({
                legal_name: 'Test Legal Hold Case',
                legal_reason: 'Test Reason updated',
                legal_description: 'Test Description updated',
            });
            fixture.detectChanges();
        });

        it('should update legal hold case and show success notification on success', fakeAsync(async () => {
            governanceLegalCaseServiceMock.editLegalHoldCase.mockImplementation(() => of(newLegalCase));

            component.legalHoldCaseForm.markAsDirty();
            fixture.detectChanges();

            const editBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.EDIT_LEGAL_HOLD_CASE_DIALOG.EDIT/i }));
            await editBtn.click();

            tick();
            fixture.detectChanges();
            flush();

            expect(dialogRefMock.close).toHaveBeenCalled();
            expect(notificationServiceMock.showSuccess).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_EDIT_SUCCESS');
            expect(governanceLegalCaseServiceMock.emitRefreshList).toHaveBeenCalled();
        }));

        it('should show error message as failure and keep open the dialog', fakeAsync(async () => {
            governanceLegalCaseServiceMock.editLegalHoldCase.mockImplementation(() => throwError(() => new Error('boom')));

            component.legalHoldCaseForm.markAsDirty();
            fixture.detectChanges();

            const editBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.EDIT_LEGAL_HOLD_CASE_DIALOG.EDIT/i }));
            await editBtn.click();

            tick();
            fixture.detectChanges();
            flush();

            expect(dialogRefMock.close).not.toHaveBeenCalled();
            expect(notificationServiceMock.showError).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_EDIT_ERROR');
            expect(governanceLegalCaseServiceMock.emitRefreshList).not.toHaveBeenCalled();
        }));

        it('should disabled Edit button if form is invalid', fakeAsync(async () => {
            component.legalHoldCaseForm.patchValue({
                legal_name: '',
                legal_reason: '',
            });
            component.legalHoldCaseForm.markAsTouched();
            fixture.detectChanges();

            const editBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.EDIT_LEGAL_HOLD_CASE_DIALOG.EDIT/i }));
            expect(await editBtn.isDisabled()).toBe(true);
        }));

        it('should disabled Edit button if form content has not changed', fakeAsync(async () => {
            const editBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.EDIT_LEGAL_HOLD_CASE_DIALOG.EDIT/i }));
            expect(await editBtn.isDisabled()).toBe(true);
        }));

        it('should disabled Edit button when legal case is updating', fakeAsync(async () => {
            (component as any).isProcessing = true;
            fixture.detectChanges();

            const editBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.EDIT_LEGAL_HOLD_CASE_DIALOG.EDIT/i }));
            expect(await editBtn.isDisabled()).toBe(true);
        }));

    });

    describe('Input safety and trimming', () => {
        beforeEach(() => {
            setupTestBed(dialogDataMock);
            fixture = TestBed.createComponent(CreateLegalHoldCaseComponent);
            loader = TestbedHarnessEnvironment.loader(fixture);
            component = fixture.componentInstance;
            component.existingLegalHoldCase = false;
            fixture.detectChanges();
        });

        it('should render payloads as input text values and not execute alert', () => {
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
            const imagePayload = '"><img src=x onerror=alert(1)>';
            const scriptPayload = '<script>alert(1)</script>';

            try {
                component.legalHoldCaseForm.patchValue({
                    legal_name: imagePayload,
                    legal_reason: scriptPayload,
                    legal_description: scriptPayload,
                });
                fixture.detectChanges();

                const nameInput = fixture.nativeElement.querySelector('#hxp-new-legal-case-name') as HTMLInputElement;
                const reasonInput = fixture.nativeElement.querySelector('#hxp-new-legal-case-reason') as HTMLInputElement;
                const descriptionInput = fixture.nativeElement.querySelector('#hxp-new-legal-case-description') as HTMLTextAreaElement;

                expect(nameInput.value).toBe(imagePayload);
                expect(reasonInput.value).toBe(scriptPayload);
                expect(descriptionInput.value).toBe(scriptPayload);
                expect(alertSpy).not.toHaveBeenCalled();
            } finally {
                alertSpy.mockRestore();
            }
        });

        it('should trim whitespace from all fields before submission', fakeAsync(() => {
            governanceLegalCaseServiceMock.createLegalHoldCase.mockImplementation((payload) => {
                expect(payload.legalCaseName).toBe('Test Name');
                expect(payload.legalCaseReason).toBe('Test Reason');
                expect(payload.legalCaseDescription).toBe('Test Description');
                return of(newLegalCase);
            });

            component.legalHoldCaseForm.setValue({
                legal_name: '  Test Name  ',
                legal_reason: '  Test Reason  ',
                legal_description: '  Test Description  ',
            });
            fixture.detectChanges();

            component.onAction();
            tick();
            flush();

            expect(governanceLegalCaseServiceMock.createLegalHoldCase).toHaveBeenCalled();
        }));

        it('should allow script-like payload text with normal validators only', () => {
            component.legalHoldCaseForm.patchValue({
                legal_name: '<script>alert(1)</script>',
                legal_reason: '"><img src=x onerror=alert(1)>',
                legal_description: '<script>alert(1)</script>',
            });
            fixture.detectChanges();

            expect(component.legalHoldCaseForm.get('legal_name')?.hasError('maxlength')).toBe(false);
            expect(component.legalHoldCaseForm.get('legal_reason')?.hasError('maxlength')).toBe(false);
            expect(component.legalHoldCaseForm.get('legal_description')?.hasError('maxlength')).toBe(false);
            expect(component.legalHoldCaseForm.valid).toBe(true);
            expect(component.canPerformAction()).toBe(true);
        });
    });

    it('should pass accessibility audit', async () => {
        setupTestBed(dialogDataMock);
        fixture = TestBed.createComponent(CreateLegalHoldCaseComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        const report = await a11yReport(fixture.nativeElement);
        expect(report?.violations).toEqual([]);
    });
});

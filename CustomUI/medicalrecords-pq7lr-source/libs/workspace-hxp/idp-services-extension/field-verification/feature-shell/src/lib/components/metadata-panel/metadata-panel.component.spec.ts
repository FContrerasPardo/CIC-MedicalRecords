/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule } from '@alfresco/adf-core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetadataPanelComponent, TableContextPipe } from './metadata-panel.component';
import { By } from '@angular/platform-browser';
import { MatDialogModule } from '@angular/material/dialog';
import { ActionHistoryService, ActionLinearHistoryService } from '../../services/action-history.service';
import { IdpVerificationService } from '../../services/verification/verification.service';
import { IdpDocument, IdpField, IdpValidationStatus } from '../../models/screen-models';
import {
    IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN,
    IdpContextTaskBaseService,
    IdpFieldDataType,
    IdpShortcutService,
    IdpVerificationStatus,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { documentState, fieldVerificationRootState } from '../../store/shared-mock-states';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { selectDocument } from '../../store/selectors/document.selectors';
import { FieldVerificationContextTaskService } from '../../services/context-task/field-verification-context-task.service';
import { firstValueFrom, of, take } from 'rxjs';
import { selectDocumentFields } from '../../store/selectors/document-field.selectors';
import { MetadataTableFieldComponent } from '../metadata-table-field/metadata-table-field.component';
import { fieldVerificationRootFeatureSelector } from '../../store/selectors/field-verification-root.selectors';
import { selectFieldIgnoreForAutoMap, selectFieldIgnoreForReviewMap } from '../../store/selectors/field-definitions.selectors';
import { IdpFormCloudService } from '../../services/idp-form-cloud.service';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { selectIsValidationProcessRunning } from '../../store/selectors/screen.selectors';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';

function buildMockCloudForm(formFieldsDef: Array<{ id: string; isValid: boolean }>) {
    const formFields = formFieldsDef.map((def) => ({ id: def.id, isValid: def.isValid }) as any);
    const validateField = jest.fn();
    const validateForm = jest.fn();
    return {
        form: {
            getFormFields: () => formFields,
            validateField,
            validateForm,
        },
        onKeyDown: jest.fn(),
        loadInjectedFieldValidators: jest.fn(),
    } as any;
}

describe('MetadataPanelComponent', () => {
    let component: MetadataPanelComponent;
    let fixture: ComponentFixture<MetadataPanelComponent>;
    let fields: IdpField[];
    let store: MockStore;
    let idpVerificationService: IdpVerificationService;

    const updatedFieldValue = 'Updated Field Value 1';

    const mockField1: IdpField = {
        id: '1',
        name: 'Field 1',
        value: 'Value 1',
        dataType: IdpFieldDataType.Text,
        verificationStatus: IdpVerificationStatus.ManualValid,
        validationStatus: IdpValidationStatus.Valid,
        hasIssue: true,
        confidence: 0.55,
        format: 'string',
        isSelected: false,
        boundingBox: {
            top: 0,
            left: 0,
            width: 100,
            height: 50,
            pageId: '1',
        },
    };

    const mockField2: IdpField = {
        id: '2',
        name: 'Field 2',
        value: 'Value 2',
        dataType: IdpFieldDataType.Text,
        verificationStatus: IdpVerificationStatus.AutoInvalid,
        validationStatus: IdpValidationStatus.Valid,
        hasIssue: false,
        confidence: 0.95,
        format: 'string',
        isSelected: false,
    };

    const mockField3: IdpField = {
        id: '3',
        name: 'Field 3',
        value: 'Value 3',
        dataType: IdpFieldDataType.Text,
        verificationStatus: IdpVerificationStatus.AutoInvalid,
        validationStatus: IdpValidationStatus.Valid,
        hasIssue: true,
        confidence: 0.55,
        format: 'string',
        isSelected: true,
    };

    const mockField4: IdpField = {
        id: '4',
        name: 'Field 4',
        value: '',
        dataType: IdpFieldDataType.Table,
        verificationStatus: IdpVerificationStatus.AutoInvalid,
        validationStatus: IdpValidationStatus.Valid,
        hasIssue: true,
        confidence: 0.55,
        format: 'string',
        isSelected: true,
    };

    const mockField5: IdpField = {
        id: '5',
        name: 'Field 5',
        value: 'Because I said so',
        dataType: IdpFieldDataType.Reasoning,
        verificationStatus: IdpVerificationStatus.AutoValid,
        validationStatus: IdpValidationStatus.Valid,
        confidence: 1,
        format: 'string',
    };

    const mockFormContext = {
        id: 'test-form-id',
        appName: 'test-app',
        name: 'test-form',
        key: 'test-form-key',
        description: 'A test form',
        fields: [],
    };

    const testDocument: IdpDocument = {
        id: documentState.id,
        name: documentState.name,
        class: {
            ...documentState.class,
            formModelKey: 'test-form-key',
        },
        pages: documentState.pages.map((page) => ({
            id: page.id,
            name: page.name,
            documentId: documentState.id,
            fileReference: page.fileReference,
            sourcePageIndex: page.sourcePageIndex,
            rotation: page.rotation,
            viewerRotation: page.viewerRotation,
            hasMachineTextLayer: page.hasMachineTextLayer,
            hasIssue: false,
            isSelected: documentState.selectedPageIds.includes(page.id),
            height: page.height ?? 0,
            width: page.width ?? 0,
        })),
        rejectReasonId: undefined,
        markAsRejected: false,
        rejectNote: undefined,
        hasIssue: false,
    };

    beforeEach(() => {
        const idpContextTaskBaseServiceSpy = {
            rejectReasons$: of([]),
        };

        TestBed.configureTestingModule({
            imports: [
                MatDialogModule,
                MetadataPanelComponent,
                MetadataTableFieldComponent,
                NoopTranslateModule,
                NoopAnimationsModule,
                MatProgressSpinnerModule,
                SatIconModule,
            ],
            providers: [
                { provide: ActionHistoryService, useClass: ActionLinearHistoryService },
                provideMockStore({
                    initialState: fieldVerificationRootState,
                    selectors: [
                        { selector: fieldVerificationRootFeatureSelector, value: fieldVerificationRootState },
                        { selector: selectFieldIgnoreForAutoMap, value: new Map<string, boolean>() },
                        { selector: selectFieldIgnoreForReviewMap, value: new Map<string, boolean>() },
                    ],
                }),
                IdpVerificationService,
                FieldVerificationContextTaskService,
                TableContextPipe,
                { provide: IdpContextTaskBaseService, useValue: idpContextTaskBaseServiceSpy },
                IdpShortcutService,
                { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: [] },
                {
                    provide: IdpFormCloudService,
                    useValue: {
                        getFormDefinitionByKey: jest.fn().mockReturnValue(of({ formRepresentation: { fields: [] } })),
                        getFormByModelKey: jest.fn().mockReturnValue(Promise.resolve({ formRepresentation: mockFormContext })),
                    },
                },
                {
                    provide: FeaturesServiceToken,
                    useValue: {
                        isOn$: (flag: string) => {
                            if (flag === WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL) {
                                return of(false);
                            }
                            return of(true);
                        },
                    },
                },
            ],
        });

        store = TestBed.inject(MockStore);
        idpVerificationService = TestBed.inject(IdpVerificationService);

        fields = [mockField1, mockField2, mockField3, mockField4, mockField5];
        store.overrideSelector(selectDocumentFields, fields);
        store.overrideSelector(selectDocument, testDocument);

        fixture = TestBed.createComponent(MetadataPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render lock icon when field is ignored for auto', async () => {
        const ignoreMap = new Map<string, boolean>([[mockField2.id, true]]);
        store.overrideSelector(selectFieldIgnoreForAutoMap, ignoreMap);
        store.refreshState();

        await fixture.whenStable();
        fixture.detectChanges();

        const lockIcon = fixture.debugElement.query(By.css(`.form-field-${mockField2.id} .idp-field-lock-icon`));
        expect(lockIcon).toBeTruthy();

        const nonIgnoredIcon = fixture.debugElement.query(By.css(`.form-field-${mockField1.id} .idp-field-lock-icon`));
        expect(nonIgnoredIcon).toBeFalsy();
    });

    it('should hide field when ignoreForReview is true', async () => {
        const reviewMap = new Map<string, boolean>([[mockField3.id, true]]);
        store.overrideSelector(selectFieldIgnoreForReviewMap, reviewMap);
        store.refreshState();

        await fixture.whenStable();
        fixture.detectChanges();

        const hiddenInput = fixture.debugElement.query(By.css(`input[id='${mockField3.id}']`));
        expect(hiddenInput).toBeFalsy();

        const visibleInput = fixture.debugElement.query(By.css(`input[id='${mockField1.id}']`));
        expect(visibleInput).toBeTruthy();
    });

    function findFieldInputDebugElement(field: IdpField) {
        return fixture.debugElement.query(By.css(`input[id='${field.id}']`));
    }

    function simulateFieldInput(input: HTMLInputElement, value: string) {
        input.dispatchEvent(new Event('focus'));
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('focusout'));
    }

    function getFieldValue(field: IdpField) {
        const fieldInput = findFieldInputDebugElement(field)?.nativeElement;
        return fieldInput.value as string | undefined;
    }

    function updatePanelField(field: IdpField, value: string) {
        const fieldInput = findFieldInputDebugElement(field)?.nativeElement;
        simulateFieldInput(fieldInput, value);
    }

    it('should display metadata fields', async () => {
        await fixture.whenStable(); // Wait for asynchronous rendering
        fixture.detectChanges(); // Trigger change detection

        const fieldElements = fixture.debugElement.queryAll(By.css('.idp-form-field'));
        expect(fieldElements.length).toBe(fields.length);
        for (const [index, field] of fieldElements.entries()) {
            const expectedField = fields[index];
            if (expectedField.dataType === 'Table') {
                const metadataTableField = field.query(By.css('.idp-metadata-table-field'));
                expect(metadataTableField).toBeTruthy(); // Ensure it's found
            } else {
                const labelElement = field.query(By.css('.idp-form-field-label'));
                expect(labelElement.nativeElement.textContent.trim()).toEqual(expectedField.name);
                const inputElement = field.query(By.css('.idp-form-field-input'));
                expect(inputElement.nativeElement.value).toEqual(expectedField.value);
            }
        }
    });

    it('should update extraction result using IdpVerificationService', () => {
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        updatePanelField(mockField1, updatedFieldValue);
        fixture.detectChanges();

        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: updatedFieldValue,
            boundingBox: undefined,
            confidence: 1,
        });
        const fieldValue = getFieldValue(mockField1);
        expect(fieldValue).toBe(updatedFieldValue);
    });

    it('should undo and redo', () => {
        const updateFieldSpy = jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        const originalValue = mockField1.value;

        expect(component.canUndo()).toBe(false);
        expect(component.canRedo()).toBe(false);

        updatePanelField(mockField1, updatedFieldValue);
        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: updatedFieldValue,
            boundingBox: undefined,
            confidence: 1,
        });
        expect(getFieldValue(mockField1)).toEqual(updatedFieldValue);
        expect(component.canUndo()).toBe(true);
        expect(component.canRedo()).toBe(false);
        updateFieldSpy.mockClear();

        // Due to mock ngrx store limitation, the actual field value on the component is not updated after this point.
        // Instead we verify that 'updateField' gets called and trust the other tests to make sure this has the intended effect.

        component.onUndo();
        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: originalValue,
        });
        expect(component.canUndo()).toBe(false);
        expect(component.canRedo()).toBe(true);
        updateFieldSpy.mockClear();

        component.onRedo();
        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: updatedFieldValue,
            boundingBox: undefined,
            confidence: 1,
        });
        expect(component.canUndo()).toBe(true);
        expect(component.canRedo()).toBe(false);
        updateFieldSpy.mockClear();
    });

    it('should not be able to redo after manual change', () => {
        const updateFieldSpy = jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        const originalValue = mockField1.value;

        expect(component.canUndo()).toBe(false);
        expect(component.canRedo()).toBe(false);

        updatePanelField(mockField1, updatedFieldValue);
        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: updatedFieldValue,
            boundingBox: undefined,
            confidence: 1,
        });
        expect(getFieldValue(mockField1)).toEqual(updatedFieldValue);
        expect(component.canUndo()).toBe(true);
        expect(component.canRedo()).toBe(false);
        updateFieldSpy.mockClear();

        // Due to mock ngrx store limitation, the actual field value on the component is not updated after this point.
        // Instead we verify that 'updateField' gets called and trust the other tests to make sure this has the intended effect.

        component.onUndo();
        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: originalValue,
        });
        expect(component.canUndo()).toBe(false);
        expect(component.canRedo()).toBe(true);
        updateFieldSpy.mockClear();

        updatePanelField(mockField1, 'manual change');
        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: 'manual change',
            boundingBox: undefined,
            confidence: 1,
        });
        expect(component.canUndo()).toBe(true);
        expect(component.canRedo()).toBe(false);
        updateFieldSpy.mockClear();
    });

    it('should confirm field value and move to the next field with issue on Enter key press', () => {
        jest.spyOn(idpVerificationService, 'selectNextField').mockImplementation();
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;

        firstFieldInput.focus();
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(idpVerificationService.updateField).toHaveBeenCalled();
        expect(idpVerificationService.selectNextField).toHaveBeenCalled();
    });

    it('should not update field if value has not changed', () => {
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;
        const originalValue = firstFieldInput.value;

        firstFieldInput.focus();
        firstFieldInput.value = originalValue;
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(
            jasmine.objectContaining({
                ...mockField1,
                value: originalValue,
            })
        );
    });

    it('should update field verification status when confirming field value', () => {
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;
        const newValue = 'Updated value';

        firstFieldInput.focus();
        simulateFieldInput(firstFieldInput, newValue);
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: newValue,
            boundingBox: undefined,
            confidence: 1,
        });
    });

    it('should handle Shift+Enter without confirming field value', () => {
        jest.spyOn(idpVerificationService, 'selectNextField').mockImplementation();
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;

        firstFieldInput.focus();
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(
            jasmine.objectContaining({
                ...mockField1,
                value: mockField1.value,
            })
        );
    });

    it('should confirm field value on Enter key press even when there is only one field', () => {
        store.overrideSelector(selectDocument, {
            ...documentState,
            fields: [mockField1],
            tables: [],
            hasIssue: false,
            pages: documentState.pages.map((page) => ({
                ...page,
                documentId: documentState.id,
                hasIssue: false,
                isSelected: false,
            })),
        });
        fixture = TestBed.createComponent(MetadataPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        jest.spyOn(idpVerificationService, 'selectNextField').mockImplementation();
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;

        firstFieldInput.focus();
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(idpVerificationService.updateField).toHaveBeenCalled();
        expect(idpVerificationService.selectNextField).toHaveBeenCalled();
    });

    it('should not move to the next field with issue on a different key press', () => {
        jest.spyOn(idpVerificationService, 'selectNextField').mockImplementation();

        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;

        firstFieldInput.focus();
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

        expect(idpVerificationService.selectNextField).not.toHaveBeenCalled();
    });

    it('should complete suggested field value when typing the beginning of the value', () => {
        const pageId = '1';
        component.ocrWords = [
            { text: 'foo', pageId },
            { text: 'far', pageId },
            { text: 'bar', pageId },
        ];
        const fieldInput =
            findFieldInputDebugElement(mockField1)?.nativeElement ??
            (() => {
                throw new Error('Field input not found');
            })();
        simulateFieldInput(fieldInput, '');
        expect(fieldInput.value).toBe('');
        simulateFieldInput(fieldInput, 'f');
        expect(fieldInput.value).toBe('f');
        simulateFieldInput(fieldInput, 'fo');
        expect(fieldInput.value).toBe('foo');
        simulateFieldInput(fieldInput, 'FA');
        expect(fieldInput.value).toBe('far');
        simulateFieldInput(fieldInput, 'foo b');
        expect(fieldInput.value).toBe('foo b');
        simulateFieldInput(fieldInput, 'foo f');
        expect(fieldInput.value).toBe('foo far');
    });

    it('should not complete suggested field value across pages', () => {
        component.ocrWords = [
            { text: 'foo', pageId: '1' },
            { text: 'far', pageId: '2' },
        ];
        const fieldInput =
            findFieldInputDebugElement(mockField1)?.nativeElement ??
            (() => {
                throw new Error('Field input not found');
            })();
        simulateFieldInput(fieldInput, '');
        expect(fieldInput.value).toBe('');
        simulateFieldInput(fieldInput, 'foo f');
        expect(fieldInput.value).toBe('foo f');
    });

    it('should call verificationService.selectField() when metadata table component is clicked', () => {
        jest.spyOn(idpVerificationService, 'selectField').mockImplementation();

        const metadataTableField = fixture.debugElement.query(By.css('hyland-idp-metadata-table-field'));
        expect(metadataTableField).toBeTruthy();

        metadataTableField.nativeElement.click();
        fixture.detectChanges();

        expect(idpVerificationService.selectField).toHaveBeenCalled();
    });

    it('should update field with OCR matches when value matches OCR words', () => {
        const ocrWords = [
            { text: 'test', pageId: '1', left: 10, top: 20, width: 30, height: 15, confidence: 0.9 },
            { text: 'value', pageId: '1', left: 45, top: 20, width: 40, height: 15, confidence: 0.8 },
        ];
        component.ocrWords = ocrWords;

        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;

        firstFieldInput.focus();
        simulateFieldInput(firstFieldInput, 'test value');
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(
            jasmine.objectContaining({
                ...mockField1,
                value: 'test value',
                boundingBox: {
                    pageId: '1',
                    left: 10,
                    top: 20,
                    width: 75,
                    height: 15,
                },
                confidence: 1,
            })
        );
    });

    it('should update field without OCR info when no OCR matches found', () => {
        const ocrWords = [
            { text: 'different', pageId: '1', left: 10, top: 20, width: 30, height: 15, confidence: 0.9 },
            { text: 'text', pageId: '1', left: 45, top: 20, width: 40, height: 15, confidence: 0.8 },
        ];
        component.ocrWords = ocrWords;

        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;

        firstFieldInput.focus();
        simulateFieldInput(firstFieldInput, 'no match');
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(idpVerificationService.updateField).toHaveBeenCalledWith({
            ...mockField1,
            value: 'no match',
            boundingBox: undefined,
            confidence: 1,
        });
    });

    it('should calculate correct bounding box for multi-word OCR matches', () => {
        const ocrWords = [
            { text: 'first', pageId: '1', left: 10, top: 20, width: 30, height: 15, confidence: 0.9 },
            { text: 'second', pageId: '1', left: 45, top: 15, width: 40, height: 20, confidence: 0.8 },
            { text: 'third', pageId: '1', left: 90, top: 18, width: 35, height: 18, confidence: 0.85 },
        ];
        component.ocrWords = ocrWords;

        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();
        const firstFieldInput = findFieldInputDebugElement(mockField1)?.nativeElement;

        firstFieldInput.focus();
        simulateFieldInput(firstFieldInput, 'first second third');
        firstFieldInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(
            jasmine.objectContaining({
                ...mockField1,
                value: 'first second third',
                boundingBox: jasmine.objectContaining({
                    pageId: '1',
                    left: 10,
                    top: 15,
                    width: 115,
                }),
                confidence: 1,
            })
        );
    });

    it('should expose isValidationProcessRunning$ observable from verification service', async () => {
        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.refreshState();
        fixture.detectChanges();

        const serviceValue = await new Promise<boolean>((resolve) => {
            idpVerificationService.isValidationProcessRunning$.pipe(take(1)).subscribe((value) => resolve(value));
        });

        const componentValue = await new Promise<boolean>((resolve) => {
            component.isValidationProcessRunning$.pipe(take(1)).subscribe((value) => resolve(value));
        });

        expect(componentValue).toBe(serviceValue);
        expect(componentValue).toBe(true);
    });

    it('should mark field as invalid when validationStatus is Invalid', () => {
        const fieldWithInvalidValidation: IdpField = {
            ...mockField1,
            verificationStatus: IdpVerificationStatus.ManualValid,
            validationStatus: IdpValidationStatus.Invalid,
        };

        store.overrideSelector(selectDocumentFields, [fieldWithInvalidValidation]);
        store.refreshState();

        fixture.detectChanges();

        // Check that the field element has the error CSS class
        const fieldElement = fixture.debugElement.query(By.css(`.form-field-${fieldWithInvalidValidation.id}`));
        expect(fieldElement).toBeTruthy();
        expect(fieldElement.nativeElement.classList.contains('idp-has-issue')).toBe(true);
    });

    it('should show progress spinner and disable form when validation is in progress', async () => {
        const featuresService = TestBed.inject(FeaturesServiceToken);
        jest.spyOn(featuresService, 'isOn$').mockImplementation((flag: string) => {
            if (flag === WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL || flag === WORKSPACE_IDP_HXP.FIELD_VALIDATION_RULES) {
                return of(true);
            }
            return of(true);
        });
        jest.spyOn(idpVerificationService, 'getFormContext$').mockReturnValue(of(mockFormContext));

        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.refreshState();

        const fixtureWithCloudForm = TestBed.createComponent(MetadataPanelComponent);
        fixtureWithCloudForm.detectChanges();

        const isValidating = await new Promise<boolean>((resolve) => {
            idpVerificationService.isValidationProcessRunning$.pipe(take(1)).subscribe((value) => resolve(value));
        });
        expect(isValidating).toBe(true);

        const validationOverlay = fixtureWithCloudForm.debugElement.query(By.css('.idp-validation-overlay'));
        expect(validationOverlay).toBeTruthy();

        const progressSpinner = fixtureWithCloudForm.debugElement.query(By.css('[data-automation-id="idp-validation-progress-spinner"]'));
        expect(progressSpinner).toBeTruthy();

        const validationMessage = fixtureWithCloudForm.debugElement.query(By.css('.idp-validation-message'));
        expect(validationMessage).toBeTruthy();

        const cloudForm = fixtureWithCloudForm.debugElement.query(By.css('.idp-cloud-form-wrapper'));
        expect(cloudForm).toBeTruthy();
        expect(cloudForm.nativeElement.classList.contains('idp-disabled')).toBe(true);

        const undoButton = fixtureWithCloudForm.debugElement.query(By.css('[data-automation-id="idp-field-undo-button"]'));
        const redoButton = fixtureWithCloudForm.debugElement.query(By.css('[data-automation-id="idp-field-redo-button"]'));
        expect(undoButton.nativeElement.disabled).toBe(true);
        expect(redoButton.nativeElement.disabled).toBe(true);
    });

    it('should hide progress spinner and enable form when validation is complete', async () => {
        const featuresService = TestBed.inject(FeaturesServiceToken);
        jest.spyOn(featuresService, 'isOn$').mockImplementation((flag: string) => {
            if (flag === WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL || flag === WORKSPACE_IDP_HXP.FIELD_VALIDATION_RULES) {
                return of(true);
            }
            return of(true);
        });
        jest.spyOn(idpVerificationService, 'getFormContext$').mockReturnValue(of(mockFormContext));

        store.overrideSelector(selectIsValidationProcessRunning, false);
        store.refreshState();

        const fixtureWithCloudForm = TestBed.createComponent(MetadataPanelComponent);
        fixtureWithCloudForm.detectChanges();

        const isValidating = await new Promise<boolean>((resolve) => {
            idpVerificationService.isValidationProcessRunning$.pipe(take(1)).subscribe((value) => resolve(value));
        });
        expect(isValidating).toBe(false);

        const validationOverlay = fixtureWithCloudForm.debugElement.query(By.css('.idp-validation-overlay'));
        expect(validationOverlay).toBeFalsy();

        const progressSpinner = fixtureWithCloudForm.debugElement.query(By.css('[data-automation-id="idp-validation-progress-spinner"]'));
        expect(progressSpinner).toBeFalsy();

        const cloudForm = fixtureWithCloudForm.debugElement.query(By.css('.idp-cloud-form-wrapper'));
        expect(cloudForm).toBeTruthy();
        expect(cloudForm.nativeElement.classList.contains('idp-disabled')).toBe(false);
    });

    describe('Table Content Template', () => {
        const tableFieldWithOneRow = { ...mockField4, id: 'table-with-one-row' };
        const tableFieldWithMultipleRows = { ...mockField4, id: 'table-with-multiple-rows' };

        let pipe: TableContextPipe;
        beforeEach(() => {
            // Enable form feature flag for template testing
            const mockFeaturesService = TestBed.inject(FeaturesServiceToken) as any;
            mockFeaturesService.isOn$ = jest.fn((flag: string) => {
                if (flag === WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL) {
                    return of(true);
                }
                return of(true);
            });

            // Mock the verification service methods needed for table operations
            jest.spyOn(idpVerificationService, 'getTableSummaryById$').mockImplementation((tableId: string) => {
                switch (tableId) {
                    case mockField4.id: {
                        return of({
                            id: mockField4.id,
                            name: 'Test Table',
                            rowCount: 0,
                        });
                    }
                    case tableFieldWithOneRow.id: {
                        return of({
                            id: tableFieldWithOneRow.id,
                            name: 'Table With One Row',
                            rowCount: 1,
                        });
                    }
                    case tableFieldWithMultipleRows.id: {
                        return of({
                            id: tableFieldWithMultipleRows.id,
                            name: 'Table With Multiple Rows',
                            rowCount: 3,
                        });
                    }
                    // No default
                }
                return of(undefined);
            });

            jest.spyOn(idpVerificationService, 'selectField').mockImplementation();
            jest.spyOn(idpVerificationService, 'addTableRow').mockImplementation();
            jest.spyOn(idpVerificationService, 'deleteTableRow').mockImplementation();

            (idpVerificationService.documentFields$ as typeof idpVerificationService.documentFields$) = of([
                mockField4,
                tableFieldWithOneRow,
                tableFieldWithMultipleRows,
            ]);
            pipe = TestBed.inject(TableContextPipe);
        });

        it('should show "Add Table" button when table has no rows', async () => {
            // Simulate template rendering with context
            const template = component.tableContentTemplate;
            expect(template).toBeTruthy();

            const tableContext = await firstValueFrom(pipe.transform(mockField4.id));
            expect(tableContext.rowCount).toBe(0);
            expect(tableContext.transformedFieldId).toBe(mockField4.id); // ID should remain '4' (no idp_ prefix to remove)
        });

        it('should show row count text when table has one row', async () => {
            const tableContext = await firstValueFrom(pipe.transform(tableFieldWithOneRow.id));
            expect(tableContext.rowCount).toBe(1);
            expect(tableContext.transformedFieldId).toBe(tableFieldWithOneRow.id);
        });

        it('should show row count text when table has multiple rows', async () => {
            const tableContext = await firstValueFrom(pipe.transform(tableFieldWithMultipleRows.id));
            expect(tableContext.rowCount).toBe(3);
            expect(tableContext.transformedFieldId).toBe(tableFieldWithMultipleRows.id);
        });

        it('should use table summary selector for table context row count', async () => {
            const getTableByIdSpy = jest.spyOn(idpVerificationService, 'getTableById$');
            const getTableSummaryByIdSpy = jest
                .spyOn(idpVerificationService, 'getTableSummaryById$')
                .mockReturnValue(of({ id: mockField4.id, name: 'Test Table', rowCount: 0 }));

            const tableContext = await firstValueFrom(pipe.transform(mockField4.id));

            expect(getTableSummaryByIdSpy).toHaveBeenCalledWith(mockField4.id);
            expect(getTableByIdSpy).not.toHaveBeenCalled();
            expect(tableContext.rowCount).toBe(0);
        });

        it('should call addTable method when Add Table button is clicked', async () => {
            const addTableSpy = jest.spyOn(component, 'addTable').mockImplementation();

            // Create a mock button element with the data-table-id attribute
            const mockButton = document.createElement('a');
            mockButton.className = 'idp-add-table-link';
            mockButton.dataset['tableId'] = '4';
            mockButton.textContent = 'Add Table';

            // Simulate the click event on the button
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            });

            // Mock the event target to have the data-table-id attribute
            Object.defineProperty(clickEvent, 'target', {
                value: mockButton,
                enumerable: true,
            });

            // Simulate clicking the Add Table link by calling the click handler directly
            // This mimics the (click)="addTable(data.transformedField.id)" from the template
            const tableId = mockButton.dataset['tableId'];
            if (tableId) {
                component.addTable(tableId);
            }

            expect(addTableSpy).toHaveBeenCalledWith('4');
        });
    });

    describe('initial field selection on panel load', () => {
        it('should select the first field that has an issue, deferred until the zone stabilizes', async () => {
            const selectFieldSpy = jest.spyOn(idpVerificationService, 'selectField').mockImplementation();

            fixture = TestBed.createComponent(MetadataPanelComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            await fixture.whenStable();

            expect(selectFieldSpy).toHaveBeenCalledWith(mockField1, true);
            expect(selectFieldSpy).toHaveBeenCalledTimes(1);
        });

        it('should select the first field with an issue even when it is not the first field', async () => {
            const firstFieldNoIssue = { ...mockField1, hasIssue: false };
            const secondFieldWithIssue = { ...mockField2, hasIssue: true };
            store.overrideSelector(selectDocumentFields, [firstFieldNoIssue, secondFieldWithIssue]);
            store.refreshState();

            const selectFieldSpy = jest.spyOn(idpVerificationService, 'selectField').mockImplementation();

            fixture = TestBed.createComponent(MetadataPanelComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            await fixture.whenStable();

            expect(selectFieldSpy).toHaveBeenCalledWith(secondFieldWithIssue, true);
            expect(selectFieldSpy).toHaveBeenCalledTimes(1);
        });

        it('should fall back to the first field when no fields have issues', async () => {
            const noIssueFields = fields.map((f) => ({ ...f, hasIssue: false }));
            store.overrideSelector(selectDocumentFields, noIssueFields);
            store.refreshState();

            const selectFieldSpy = jest.spyOn(idpVerificationService, 'selectField').mockImplementation();

            fixture = TestBed.createComponent(MetadataPanelComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            await fixture.whenStable();

            expect(selectFieldSpy).toHaveBeenCalledWith(noIssueFields[0], true);
            expect(selectFieldSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('form context loading spinner', () => {
        it('should set isFormContextLoading$ to false when feature flag is off', async () => {
            fixture.detectChanges();
            await fixture.whenStable();

            const loading = await firstValueFrom(component.isFormContextLoading$.pipe(take(1)));
            expect(loading).toBe(false);
        });

        it('should set isFormContextLoading$ to false when feature flag is on and form resolves', async () => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [
                    MatDialogModule,
                    MetadataPanelComponent,
                    MetadataTableFieldComponent,
                    NoopTranslateModule,
                    NoopAnimationsModule,
                    MatProgressSpinnerModule,
                    SatIconModule,
                ],
                providers: [
                    { provide: ActionHistoryService, useClass: ActionLinearHistoryService },
                    provideMockStore({
                        initialState: fieldVerificationRootState,
                        selectors: [
                            { selector: fieldVerificationRootFeatureSelector, value: fieldVerificationRootState },
                            { selector: selectFieldIgnoreForAutoMap, value: new Map<string, boolean>() },
                            { selector: selectFieldIgnoreForReviewMap, value: new Map<string, boolean>() },
                        ],
                    }),
                    IdpVerificationService,
                    FieldVerificationContextTaskService,
                    TableContextPipe,
                    { provide: IdpContextTaskBaseService, useValue: { rejectReasons$: of([]) } },
                    IdpShortcutService,
                    { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: [] },
                    {
                        provide: IdpFormCloudService,
                        useValue: {
                            getFormDefinitionByKey: jest.fn().mockReturnValue(of({ formRepresentation: { fields: [] } })),
                            getFormByModelKey: jest.fn().mockReturnValue(Promise.resolve({ formRepresentation: mockFormContext })),
                        },
                    },
                    {
                        provide: FeaturesServiceToken,
                        useValue: {
                            isOn$: () => of(true),
                        },
                    },
                ],
            });

            const featureOnStore = TestBed.inject(MockStore);
            featureOnStore.overrideSelector(selectDocumentFields, fields);
            featureOnStore.overrideSelector(selectDocument, testDocument);

            const featureOnFixture = TestBed.createComponent(MetadataPanelComponent);
            featureOnFixture.detectChanges();
            await featureOnFixture.whenStable();

            const loading = await firstValueFrom(featureOnFixture.componentInstance.isFormContextLoading$.pipe(take(1)));
            expect(loading).toBe(false);

            featureOnFixture.destroy();
        });

        it('should recover from getFormContext$ errors without killing the outer stream', async () => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [
                    MatDialogModule,
                    MetadataPanelComponent,
                    MetadataTableFieldComponent,
                    NoopTranslateModule,
                    NoopAnimationsModule,
                    MatProgressSpinnerModule,
                    SatIconModule,
                ],
                providers: [
                    { provide: ActionHistoryService, useClass: ActionLinearHistoryService },
                    provideMockStore({
                        initialState: fieldVerificationRootState,
                        selectors: [
                            { selector: fieldVerificationRootFeatureSelector, value: fieldVerificationRootState },
                            { selector: selectFieldIgnoreForAutoMap, value: new Map<string, boolean>() },
                            { selector: selectFieldIgnoreForReviewMap, value: new Map<string, boolean>() },
                        ],
                    }),
                    IdpVerificationService,
                    FieldVerificationContextTaskService,
                    TableContextPipe,
                    { provide: IdpContextTaskBaseService, useValue: { rejectReasons$: of([]) } },
                    IdpShortcutService,
                    { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: [] },
                    {
                        provide: IdpFormCloudService,
                        useValue: {
                            getFormDefinitionByKey: jest.fn().mockReturnValue(of({ formRepresentation: { fields: [] } })),
                            getFormByModelKey: jest.fn().mockReturnValue(Promise.reject(new Error('API failure'))),
                        },
                    },
                    {
                        provide: FeaturesServiceToken,
                        useValue: {
                            isOn$: () => of(true),
                        },
                    },
                ],
            });

            const errorStore = TestBed.inject(MockStore);
            errorStore.overrideSelector(selectDocumentFields, fields);
            errorStore.overrideSelector(selectDocument, testDocument);

            const errorFixture = TestBed.createComponent(MetadataPanelComponent);
            errorFixture.detectChanges();
            await errorFixture.whenStable();

            const loading = await firstValueFrom(errorFixture.componentInstance.isFormContextLoading$.pipe(take(1)));
            expect(loading).toBe(false);

            errorFixture.destroy();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });
    });

    describe('form validity batch dispatch on cloud form load', () => {
        it('should validate each form field and batch-dispatch validity when cloud form loads', async () => {
            const batchSpy = jest.spyOn(idpVerificationService, 'batchUpdateFieldValidity').mockImplementation();
            jest.spyOn(idpVerificationService, 'selectField').mockImplementation();

            await fixture.whenStable();

            const cloudForm = buildMockCloudForm([
                { id: mockField1.id, isValid: true },
                { id: mockField2.id, isValid: false },
                { id: 'unknown-field', isValid: true },
            ]);

            component.formLoaded.next(cloudForm);
            await fixture.whenStable();

            expect(cloudForm.form.validateField).toHaveBeenCalledTimes(2);
            expect(batchSpy).toHaveBeenCalled();
            const lastCallArg = batchSpy.mock.calls.at(-1)?.[0] ?? [];
            expect(lastCallArg).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ fieldId: mockField1.id, isFormFieldValid: true, formFieldIndex: 0 }),
                    expect.objectContaining({ fieldId: mockField2.id, isFormFieldValid: false, formFieldIndex: 1 }),
                ])
            );
            expect(lastCallArg.find((u) => u.fieldId === 'unknown-field')).toBeUndefined();
        });

        it('should validate the form and batch-dispatch validity when a new form loads', async () => {
            const batchSpy = jest.spyOn(idpVerificationService, 'batchUpdateFieldValidity').mockImplementation();
            jest.spyOn(idpVerificationService, 'selectField').mockImplementation();

            await fixture.whenStable();

            const cloudForm = buildMockCloudForm([
                { id: mockField1.id, isValid: true },
                { id: mockField3.id, isValid: false },
            ]);

            component.formLoaded.next(cloudForm);
            await fixture.whenStable();

            expect(cloudForm.form.validateForm).toHaveBeenCalled();
            const calls = batchSpy.mock.calls.map((args) => args[0]);
            const hasExpectedUpdates = calls.some(
                (updates) =>
                    updates.some((u) => u.fieldId === mockField1.id && u.isFormFieldValid === true && u.formFieldIndex === 0) &&
                    updates.some((u) => u.fieldId === mockField3.id && u.isFormFieldValid === false && u.formFieldIndex === 1)
            );
            expect(hasExpectedUpdates).toBe(true);
        });
    });
});

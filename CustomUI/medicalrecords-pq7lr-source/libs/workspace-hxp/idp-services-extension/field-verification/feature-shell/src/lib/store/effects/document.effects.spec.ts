/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { EMPTY, firstValueFrom, Observable, of, throwError } from 'rxjs';
import { DocumentEffects } from './document.effects';
import { systemActions, userActions } from '../actions/field-verification.actions';
import { fieldVerificationRootState, idpConfiguration, taskContext, taskData, taskInputData } from '../shared-mock-states';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { cold, hot } from 'jasmine-marbles';
import { IdpBackendService, IdpFieldDataType, IdpVerificationStatus, RejectReason } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { selectDocument } from '../selectors/document.selectors';
import { selectCorrelationId, selectTaskInfo, selectTaskInputData } from '../selectors/screen.selectors';
import { IdpDocument, IdpField, IdpTable, IdpTaskData, IdpValidationStatus } from '../../models/screen-models';
import { selectActiveField, selectDocumentFields, selectFieldsWithIssue } from '../selectors/document-field.selectors';
import { DocumentFieldEntity } from '../states/document-field.state';
import { DocumentEntity } from '../states/document.state';
import { DocumentTableEntity } from '../states/document-table.state';
import { fieldVerificationRootFeatureSelector } from '../selectors/field-verification-root.selectors';
import { selectDocumentTables } from '../selectors/document-table.selectors';
import { ApiTable } from '../../models/contracts/field-verification-models';
import { IdpImageLoadingService } from '../../services/image/idp-image-loading.service';
import { MockIdpImageLoadingService } from '../../services/image/idp-image-loading.service.spec';
import { ValidationProcessService } from '../../services/validation-process/validation-process.service';
import { IdpTableCellValidationService } from '../../services/table-cell-validation/table-cell-validation.service';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { ValidationProcessResults, ValidationTableRecord } from '../../models/validation-models';

type Members<T> = Pick<T, keyof T>;

function MockValidationProcessService() {
    return {
        runValidationProcess$() {
            return EMPTY;
        },
    } satisfies Members<ValidationProcessService>;
}

function MockIdpTableCellValidationService() {
    return {
        validateField: jest.fn().mockImplementation((field: { value?: string; name: string }, validation: any) => {
            if (!validation) {
                return true;
            }

            const value = field.value ?? '';
            const isEmpty = value.trim() === '';

            // Check required validator
            if (validation.required && isEmpty) {
                return false;
            }

            // For non-required fields, empty values are valid
            if (isEmpty) {
                return true;
            }

            // Check minLength validator
            if (validation.minLength !== undefined && value.length < validation.minLength) {
                return false;
            }

            // Check maxLength validator
            if (validation.maxLength !== undefined && value.length > validation.maxLength) {
                return false;
            }

            // Check pattern validator
            if (validation.pattern) {
                const regex = new RegExp(validation.pattern);
                if (!regex.test(value)) {
                    return false;
                }
            }

            return true;
        }),
    } satisfies Members<IdpTableCellValidationService>;
}

describe('DocumentEffects', () => {
    let actions$: Observable<any>;
    let effects: DocumentEffects;
    let store: MockStore;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        // Suppress console output in tests to reduce noise from intentional error handling
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        // Restore console output after each test
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    const documentState: DocumentEntity = {
        id: 'doc1',
        name: 'Document 1',
        class: {
            id: 'class1',
            name: 'Class 1',
        },
        pages: [
            {
                id: 'page1',
                name: 'Page 1',
                fileReference: 'fileRef1',
                contentFileReferenceIndex: 0,
                sourcePageIndex: 1,
            },
        ],
    };

    const taskDataFields: DocumentFieldEntity[] = [
        {
            order: 1,
            id: '1',
            name: 'Field 1',
            dataType: IdpFieldDataType.Text,
            format: '',
            value: 'test',
            confidence: 1,
            verificationStatus: 'AutoValid',
            validationStatus: IdpValidationStatus.Valid,
        },
    ];

    const fields: DocumentFieldEntity[] = [
        {
            order: 1,
            id: 'field1',
            name: 'Field 1',
            value: 'Value 1',
            dataType: IdpFieldDataType.Text,
            format: '',
            confidence: 0,
            verificationStatus: 'AutoValid',
            validationStatus: IdpValidationStatus.Valid,
            validatorName: 'validator',
        },
        {
            order: 2,
            id: 'field2',
            name: 'Field 2',
            value: 'Value 2',
            dataType: IdpFieldDataType.Text,
            format: '',
            confidence: 0,
            verificationStatus: 'AutoValid',
            validationStatus: IdpValidationStatus.Valid,
        },
        {
            order: 3,
            id: 'field3',
            name: 'Field 3',
            value: 'Value 3',
            dataType: IdpFieldDataType.Text,
            format: '',
            confidence: 0,
            verificationStatus: 'AutoValid',
            validationStatus: IdpValidationStatus.Valid,
        },
    ];

    const tables: DocumentTableEntity[] = [
        {
            id: 'table1',
            name: 'Table 1',
            columnHeaderNames: ['Column 1', 'Column 2'],
            rows: [
                ['Row 1 Column 1', 'Row 1 Column 2'],
                ['Row 2 Column 1', 'Row 2 Column 2'],
            ],
            validationStatus: IdpValidationStatus.Valid,
            validatorName: 'table validator',
            isDirty: true,
        },
        {
            id: 'table2',
            name: 'Table 2',
            columnHeaderNames: ['Column 1', 'Column 2'],
            rows: [
                ['Row 1 Column 1', 'Row 1 Column 2'],
                ['Row 2 Column 1', 'Row 2 Column 2'],
            ],
            validationStatus: IdpValidationStatus.Valid,
            validatorName: 'table 2 validator',
            isDirty: false,
        },
    ];

    const idpBackendSpy = {
        getFileMetadata$: jest.fn(),
        updateRotationData$: jest.fn(),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DocumentEffects,
                { provide: IdpImageLoadingService, useFactory: MockIdpImageLoadingService },
                { provide: ValidationProcessService, useFactory: MockValidationProcessService },
                { provide: IdpTableCellValidationService, useFactory: MockIdpTableCellValidationService },
                { provide: IdpBackendService, useValue: idpBackendSpy },
                {
                    provide: FeaturesServiceToken,
                    useValue: {
                        isOn$: jest.fn().mockReturnValue(of(true)),
                    },
                },
                provideMockActions(() => actions$),
                provideMockStore({
                    initialState: fieldVerificationRootState,
                    selectors: [{ selector: fieldVerificationRootFeatureSelector, value: fieldVerificationRootState }],
                }),
            ],
        });

        effects = TestBed.inject(DocumentEffects);
        store = TestBed.inject(MockStore);
    });

    afterEach(() => {
        store.resetSelectors();
        store.setState(fieldVerificationRootState);
    });

    it('should return documentLoad action with documentState and fields on screenLoadSuccess', () => {
        const action = systemActions.screenLoadSuccess({ taskContext: taskContext, taskData: taskData });
        actions$ = of(action);

        effects.loadDocumentEffect$.subscribe((result) => {
            const resultCorrect = 'documentState' in result && 'fields' in result && 'tables' in result;
            expect(resultCorrect).toBe(true);
            const taskDocument = taskInputData.batchState.documents[taskInputData.documentIndex];
            if ('documentState' in result) {
                const fieldDef = idpConfiguration.extraction.fieldDefinitionsByClass.find((fd) => fd.documentClassId === taskDocument.classId);
                expectDefined(fieldDef?.formModelKey);
                expect(result.documentState.id).toEqual(taskDocument.id);
                expect(result.documentState.class.id).toEqual(taskDocument.classId);
                expect(result.documentState.pages.length).toEqual(taskDocument.pages.length);
                expect(result.documentState.class.formModelKey).toEqual(fieldDef.formModelKey);
                expect(result.documentState.class.validationProcessName).toEqual(fieldDef.validationProcessName);
                expect(result.documentState.class.validationProcessId).toEqual(fieldDef.validationProcessId);
            }
            if ('fields' in result) {
                expect(result.fields.length).toEqual(taskDocument.fields?.length || 0);
                for (const [index, field] of result.fields.entries()) {
                    expect(field.validationStatus).toEqual(IdpValidationStatus.Valid);
                    if (fields[index].validatorName) {
                        expect(field.validatorName).toEqual(fields[index].validatorName);
                    }
                }
            }
            if ('tables' in result) {
                expect(result.tables.length).toEqual(taskDocument.tables?.length || 0);
                for (const [index, table] of result.tables.entries()) {
                    expect(table.validationStatus).toEqual(IdpValidationStatus.Valid);
                    expect(table.isDirty).toBe(false);
                    if (tables[index].validatorName) {
                        expect(table.validatorName).toEqual(tables[index].validatorName);
                    }
                }
            }
        });
    });

    it('should return documentLoadError action if document class is not found', () => {
        const testTaskData = {
            ...taskData,
            batchState: { ...taskData.batchState, documents: [{ ...taskData.batchState.documents[0], classId: 'class2' }] },
        };
        const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
        const outcome = systemActions.documentLoadError({ error: 'Document class not found - class2' });

        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });

        expect(effects.loadDocumentEffect$).toBeObservable(expected);
    });

    it('should return taskPrepareUpdateSuccess action with updated taskData having review not required status on taskPrepareUpdate when no field has issue', () => {
        const taskDocument = taskData.batchState.documents[taskData.documentIndex];
        const testDocument: IdpDocument = {
            id: taskDocument.id,
            name: taskDocument.name,
            class: { id: taskDocument.classId, name: '' },
            pages: [
                {
                    id: '0_0',
                    name: 'Page 1',
                    fileReference: 'ref1',
                    sourcePageIndex: 0,
                    documentId: 'doc1',
                    hasIssue: false,
                    isSelected: false,
                    rotation: 90,
                    viewerRotation: 90,
                },
            ],
            hasIssue: false,
        };
        const expectedTaskData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                documents: taskData.batchState.documents.map((d) =>
                    d.id === taskDocument.id
                        ? {
                              ...d,
                              extractionReviewStatus: 'ReviewNotRequired' as const,
                              pages: d.pages?.map((p) => ({
                                  ...p,
                                  rotation: 180,
                              })),
                              fields: d.fields?.map((f) => ({
                                  ...f,
                                  value: 'test',
                                  extractionConfidence: 1,
                                  boundingBox: undefined,
                                  extractionReviewStatus: 'ReviewNotRequired' as const,
                              })),
                              tables: [],
                          }
                        : d
                ),
                extractionStatus: 'Extracted' as const,
                hasRejectedDocuments: false,
            },
        };

        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: false });
        const outcome = systemActions.updateDocumentRotation({ taskAction: 'Complete', taskData: expectedTaskData, openNextTask: false });

        // overwrite selectors that taskPrepareUpdate depends upon.
        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, taskDataFields);
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, taskData);

        actions$ = of(action);
        effects.taskDataEffect$.subscribe((result) => {
            expect(result).toEqual(outcome);
        });
    });

    it('should return taskPrepareUpdateSuccess action with updated taskData having hasRejectedDocuments as true on taskPrepareUpdate when document is rejected', () => {
        const taskDocument = taskData.batchState.documents[taskData.documentIndex];
        const testDocument: IdpDocument = {
            id: taskDocument.id,
            name: taskDocument.name,
            class: { id: taskDocument.classId, name: '' },
            pages: [],
            hasIssue: false,
            markAsRejected: true,
            rejectReasonId: '1',
            rejectNote: 'test note',
        };
        const expectedTaskData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                documents: taskData.batchState.documents.map((d) =>
                    d.id === taskDocument.id
                        ? {
                              ...d,
                              extractionReviewStatus: 'ReviewNotRequired' as const,
                              pages: d.pages?.map((p) => ({
                                  ...p,
                                  rotation: 0,
                              })),
                              fields: d.fields?.map((f) => ({
                                  ...f,
                                  value: 'test',
                                  extractionConfidence: 1,
                                  boundingBox: undefined,
                                  extractionReviewStatus: 'ReviewNotRequired' as const,
                              })),
                              tables: [],
                              markAsRejected: true,
                              rejectReasonId: '1',
                              rejectNote: 'test note',
                          }
                        : d
                ),
                extractionStatus: 'Extracted' as const,
                hasRejectedDocuments: true,
            },
        };

        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: false });
        const outcome = systemActions.updateDocumentRotation({ taskAction: 'Complete', taskData: expectedTaskData, openNextTask: false });

        // overwrite selectors that taskPrepareUpdate depends upon.
        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, taskDataFields);
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, taskData);

        actions$ = of(action);
        effects.taskDataEffect$.subscribe((result) => {
            expect(result).toEqual(outcome);
        });
    });

    it('should return taskPrepareUpdateSuccess action with updated taskData having review required status on taskPrepareUpdate when at least one field has issue', () => {
        const taskDocument = taskData.batchState.documents[taskData.documentIndex];
        const testDocument: IdpDocument = {
            id: taskDocument.id,
            name: taskDocument.name,
            class: { id: taskDocument.classId, name: '' },
            pages: [],
            hasIssue: false,
            rejectReasonId: taskDocument.rejectReasonId,
            rejectNote: taskDocument.rejectNote,
            markAsRejected: taskDocument.markAsRejected,
        };
        const expectedTaskData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                documents: taskData.batchState.documents.map((d) =>
                    d.id === taskDocument.id
                        ? {
                              ...d,
                              extractionReviewStatus: 'ReviewRequired' as const,
                              pages: d.pages?.map((p) => ({
                                  ...p,
                                  rotation: 0,
                              })),
                              fields: d.fields?.map((f) => ({
                                  ...f,
                                  value: 'test',
                                  extractionConfidence: 1,
                                  boundingBox: undefined,
                                  extractionReviewStatus: 'ReviewRequired' as const,
                              })),
                              tables: [],
                          }
                        : d
                ),
                extractionStatus: 'ReviewRequired' as const,
                hasRejectedDocuments: false,
            },
        };

        // overwrite selectors that taskPrepareUpdate depends upon.
        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });
        const outcome = systemActions.updateDocumentRotation({ taskAction: 'Complete', taskData: expectedTaskData, openNextTask: undefined });

        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(
            selectDocumentFields,
            taskDataFields.map((field, index) => ({
                ...field,
                hasIssue: index === 0, // Mark the first field as having an issue
            }))
        );
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, taskData);

        actions$ = of(action);

        effects.taskDataEffect$.subscribe((result) => {
            expect(result).toEqual(outcome);
        });
    });

    it('should return taskPrepareUpdateError action with error message on taskPrepareUpdate when task data is not found', () => {
        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });
        const outcome = systemActions.taskPrepareUpdateError({ taskAction: 'Complete', error: 'Task data not found' });

        store.overrideSelector(selectDocument, {} as IdpDocument);

        store.overrideSelector(selectTaskInputData, undefined);

        actions$ = of(action);

        effects.taskDataEffect$.subscribe((result) => {
            expect(result).toEqual(outcome);
        });
    });

    it('should save table as ReviewRequired and reload it as AutoInvalid when it had AutoValid verificationStatus but Invalid validationStatus', async () => {
        const taskDocument = taskData.batchState.documents[taskData.documentIndex];
        const testDocument: IdpDocument = {
            id: taskDocument.id,
            name: taskDocument.name,
            class: { id: '2', name: '' },
            pages: [],
            hasIssue: false,
        };

        const tableId = '1';
        const apiTable: ApiTable = {
            id: tableId,
            name: 'Table 1',
            columnHeaderNames: ['Column 1'],
            pageIndexes: [0],
            extractionConfidence: 0.9,
            reviewStatus: 'ReviewNotRequired',
            columnHeaderBoundingBoxes: [],
            tableBoundingBoxes: [],
        };

        const testTaskData: IdpTaskData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                documents: [{ ...taskData.batchState.documents[0], classId: '2', tables: [apiTable] }],
            },
        };

        const tableFieldWithInvalidValidation: DocumentFieldEntity = {
            id: tableId,
            name: 'Table 1',
            dataType: IdpFieldDataType.Table,
            format: '',
            order: 0,
            confidence: 0.9,
            verificationStatus: IdpVerificationStatus.AutoValid,
            validationStatus: IdpValidationStatus.Invalid,
        };

        const tableInStore: IdpTable = {
            id: tableId,
            name: 'Table 1',
            columnHeaderNames: ['Column 1'],
            rows: [
                {
                    rowCells: [
                        {
                            id: 'cell1',
                            name: 'Column 1',
                            dataType: IdpFieldDataType.Text,
                            format: '',
                            confidence: 0.9,
                            verificationStatus: IdpVerificationStatus.AutoValid,
                            validationStatus: IdpValidationStatus.Valid,
                            hasIssue: false,
                            isSelected: false,
                            tableId,
                        },
                    ],
                },
            ],
            validationStatus: IdpValidationStatus.Valid,
            isDirty: false,
        };

        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, [tableFieldWithInvalidValidation]);
        store.overrideSelector(selectDocumentTables, [tableInStore]);
        store.overrideSelector(selectTaskInputData, testTaskData);

        actions$ = of(systemActions.taskPrepareUpdate({ taskAction: 'Save' }));
        const saveResult = await firstValueFrom(effects.taskDataEffect$);

        expect('taskData' in saveResult).toBe(true);
        if (!('taskData' in saveResult)) {
            return;
        }

        const savedTable = saveResult.taskData.batchState.documents[0].tables?.[0];
        expect(savedTable?.reviewStatus).toBe('ReviewRequired');

        actions$ = of(systemActions.screenLoadSuccess({ taskData: saveResult.taskData }));
        const loadResult = await firstValueFrom(effects.loadDocumentEffect$);

        expect('fields' in loadResult).toBe(true);
        if (!('fields' in loadResult)) {
            return;
        }

        const reloadedTableField = loadResult.fields.find((f) => f.id === tableId);
        expect(reloadedTableField?.verificationStatus).toBe(IdpVerificationStatus.AutoInvalid);
    });

    it('should return movedToNextField action with the first field with an issue on documentLoad', (done) => {
        const idpFields: IdpField[] = [
            {
                ...fields[0],
                hasIssue: false,
                isSelected: false,
            },
            {
                ...fields[1],
                hasIssue: true,
                isSelected: false,
            },
        ];

        store.overrideSelector(selectDocumentFields, idpFields);
        store.overrideSelector(selectFieldsWithIssue, [idpFields[0]]);
        const action = systemActions.documentLoad({ documentState, fields, tables });
        store.overrideSelector(selectDocumentFields, idpFields);
        store.overrideSelector(selectFieldsWithIssue, [idpFields[0]]);

        actions$ = new Observable((observer) => {
            observer.next(action);
            observer.complete();
        });

        effects.selectInitialFieldEffect$.subscribe((result) => {
            expect(result).toEqual(systemActions.movedToNextField({ id: 'field2' }));
            done();
        });
    });

    it('should return movedToNextField action with the first field with no fields with issues on documentLoad', () => {
        const idpFields: IdpField[] = [
            {
                ...fields[0],
                hasIssue: false,
                isSelected: false,
            },
            {
                ...fields[1],
                hasIssue: false,
                isSelected: false,
            },
        ];

        store.overrideSelector(selectDocumentFields, idpFields);
        store.overrideSelector(selectFieldsWithIssue, []);

        const action = systemActions.documentLoad({ documentState, fields, tables });
        store.overrideSelector(selectDocumentFields, idpFields);
        store.overrideSelector(selectFieldsWithIssue, []);

        actions$ = new Observable((observer) => {
            observer.next(action);
            observer.complete();
        });

        effects.selectInitialFieldEffect$.subscribe((result) => {
            expect(result).toEqual(systemActions.movedToNextField({ id: 'field1' }));
        });
    });

    it('should return movedToNextField action with the next field that has an issue on selectNextField', () => {
        const idpFields: IdpField[] = [
            {
                ...fields[0],
                hasIssue: true,
                isSelected: true,
            },
            {
                ...fields[1],
                hasIssue: false,
                isSelected: false,
            },
            {
                ...fields[2],
                hasIssue: true,
                isSelected: false,
            },
        ];

        store.overrideSelector(selectActiveField, idpFields[0]);
        store.overrideSelector(selectDocumentFields, idpFields);
        const action = userActions.selectNextField({});

        actions$ = of(action);
        effects.moveNextFieldEffect$.subscribe((result) => {
            expect(result).toEqual(systemActions.movedToNextField({ id: 'field3' }));
        });
    });

    it('should return movedToNextField action with the first field in that has an issue after wraparound on selectNextField', () => {
        const idpFields: IdpField[] = [
            {
                ...fields[0],
                hasIssue: true,
                isSelected: false,
            },
            {
                ...fields[1],
                hasIssue: false,
                isSelected: false,
            },
            {
                ...fields[2],
                hasIssue: true,
                isSelected: true,
            },
        ];

        store.overrideSelector(selectActiveField, idpFields[2]);
        store.overrideSelector(selectDocumentFields, idpFields);
        const action = userActions.selectNextField({});

        actions$ = of(action);
        effects.moveNextFieldEffect$.subscribe((result) => {
            expect(result).toEqual(systemActions.movedToNextField({ id: 'field1' }));
        });
    });

    it('should move to next document field with issue on selectNextField even when a table field has issue', () => {
        const idpFields: IdpField[] = [
            {
                ...fields[0],
                hasIssue: true,
                isSelected: false,
            },
            {
                ...fields[1],
                hasIssue: false,
                isSelected: true,
            },
            {
                ...fields[2],
                hasIssue: true,
                isSelected: false,
            },
            {
                id: 'tableField1',
                tableId: 'table1',
                name: '',
                dataType: IdpFieldDataType.Table,
                format: '',
                confidence: 0,
                verificationStatus: 'AutoInvalid',
                hasIssue: true,
                validationStatus: IdpValidationStatus.Valid,
            },
        ];

        store.overrideSelector(selectActiveField, idpFields[1]);
        store.overrideSelector(selectDocumentFields, idpFields);
        const action = userActions.selectNextField({});

        actions$ = of(action);
        effects.moveNextFieldEffect$.subscribe((result) => {
            expect(result).toEqual(systemActions.movedToNextField({ id: fields[2].id }));
        });
    });

    it('should complete the task when a reject reason is updated with doCompleteTask set', () => {
        const reason: RejectReason = { id: '1', value: 'Image Blurry' };
        const rejectReasonAction = userActions.rejectReasonUpdate({ rejectReasonId: reason.id, rejectNote: 'too blurry', doCompleteTask: true });
        const taskCompleteAction = userActions.taskComplete();

        actions$ = new Observable((observer) => {
            observer.next(rejectReasonAction);
            observer.complete();
        });

        effects.rejectBatchEffect$.subscribe((result) => {
            expect(result).toEqual(taskCompleteAction);
        });
    });

    it('should not complete the task when a reject reason is updated with doCompleteTask not set', () => {
        const reason: RejectReason = { id: '1', value: 'Image Blurry' };
        const rejectReasonAction = userActions.rejectReasonUpdate({ rejectReasonId: reason.id, rejectNote: 'too blurry', doCompleteTask: false });

        actions$ = hot('-a', { a: rejectReasonAction });

        const expected$ = cold('--');
        expect(effects.rejectBatchEffect$).toBeObservable(expected$);
    });

    it('should maintain existing pageIndex in boundingBox when available', () => {
        const taskDocument = taskData.batchState.documents[taskData.documentIndex];
        const testDocument: IdpDocument = {
            id: taskDocument.id,
            name: taskDocument.name,
            class: { id: taskDocument.classId, name: '' },
            pages: [
                { id: 'page1', name: 'Page 1', fileReference: 'ref1', sourcePageIndex: 0, documentId: 'doc1', hasIssue: false, isSelected: false },
                { id: 'page2', name: 'Page 2', fileReference: 'ref2', sourcePageIndex: 1, documentId: 'doc1', hasIssue: false, isSelected: false },
            ],
            hasIssue: false,
        };

        const fieldsWithBoundingBox: DocumentFieldEntity[] = [
            {
                ...taskDataFields[0],
                boundingBox: {
                    top: 100,
                    left: 100,
                    height: 50,
                    width: 100,
                    pageIndex: 1,
                },
            },
        ];

        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });

        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, fieldsWithBoundingBox);
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, taskData);

        actions$ = of(action);
        effects.taskDataEffect$.subscribe((result) => {
            if ('taskData' in result) {
                const updatedField = result.taskData.batchState.documents[0].fields?.[0];
                expect(updatedField?.boundingBox?.pageIndex).toBe(1);
            }
        });
    });

    it('should resolve pageIndex from pageId when pageIndex is not available', () => {
        const taskDocument = taskData.batchState.documents[taskData.documentIndex];
        const testDocument: IdpDocument = {
            id: taskDocument.id,
            name: taskDocument.name,
            class: { id: taskDocument.classId, name: '' },
            pages: [
                { id: 'page1', name: 'Page 1', fileReference: 'ref1', sourcePageIndex: 0, documentId: 'doc1', hasIssue: false, isSelected: false },
                { id: 'page2', name: 'Page 2', fileReference: 'ref2', sourcePageIndex: 1, documentId: 'doc1', hasIssue: false, isSelected: false },
            ],
            hasIssue: false,
        };

        const fieldsWithBoundingBox: DocumentFieldEntity[] = [
            {
                ...taskDataFields[0],
                boundingBox: {
                    top: 100,
                    left: 100,
                    height: 50,
                    width: 100,
                    pageId: 'page2',
                },
            },
        ];

        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });

        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, fieldsWithBoundingBox);
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, taskData);

        actions$ = of(action);
        effects.taskDataEffect$.subscribe((result) => {
            if ('taskData' in result) {
                const updatedField = result.taskData.batchState.documents[0].fields?.[0];
                expect(updatedField?.boundingBox?.pageIndex).toBe(1);
            }
        });
    });

    it('should ensure fields values are never undefined for textual table cells', (done) => {
        const apiTable: ApiTable = {
            id: '1',
            name: 'Table 1',
            columnHeaderNames: ['Column 1'],
            pageIndexes: [0],
            extractionConfidence: 1,
            reviewStatus: 'ReviewNotRequired',
            columnHeaderBoundingBoxes: [],
            tableBoundingBoxes: [],
            records: [
                {
                    records: [
                        {
                            recordName: 'Column 1',
                            type: IdpFieldDataType.Text,
                            value: undefined, // This should be converted to an empty string
                        },
                    ],
                },
            ],
        };

        const testTaskData: IdpTaskData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                documents: [{ ...taskData.batchState.documents[0], classId: '2', tables: [apiTable] }],
            },
        };

        actions$ = of(systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData }));

        effects.loadDocumentEffect$.subscribe((result) => {
            if (!('fields' in result)) {
                done.fail(result.error);
                return;
            }
            const table = result.tables[0];
            const cellMatrix = table.rows.map((row) => row.map((columnCellId) => result.fields.find((field) => field.id === columnCellId)));
            expect(cellMatrix[0][0]?.value).toBe('');
            done();
        });
    });

    it('should preload page data in order', () => {
        const imageLoadingService = TestBed.inject(IdpImageLoadingService);
        const getImageDataSpy = spyOn(imageLoadingService, 'getImageDataForPage$').and.callThrough();
        const getOcrDataSpy = spyOn(imageLoadingService, 'getPageOcrData$').and.callThrough();

        const plainPages = [
            { id: 'page1', name: 'Page 1', fileReference: 'ref1', contentFileReferenceIndex: 0, sourcePageIndex: 0 },
            { id: 'page2', name: 'Page 2', fileReference: 'ref2', contentFileReferenceIndex: 0, sourcePageIndex: 0 },
        ];
        const pageWithField = { id: 'page3', name: 'Page 3', fileReference: 'ref3', contentFileReferenceIndex: 0, sourcePageIndex: 0 };
        const pageWithIssueField = { id: 'page4', name: 'Page 4', fileReference: 'ref4', contentFileReferenceIndex: 0, sourcePageIndex: 0 };

        const taskDocument = taskData.batchState.documents[taskData.documentIndex];
        const testDocument: DocumentEntity = {
            id: taskDocument.id,
            name: taskDocument.name,
            class: { id: taskDocument.classId, name: '' },
            pages: [...plainPages, pageWithField, pageWithIssueField],
        };

        const documentFields = [
            {
                ...fields[0],
                boundingBox: {
                    top: 100,
                    left: 100,
                    height: 50,
                    width: 100,
                    pageId: pageWithField.id,
                },
            },
            {
                ...fields[1],
                hasIssue: true,
                boundingBox: {
                    top: 100,
                    left: 100,
                    height: 50,
                    width: 100,
                    pageId: pageWithIssueField.id,
                },
            },
        ];

        store.overrideSelector(selectDocumentFields, documentFields);

        const action = systemActions.documentLoad({ documentState: testDocument, fields: documentFields, tables: [] });

        actions$ = of(action);
        effects.preloadPagesEffect$.subscribe({
            complete: () => {
                const expectedPageOrder = [pageWithIssueField, pageWithField, ...plainPages];
                expect(getImageDataSpy.calls.allArgs()).toEqual(expectedPageOrder.map((page) => [page.id]));
                expect(getOcrDataSpy.calls.allArgs()).toEqual(expectedPageOrder.map((page) => [page.id]));
            },
        });
    });

    it('should return addTableRowFields action with new cell fields on addTableRow', (done) => {
        const uuidService = TestBed.inject(DocumentEffects)['uuidService'];
        spyOn(uuidService, 'generate').and.returnValue('generated-uuid');

        const documentFields = [
            {
                ...fields[0],
                boundingBox: {
                    top: 100,
                    left: 100,
                    height: 50,
                    width: 100,
                    pageId: '1',
                },
            },
            {
                ...fields[1],
                hasIssue: true,
                boundingBox: {
                    top: 100,
                    left: 100,
                    height: 50,
                    width: 100,
                    pageId: '1',
                },
            },
        ];

        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);
        store.overrideSelector(selectDocumentFields, documentFields);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { required: true } },
                                    { name: 'Col2', validation: { minLength: 5 } },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        const action = userActions.addTableRow({ tableId: 'table1', rowIndex: 0 });
        actions$ = of(action);

        effects.addTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.addTableRowFields.type);
            if ('tableId' in result && 'rowIndex' in result && 'fields' in result) {
                expect(result.tableId).toBe('table1');
                expect(result.rowIndex).toBe(0);
                expect(result.fields.length).toBe(2);
                expect(result.fields[0].id).toBe('generated-uuid');
                expect(result.fields[0].name).toBe('Col1');
                expect(result.fields[0].validationStatus).toBe(IdpValidationStatus.Invalid); // required, empty
                expect(result.fields[1].name).toBe('Col2');
                expect(result.fields[1].validationStatus).toBe(IdpValidationStatus.Valid); // minLength, but empty allowed
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should return [Noop] action if table is not found on addTableRow', (done) => {
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectDocumentFields, []);
        const action = userActions.addTableRow({ tableId: 'notfound', rowIndex: 0 });
        actions$ = of(action);

        effects.addTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe('[Noop]');
            done();
        });
    });

    it('should return clearTableRowFields action with cleared row cells on clearTableRow', (done) => {
        const rowCells = [
            { id: 'cell1', name: 'Col1', value: 'A', order: 0 },
            { id: 'cell2', name: 'Col2', value: 'B', order: 0 },
        ];
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [{ rowCells } as any],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { required: true } },
                                    { name: 'Col2', validation: { pattern: '^[A-Z]+$' } },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        const action = userActions.clearTableRow({ tableId: 'table1', rowIndex: 0 } as any);
        actions$ = of(action);

        effects.clearTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.clearTableRowFields.type);
            if ('tableId' in result && 'rowIndex' in result && 'fields' in result) {
                expect(result.tableId).toBe('table1');
                expect(result.rowIndex).toBe(0);
                expect(result.fields.length).toBe(2);
                expect(result.fields[0].value).toBe('');
                expect(result.fields[0].validationStatus).toBe(IdpValidationStatus.Invalid); // required, empty
                expect(result.fields[1].value).toBe('');
                expect(result.fields[1].validationStatus).toBe(IdpValidationStatus.Valid); // pattern, but empty allowed
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should return [Noop] action if table or row is not found on clearTableRow', (done) => {
        store.overrideSelector(selectDocumentTables, []);
        const action = userActions.clearTableRow({ tableId: 'notfound', rowIndex: 0 });
        actions$ = of(action);

        effects.clearTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe('[Noop]');
            done();
        });
    });

    it('should return updateTableRowFields action with updated row cells on updateTableRow', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [{ rowCells: [{ documentClassId: 'class1' }] } as any],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { minLength: 3 } },
                                    { name: 'Col2', validation: {} },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        const rowCells = [
            { id: 'cell1', name: 'Col1', value: 'A' },
            { id: 'cell2', name: 'Col2', value: 'B' },
        ];
        // Only include the properties needed for the test, and cast as any to avoid type errors
        const action = userActions.updateTableRow({ tableId: 'table1', rowIndex: 1, rowCells: rowCells } as any);
        actions$ = of(action);

        effects.updateTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.updateTableRowFields.type);
            expect(result.tableId).toBe('table1');
            expect(result.rowIndex).toBe(1);
            expect(result.fields[0].order).toBe(1);
            expect(result.fields[0].validationStatus).toBe(IdpValidationStatus.Invalid); // 'A' fails minLength: 3
            expect(result.fields[1].order).toBe(1);
            expect(result.fields[1].validationStatus).toBe(IdpValidationStatus.Valid); // no validation
            done();
        });
    });

    it('should return clearTableColumnFields action with cleared column cells on clearTableColumn', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [
                    {
                        rowCells: [
                            {
                                id: 'cell1',
                                name: 'Col1',
                                value: 'A',
                                confidence: 0.8,
                                boundingBox: { top: 1, left: 2, width: 3, height: 4, pageId: 'page-1' },
                            } as any,
                            { id: 'cell2', name: 'Col2', value: 'B' } as any,
                        ],
                    },
                    {
                        rowCells: [
                            {
                                id: 'cell3',
                                name: 'Col1',
                                value: 'C',
                                confidence: 0.9,
                                boundingBox: { top: 5, left: 6, width: 7, height: 8, pageId: 'page-2' },
                            } as any,
                            { id: 'cell4', name: 'Col2', value: 'D' } as any,
                        ],
                    },
                ],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { required: true } },
                                    { name: 'Col2', validation: { minLength: 3 } },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        const action = userActions.clearTableColumn({ tableId: 'table1', columnIndex: 0 });
        actions$ = of(action);

        effects.clearTableColumnEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.clearTableColumnFields.type);
            if ('tableId' in result && 'columnIndex' in result && 'fields' in result) {
                expect(result.tableId).toBe('table1');
                expect(result.columnIndex).toBe(0);
                expect(result.fields.length).toBe(2);
                expect(result.fields[0].value).toBe('');
                expect(result.fields[0].validationStatus).toBe(IdpValidationStatus.Invalid); // required, empty
                expect(result.fields[0].confidence).toBe(0.8);
                expect(result.fields[0].boundingBox).toBeUndefined();
                expect(result.fields[1].value).toBe('');
                expect(result.fields[1].validationStatus).toBe(IdpValidationStatus.Invalid); // required, empty
                expect(result.fields[1].confidence).toBe(0.9);
                expect(result.fields[1].boundingBox).toBeUndefined();
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should skip rows without the selected column cell on clearTableColumn', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [
                    {
                        rowCells: [{ id: 'cell1', name: 'Col1', value: 'A' } as any],
                    },
                    {
                        rowCells: [{ id: 'cell2', name: 'Col1', value: 'B' } as any, { id: 'cell3', name: 'Col2', value: 'C' } as any],
                    },
                ],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { required: true } },
                                    { name: 'Col2', validation: { required: true } },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        const action = userActions.clearTableColumn({ tableId: 'table1', columnIndex: 1 });
        actions$ = of(action);

        effects.clearTableColumnEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.clearTableColumnFields.type);
            if ('tableId' in result && 'columnIndex' in result && 'fields' in result) {
                expect(result.tableId).toBe('table1');
                expect(result.columnIndex).toBe(1);
                expect(result.fields).toHaveLength(1);
                expect(result.fields[0].id).toBe('cell3');
                expect(result.fields[0].value).toBe('');
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should return [Noop] action if table is not found on clearTableColumn', (done) => {
        store.overrideSelector(selectDocumentTables, []);
        const action = userActions.clearTableColumn({ tableId: 'notfound', columnIndex: 0 });
        actions$ = of(action);

        effects.clearTableColumnEffect$.subscribe((result) => {
            expect(result.type).toBe('[Noop]');
            done();
        });
    });

    it('should return updateTableColumnFields action with updated column cells on updateTableColumn', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [{ rowCells: [{ documentClassId: 'class1' }] } as any],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { required: true, minLength: 2 } },
                                    { name: 'Col2', validation: {} },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        const columnCells = [
            { id: 'cell1', name: 'Col1', value: 'A' },
            { id: 'cell3', name: 'Col1', value: 'C' },
        ];
        const action = userActions.updateTableColumn({ tableId: 'table1', columnIndex: 0, columnCells } as any);
        actions$ = of(action);

        effects.updateTableColumnEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.updateTableColumnFields.type);
            if ('tableId' in result && 'columnIndex' in result && 'fields' in result) {
                expect(result.tableId).toBe('table1');
                expect(result.columnIndex).toBe(0);
                expect(result.fields[0].order).toBe(0);
                expect(result.fields[0].validationStatus).toBe(IdpValidationStatus.Invalid); // 'A' fails minLength: 2
                expect(result.fields[1].order).toBe(1);
                expect(result.fields[1].validationStatus).toBe(IdpValidationStatus.Invalid); // 'C' fails minLength: 2
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should return [Noop] action if table is not found on updateTableColumn', (done) => {
        store.overrideSelector(selectDocumentTables, []);
        const action = userActions.updateTableColumn({ tableId: 'notfound', columnIndex: 0, columnCells: [] });
        actions$ = of(action);

        effects.updateTableColumnEffect$.subscribe((result) => {
            expect(result.type).toBe('[Noop]');
            done();
        });
    });

    it('should return insertTableRowFields action with inserted row cells on insertTableRow', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { required: true, minLength: 2 } },
                                    { name: 'Col2', validation: {} },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        const rowCells = [
            { id: 'cell1', name: 'Col1', value: 'A' },
            { id: 'cell2', name: 'Col2', value: 'B' },
        ];
        const action = userActions.insertTableRow({ tableId: 'table1', rowIndex: 1, rowCells } as any);
        actions$ = of(action);

        effects.insertTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.insertTableRowFields.type);
            if ('tableId' in result && 'rowIndex' in result && 'fields' in result) {
                expect(result.tableId).toBe('table1');
                expect(result.rowIndex).toBe(1);
                expect(result.fields[0].order).toBe(1);
                expect(result.fields[0].validationStatus).toBe(IdpValidationStatus.Invalid); // 'A' fails minLength: 2
                expect(result.fields[1].order).toBe(1);
                expect(result.fields[1].validationStatus).toBe(IdpValidationStatus.Valid); // no validation rules
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should return [Noop] action if table is not found on insertTableRow', (done) => {
        store.overrideSelector(selectDocumentTables, []);
        const action = userActions.insertTableRow({ tableId: 'notfound', rowIndex: 0, rowCells: [] });
        actions$ = of(action);

        effects.insertTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe('[Noop]');
            done();
        });
    });

    it('should recalculate validation when restoring row with invalid fields via insertTableRow', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { required: true } },
                                    { name: 'Col2', validation: { minLength: 5 } },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        // Simulate restoring a row that had an error (empty required field, short value)
        const rowCells = [
            { id: 'cell1', name: 'Col1', value: '', validationStatus: IdpValidationStatus.Valid }, // Old status (wrong)
            { id: 'cell2', name: 'Col2', value: 'ab', validationStatus: IdpValidationStatus.Valid }, // Old status (wrong)
        ];
        const action = userActions.insertTableRow({ tableId: 'table1', rowIndex: 0, rowCells } as any);
        actions$ = of(action);

        effects.insertTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.insertTableRowFields.type);
            if ('tableId' in result && 'rowIndex' in result && 'fields' in result) {
                // Verify validation was recalculated (not using old status)
                expect(result.fields[0].validationStatus).toBe(IdpValidationStatus.Invalid); // required, empty
                expect(result.fields[1].validationStatus).toBe(IdpValidationStatus.Invalid); // 'ab' fails minLength: 5
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should recalculate validation when restoring row via updateTableRow (undo clear row)', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [
                    {
                        rowCells: [
                            { id: 'cell1', name: 'Col1', value: '', validationStatus: IdpValidationStatus.Valid },
                            { id: 'cell2', name: 'Col2', value: '', validationStatus: IdpValidationStatus.Valid },
                        ],
                    },
                ],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const mockTaskInputData = {
            ...taskInputData,
            extractionConfiguration: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: 'class1',
                        fieldDefinitions: [
                            {
                                id: 'table1',
                                name: 'Table 1',
                                dataType: IdpFieldDataType.Table,
                                columns: [
                                    { name: 'Col1', validation: { minLength: 7, maxLength: 25 } },
                                    { name: 'Col2', validation: { required: true } },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
        store.overrideSelector(selectTaskInputData, mockTaskInputData);

        // Simulate restoring a row that had invalid/valid cells (undo clear row)
        const rowCells = [
            { id: 'cell1', name: 'Col1', value: 'abc', validationStatus: IdpValidationStatus.Valid }, // Old status (wrong - should be invalid, too short)
            { id: 'cell2', name: 'Col2', value: 'populated', validationStatus: IdpValidationStatus.Valid }, // Old status (correct)
        ];
        const action = userActions.updateTableRow({ tableId: 'table1', rowIndex: 0, rowCells } as any);
        actions$ = of(action);

        effects.updateTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.updateTableRowFields.type);
            if ('tableId' in result && 'rowIndex' in result && 'fields' in result) {
                // Verify validation was recalculated (not using old status)
                expect(result.fields[0].validationStatus).toBe(IdpValidationStatus.Invalid); // 'abc' fails minLength: 7
                expect(result.fields[1].validationStatus).toBe(IdpValidationStatus.Valid); // 'populated' is valid
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should return deleteTableRowFields action with fieldIds on deleteTableRow', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [{ rowCells: [{ id: 'cell1' }, { id: 'cell2' }] } as any, { rowCells: [{ id: 'cell3' }, { id: 'cell4' }] } as any],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const action = userActions.deleteTableRow({ tableId: 'table1', rowIndex: 1 });
        actions$ = of(action);

        effects.deleteTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.deleteTableRowFields.type);
            if ('tableId' in result && 'rowIndex' in result && 'fieldIds' in result) {
                expect(result.tableId).toBe('table1');
                expect(result.rowIndex).toBe(1);
                expect(result.fieldIds).toEqual(['cell3', 'cell4']);
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should return [Noop] action if table is not found or rowIndex is invalid on deleteTableRow', (done) => {
        store.overrideSelector(selectDocumentTables, []);
        const action = userActions.deleteTableRow({ tableId: 'notfound', rowIndex: 0 });
        actions$ = of(action);

        effects.deleteTableRowEffect$.subscribe((result) => {
            expect(result.type).toBe('[Noop]');
            done();
        });
    });

    it('should return deleteTableFields action with all fieldIds on deleteTable', (done) => {
        const documentTables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1', 'Col2'],
                rows: [{ rowCells: [{ id: 'cell1' }, { id: 'cell2' }] } as any, { rowCells: [{ id: 'cell3' }, { id: 'cell4' }] } as any],
            },
        ];
        store.overrideSelector(selectDocumentTables, documentTables);

        const action = userActions.deleteTable({ tableId: 'table1' });
        actions$ = of(action);

        effects.deleteTableEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.deleteTableFields.type);
            if ('tableId' in result && 'fieldIds' in result) {
                expect(result.tableId).toBe('table1');
                expect(result.fieldIds).toEqual(['cell1', 'cell2', 'cell3', 'cell4']);
            } else {
                fail('Result does not have expected properties: ' + JSON.stringify(result));
            }
            done();
        });
    });

    it('should return [Noop] action if table is not found on deleteTable', (done) => {
        store.overrideSelector(selectDocumentTables, []);
        const action = userActions.deleteTable({ tableId: 'notfound' });
        actions$ = of(action);

        effects.deleteTableEffect$.subscribe((result) => {
            expect(result.type).toBe('[Noop]');
            done();
        });
    });

    it('should return restoreTableFields action with converted table and fields on restoreTable', (done) => {
        const tableData = {
            id: 'table1',
            name: 'Table 1',
            columnHeaderNames: ['Col1', 'Col2'],
            rows: [{ rowCells: [{ id: 'cell1' }, { id: 'cell2' }] }, { rowCells: [{ id: 'cell3' }, { id: 'cell4' }] }],
        };
        const tableFields = [
            { id: 'cell1', name: 'Col1', value: 'A' },
            { id: 'cell2', name: 'Col2', value: 'B' },
            { id: 'cell3', name: 'Col1', value: 'C' },
            { id: 'cell4', name: 'Col2', value: 'D' },
        ];
        const action = userActions.restoreTable({ tableId: 'table1', tableData, tableFields } as any);
        actions$ = of(action);

        effects.restoreTableEffect$.subscribe((result) => {
            expect(result.type).toBe(userActions.restoreTableFields.type);
            expect(result.tableId).toBe('table1');
            expect(result.tableData.id).toBe('table1');
            expect(result.fields.length).toBe(4);
            expect(result.fields[0].order).toBe(0);
            expect(result.fields[1].order).toBe(1);
            done();
        });
    });

    describe('fieldValueUpdateEffect$', () => {
        it('should dispatch applyFieldValueUpdate and runValidationProcessIfConfigured if field value changed', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const action = userActions.fieldValueUpdate({
                fieldId: 'field1',
                value: 'new value',
                confidence: 0.95,
            });

            const expectedApplyAction = systemActions.applyFieldValueUpdate({
                fieldId: 'field1',
                value: 'new value',
                confidence: 0.95,
            });

            const expectedValidationAction = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'field1',
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fields);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', { b: expectedApplyAction, c: expectedValidationAction });

            expect(effects.fieldValueUpdateEffect$).toBeObservable(expected);
        });

        it('should not dispatch runValidationProcessIfConfigured if field value did not change', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const action = userActions.fieldValueUpdate({
                fieldId: 'field1',
                value: 'Value 1',
                confidence: 0.95,
            });

            const expectedAction = systemActions.applyFieldValueUpdate({
                fieldId: 'field1',
                value: 'Value 1',
                confidence: 0.95,
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fields);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.fieldValueUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch updateTableDirtyFlag when table cell value changes', () => {
            const cellId = 'cell1-1';
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1', 'Column 2'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: cellId,
                                    name: 'Column 1',
                                    value: 'old value',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                                {
                                    id: 'cell1-2',
                                    name: 'Column 2',
                                    value: 'value2',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = userActions.fieldValueUpdate({
                fieldId: cellId,
                value: 'new value',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedApplyAction = systemActions.applyFieldValueUpdate({
                fieldId: cellId,
                value: 'new value',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedDirtyAction = systemActions.updateTableDirtyFlag({
                tableId: 'table1',
                isDirty: true,
            });

            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', { b: expectedApplyAction, c: expectedDirtyAction });

            expect(effects.fieldValueUpdateEffect$).toBeObservable(expected);
        });

        it('should not dispatch updateTableDirtyFlag when table cell value does not change', () => {
            const cellId = 'cell1-1';
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1', 'Column 2'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: cellId,
                                    name: 'Column 1',
                                    value: 'same value',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = userActions.fieldValueUpdate({
                fieldId: cellId,
                value: 'same value',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedApplyAction = systemActions.applyFieldValueUpdate({
                fieldId: cellId,
                value: 'same value',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedApplyAction });

            expect(effects.fieldValueUpdateEffect$).toBeObservable(expected);
        });

        it('should find cell in second row of table', () => {
            const cellId = 'cell2-1';
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1-1',
                                    name: 'Column 1',
                                    value: 'row1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                        {
                            rowCells: [
                                {
                                    id: cellId,
                                    name: 'Column 1',
                                    value: 'row2 old',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 1,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = userActions.fieldValueUpdate({
                fieldId: cellId,
                value: 'row2 new',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedApplyAction = systemActions.applyFieldValueUpdate({
                fieldId: cellId,
                value: 'row2 new',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedDirtyAction = systemActions.updateTableDirtyFlag({
                tableId: 'table1',
                isDirty: true,
            });

            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', { b: expectedApplyAction, c: expectedDirtyAction });

            expect(effects.fieldValueUpdateEffect$).toBeObservable(expected);
        });
    });

    describe('checkTableValidationAfterFieldUpdateEffect$', () => {
        it('should dispatch fieldValidationUpdate with Valid status when table cell is updated to valid value', () => {
            const cellId = 'cell1-1';
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: cellId,
                                    name: 'Column 1',
                                    value: 'valid value',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.applyFieldValueUpdate({
                fieldId: cellId,
                value: 'valid value',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedAction = systemActions.fieldValidationUpdate({
                fieldId: 'table1',
                validationStatus: IdpValidationStatus.Valid,
            });

            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.checkTableValidationAfterFieldUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch fieldValidationUpdate with Invalid status when table cell is updated to invalid value', () => {
            const cellId = 'cell1-1';
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: cellId,
                                    name: 'Column 1',
                                    value: 'invalid',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Invalid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Invalid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.applyFieldValueUpdate({
                fieldId: cellId,
                value: 'invalid',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Invalid,
            });

            const expectedAction = systemActions.fieldValidationUpdate({
                fieldId: 'table1',
                validationStatus: IdpValidationStatus.Invalid,
            });

            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.checkTableValidationAfterFieldUpdateEffect$).toBeObservable(expected);
        });

        it('should not dispatch any action when a regular field (not table cell) is updated', () => {
            const fieldId = 'field1';
            const fieldsWithRegularField: IdpField[] = [
                {
                    id: fieldId,
                    name: 'Regular Field',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    order: 0,
                    value: 'some value',
                    confidence: 0.9,
                    verificationStatus: 'AutoValid',
                    validationStatus: IdpValidationStatus.Valid,
                },
            ];

            const action = systemActions.applyFieldValueUpdate({
                fieldId: fieldId,
                value: 'updated value',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            store.overrideSelector(selectDocumentFields, fieldsWithRegularField);
            store.overrideSelector(selectDocumentTables, []);

            actions$ = hot('-a-', { a: action });
            const expected = cold('--'); // No emissions

            expect(effects.checkTableValidationAfterFieldUpdateEffect$).toBeObservable(expected);
        });

        it('should not dispatch any action when field is not found in any table', () => {
            const cellId = 'nonexistent-cell';
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'different-cell',
                                    name: 'Column 1',
                                    value: 'value',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.applyFieldValueUpdate({
                fieldId: cellId,
                value: 'value',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Valid,
            });

            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('--'); // No emissions

            expect(effects.checkTableValidationAfterFieldUpdateEffect$).toBeObservable(expected);
        });

        it('should correctly validate table with multiple cells when one becomes invalid', () => {
            const cellId = 'cell1-2';
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1', 'Column 2'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1-1',
                                    name: 'Column 1',
                                    value: 'valid',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                                {
                                    id: cellId,
                                    name: 'Column 2',
                                    value: 'invalid',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Invalid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Invalid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.applyFieldValueUpdate({
                fieldId: cellId,
                value: 'invalid',
                confidence: 0.95,
                validationStatus: IdpValidationStatus.Invalid,
            });

            const expectedAction = systemActions.fieldValidationUpdate({
                fieldId: 'table1',
                validationStatus: IdpValidationStatus.Invalid,
            });

            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.checkTableValidationAfterFieldUpdateEffect$).toBeObservable(expected);
        });
    });

    describe('checkTableValidationAfterBatchTableUpdateEffect$', () => {
        it('should dispatch fieldValidationUpdate with Invalid status after a cleared column leaves invalid cells', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1-1',
                                    name: 'Column 1',
                                    value: '',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'ManualValid',
                                    validationStatus: IdpValidationStatus.Invalid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: true,
                },
            ];

            const action = userActions.clearTableColumnFields({
                tableId: 'table1',
                columnIndex: 0,
                fields: [],
            });

            const expectedAction = systemActions.fieldValidationUpdate({
                fieldId: 'table1',
                validationStatus: IdpValidationStatus.Invalid,
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.checkTableValidationAfterBatchTableUpdateEffect$).toBeObservable(expected);
        });

        it('should not dispatch fieldValidationUpdate when the updated table cannot be found', () => {
            const action = userActions.updateTableColumnFields({
                tableId: 'missing-table',
                columnIndex: 0,
                fields: [],
            });

            store.overrideSelector(selectDocumentTables, tables);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.checkTableValidationAfterBatchTableUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch fieldValidationUpdate with Valid status after a batched column update restores valid cells', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1-1',
                                    name: 'Column 1',
                                    value: 'valid',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'ManualValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Invalid,
                    validatorName: 'tableValidator',
                    isDirty: true,
                },
            ];

            const action = userActions.updateTableColumnFields({
                tableId: 'table1',
                columnIndex: 0,
                fields: [],
            });

            const expectedAction = systemActions.fieldValidationUpdate({
                fieldId: 'table1',
                validationStatus: IdpValidationStatus.Valid,
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.checkTableValidationAfterBatchTableUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch fieldValidationUpdate with Invalid when required table is empty after deleteTableRowFields', () => {
            const emptyTable: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Col1'],
                    rows: [],
                    validationStatus: IdpValidationStatus.Valid,
                    isDirty: true,
                },
            ];

            const mockTaskInputData = {
                ...taskInputData,
                extractionConfiguration: {
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: 'class1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Table 1',
                                    dataType: IdpFieldDataType.Table,
                                    validation: { required: true },
                                },
                            ],
                        },
                    ],
                },
            };

            store.overrideSelector(selectDocumentTables, emptyTable);
            store.overrideSelector(selectTaskInputData, mockTaskInputData);

            const action = userActions.deleteTableRowFields({ tableId: 'table1', rowIndex: 0, fieldIds: [] });

            const expectedAction = systemActions.fieldValidationUpdate({
                fieldId: 'table1',
                validationStatus: IdpValidationStatus.Invalid,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.checkTableValidationAfterBatchTableUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch fieldValidationUpdate with Valid when required table has rows after addTableRowFields', () => {
            const tableWithRows: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Col1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Col1',
                                    value: 'A',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'ManualValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Invalid,
                    isDirty: true,
                },
            ];

            const mockTaskInputData = {
                ...taskInputData,
                extractionConfiguration: {
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: 'class1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Table 1',
                                    dataType: IdpFieldDataType.Table,
                                    validation: { required: true },
                                },
                            ],
                        },
                    ],
                },
            };

            store.overrideSelector(selectDocumentTables, tableWithRows);
            store.overrideSelector(selectTaskInputData, mockTaskInputData);

            const action = userActions.addTableRowFields({ tableId: 'table1', rowIndex: 0, fields: [] });

            const expectedAction = systemActions.fieldValidationUpdate({
                fieldId: 'table1',
                validationStatus: IdpValidationStatus.Valid,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.checkTableValidationAfterBatchTableUpdateEffect$).toBeObservable(expected);
        });
    });

    describe('checkTableValidationAfterDeleteTableEffect$', () => {
        it('should dispatch fieldValidationUpdate with Invalid when deleted table is required', () => {
            const mockTaskInputData = {
                ...taskInputData,
                extractionConfiguration: {
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: 'class1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Table 1',
                                    dataType: IdpFieldDataType.Table,
                                    validation: { required: true },
                                },
                            ],
                        },
                    ],
                },
            };

            store.overrideSelector(selectTaskInputData, mockTaskInputData);

            const action = userActions.deleteTableFields({ tableId: 'table1', fieldIds: [] });

            const expectedAction = systemActions.fieldValidationUpdate({
                fieldId: 'table1',
                validationStatus: IdpValidationStatus.Invalid,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.checkTableValidationAfterDeleteTableEffect$).toBeObservable(expected);
        });

        it('should not dispatch fieldValidationUpdate when deleted table is not required', () => {
            const mockTaskInputData = {
                ...taskInputData,
                extractionConfiguration: {
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: 'class1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Table 1',
                                    dataType: IdpFieldDataType.Table,
                                },
                            ],
                        },
                    ],
                },
            };

            store.overrideSelector(selectTaskInputData, mockTaskInputData);

            const action = userActions.deleteTableFields({ tableId: 'table1', fieldIds: [] });

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.checkTableValidationAfterDeleteTableEffect$).toBeObservable(expected);
        });
    });

    describe('setTableDirtyEffect$', () => {
        it('should dispatch updateTableDirtyFlag for clearTableRowFields action', () => {
            const action = userActions.clearTableRowFields({
                tableId: 'table1',
                rowIndex: 0,
                fields: [],
            });

            const expectedAction = systemActions.updateTableDirtyFlag({
                tableId: 'table1',
                isDirty: true,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.setTableDirtyEffect$).toBeObservable(expected);
        });

        it('should dispatch updateTableDirtyFlag for updateTableRowFields action', () => {
            const action = userActions.updateTableRowFields({
                tableId: 'table1',
                rowIndex: 0,
                fields: [],
            });

            const expectedAction = systemActions.updateTableDirtyFlag({
                tableId: 'table1',
                isDirty: true,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.setTableDirtyEffect$).toBeObservable(expected);
        });

        it('should dispatch updateTableDirtyFlag for deleteTableRowFields action', () => {
            const action = userActions.deleteTableRowFields({
                tableId: 'table1',
                rowIndex: 0,
                fieldIds: ['cell1'],
            });

            const expectedAction = systemActions.updateTableDirtyFlag({
                tableId: 'table1',
                isDirty: true,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.setTableDirtyEffect$).toBeObservable(expected);
        });

        it('should dispatch updateTableDirtyFlag for clearTableColumnFields action', () => {
            const action = userActions.clearTableColumnFields({
                tableId: 'table1',
                columnIndex: 0,
                fields: [],
            });

            const expectedAction = systemActions.updateTableDirtyFlag({
                tableId: 'table1',
                isDirty: true,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.setTableDirtyEffect$).toBeObservable(expected);
        });

        it('should dispatch updateTableDirtyFlag for updateTableColumnFields action', () => {
            const action = userActions.updateTableColumnFields({
                tableId: 'table1',
                columnIndex: 0,
                fields: [],
            });

            const expectedAction = systemActions.updateTableDirtyFlag({
                tableId: 'table1',
                isDirty: true,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.setTableDirtyEffect$).toBeObservable(expected);
        });
    });

    describe('runValidationProcessIfTableIsDirtyEffect$', () => {
        it('should dispatch runValidationProcessIfConfigured when table is dirty', () => {
            const tableEntities: DocumentTableEntity[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: true,
                },
            ];

            const action = systemActions.runValidationProcessIfTableIsDirty({
                tableId: 'table1',
            });

            const expectedAction = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'table1',
            });

            store.overrideSelector(selectDocumentTables, tableEntities);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.runValidationProcessIfTableIsDirtyEffect$).toBeObservable(expected);
        });

        it('should not dispatch runValidationProcessIfConfigured when table is not dirty', () => {
            const tableEntities: DocumentTableEntity[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.runValidationProcessIfTableIsDirty({
                tableId: 'table1',
            });

            store.overrideSelector(selectDocumentTables, tableEntities);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.runValidationProcessIfTableIsDirtyEffect$).toBeObservable(expected);
        });

        it('should not dispatch runValidationProcessIfConfigured when table is not found', () => {
            const action = systemActions.runValidationProcessIfTableIsDirty({
                tableId: 'nonexistent',
            });

            store.overrideSelector(selectDocumentTables, tables);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.runValidationProcessIfTableIsDirtyEffect$).toBeObservable(expected);
        });
    });

    describe('runValidationProcessIfConfiguredEffect$', () => {
        it('should dispatch runValidationProcess when feature flags are enabled and validation is configured', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const action = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'field1',
            });

            const expectedAction = systemActions.runValidationProcess({
                triggeringFieldName: fields[0].name,
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: fields[0].validatorName,
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.runValidationProcessIfConfiguredEffect$).toBeObservable(expected);
        });

        it('should not dispatch anything when FORM_AS_METADATA_PANEL feature flag is disabled', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const featuresService = TestBed.inject(FeaturesServiceToken);
            jest.spyOn(featuresService, 'isOn$').mockImplementation((flag: string) => {
                if (flag === WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL) {
                    return of(false);
                }
                if (flag === WORKSPACE_IDP_HXP.FIELD_VALIDATION_RULES) {
                    return of(true);
                }
                return of(false);
            });

            const action = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'field1',
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.runValidationProcessIfConfiguredEffect$).toBeObservable(expected);
        });

        it('should not dispatch anything when FIELD_VALIDATION_RULES feature flag is disabled', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const featuresService = TestBed.inject(FeaturesServiceToken);
            jest.spyOn(featuresService, 'isOn$').mockImplementation((flag: string) => {
                if (flag === WORKSPACE_IDP_HXP.FORM_AS_METADATA_PANEL) {
                    return of(true);
                }
                if (flag === WORKSPACE_IDP_HXP.FIELD_VALIDATION_RULES) {
                    return of(false);
                }
                return of(false);
            });

            const action = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'field1',
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.runValidationProcessIfConfiguredEffect$).toBeObservable(expected);
        });

        it('should not dispatch anything when both FORM_AS_METADATA_PANEL and FIELD_VALIDATION_RULES feature flags are disabled', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const featuresService = TestBed.inject(FeaturesServiceToken);
            jest.spyOn(featuresService, 'isOn$').mockReturnValue(of(false));

            const action = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'field1',
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.runValidationProcessIfConfiguredEffect$).toBeObservable(expected);
        });

        it('should not dispatch anything when validationProcessName is not configured', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const action = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'field1',
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.runValidationProcessIfConfiguredEffect$).toBeObservable(expected);
        });

        it('should not dispatch anything when validationProcessId is not configured', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                },
                pages: [],
                hasIssue: false,
            };

            const action = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'field1',
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.runValidationProcessIfConfiguredEffect$).toBeObservable(expected);
        });

        it('should not dispatch anything when no validator name is associated with the field', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const fieldsWithoutValidator: DocumentFieldEntity[] = [
                {
                    order: 1,
                    id: 'field1',
                    name: 'Field 1',
                    value: 'Value 1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0,
                    verificationStatus: 'AutoValid',
                    validationStatus: IdpValidationStatus.Valid,
                },
            ];

            const action = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'field1',
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, fieldsWithoutValidator);
            store.overrideSelector(selectDocumentTables, []);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.runValidationProcessIfConfiguredEffect$).toBeObservable(expected);
        });

        it('should dispatch runValidationProcess for a table field when all conditions are met', () => {
            const testDocument: IdpDocument = {
                id: 'doc1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                    validationProcessName: 'validation_process',
                    validationProcessId: 'Process_123',
                },
                pages: [],
                hasIssue: false,
            };

            const testTables: DocumentTableEntity[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Col1', 'Col2'],
                    rows: [],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'table_validator',
                    isDirty: true,
                },
            ];

            const action = systemActions.runValidationProcessIfConfigured({
                triggeringFieldId: 'table1',
            });

            const expectedAction = systemActions.runValidationProcess({
                triggeringFieldName: 'Table 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'table_validator',
            });

            store.overrideSelector(selectDocument, testDocument);
            store.overrideSelector(selectDocumentFields, []);
            store.overrideSelector(selectDocumentTables, testTables);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: expectedAction });

            expect(effects.runValidationProcessIfConfiguredEffect$).toBeObservable(expected);
        });
    });

    describe('runValidationProcessEffect$', () => {
        let validationProcessService: ValidationProcessService;

        beforeEach(() => {
            validationProcessService = TestBed.inject(ValidationProcessService);
        });
        it('should dispatch field validation actions, table validation actions, and validationProcessComplete on successful validation', () => {
            const mockResults: ValidationProcessResults = {
                fields: [
                    { name: 'Field 1', value: 'value1', type: 'Text', status: IdpValidationStatus.Valid },
                    { name: 'Field 2', value: 'value2', type: 'Text', status: IdpValidationStatus.Invalid },
                    { name: 'Field 3', value: 'value3', type: 'Text', status: IdpValidationStatus.Valid },
                ],
                tables: [
                    { name: 'Table 1', columnNames: ['Column 1', 'Column 2'], records: [], status: IdpValidationStatus.Valid },
                    { name: 'Table 2', columnNames: ['Column 1', 'Column 2'], records: [], status: IdpValidationStatus.Invalid },
                ],
            };

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            validationProcessService.runValidationProcess$ = jest.fn().mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(abcdef)-', {
                a: systemActions.fieldValidationUpdate({ fieldId: 'field1', validationStatus: IdpValidationStatus.Valid }),
                b: systemActions.fieldValidationUpdate({ fieldId: 'field2', validationStatus: IdpValidationStatus.Invalid }),
                c: systemActions.fieldValidationUpdate({ fieldId: 'field3', validationStatus: IdpValidationStatus.Valid }),
                d: systemActions.tableValidationUpdate({ tableId: 'table1', validationStatus: IdpValidationStatus.Valid }),
                e: systemActions.tableValidationUpdate({ tableId: 'table2', validationStatus: IdpValidationStatus.Invalid }),
                f: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should dispatch updateTableDirtyFlag action on successful validation when triggering field is a table', () => {
            const mockResults: ValidationProcessResults = {
                fields: [
                    { name: 'Field 1', value: 'value1', type: 'Text', status: IdpValidationStatus.Valid },
                    { name: 'Field 2', value: 'value2', type: 'Text', status: IdpValidationStatus.Invalid },
                    { name: 'Field 3', value: 'value3', type: 'Text', status: IdpValidationStatus.Valid },
                ],
                tables: [
                    { name: 'Table 1', columnNames: ['Column 1', 'Column 2'], records: [], status: IdpValidationStatus.Valid },
                    { name: 'Table 2', columnNames: ['Column 1', 'Column 2'], records: [], status: IdpValidationStatus.Invalid },
                ],
            };

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Table 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'table validator',
            });

            validationProcessService.runValidationProcess$ = jest.fn().mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(abcdefg)-', {
                a: systemActions.fieldValidationUpdate({ fieldId: 'field1', validationStatus: IdpValidationStatus.Valid }),
                b: systemActions.fieldValidationUpdate({ fieldId: 'field2', validationStatus: IdpValidationStatus.Invalid }),
                c: systemActions.fieldValidationUpdate({ fieldId: 'field3', validationStatus: IdpValidationStatus.Valid }),
                d: systemActions.tableValidationUpdate({ tableId: 'table1', validationStatus: IdpValidationStatus.Valid }),
                e: systemActions.tableValidationUpdate({ tableId: 'table2', validationStatus: IdpValidationStatus.Invalid }),
                f: systemActions.updateTableDirtyFlag({ tableId: 'table1', isDirty: false }),
                g: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should call runValidationProcess$ with correct parameters', (done) => {
            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            validationProcessService.runValidationProcess$ = jest.fn().mockReturnValue(of(undefined));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            actions$ = of(action);

            effects.runValidationProcessEffect$.subscribe(() => {
                expect(validationProcessService.runValidationProcess$).toHaveBeenCalledWith(
                    {
                        processId: 'Process_123',
                        processName: 'validation_process',
                        appName: taskContext.appName,
                        validatorName: 'validator',
                    },
                    'Field 1',
                    fields,
                    tables
                );
                done();
            });
        });

        it('should dispatch fieldValidationUpdate (Invalid), notificationShow and validationProcessComplete on validation error', () => {
            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(throwError(() => new Error('Process failed')));
            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(abc)-', {
                a: systemActions.fieldValidationUpdate({
                    fieldId: 'field1',
                    validationStatus: IdpValidationStatus.Invalid,
                }),
                b: systemActions.notificationShow({
                    severity: 'error',
                    message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_PROCESS_ERROR',
                }),
                c: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should handle undefined fields in validation results gracefully', () => {
            const mockResults: ValidationProcessResults = {
                fields: undefined,
                tables: [{ name: 'Table 1', columnNames: ['Col1'], records: [], status: IdpValidationStatus.Valid }],
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            const expectedTableAction = systemActions.tableValidationUpdate({
                tableId: 'table1',
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedCompleteAction = systemActions.validationProcessComplete();

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: expectedTableAction,
                c: expectedCompleteAction,
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should handle undefined tables in validation results gracefully', () => {
            const mockResults: ValidationProcessResults = {
                fields: [{ name: 'Field 1', value: 'value1', type: 'Text', status: IdpValidationStatus.Valid }],
                tables: undefined,
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            const expectedFieldAction = systemActions.fieldValidationUpdate({
                fieldId: 'field1',
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedCompleteAction = systemActions.validationProcessComplete();

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: expectedFieldAction,
                c: expectedCompleteAction,
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should only dispatch actions for fields and tables with defined status in validation results', () => {
            const mockResults: ValidationProcessResults = {
                fields: [
                    { name: 'Field 1', value: 'value1', type: 'Text', status: IdpValidationStatus.Valid },
                    { name: 'Field 2', value: 'value2', type: 'Text', status: undefined },
                    { name: 'Field 3', value: 'value3', type: 'Text', status: IdpValidationStatus.Invalid },
                ],
                tables: [
                    { name: 'Table 1', columnNames: ['Column 1', 'Column 2'], records: [], status: undefined },
                    { name: 'Table 2', columnNames: ['Column 1', 'Column 2'], records: [], status: IdpValidationStatus.Valid },
                ],
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(abcd)-', {
                a: systemActions.fieldValidationUpdate({ fieldId: 'field1', validationStatus: IdpValidationStatus.Valid }),
                b: systemActions.fieldValidationUpdate({ fieldId: 'field3', validationStatus: IdpValidationStatus.Invalid }),
                c: systemActions.tableValidationUpdate({ tableId: 'table2', validationStatus: IdpValidationStatus.Valid }),
                d: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should ignore validation results for fields and tables that do not match by name', () => {
            const mockResults: ValidationProcessResults = {
                fields: [
                    { name: 'Field 1', value: 'value1', type: 'Text', status: IdpValidationStatus.Valid },
                    { name: 'Unknown Field', value: 'value2', type: 'Text', status: IdpValidationStatus.Invalid },
                    { name: 'Another Unknown', value: 'value3', type: 'Text', status: IdpValidationStatus.Valid },
                ],
                tables: [{ name: 'Unknown Table', columnNames: ['Column 1', 'Column 2'], records: [], status: IdpValidationStatus.Valid }],
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            // Only Field 1 should match and generate an action
            const expectedFieldAction = systemActions.fieldValidationUpdate({
                fieldId: 'field1',
                validationStatus: IdpValidationStatus.Valid,
            });

            const expectedCompleteAction = systemActions.validationProcessComplete();

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: expectedFieldAction,
                c: expectedCompleteAction,
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });
    });

    describe('syncRecognitionMetadataEffect$', () => {
        const correlationId = 'corr-sync-1';
        const testTaskInputData = {
            ...taskInputData,
            batchState: {
                ...taskInputData.batchState,
                contentFileReferences: [{ sys_id: 'file1' }],
                documents: [
                    {
                        id: 'doc1',
                        name: 'Document 1',
                        pages: [
                            {
                                id: '0_0',
                                contentFileReferenceIndex: 0,
                                sourcePageIndex: 0,
                                rotation: 90,
                            },
                        ],
                        classId: '1',
                    },
                ],
            },
        };

        const testDocumentState: DocumentEntity = {
            id: 'doc1',
            name: 'Document 1',
            class: { id: 'class1', name: 'Class 1' },
            pages: [
                {
                    id: '0_0',
                    name: 'Page 0_0',
                    fileReference: 'file1',
                    contentFileReferenceIndex: 0,
                    sourcePageIndex: 0,
                    rotation: 90,
                },
            ],
        };

        beforeEach(() => {
            idpBackendSpy.getFileMetadata$.mockReset();
            idpBackendSpy.updateRotationData$.mockReset();
        });

        it('should dispatch updatePagesRotation without calling updateRotationData$ when batch state and recognition metadata match', () => {
            const metadata = {
                status: 'Succeeded' as const,
                pageCount: 1,
                pages: [{ pageIndex: 0, imageWidth: 100, imageHeight: 200, rotation: 90, skew: 0 }],
            };
            idpBackendSpy.getFileMetadata$.mockReturnValue(of(metadata));
            idpBackendSpy.updateRotationData$.mockReturnValue(of(undefined));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, testTaskInputData);

            const action = systemActions.documentLoad({
                documentState: testDocumentState,
                fields: taskDataFields,
                tables: [],
            });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: '0_0', documentId: 'doc1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.getFileMetadata$).toHaveBeenCalledWith(correlationId, 'file1');
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });

        it('should call updateRotationData$ and dispatch updatePagesRotation when recognition metadata differs from batch state', () => {
            const metadata = {
                status: 'Succeeded' as const,
                pageCount: 1,
                pages: [{ pageIndex: 0, imageWidth: 100, imageHeight: 200, rotation: 0, skew: 0 }],
            };
            idpBackendSpy.getFileMetadata$.mockReturnValue(of(metadata));
            idpBackendSpy.updateRotationData$.mockReturnValue(cold('(a|)', { a: undefined }));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, testTaskInputData);

            const action = systemActions.documentLoad({
                documentState: testDocumentState,
                fields: taskDataFields,
                tables: [],
            });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: '0_0', documentId: 'doc1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.getFileMetadata$).toHaveBeenCalledWith(correlationId, 'file1');
            expect(idpBackendSpy.updateRotationData$).toHaveBeenCalledWith(
                correlationId,
                ['file1'],
                [{ contentFileReferenceIndex: 0, pageIndex: 0, rotation: 90 }]
            );
        });

        it('should use recognition metadata rotation when batch state rotation is invalid', () => {
            const documentStateWithInvalidRotation: DocumentEntity = {
                ...testDocumentState,
                pages: [
                    {
                        ...testDocumentState.pages[0],
                        rotation: 45,
                    },
                ],
            };
            const taskInputWithInvalidRotation = {
                ...testTaskInputData,
                batchState: {
                    ...testTaskInputData.batchState,
                    documents: [
                        {
                            ...testTaskInputData.batchState.documents[0],
                            pages: [{ id: '0_0', contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 45 }],
                        },
                    ],
                },
            };
            const metadata = {
                status: 'Succeeded' as const,
                pageCount: 1,
                pages: [{ pageIndex: 0, imageWidth: 100, imageHeight: 200, rotation: 90, skew: 0 }],
            };
            idpBackendSpy.getFileMetadata$.mockReturnValue(of(metadata));
            idpBackendSpy.updateRotationData$.mockReturnValue(of(undefined));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, taskInputWithInvalidRotation);

            const action = systemActions.documentLoad({
                documentState: documentStateWithInvalidRotation,
                fields: taskDataFields,
                tables: [],
            });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: '0_0', documentId: 'doc1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });

        it('should dispatch updatePagesRotation with batch state when getFileMetadata$ fails (errors are caught)', () => {
            idpBackendSpy.getFileMetadata$.mockReturnValue(cold('#', {}, new Error('Metadata fetch failed')));
            idpBackendSpy.updateRotationData$.mockReturnValue(of(undefined));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, testTaskInputData);

            const action = systemActions.documentLoad({
                documentState: testDocumentState,
                fields: taskDataFields,
                tables: [],
            });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: '0_0', documentId: 'doc1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });

        it('should return EMPTY when correlationId is missing', () => {
            idpBackendSpy.getFileMetadata$.mockReturnValue(of(undefined));
            store.overrideSelector(selectCorrelationId, '');
            store.overrideSelector(selectTaskInputData, testTaskInputData);

            const action = systemActions.documentLoad({
                documentState: testDocumentState,
                fields: taskDataFields,
                tables: [],
            });
            actions$ = hot('-a-', { a: action });
            const expected = cold('-');

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.getFileMetadata$).not.toHaveBeenCalled();
        });

        it('should return EMPTY when taskInputData is missing', () => {
            idpBackendSpy.getFileMetadata$.mockReturnValue(of(undefined));
            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, undefined);

            const action = systemActions.documentLoad({
                documentState: testDocumentState,
                fields: taskDataFields,
                tables: [],
            });
            actions$ = hot('-a-', { a: action });
            const expected = cold('-');

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.getFileMetadata$).not.toHaveBeenCalled();
        });

        it('should skip pages whose fileReference does not match the fetched file and not trigger a sync', () => {
            const documentStateWithMixedRefs: DocumentEntity = {
                ...testDocumentState,
                pages: [
                    {
                        id: '0_0',
                        name: 'Page 0_0',
                        fileReference: 'other-file',
                        contentFileReferenceIndex: 0,
                        sourcePageIndex: 0,
                        rotation: 0,
                    },
                ],
            };
            const metadata = {
                status: 'Succeeded' as const,
                pageCount: 1,
                pages: [{ pageIndex: 0, imageWidth: 100, imageHeight: 200, rotation: 90, skew: 0 }],
            };
            idpBackendSpy.getFileMetadata$.mockReturnValue(of(metadata));
            idpBackendSpy.updateRotationData$.mockReturnValue(of(undefined));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, testTaskInputData);

            const action = systemActions.documentLoad({
                documentState: documentStateWithMixedRefs,
                fields: taskDataFields,
                tables: [],
            });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: '0_0', documentId: 'doc1', rotation: 0, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });

        it('should skip pages whose sourcePageIndex has no matching entry in recognition metadata', () => {
            const documentStateWithUnmatchedIndex: DocumentEntity = {
                ...testDocumentState,
                pages: [
                    {
                        id: '0_5',
                        name: 'Page 0_5',
                        fileReference: 'file1',
                        contentFileReferenceIndex: 0,
                        sourcePageIndex: 5,
                        rotation: 90,
                    },
                ],
            };
            const metadata = {
                status: 'Succeeded' as const,
                pageCount: 1,
                pages: [{ pageIndex: 0, imageWidth: 100, imageHeight: 200, rotation: 90, skew: 0 }],
            };
            idpBackendSpy.getFileMetadata$.mockReturnValue(of(metadata));
            idpBackendSpy.updateRotationData$.mockReturnValue(of(undefined));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, testTaskInputData);

            const action = systemActions.documentLoad({
                documentState: documentStateWithUnmatchedIndex,
                fields: taskDataFields,
                tables: [],
            });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: '0_5', documentId: 'doc1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });
    });

    describe('updateRotationEffect$', () => {
        it('should call updateRotationData$ and dispatch taskPrepareUpdateSuccess on Save/Complete when viewerRotation changed', () => {
            // taskData has combined rotation (rotation - viewerRotation) already
            const testTaskData: any = {
                batchState: {
                    contentFileReferences: [{ sys_id: 'cf1' }, { sys_id: 'cf2' }],
                    documents: [
                        {
                            id: 'd_cf1',
                            name: 'Document 1',
                            pages: [
                                { id: 'p1', contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0 }, // 90 - 90 = 0
                                { id: 'p2', contentFileReferenceIndex: 0, sourcePageIndex: 1, rotation: 180 }, // 180 - 0 = 180
                            ],
                        },
                    ],
                },
            };

            const document: IdpDocument = {
                id: 'd_cf1',
                name: 'Document 1',
                pages: [
                    {
                        id: 'p1',
                        name: 'Page 1 of Document 1',
                        documentId: 'd_cf1',
                        sourcePageIndex: 0,
                        rotation: 90,
                        viewerRotation: 90,
                        fileReference: 'cf1',
                        hasIssue: false,
                        isSelected: false,
                    },
                    {
                        id: 'p2',
                        name: 'Page 2 of Document 1',
                        documentId: 'd_cf1',
                        sourcePageIndex: 1,
                        rotation: 180,
                        viewerRotation: 0,
                        fileReference: 'cf1',
                        hasIssue: false,
                        isSelected: false,
                    },
                ],
                class: {
                    id: 'class1',
                    name: 'Class 1',
                },
                hasIssue: false,
            };

            const idpImageService = TestBed.inject(IdpImageLoadingService);
            spyOn(idpImageService, 'cleanup').and.callThrough();

            const action = systemActions.updateDocumentRotation({
                taskAction: 'Save',
                taskData: testTaskData,
                openNextTask: false,
            });
            const correlationId = 'corr-id-1';
            const pagesWithIndex = [
                { contentFileReferenceIndex: 0, pageIndex: 0, rotation: 0 },
                { contentFileReferenceIndex: 0, pageIndex: 1, rotation: 180 },
            ];
            idpBackendSpy.updateRotationData$.mockReturnValue(cold('(a|)', { a: undefined }));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectDocument, document);

            actions$ = hot('-a-', { a: action });
            const outcome = systemActions.taskPrepareUpdateSuccess({
                taskAction: 'Save',
                taskData: testTaskData,
                openNextTask: false,
            });

            const expected = cold('-b-', { b: outcome });

            expect(effects.updateRotationEffect$).toBeObservable(expected);
            expect(idpBackendSpy.updateRotationData$).toHaveBeenCalledWith(correlationId, ['cf1', 'cf2'], pagesWithIndex);
            expect(idpImageService.cleanup).toHaveBeenCalled();
        });

        it('should not call updateRotationData$ if fileReferences is empty', () => {
            const testTaskData: any = {
                batchState: {
                    contentFileReferences: [],
                    documents: [],
                },
            };
            const action = systemActions.updateDocumentRotation({
                taskAction: 'Save',
                taskData: testTaskData,
                openNextTask: false,
            });

            const document: IdpDocument = {
                id: 'd_cf1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                },
                hasIssue: false,
                pages: [
                    {
                        id: 'p1',
                        name: 'Page 1 of Document 1',
                        documentId: 'd_cf1',
                        sourcePageIndex: 0,
                        rotation: 90,
                        viewerRotation: 0,
                        fileReference: 'cf1',
                        hasIssue: false,
                        isSelected: false,
                    },
                ],
            };

            store.overrideSelector(selectCorrelationId, 'corr-id-2');
            store.overrideSelector(selectDocument, document);

            actions$ = hot('-a-', { a: action });
            const outcome = systemActions.taskPrepareUpdateSuccess({
                taskAction: 'Save',
                taskData: testTaskData,
                openNextTask: false,
            });

            const expected = cold('-b-', { b: outcome });

            expect(effects.updateRotationEffect$).toBeObservable(expected);
        });

        it('should not call updateRotationData$ if taskAction is not Save/Complete', () => {
            const testTaskData: any = {
                batchState: {
                    contentFileReferences: [{ sys_id: 'cf1' }],
                    documents: [],
                },
            };
            const action = systemActions.updateDocumentRotation({
                taskAction: 'Claim',
                taskData: testTaskData,
                openNextTask: false,
            });

            const document: IdpDocument = {
                id: 'd_cf1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                },
                hasIssue: false,
                pages: [
                    {
                        id: 'p1',
                        name: 'Page 1 of Document 1',
                        documentId: 'd_cf1',
                        sourcePageIndex: 0,
                        rotation: 90,
                        viewerRotation: 0,
                        fileReference: 'cf1',
                        hasIssue: false,
                        isSelected: false,
                    },
                ],
            };

            store.overrideSelector(selectCorrelationId, 'corr-id-3');
            store.overrideSelector(selectDocument, document);

            actions$ = hot('-a-', { a: action });
            const outcome = systemActions.taskPrepareUpdateSuccess({
                taskAction: 'Claim',
                taskData: testTaskData,
                openNextTask: false,
            });
            const expected = cold('-b-', { b: outcome });

            expect(effects.updateRotationEffect$).toBeObservable(expected);
        });

        it('should dispatch taskPrepareUpdateError on updateRotationData$ error when viewerRotation changed', () => {
            const testTaskData: any = {
                batchState: {
                    contentFileReferences: [{ sys_id: 'cf1' }],
                    documents: [
                        {
                            id: 'd_cf1',
                            name: 'Document 1',
                            pages: [{ id: 'p1', contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0 }], // 90 - 90 = 0
                        },
                    ],
                },
            };
            const document: IdpDocument = {
                id: 'd_cf1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                },
                hasIssue: false,
                pages: [
                    {
                        id: 'p1',
                        name: 'Page 1 of Document 1',
                        documentId: 'd_cf1',
                        sourcePageIndex: 0,
                        rotation: 90,
                        viewerRotation: 90,
                        fileReference: 'cf1',
                        hasIssue: false,
                        isSelected: false,
                    },
                ],
            };

            const idpImageService = TestBed.inject(IdpImageLoadingService);
            spyOn(idpImageService, 'cleanup').and.callThrough();

            const action = systemActions.updateDocumentRotation({
                taskAction: 'Save',
                taskData: testTaskData,
                openNextTask: false,
            });
            const correlationId = 'corr-id-4';
            idpBackendSpy.updateRotationData$.mockReturnValue(cold('#', {}, new Error('fail')));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectDocument, document);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', {
                b: systemActions.taskPrepareUpdateError({
                    taskAction: 'Save',
                    error: 'Failed to update rotation data',
                }),
            });

            expect(effects.updateRotationEffect$).toBeObservable(expected);
            expect(idpImageService.cleanup).toHaveBeenCalled();
        });

        it('should not call updateRotationData$ if viewerRotation is 0 (no user rotation)', () => {
            idpBackendSpy.updateRotationData$.mockClear();

            const testTaskData: any = {
                batchState: {
                    contentFileReferences: [{ sys_id: 'cf1' }],
                    documents: [
                        {
                            id: 'd_cf1',
                            name: 'Document 1',
                            pages: [{ id: 'p1', contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 90 }],
                        },
                    ],
                },
            };

            const document: IdpDocument = {
                id: 'd_cf1',
                name: 'Document 1',
                class: {
                    id: 'class1',
                    name: 'Class 1',
                },
                hasIssue: false,
                pages: [
                    {
                        id: 'p1',
                        name: 'Page 1 of Document 1',
                        documentId: 'd_cf1',
                        sourcePageIndex: 0,
                        rotation: 90,
                        viewerRotation: 0,
                        fileReference: 'cf1',
                        hasIssue: false,
                        isSelected: false,
                    },
                ],
            };

            const action = systemActions.updateDocumentRotation({
                taskAction: 'Save',
                taskData: testTaskData,
                openNextTask: false,
            });

            store.overrideSelector(selectCorrelationId, 'corr-id-3');
            store.overrideSelector(selectDocument, document);

            actions$ = hot('-a-', { a: action });
            const outcome = systemActions.taskPrepareUpdateSuccess({
                taskAction: 'Save',
                taskData: testTaskData,
                openNextTask: false,
            });

            const expected = cold('-b-', { b: outcome });

            expect(effects.updateRotationEffect$).toBeObservable(expected);
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });
    });

    describe('loadDocumentEffect$ - table cell validation', () => {
        let tableCellValidationServiceSpy: jest.SpyInstance;

        beforeEach(() => {
            const service = TestBed.inject(IdpTableCellValidationService);
            tableCellValidationServiceSpy = jest.spyOn(service, 'validateField');
        });

        const verifyValidTableCells = (result: any, tableId: string) => {
            const tableCells = result.fields.filter((f: any) => f.tableId === tableId);
            expect(tableCells).toHaveLength(4);
            tableCells.forEach((cell: any) => {
                expect(cell.validationStatus).toBe(IdpValidationStatus.Valid);
            });

            const table = result.tables.find((t: any) => t.id === tableId);
            expect(table?.validationStatus).toBe(IdpValidationStatus.Valid);
        };

        const verifyMixedTableCells = (result: any, tableId: string) => {
            const tableCells = result.fields.filter((f: any) => f.tableId === tableId);
            expect(tableCells).toHaveLength(4);

            // Check individual cell validation statuses
            const johnNameCell = tableCells.find((c: any) => c.name === 'Name' && c.value === 'John Doe');
            const johnEmailCell = tableCells.find((c: any) => c.name === 'Email' && c.value === 'invalid-email');
            expect(johnNameCell?.validationStatus).toBe(IdpValidationStatus.Valid);
            expect(johnEmailCell?.validationStatus).toBe(IdpValidationStatus.Invalid);

            const janeNameCell = tableCells.find((c: any) => c.name === 'Name' && c.value === 'Jane Smith');
            const janeEmailCell = tableCells.find((c: any) => c.name === 'Email' && c.value === 'jane@example.com');
            expect(janeNameCell?.validationStatus).toBe(IdpValidationStatus.Valid);
            expect(janeEmailCell?.validationStatus).toBe(IdpValidationStatus.Valid);

            // Verify table has invalid status (due to one invalid cell)
            const table = result.tables.find((t: any) => t.id === tableId);
            expect(table?.validationStatus).toBe(IdpValidationStatus.Invalid);
        };

        it('should validate table cells and set validation status correctly when validation rules exist and all cells are valid', () => {
            // Mock validation service to return true (valid)
            tableCellValidationServiceSpy.mockReturnValue(true);

            const testTaskData = {
                ...taskData,
                extractionConfiguration: {
                    ...taskData.extractionConfiguration,
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: '1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Test Table',
                                    dataType: IdpFieldDataType.Table,
                                    format: '',
                                    description: 'table with validation',
                                    columns: [
                                        { name: 'Name', validation: { required: true } },
                                        { name: 'Email', validation: { pattern: '.*@.*' } },
                                    ],
                                },
                            ],
                            fieldConfidenceThreshold: 0.8,
                        },
                    ],
                },
                batchState: {
                    ...taskData.batchState,
                    documents: [
                        {
                            ...taskData.batchState.documents[0],
                            tables: [
                                {
                                    id: 'table1',
                                    columnHeaderNames: ['Name', 'Email'],
                                    extractionConfidence: 0.9,
                                    reviewStatus: 'ReviewRequired' as const,
                                    records: [
                                        {
                                            records: [
                                                { recordName: 'Name', value: 'John Doe', type: IdpFieldDataType.Text },
                                                { recordName: 'Email', value: 'john@example.com', type: IdpFieldDataType.Text },
                                            ],
                                        },
                                        {
                                            records: [
                                                { recordName: 'Name', value: 'Jane Smith', type: IdpFieldDataType.Text },
                                                { recordName: 'Email', value: 'jane@example.com', type: IdpFieldDataType.Text },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
            actions$ = of(action);

            effects.loadDocumentEffect$.subscribe((result) => {
                if ('fields' in result && 'tables' in result) {
                    // Verify validation service was called for each cell
                    expect(tableCellValidationServiceSpy).toHaveBeenCalledTimes(4); // 2 rows × 2 columns
                    verifyValidTableCells(result, 'table1');
                }
            });
        });

        it('should set table validation status to Invalid when some cells fail validation', () => {
            // Mock validation service to return false for some cells
            tableCellValidationServiceSpy
                .mockReturnValueOnce(true) // Name: John Doe - valid
                .mockReturnValueOnce(false) // Email: invalid-email - invalid
                .mockReturnValueOnce(true) // Name: Jane Smith - valid
                .mockReturnValueOnce(true); // Email: jane@example.com - valid

            const testTaskData = {
                ...taskData,
                extractionConfiguration: {
                    ...taskData.extractionConfiguration,
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: '1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Test Table',
                                    dataType: IdpFieldDataType.Table,
                                    format: '',
                                    description: 'table with validation',
                                    columns: [
                                        { name: 'Name', validation: { required: true } },
                                        { name: 'Email', validation: { pattern: '.*@.*' } },
                                    ],
                                },
                            ],
                            fieldConfidenceThreshold: 0.8,
                        },
                    ],
                },
                batchState: {
                    ...taskData.batchState,
                    documents: [
                        {
                            ...taskData.batchState.documents[0],
                            tables: [
                                {
                                    id: 'table1',
                                    columnHeaderNames: ['Name', 'Email'],
                                    extractionConfidence: 0.9,
                                    reviewStatus: 'ReviewRequired' as const,
                                    records: [
                                        {
                                            records: [
                                                { recordName: 'Name', value: 'John Doe', type: IdpFieldDataType.Text },
                                                { recordName: 'Email', value: 'invalid-email', type: IdpFieldDataType.Text },
                                            ],
                                        },
                                        {
                                            records: [
                                                { recordName: 'Name', value: 'Jane Smith', type: IdpFieldDataType.Text },
                                                { recordName: 'Email', value: 'jane@example.com', type: IdpFieldDataType.Text },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
            actions$ = of(action);

            effects.loadDocumentEffect$.subscribe((result) => {
                if ('fields' in result && 'tables' in result) {
                    verifyMixedTableCells(result, 'table1');
                }
            });
        });

        it('should not validate table cells when no column validation rules exist', () => {
            const testTaskData = {
                ...taskData,
                extractionConfiguration: {
                    ...taskData.extractionConfiguration,
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: '1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Test Table',
                                    dataType: IdpFieldDataType.Table,
                                    format: '',
                                    description: 'table without validation',
                                    // No columns property
                                },
                            ],
                            fieldConfidenceThreshold: 0.8,
                        },
                    ],
                },
                batchState: {
                    ...taskData.batchState,
                    documents: [
                        {
                            ...taskData.batchState.documents[0],
                            tables: [
                                {
                                    id: 'table1',
                                    columnHeaderNames: ['Name', 'Email'],
                                    extractionConfidence: 0.9,
                                    reviewStatus: 'ReviewRequired' as const,
                                    records: [
                                        {
                                            records: [
                                                { recordName: 'Name', value: 'John Doe', type: IdpFieldDataType.Text },
                                                { recordName: 'Email', value: 'john@example.com', type: IdpFieldDataType.Text },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
            actions$ = of(action);

            effects.loadDocumentEffect$.subscribe((result) => {
                if ('fields' in result && 'tables' in result) {
                    // Verify validation service was not called
                    expect(tableCellValidationServiceSpy).not.toHaveBeenCalled();

                    // Verify all cells default to valid status
                    const tableCells = result.fields.filter((f: any) => f.tableId === 'table1');
                    expect(tableCells.every((cell: any) => cell.validationStatus === IdpValidationStatus.Valid)).toBe(true);

                    // Verify table has valid status
                    const table = result.tables.find((t: any) => t.id === 'table1');
                    expect(table?.validationStatus).toBe(IdpValidationStatus.Valid);
                }
            });
        });

        it('should not validate columns that do not have validation rules', () => {
            tableCellValidationServiceSpy.mockReturnValue(true);

            const testTaskData = {
                ...taskData,
                extractionConfiguration: {
                    ...taskData.extractionConfiguration,
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: '1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Test Table',
                                    dataType: IdpFieldDataType.Table,
                                    format: '',
                                    description: 'mixed validation rules',
                                    columns: [
                                        { name: 'Name', validation: { required: true } }, // has validation
                                        { name: 'Notes' }, // no validation property
                                    ],
                                },
                            ],
                            fieldConfidenceThreshold: 0.8,
                        },
                    ],
                },
                batchState: {
                    ...taskData.batchState,
                    documents: [
                        {
                            ...taskData.batchState.documents[0],
                            tables: [
                                {
                                    id: 'table1',
                                    columnHeaderNames: ['Name', 'Notes'],
                                    extractionConfidence: 0.9,
                                    reviewStatus: 'ReviewRequired' as const,
                                    records: [
                                        {
                                            records: [
                                                { recordName: 'Name', value: 'John Doe', type: IdpFieldDataType.Text },
                                                { recordName: 'Notes', value: 'Some notes', type: IdpFieldDataType.Text },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
            actions$ = of(action);

            effects.loadDocumentEffect$.subscribe((result) => {
                if ('fields' in result && 'tables' in result) {
                    // Verify validation service was called only once (for 'Name' column)
                    expect(tableCellValidationServiceSpy).toHaveBeenCalledTimes(1);
                    expect(tableCellValidationServiceSpy).toHaveBeenCalledWith({ value: 'John Doe', name: 'Name' }, { required: true });

                    // Verify all cells have valid status (Notes defaults to valid)
                    const tableCells = result.fields.filter((f: any) => f.tableId === 'table1');
                    expect(tableCells.every((cell: any) => cell.validationStatus === IdpValidationStatus.Valid)).toBe(true);
                }
            });
        });

        it('should call validateTableCellField with correct parameters', () => {
            tableCellValidationServiceSpy.mockReturnValue(true);

            const testTaskData = {
                ...taskData,
                extractionConfiguration: {
                    ...taskData.extractionConfiguration,
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: '1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Test Table',
                                    dataType: IdpFieldDataType.Table,
                                    format: '',
                                    description: 'test validation parameters',
                                    columns: [{ name: 'Amount', validation: { pattern: String.raw`^\d+(\.\d{2})?$` } }],
                                },
                            ],
                            fieldConfidenceThreshold: 0.8,
                        },
                    ],
                },
                batchState: {
                    ...taskData.batchState,
                    documents: [
                        {
                            ...taskData.batchState.documents[0],
                            tables: [
                                {
                                    id: 'table1',
                                    columnHeaderNames: ['Amount'],
                                    extractionConfidence: 0.9,
                                    reviewStatus: 'ReviewRequired' as const,
                                    records: [
                                        {
                                            records: [{ recordName: 'Amount', value: '123.45', type: IdpFieldDataType.Text }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
            actions$ = of(action);

            effects.loadDocumentEffect$.subscribe(() => {
                expect(tableCellValidationServiceSpy).toHaveBeenCalledWith(
                    { value: '123.45', name: 'Amount' },
                    { pattern: String.raw`^\d+(\.\d{2})?$` }
                );
            });
        });

        it('should set table validation status to Invalid when a required table has no rows at load', () => {
            const testTaskData = {
                ...taskData,
                extractionConfiguration: {
                    ...taskData.extractionConfiguration,
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: '1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Required Table',
                                    dataType: IdpFieldDataType.Table,
                                    format: '',
                                    validation: { required: true },
                                },
                            ],
                            fieldConfidenceThreshold: 0.8,
                        },
                    ],
                },
                batchState: {
                    ...taskData.batchState,
                    documents: [{ ...taskData.batchState.documents[0], tables: [] }],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
            actions$ = of(action);

            effects.loadDocumentEffect$.subscribe((result) => {
                if ('fields' in result && 'tables' in result) {
                    const tableField = result.fields.find((f: any) => f.id === 'table1');
                    expect(tableField?.validationStatus).toBe(IdpValidationStatus.Invalid);

                    const table = result.tables.find((t: any) => t.id === 'table1');
                    expect(table?.validationStatus).toBe(IdpValidationStatus.Invalid);
                }
            });
        });

        it('should set table validation status to Valid when a non-required table has no rows at load', () => {
            const testTaskData = {
                ...taskData,
                extractionConfiguration: {
                    ...taskData.extractionConfiguration,
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: '1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Optional Table',
                                    dataType: IdpFieldDataType.Table,
                                    format: '',
                                },
                            ],
                            fieldConfidenceThreshold: 0.8,
                        },
                    ],
                },
                batchState: {
                    ...taskData.batchState,
                    documents: [{ ...taskData.batchState.documents[0], tables: [] }],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
            actions$ = of(action);

            effects.loadDocumentEffect$.subscribe((result) => {
                if ('fields' in result && 'tables' in result) {
                    const tableField = result.fields.find((f: any) => f.id === 'table1');
                    expect(tableField?.validationStatus).toBe(IdpValidationStatus.Valid);

                    const table = result.tables.find((t: any) => t.id === 'table1');
                    expect(table?.validationStatus).toBe(IdpValidationStatus.Valid);
                }
            });
        });

        it('should set table validation status to Valid when a required table has rows at load', () => {
            const testTaskData = {
                ...taskData,
                extractionConfiguration: {
                    ...taskData.extractionConfiguration,
                    fieldDefinitionsByClass: [
                        {
                            documentClassId: '1',
                            fieldDefinitions: [
                                {
                                    id: 'table1',
                                    name: 'Required Table',
                                    dataType: IdpFieldDataType.Table,
                                    format: '',
                                    validation: { required: true },
                                },
                            ],
                            fieldConfidenceThreshold: 0.8,
                        },
                    ],
                },
                batchState: {
                    ...taskData.batchState,
                    documents: [
                        {
                            ...taskData.batchState.documents[0],
                            tables: [
                                {
                                    id: 'table1',
                                    columnHeaderNames: ['Col1'],
                                    extractionConfidence: 0.9,
                                    reviewStatus: 'ReviewRequired' as const,
                                    records: [
                                        {
                                            records: [{ recordName: 'Col1', value: 'some value', type: IdpFieldDataType.Text }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskContext, taskData: testTaskData });
            actions$ = of(action);

            effects.loadDocumentEffect$.subscribe((result) => {
                if ('fields' in result && 'tables' in result) {
                    const tableField = result.fields.find((f: any) => f.id === 'table1');
                    expect(tableField?.validationStatus).toBe(IdpValidationStatus.Valid);

                    const table = result.tables.find((t: any) => t.id === 'table1');
                    expect(table?.validationStatus).toBe(IdpValidationStatus.Valid);
                }
            });
        });
    });

    describe('tableValueUpdateEffect$', () => {
        it('should return EMPTY when table is not found in store', () => {
            const action = systemActions.tableValidationUpdate({
                tableId: 'nonexistent-table',
                validationStatus: IdpValidationStatus.Valid,
                records: [],
            });

            store.overrideSelector(selectDocumentTables, tables);

            actions$ = hot('-a-', { a: action });
            const expected = cold('---');

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch fieldValidationUpdate with validationStatus for the table when validationStatus is provided', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old-value',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                validationStatus: IdpValidationStatus.Invalid,
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', {
                b: systemActions.fieldValidationUpdate({ fieldId: 'table1', validationStatus: IdpValidationStatus.Invalid }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch fieldValidationUpdate with value for each cell when records are provided', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1', 'Column 2'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                                {
                                    id: 'cell2',
                                    name: 'Column 2',
                                    value: 'old2',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                records: [
                    [
                        { value: 'new1', pageIndex: 0, type: 'Text' },
                        { value: 'new2', pageIndex: 0, type: 'Text' },
                    ],
                ],
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', {
                b: systemActions.bulkFieldValidationUpdate({
                    updates: [
                        { fieldId: 'cell1', value: 'new1' },
                        { fieldId: 'cell2', value: 'new2' },
                    ],
                }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch both table status update and cell value updates when validationStatus and records are both present', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                validationStatus: IdpValidationStatus.Invalid,
                records: [[{ value: 'new1', pageIndex: 0, type: 'Text' }]],
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: systemActions.fieldValidationUpdate({ fieldId: 'table1', validationStatus: IdpValidationStatus.Invalid }),
                c: systemActions.bulkFieldValidationUpdate({ updates: [{ fieldId: 'cell1', value: 'new1' }] }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch a row mismatch notification when records contain more rows than the table has', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                records: [[{ value: 'new1', pageIndex: 0, type: 'Text' }], [{ value: 'out-of-bounds', pageIndex: 0, type: 'Text' }]],
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', {
                b: systemActions.notificationShow({
                    severity: 'error',
                    message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_TABLE_ROW_MISMATCH',
                }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should use updatedValue over value for cell when updatedValue is present', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                records: [[{ value: 'original', pageIndex: 0, type: 'Text', updatedValue: 'corrected' }]],
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', {
                b: systemActions.bulkFieldValidationUpdate({ updates: [{ fieldId: 'cell1', value: 'corrected' }] }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should fall back to value for cell when updatedValue is absent', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                records: [[{ value: 'original', pageIndex: 0, type: 'Text' }]],
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', {
                b: systemActions.bulkFieldValidationUpdate({ updates: [{ fieldId: 'cell1', value: 'original' }] }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch a row mismatch notification and stop cell updates when row count differs from the table', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                        {
                            rowCells: [
                                {
                                    id: 'cell2',
                                    name: 'Column 1',
                                    value: 'old2',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 1,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                records: [[{ value: 'new1', pageIndex: 0, type: 'Text' }]],
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', {
                b: systemActions.notificationShow({
                    severity: 'error',
                    message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_TABLE_ROW_MISMATCH',
                }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should also emit a prior validationStatus update before the row mismatch notification when validationStatus is provided', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                        {
                            rowCells: [
                                {
                                    id: 'cell2',
                                    name: 'Column 1',
                                    value: 'old2',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 1,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                validationStatus: IdpValidationStatus.Invalid,
                records: [[{ value: 'new1', pageIndex: 0, type: 'Text' }]],
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: systemActions.fieldValidationUpdate({ fieldId: 'table1', validationStatus: IdpValidationStatus.Invalid }),
                c: systemActions.notificationShow({
                    severity: 'error',
                    message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_TABLE_ROW_MISMATCH',
                }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should process surrounding field updates normally when a table row mismatch occurs between them', () => {
            const allTables: IdpTable[] = [
                {
                    id: 'field1',
                    name: 'Field 1',
                    columnHeaderNames: ['Value'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'field1-cell',
                                    name: 'Value',
                                    value: 'old-field1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'field1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'table1-cell1',
                                    name: 'Column 1',
                                    value: 'old-row1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                        {
                            rowCells: [
                                {
                                    id: 'table1-cell2',
                                    name: 'Column 1',
                                    value: 'old-row2',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 1,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
                {
                    id: 'field2',
                    name: 'Field 2',
                    columnHeaderNames: ['Value'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'field2-cell',
                                    name: 'Value',
                                    value: 'old-field2',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'field2',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const actionA = systemActions.tableValidationUpdate({
                tableId: 'field1',
                validationStatus: IdpValidationStatus.Valid,
                records: [[{ value: 'new-field1', pageIndex: 0, type: 'Text' }]],
            });
            const actionB = systemActions.tableValidationUpdate({
                tableId: 'table1',
                records: [[{ value: 'new-row1', pageIndex: 0, type: 'Text' }]],
            });
            const actionC = systemActions.tableValidationUpdate({
                tableId: 'field2',
                validationStatus: IdpValidationStatus.Valid,
                records: [[{ value: 'new-field2', pageIndex: 0, type: 'Text' }]],
            });

            store.overrideSelector(selectDocumentTables, allTables);

            actions$ = hot('-a---b-c-', { a: actionA, b: actionB, c: actionC });
            const expected = cold('-(de)f-(gh)', {
                d: systemActions.fieldValidationUpdate({ fieldId: 'field1', validationStatus: IdpValidationStatus.Valid }),
                e: systemActions.bulkFieldValidationUpdate({ updates: [{ fieldId: 'field1-cell', value: 'new-field1' }] }),
                f: systemActions.notificationShow({
                    severity: 'error',
                    message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_TABLE_ROW_MISMATCH',
                }),
                g: systemActions.fieldValidationUpdate({ fieldId: 'field2', validationStatus: IdpValidationStatus.Valid }),
                h: systemActions.bulkFieldValidationUpdate({ updates: [{ fieldId: 'field2-cell', value: 'new-field2' }] }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });

        it('should dispatch a column mismatch notification and stop cell updates when column count differs from the table', () => {
            const tablesWithCells: IdpTable[] = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Column 1', 'Column 2'],
                    rows: [
                        {
                            rowCells: [
                                {
                                    id: 'cell1',
                                    name: 'Column 1',
                                    value: 'old1',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                                {
                                    id: 'cell2',
                                    name: 'Column 2',
                                    value: 'old2',
                                    dataType: IdpFieldDataType.Text,
                                    format: '',
                                    order: 0,
                                    confidence: 0.9,
                                    verificationStatus: 'AutoValid',
                                    validationStatus: IdpValidationStatus.Valid,
                                    tableId: 'table1',
                                },
                            ],
                        },
                    ],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'tableValidator',
                    isDirty: false,
                },
            ];

            const action = systemActions.tableValidationUpdate({
                tableId: 'table1',
                records: [[{ value: 'new1', pageIndex: 0, type: 'Text' }]],
            });

            store.overrideSelector(selectDocumentTables, tablesWithCells);

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', {
                b: systemActions.notificationShow({
                    severity: 'error',
                    message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.VALIDATION_TABLE_COLUMN_MISMATCH',
                }),
            });

            expect(effects.tableValueUpdateEffect$).toBeObservable(expected);
        });
    });

    describe('runValidationProcessEffect$ - value updates', () => {
        let validationProcessService: ValidationProcessService;

        beforeEach(() => {
            validationProcessService = TestBed.inject(ValidationProcessService);
        });

        it('should dispatch fieldValidationUpdate with value when updatedValue is present and status is absent', () => {
            const mockResults: ValidationProcessResults = {
                fields: [{ name: 'Field 1', value: 'value1', type: 'Text', status: undefined, updatedValue: 'updated-value1' }],
                tables: [],
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: systemActions.fieldValidationUpdate({ fieldId: 'field1', validationStatus: undefined, value: 'updated-value1' }),
                c: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should dispatch fieldValidationUpdate with both validationStatus and value when both are present in validation result', () => {
            const mockResults: ValidationProcessResults = {
                fields: [{ name: 'Field 1', value: 'value1', type: 'Text', status: IdpValidationStatus.Invalid, updatedValue: 'corrected-value' }],
                tables: [],
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: systemActions.fieldValidationUpdate({
                    fieldId: 'field1',
                    validationStatus: IdpValidationStatus.Invalid,
                    value: 'corrected-value',
                }),
                c: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should not dispatch fieldValidationUpdate when neither status nor updatedValue are present', () => {
            const mockResults: ValidationProcessResults = {
                fields: [
                    { name: 'Field 1', value: 'value1', type: 'Text', status: undefined },
                    { name: 'Field 2', value: 'value2', type: 'Text', status: IdpValidationStatus.Valid },
                ],
                tables: [],
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, []);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: systemActions.fieldValidationUpdate({ fieldId: 'field2', validationStatus: IdpValidationStatus.Valid }),
                c: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should dispatch tableValidationUpdate with non-empty records from validation result', () => {
            const tableRecords: ValidationTableRecord[] = [
                [
                    { value: 'cell1-new', pageIndex: 0, type: 'Text' },
                    { value: 'cell2-new', pageIndex: 0, type: 'Text' },
                ],
            ];

            const mockResults: ValidationProcessResults = {
                fields: [],
                tables: [{ name: 'Table 1', columnNames: ['Column 1', 'Column 2'], records: tableRecords, status: IdpValidationStatus.Valid }],
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: systemActions.tableValidationUpdate({ tableId: 'table1', validationStatus: IdpValidationStatus.Valid, records: tableRecords }),
                c: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });

        it('should dispatch tableValidationUpdate when records are non-empty even when status is undefined', () => {
            const tableRecords: ValidationTableRecord[] = [[{ value: 'cell1-new', pageIndex: 0, type: 'Text' }]];

            const mockResults: ValidationProcessResults = {
                fields: [],
                tables: [{ name: 'Table 1', columnNames: ['Column 1'], records: tableRecords, status: undefined }],
            };

            jest.spyOn(validationProcessService, 'runValidationProcess$').mockReturnValue(of(mockResults));

            store.overrideSelector(selectTaskInfo, taskContext);
            store.overrideSelector(selectDocumentFields, fields);
            store.overrideSelector(selectDocumentTables, tables);

            const action = systemActions.runValidationProcess({
                triggeringFieldName: 'Field 1',
                validationProcessName: 'validation_process',
                validationProcessId: 'Process_123',
                validatorName: 'validator',
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-(bc)-', {
                b: systemActions.tableValidationUpdate({ tableId: 'table1', validationStatus: undefined, records: tableRecords }),
                c: systemActions.validationProcessComplete(),
            });

            expect(effects.runValidationProcessEffect$).toBeObservable(expected);
        });
    });

    it('should preserve custom field properties from original extracted field data on taskPrepareUpdate', (done) => {
        const customFieldProperty = 'customFieldValue';
        const anotherExtraProperty = 42;
        const taskDocumentWithCustomFields = {
            ...taskData.batchState.documents[taskData.documentIndex],
            fields: [
                {
                    id: '1',
                    name: 'Field 1',
                    value: 'original',
                    customProperty: customFieldProperty,
                    anotherExtra: anotherExtraProperty,
                },
            ],
        };
        const testTaskInputData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                documents: [taskDocumentWithCustomFields],
            },
        };

        const testDocument: IdpDocument = {
            id: taskDocumentWithCustomFields.id,
            name: taskDocumentWithCustomFields.name,
            class: { id: taskDocumentWithCustomFields.classId, name: '' },
            pages: [],
            hasIssue: false,
        };

        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, taskDataFields);
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, testTaskInputData);

        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: false });
        actions$ = of(action);

        effects.taskDataEffect$.subscribe((result) => {
            expect(result.type).toBe(systemActions.updateDocumentRotation.type);
            expect('taskData' in result).toBe(true);

            const updatedField = result.taskData.batchState.documents[0].fields?.[0];
            expect(updatedField?.['customProperty']).toBe(customFieldProperty);
            expect(updatedField?.['anotherExtra']).toBe(anotherExtraProperty);
            done();
        });
    });

    it('should preserve custom document properties from original task document on taskPrepareUpdate', (done) => {
        const taskDocumentWithCustomProps = {
            ...taskData.batchState.documents[taskData.documentIndex],
            customDocProp: 'preservedDocValue',
            metadata: { source: 'scanner', quality: 'high' },
        };
        const testTaskInputData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                documents: [taskDocumentWithCustomProps],
            },
        };

        const testDocument: IdpDocument = {
            id: taskDocumentWithCustomProps.id,
            name: taskDocumentWithCustomProps.name,
            class: { id: taskDocumentWithCustomProps.classId, name: '' },
            pages: [],
            hasIssue: false,
        };

        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, taskDataFields);
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, testTaskInputData);

        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: false });
        actions$ = of(action);

        effects.taskDataEffect$.subscribe((result) => {
            expect(result.type).toBe(systemActions.updateDocumentRotation.type);
            expect('taskData' in result).toBe(true);

            const updatedDoc = result.taskData.batchState.documents[0];
            expect(updatedDoc['customDocProp']).toBe('preservedDocValue');
            expect(updatedDoc['metadata']).toEqual({ source: 'scanner', quality: 'high' });
            done();
        });
    });

    it('should build taskData correctly when field ID does not exist in original extracted fields on taskPrepareUpdate', (done) => {
        const taskDocumentWithNoMatchingFields = {
            ...taskData.batchState.documents[taskData.documentIndex],
            fields: [],
        };
        const testTaskInputData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                documents: [taskDocumentWithNoMatchingFields],
            },
        };

        const storeFields: DocumentFieldEntity[] = [
            {
                order: 0,
                id: 'new-field-not-in-extracted',
                name: 'New Field',
                dataType: IdpFieldDataType.Text,
                format: '',
                value: 'user-entered-value',
                confidence: 0.95,
                verificationStatus: 'ManualValid',
                validationStatus: IdpValidationStatus.Valid,
            },
        ];

        const testDocument: IdpDocument = {
            id: taskDocumentWithNoMatchingFields.id,
            name: taskDocumentWithNoMatchingFields.name,
            class: { id: taskDocumentWithNoMatchingFields.classId, name: '' },
            pages: [],
            hasIssue: false,
        };

        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, storeFields);
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, testTaskInputData);

        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: false });
        actions$ = of(action);

        effects.taskDataEffect$.subscribe((result) => {
            expect(result.type).toBe(systemActions.updateDocumentRotation.type);
            expect('taskData' in result).toBe(true);

            const updatedFields = result.taskData.batchState.documents[0].fields;
            expect(updatedFields).toHaveLength(1);

            const updatedField = updatedFields[0];
            expect(updatedField.id).toBe('new-field-not-in-extracted');
            expect(updatedField.name).toBe('New Field');
            expect(updatedField.value).toBe('user-entered-value');
            expect(updatedField.extractionConfidence).toBe(0.95);
            expect(updatedField.extractionReviewStatus).toBe('ReviewNotRequired');
            expect(updatedField.boundingBox).toBeUndefined();
            done();
        });
    });

    it('should preserve custom batch state properties from original task input data on taskPrepareUpdate', (done) => {
        const testTaskInputData = {
            ...taskData,
            batchState: {
                ...taskData.batchState,
                customBatchProp: 'preservedBatchValue',
                processingInfo: { engine: 'ocr-v2', language: 'en' },
            }
        };

        const taskDocument = taskData.batchState.documents[taskData.documentIndex];
        const testDocument: IdpDocument = {
            id: taskDocument.id,
            name: taskDocument.name,
            class: { id: taskDocument.classId, name: '' },
            pages: [],
            hasIssue: false,
        };

        store.overrideSelector(selectDocument, testDocument);
        store.overrideSelector(selectDocumentFields, taskDataFields);
        store.overrideSelector(selectDocumentTables, []);
        store.overrideSelector(selectTaskInputData, testTaskInputData);

        const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: false });
        actions$ = of(action);

        effects.taskDataEffect$.subscribe((result) => {
            expect(result.type).toBe(systemActions.updateDocumentRotation.type);
            expect('taskData' in result).toBe(true);

            expect(result.taskData.batchState['customBatchProp']).toBe('preservedBatchValue');
            expect(result.taskData.batchState['processingInfo']).toEqual({ engine: 'ocr-v2', language: 'en' });
            done();
        });
    });
});

function expectDefined<T>(value: T | undefined): asserts value is T {
    expect(value).toBeDefined();
}

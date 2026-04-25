/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Observable, of } from 'rxjs';
import { hot, cold, getTestScheduler } from 'jasmine-marbles';
import { DocumentEffects } from './document.effects';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { systemActions, userActions } from '../actions/class-verification.actions';
import {
    ContentFileReference,
    IdpBackendService,
    IdpDocumentClassDefinition,
    IdpLoadState,
    IdpSharedImageLoadingService,
    IdpVerificationStatus,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { mockDocumentEntities, mockDocumentEntitiesByIdpDocuments } from '../models/mocked/mocked-documents';
import { mockIdpDocuments } from '../../models/mocked/mocked-documents';
import { IdpConfigClass, IdpDocument, IdpDocumentAction, IdpDocumentPage, IdpTaskData, UNCLASSIFIED_CLASS_ID } from '../../models/screen-models';
import { cloneDeep } from 'es-toolkit/compat';
import { documentAdapter, DocumentEntity, DocumentState, initialDocumentState } from '../states/document.state';
import { DocumentStateUpdate } from '../models/document-state-updates';
import { classVerificationStateName, initialClassVerificationRootState } from '../states/root.state';
import { documentClassAdapter, DocumentClassState, initialDocumentClassState } from '../states/document-class.state';
import { mockIdpConfigClasses } from '../../models/mocked/mocked-classes';
import { selectActivePageCount, selectAllCutPages, selectAllDocuments, selectDocumentsRawState } from '../selectors/document.selectors';
import { selectCorrelationId, selectTaskInputData } from '../selectors/screen.selectors';
import {
    ApiDocument,
    ClassificationCandidate,
    ClassSelectionReasonCode,
    ClassVerificationBatchState,
} from '../../models/contracts/class-verification-models';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { createMockDocumentEntity, createMockDocumentEntityPage } from '../../test-utils';

export const resetMockStore = (store: MockStore) => {
    const cleanDocumentState = documentAdapter.setAll([], initialDocumentState);
    const cleanClassesState = documentClassAdapter.setAll([], initialDocumentClassState);
    const cleanState = {
        [classVerificationStateName]: {
            ...initialClassVerificationRootState,
            documents: cleanDocumentState,
            documentClasses: cleanClassesState,
        },
    };

    store.setState(cleanState);
    store.resetSelectors();
};

describe('Document Effects', () => {
    let actions$: Observable<any>;
    let effects: DocumentEffects;
    let store: MockStore;

    const idpBackendSpy = jasmine.createSpyObj(
        'IdpBackendService',
        {
            getFileMetadata$: {},
            updateRotationData$: {},
        },
        {}
    );

    const idpSharedImageServiceSpy = jasmine.createSpyObj('IdpSharedImageLoadingService', ['cleanup']);

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: IdpBackendService, useValue: idpBackendSpy },
                { provide: IdpSharedImageLoadingService, useValue: idpSharedImageServiceSpy },
                DocumentEffects,
                provideMockActions(() => actions$),
                provideMockStore(),
                {
                    provide: FeaturesServiceToken,
                    useValue: { isOn$: () => of(true), getFlags$: () => of([]) },
                },
            ],
        });

        effects = TestBed.inject(DocumentEffects);
        store = TestBed.inject(MockStore);
        resetMockStore(store);
    });

    afterEach(() => {
        resetMockStore(store);
    });

    describe('Task Data Input', () => {
        it('should map task documents to document entities', () => {
            spyOn(effects, 'uuid').and.returnValues('uuid_0_0', 'uuid_0_1', 'uuid_1_0', 'uuid_1_1');

            const taskData: IdpTaskData = {
                batchState: {
                    documents: [
                        {
                            id: 'd_cf1',
                            name: 'Document 1',
                            classId: 'payslips',
                            classificationConfidence: 0.9,
                            pages: [
                                { contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0, width: 1000, height: 500 },
                                { contentFileReferenceIndex: 0, sourcePageIndex: 1, rotation: 0, width: 400, height: 600 },
                            ],
                        },
                        {
                            id: 'd_cf2',
                            name: 'Document 2',
                            markAsDeleted: true,
                            markAsRejected: true,
                            rejectReasonId: 'rr1',
                            classificationReviewStatus: 'ReviewRequired',
                            pages: [
                                { contentFileReferenceIndex: 1, sourcePageIndex: 0, rotation: 0, width: 100, height: 200 },
                                { contentFileReferenceIndex: 1, sourcePageIndex: 1, rotation: 0, width: 1400, height: 2000 },
                            ],
                        },
                    ],
                    contentFileReferences: [{ sys_id: 'cf1' }, { sys_id: 'cf2' }],
                },
                rejectReasons: [],
                configuration: {
                    classificationConfidenceThreshold: 0.9,
                    documentClassDefinitions: [
                        { id: 'payslips', name: 'Payslips', description: "Yup! It's Payslips." },
                        { id: 'contracts', name: 'Contracts', description: 'Contracts.' },
                    ],
                },
            };

            const action = systemActions.screenLoadSuccess({ taskData });
            const outcome = systemActions.createDocuments({
                documents: [
                    {
                        id: 'd_cf1',
                        name: 'Document 1',
                        class: { id: 'payslips', name: 'Payslips', description: "Yup! It's Payslips.", isSpecialClass: false } as any,
                        verificationStatus: IdpVerificationStatus.AutoValid,
                        classificationConfidence: 0.9,
                        classificationClassCandidates: undefined,
                        classificationSelectionReason: undefined,
                        isGenerated: false,
                        markAsDeleted: false,
                        rejectedReasonId: undefined,
                        pages: [
                            {
                                id: '0_0_uuid_0_0',
                                name: 'Page 0_0',
                                fileReference: 'cf1',
                                contentFileReferenceIndex: 0,
                                sourcePageIndex: 0,
                                rotation: 0,
                                width: 1000,
                                height: 500,
                            },
                            {
                                id: '0_1_uuid_0_1',
                                name: 'Page 0_1',
                                fileReference: 'cf1',
                                contentFileReferenceIndex: 0,
                                sourcePageIndex: 1,
                                rotation: 0,
                                width: 400,
                                height: 600,
                            },
                        ],
                    },
                    {
                        id: 'd_cf2',
                        name: 'Document 2',
                        class: undefined,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        classificationConfidence: 0,
                        classificationClassCandidates: undefined,
                        classificationSelectionReason: undefined,
                        rejectedReasonId: 'rr1',
                        isGenerated: false,
                        markAsDeleted: true,
                        pages: [
                            {
                                id: '1_0_uuid_1_0',
                                name: 'Page 1_0',
                                fileReference: 'cf2',
                                contentFileReferenceIndex: 1,
                                sourcePageIndex: 0,
                                rotation: 0,
                                width: 100,
                                height: 200,
                            },
                            {
                                id: '1_1_uuid_1_1',
                                name: 'Page 1_1',
                                fileReference: 'cf2',
                                contentFileReferenceIndex: 1,
                                sourcePageIndex: 1,
                                rotation: 0,
                                width: 1400,
                                height: 2000,
                            },
                        ],
                    },
                ],
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.loadDocumentEffect$).toBeObservable(expected);
        });

        it('should return empty documents if task documents are not set', () => {
            const taskData: IdpTaskData = {
                configuration: {},
            } as unknown as IdpTaskData;
            const action = systemActions.screenLoadSuccess({ taskData });
            const outcome = systemActions.createDocuments({ documents: [] });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.loadDocumentEffect$).toBeObservable(expected);
        });

        it('should return documents with undefined class if task classes are not set', () => {
            spyOn(effects, 'uuid').and.returnValues('uuid_0_0', 'uuid_0_1');

            const taskData: IdpTaskData = {
                batchState: {
                    documents: [
                        {
                            id: 'd_cf1',
                            name: 'Document 1',
                            classId: 'payslips',
                            classificationConfidence: 99,
                            pages: [
                                { contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0, width: 1000, height: 800 },
                                { contentFileReferenceIndex: 0, sourcePageIndex: 1, rotation: 0, width: 100, height: 200 },
                            ],
                        },
                    ],
                    contentFileReferences: [{ sys_id: 'cf1' }],
                },
                configuration: {
                    classificationConfiguration: {
                        rejectReasons: [],
                        documentClassDefinitions: [],
                    },
                },
            } as unknown as IdpTaskData;

            const action = systemActions.screenLoadSuccess({ taskData });
            const outcome = systemActions.createDocuments({
                documents: [
                    {
                        id: 'd_cf1',
                        name: 'Document 1',
                        class: undefined,
                        verificationStatus: IdpVerificationStatus.AutoValid,
                        classificationConfidence: 99,
                        classificationClassCandidates: undefined,
                        classificationSelectionReason: undefined,
                        isGenerated: false,
                        markAsDeleted: false,
                        rejectedReasonId: undefined,
                        pages: [
                            {
                                id: '0_0_uuid_0_0',
                                name: 'Page 0_0',
                                fileReference: 'cf1',
                                contentFileReferenceIndex: 0,
                                sourcePageIndex: 0,
                                rotation: 0,
                                width: 1000,
                                height: 800,
                            },
                            {
                                id: '0_1_uuid_0_1',
                                name: 'Page 0_1',
                                fileReference: 'cf1',
                                contentFileReferenceIndex: 0,
                                sourcePageIndex: 1,
                                rotation: 0,
                                width: 100,
                                height: 200,
                            },
                        ],
                    },
                ],
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.loadDocumentEffect$).toBeObservable(expected);
        });

        it('should map classificationClassCandidates and classificationSelectionReason to document entities', () => {
            spyOn(effects, 'uuid').and.returnValues('uuid_0_0');

            const candidates = [
                { classId: 'payslips', className: 'Payslips', confidence: 0.95, reason: 'Looks like a payslip' },
                { classId: 'contracts', className: 'Contracts', confidence: 0.8, reason: 'Has contract-like elements' },
            ];

            const taskData: IdpTaskData = {
                batchState: {
                    documents: [
                        {
                            id: 'd_cf1',
                            name: 'Document 1',
                            classId: 'payslips',
                            classificationConfidence: 0.95,
                            classificationClassCandidates: candidates,
                            classificationSelectionReason: 'AUTOWIN',
                            pages: [{ contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0, width: 1000, height: 500 }],
                        },
                    ],
                    contentFileReferences: [{ sys_id: 'cf1' }],
                },
                rejectReasons: [],
                configuration: {
                    documentClassDefinitions: [{ id: 'payslips', name: 'Payslips' }],
                },
            } as unknown as IdpTaskData;

            const action = systemActions.screenLoadSuccess({ taskData });
            const outcome = systemActions.createDocuments({
                documents: [
                    jasmine.objectContaining({
                        id: 'd_cf1',
                        classificationClassCandidates: candidates,
                        classificationSelectionReason: 'AUTOWIN',
                    }) as any,
                ],
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.loadDocumentEffect$).toBeObservable(expected);
        });

        it('should map null classificationClassCandidates for config-only batch documents', () => {
            spyOn(effects, 'uuid').and.returnValues('uuid_0_0');

            const taskData: IdpTaskData = {
                batchState: {
                    documents: [
                        {
                            id: 'd_cf1',
                            name: 'Document 1',
                            classId: 'default-class',
                            classificationConfidence: 1,
                            classificationClassCandidates: null,
                            classificationSelectionReason: 'DEFAULT_CLASS_ID',
                            pages: [{ contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0, width: 1000, height: 500 }],
                        },
                    ],
                    contentFileReferences: [{ sys_id: 'cf1' }],
                },
                rejectReasons: [],
                configuration: {
                    documentClassDefinitions: [{ id: 'default-class', name: 'Default' }],
                },
            } as unknown as IdpTaskData;

            const action = systemActions.screenLoadSuccess({ taskData });
            const outcome = systemActions.createDocuments({
                documents: [
                    jasmine.objectContaining({
                        id: 'd_cf1',
                        classificationClassCandidates: null,
                        classificationSelectionReason: 'DEFAULT_CLASS_ID',
                    }) as any,
                ],
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.loadDocumentEffect$).toBeObservable(expected);
        });

        it('should handle legacy batch documents without reasoning fields', () => {
            spyOn(effects, 'uuid').and.returnValues('uuid_0_0');

            const taskData: IdpTaskData = {
                batchState: {
                    documents: [
                        {
                            id: 'd_cf1',
                            name: 'Document 1',
                            classId: 'payslips',
                            classificationConfidence: 0.9,
                            pages: [{ contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0, width: 1000, height: 500 }],
                        },
                    ],
                    contentFileReferences: [{ sys_id: 'cf1' }],
                },
                rejectReasons: [],
                configuration: {
                    documentClassDefinitions: [{ id: 'payslips', name: 'Payslips' }],
                },
            } as unknown as IdpTaskData;

            const action = systemActions.screenLoadSuccess({ taskData });
            const outcome = systemActions.createDocuments({
                documents: [
                    jasmine.objectContaining({
                        id: 'd_cf1',
                        classificationClassCandidates: undefined,
                        classificationSelectionReason: undefined,
                    }) as any,
                ],
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.loadDocumentEffect$).toBeObservable(expected);
        });
    });

    describe('syncRecognitionMetadataEffect$', () => {
        const correlationId = 'corr-sync-1';
        const taskInputData: IdpTaskData = {
            batchState: {
                contentFileReferences: [{ sys_id: 'cf1' }],
                documents: [
                    {
                        id: 'd_cf1',
                        name: 'Document 1',
                        pages: [
                            {
                                id: 'p1',
                                contentFileReferenceIndex: 0,
                                sourcePageIndex: 0,
                                rotation: 90,
                                width: 100,
                                height: 200,
                            },
                        ],
                    },
                ],
            },
        } as unknown as IdpTaskData;

        const documents: DocumentEntity[] = [
            {
                id: 'd_cf1',
                name: 'Document 1',
                pages: [
                    {
                        id: 'p1',
                        name: 'Page 1',
                        fileReference: 'cf1',
                        contentFileReferenceIndex: 0,
                        sourcePageIndex: 0,
                        rotation: 90,
                        width: 100,
                        height: 200,
                    },
                ],
            } as DocumentEntity,
        ];

        beforeEach(() => {
            idpBackendSpy.getFileMetadata$.calls.reset();
            idpBackendSpy.updateRotationData$.calls.reset();
            spyOn(console, 'warn').and.stub();
            spyOn(console, 'error').and.stub();
        });

        it('should dispatch updatePagesRotation without calling updateRotationData$ when batch state and recognition metadata match', () => {
            const metadata = {
                status: 'Succeeded' as const,
                pageCount: 1,
                pages: [{ pageIndex: 0, imageWidth: 100, imageHeight: 200, rotation: 90, skew: 0 }],
            };
            idpBackendSpy.getFileMetadata$.and.returnValue(of(metadata));
            idpBackendSpy.updateRotationData$.and.returnValue(of(undefined));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, taskInputData);

            const action = systemActions.createDocuments({ documents });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: 'p1', documentId: 'd_cf1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.getFileMetadata$).toHaveBeenCalledWith(correlationId, 'cf1');
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });

        it('should call updateRotationData$ and dispatch updatePagesRotation when recognition metadata differs from batch state', () => {
            const metadata = {
                status: 'Succeeded' as const,
                pageCount: 1,
                pages: [{ pageIndex: 0, imageWidth: 100, imageHeight: 200, rotation: 0, skew: 0 }],
            };
            idpBackendSpy.getFileMetadata$.and.returnValue(of(metadata));
            idpBackendSpy.updateRotationData$.and.returnValue(cold('(a|)', { a: undefined }));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, taskInputData);

            const action = systemActions.createDocuments({ documents });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: 'p1', documentId: 'd_cf1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.getFileMetadata$).toHaveBeenCalledWith(correlationId, 'cf1');
            expect(idpBackendSpy.updateRotationData$).toHaveBeenCalledWith(
                correlationId,
                ['cf1'],
                [{ contentFileReferenceIndex: 0, pageIndex: 0, rotation: 90 }]
            );
            expect(idpSharedImageServiceSpy.cleanup).toHaveBeenCalled();
        });

        it('should use recognition metadata rotation when batch state rotation is invalid', () => {
            const taskInputWithInvalidRotation = {
                ...taskInputData,
                batchState: {
                    ...taskInputData.batchState,
                    documents: [
                        {
                            ...taskInputData.batchState.documents[0],
                            pages: [{ id: 'p1', contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 45, width: 100, height: 200 }],
                        },
                    ],
                },
            };
            const documentsWithInvalidRotation = [
                {
                    ...documents[0],
                    pages: [
                        {
                            ...documents[0].pages[0],
                            rotation: 45,
                        },
                    ],
                },
            ];
            const metadata = {
                status: 'Succeeded' as const,
                pageCount: 1,
                pages: [{ pageIndex: 0, imageWidth: 100, imageHeight: 200, rotation: 90, skew: 0 }],
            };
            idpBackendSpy.getFileMetadata$.and.returnValue(of(metadata));
            idpBackendSpy.updateRotationData$.and.returnValue(of(undefined));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, taskInputWithInvalidRotation);

            const action = systemActions.createDocuments({ documents: documentsWithInvalidRotation });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: 'p1', documentId: 'd_cf1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });

        it('should dispatch updatePagesRotation with batch state when getFileMetadata$ fails (errors are caught)', () => {
            idpBackendSpy.getFileMetadata$.and.returnValue(cold('#', {}, new Error('Metadata fetch failed')));
            idpBackendSpy.updateRotationData$.and.returnValue(of(undefined));

            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, taskInputData);

            const action = systemActions.createDocuments({ documents });
            const outcome = userActions.updatePagesRotation({
                pages: [{ pageId: 'p1', documentId: 'd_cf1', rotation: 90, viewerRotation: 0 }],
                taskDataSynced: undefined,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
        });

        it('should return EMPTY when correlationId is missing', () => {
            idpBackendSpy.getFileMetadata$.and.returnValue(of(undefined));
            store.overrideSelector(selectCorrelationId, '');
            store.overrideSelector(selectTaskInputData, taskInputData);

            const action = systemActions.createDocuments({ documents });
            actions$ = hot('-a-', { a: action });
            const expected = cold('-');

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.getFileMetadata$).not.toHaveBeenCalled();
        });

        it('should return EMPTY when taskInputData is missing', () => {
            idpBackendSpy.getFileMetadata$.and.returnValue(of(undefined));
            store.overrideSelector(selectCorrelationId, correlationId);
            store.overrideSelector(selectTaskInputData, undefined);

            const action = systemActions.createDocuments({ documents });
            actions$ = hot('-a-', { a: action });
            const expected = cold('-');

            expect(effects.syncRecognitionMetadataEffect$).toBeObservable(expected);
            expect(idpBackendSpy.getFileMetadata$).not.toHaveBeenCalled();
        });
    });

    describe('Page Merge', () => {
        it('should merge pages', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];
            const targetDocument = entities[3];

            const affectedEntities = cloneDeep([entities[1], entities[2], targetDocument]);

            const updates: DocumentStateUpdate[] = [];
            targetDocument.pages = [...targetDocument.pages, entities[1].pages[0], entities[2].pages[0]];
            entities[1].pages = entities[1].pages.slice(1);
            entities[2].pages = entities[2].pages.slice(1);
            updates.push(
                { operation: 'update', documentId: entities[1].id, update: entities[1] },
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: targetDocument.id, update: targetDocument }
            );

            testPageMergeEffect(pages, targetDocument, updates, affectedEntities);
        });

        function testPageMergeEffect(
            pages: IdpDocumentPage[],
            targetDocument: DocumentEntity,
            updates: DocumentStateUpdate[],
            affectedEntities: DocumentEntity[]
        ) {
            setMockStoreState(affectedEntities);

            const action = userActions.pageMerge({
                docAction: IdpDocumentAction.Merge,
                canUndoAction: true,
                pages,
                targetDocumentId: targetDocument.id,
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_MERGE_SUCCESS',
                messageArgs: jasmine.any(Object),
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.mergePageEffect$).toBeObservable(expected);
        }

        it('should return document operation error on pages merge if target document cannot be found', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];
            const targetDocument = entities[3];

            setMockStoreState(cloneDeep([entities[1], entities[2]]));

            const action = userActions.pageMerge({
                docAction: IdpDocumentAction.Merge,
                canUndoAction: true,
                pages,
                targetDocumentId: targetDocument.id,
            });

            const outcome = systemActions.documentOperationError({
                docAction: action.docAction,
                error: jasmine.any(String),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_MERGE_ERROR',
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.mergePageEffect$).toBeObservable(expected);
        });

        it("should mark documents deleted on pages merge if all it's pages are merged into another document", () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [...documents[2].pages, ...documents[3].pages];
            entities[3].isGenerated = true;
            const targetDocument = entities[1];

            const affectedEntities = cloneDeep([entities[2], entities[3], targetDocument]);

            const updates: DocumentStateUpdate[] = [];
            targetDocument.pages = [...targetDocument.pages, ...entities[2].pages, ...entities[3].pages];
            entities[2].pages = [];
            entities[2].markAsDeleted = true;
            entities[3].pages = [];
            entities[3].markAsDeleted = true;
            updates.push(
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: entities[3].id, update: entities[3] },
                { operation: 'update', documentId: targetDocument.id, update: targetDocument }
            );

            testPageMergeEffect(pages, targetDocument, updates, affectedEntities);
        });

        it('should throw an error when page does not exist in any of the affected documents on pages merge', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const badPage1 = cloneDeep(documents[2].pages[0]);
            badPage1.documentId = 'bad_document_id';
            const badPage2 = cloneDeep(documents[2].pages[0]);
            badPage2.id = 'bad_page_id';
            const badPage3 = documents[1].pages[1];
            const pages = [documents[2].pages[0], badPage1, badPage2, badPage3];
            const targetDocument = entities[1];

            setMockStoreState(cloneDeep([entities[2], targetDocument]));

            const action = userActions.pageMerge({
                docAction: IdpDocumentAction.Merge,
                canUndoAction: true,
                pages,
                targetDocumentId: targetDocument.id,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-#-', {}, jasmine.stringMatching(/.+/));

            expect(effects.mergePageEffect$).toBeObservable(expected);
        });
    });

    function setMockStoreState(documents: DocumentEntity[], classes?: IdpConfigClass[] | undefined) {
        const loadedDocumentState: DocumentState = { ...initialDocumentState, loadState: IdpLoadState.Loaded };
        const mockDocumentState = documentAdapter.setAll(cloneDeep(documents), loadedDocumentState);

        let mockClassesState: DocumentClassState = initialDocumentClassState;
        if (classes !== undefined) {
            const loadedClassesState: DocumentClassState = { ...initialDocumentClassState, loadState: IdpLoadState.Loaded };
            mockClassesState = documentClassAdapter.setAll(classes, loadedClassesState);
            mockClassesState.loadState = IdpLoadState.Loaded;
        }

        const mockState = {
            [classVerificationStateName]: {
                ...initialClassVerificationRootState,
                documents: mockDocumentState,
                documentClasses: mockClassesState,
            },
        };
        store.setState(mockState);
    }

    describe('Page Split', () => {
        it('should split pages', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];

            const affectedEntities = cloneDeep([entities[1], entities[2]]);

            const updates: DocumentStateUpdate[] = [];
            const created = {
                ...entities[1],
                id: 'mock_page_id',
                name: `${entities[1].name}_split`,
                isGenerated: true,
                classificationClassCandidates: undefined,
                classificationSelectionReason: undefined,
                pages: [entities[1].pages[0], entities[2].pages[0]],
            };
            entities[1].pages = entities[1].pages.slice(1);
            entities[2].pages = entities[2].pages.slice(1);
            updates.push(
                { operation: 'update', documentId: entities[1].id, update: entities[1] },
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'create', documentId: 'mock_page_id', update: created, createAfterDocId: entities[1].id }
            );

            testPageSplitEffect(pages, updates, affectedEntities);
        });

        function testPageSplitEffect(
            pages: IdpDocumentPage[],
            updates: DocumentStateUpdate[],
            affectedEntities: DocumentEntity[],
            createAfterDocId?: string
        ) {
            setMockStoreState(affectedEntities);
            spyOn(effects, 'uuid').and.returnValue('mock_page_id');

            const action = userActions.pageSplit({
                docAction: IdpDocumentAction.Split,
                canUndoAction: true,
                pages,
                createAfterDocId: createAfterDocId,
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: jasmine.stringMatching(/IDP_CLASS_VERIFICATION\.USER_FEEDBACK\.PAGE_SPLIT_SUCCESS.*/),
                messageArgs: jasmine.any(Object),
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.splitPageEffect$).toBeObservable(expected);
        }

        it('should return document operation error on pages split if target document cannot be found', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];

            setMockStoreState(cloneDeep([entities[1], entities[2]]));

            const action = userActions.pageSplit({
                docAction: IdpDocumentAction.Split,
                canUndoAction: true,
                pages,
                createAfterDocId: 'bad_document_id',
            });

            const outcome = systemActions.documentOperationError({
                docAction: action.docAction,
                error: jasmine.any(String),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_SPLIT_ERROR',
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.splitPageEffect$).toBeObservable(expected);
        });

        it("should mark documents deleted on pages split if all it's pages are split into a new document", () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [...documents[2].pages, ...documents[3].pages];
            entities[3].isGenerated = true;

            const affectedEntities = cloneDeep([entities[2], entities[3]]);

            const updates: DocumentStateUpdate[] = [];
            const created = {
                ...entities[2],
                id: 'mock_page_id',
                name: `${entities[2].name}_split`,
                isGenerated: true,
                classificationClassCandidates: undefined,
                classificationSelectionReason: undefined,
                pages: [...entities[2].pages, ...entities[3].pages],
            };
            entities[2].pages = [];
            entities[2].markAsDeleted = true;
            entities[3].pages = [];
            entities[3].markAsDeleted = true;
            updates.push(
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: entities[3].id, update: entities[3] },
                { operation: 'create', documentId: 'mock_page_id', update: created, createAfterDocId: entities[2].id }
            );

            testPageSplitEffect(pages, updates, affectedEntities);
        });

        it('should throw an error when page does not exist in any of the affected documents on pages split', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const badPage1 = cloneDeep(documents[2].pages[0]);
            badPage1.documentId = 'bad_document_id';
            const badPage2 = cloneDeep(documents[2].pages[0]);
            badPage2.id = 'bad_page_id';
            const badPage3 = documents[1].pages[1];
            const pages = [documents[2].pages[0], badPage1, badPage2, badPage3];

            setMockStoreState(cloneDeep([entities[2]]));

            const action = userActions.pageSplit({
                docAction: IdpDocumentAction.Split,
                canUndoAction: true,
                pages,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-#-', {}, jasmine.stringMatching(/.+/));

            expect(effects.splitPageEffect$).toBeObservable(expected);
        });

        it('should split single page', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0]];

            const affectedEntities = cloneDeep([entities[1]]);

            const updates: DocumentStateUpdate[] = [];
            const created = {
                ...entities[1],
                id: 'mock_page_id',
                name: `${entities[1].name}_split`,
                isGenerated: true,
                classificationClassCandidates: undefined,
                classificationSelectionReason: undefined,
                pages: [entities[1].pages[0]],
            };
            entities[1].pages = entities[1].pages.slice(1);
            updates.push(
                { operation: 'update', documentId: entities[1].id, update: entities[1] },
                { operation: 'create', documentId: 'mock_page_id', update: created, createAfterDocId: entities[1].id }
            );

            testPageSplitEffect(pages, updates, affectedEntities);
        });

        it('should generate a valid UUID', () => {
            const uuid = effects.uuid();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(uuid).toMatch(uuidRegex);
        });

        it('should generate unique UUIDs', () => {
            const uuid1 = effects.uuid();
            const uuid2 = effects.uuid();
            expect(uuid1).not.toEqual(uuid2);
        });
    });

    describe('Page Move', () => {
        it('should move pages to another document', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];
            const targetDocument = entities[3];
            const targetIndex = targetDocument.pages.length;

            const affectedEntities = cloneDeep([entities[1], entities[2], targetDocument]);

            const updates: DocumentStateUpdate[] = [];
            targetDocument.pages = [...targetDocument.pages, entities[1].pages[0], entities[2].pages[0]];
            entities[1].pages = entities[1].pages.slice(1);
            entities[2].pages = entities[2].pages.slice(1);
            updates.push(
                { operation: 'update', documentId: entities[1].id, update: entities[1] },
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: targetDocument.id, update: targetDocument }
            );

            testPageMoveEffect(pages, targetDocument, targetIndex, updates, affectedEntities);
        });

        function testPageMoveEffect(
            pages: IdpDocumentPage[],
            targetDocument: DocumentEntity,
            targetIndex: number,
            updates: DocumentStateUpdate[],
            affectedEntities: DocumentEntity[]
        ) {
            setMockStoreState(affectedEntities);

            const action = userActions.pageMove({
                docAction: IdpDocumentAction.MovePage,
                canUndoAction: true,
                pages,
                targetDocumentId: targetDocument.id,
                targetIndex,
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: jasmine.stringMatching(/IDP_CLASS_VERIFICATION\.USER_FEEDBACK\.MOVE_PAGE_SUCCESS.*/),
                messageArgs: jasmine.any(Object),
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.movePageEffect$).toBeObservable(expected);
        }

        it('should move pages to another document at target index', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[2].pages[0], documents[3].pages[0]];
            const targetDocument = entities[1];
            const targetIndex = 1;

            const affectedEntities = cloneDeep([entities[2], entities[3], targetDocument]);

            const updates: DocumentStateUpdate[] = [];
            targetDocument.pages = [targetDocument.pages[0], entities[2].pages[0], entities[3].pages[0], ...targetDocument.pages.slice(1)];
            entities[2].pages = entities[2].pages.slice(1);
            entities[3].pages = entities[3].pages.slice(1);
            entities[3].markAsDeleted = true;
            updates.push(
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: entities[3].id, update: entities[3] },
                { operation: 'update', documentId: targetDocument.id, update: targetDocument }
            );

            testPageMoveEffect(pages, targetDocument, targetIndex, updates, affectedEntities);
        });

        it('should move internal (reorder) and external (append) pages', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0], documents[3].pages[0]];
            const targetDocument = entities[1];
            const targetIndex = 1;

            const affectedEntities = cloneDeep([entities[2], entities[3], targetDocument]);

            const updates: DocumentStateUpdate[] = [];
            targetDocument.pages = [
                targetDocument.pages[1],
                targetDocument.pages[0],
                entities[2].pages[0],
                entities[3].pages[0],
                ...targetDocument.pages.slice(2),
            ];
            entities[2].pages = entities[2].pages.slice(1);
            entities[3].pages = entities[3].pages.slice(1);
            entities[3].markAsDeleted = true;
            updates.push(
                { operation: 'update', documentId: targetDocument.id, update: targetDocument },
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: entities[3].id, update: entities[3] },
                { operation: 'update', documentId: targetDocument.id, update: targetDocument }
            );

            testPageMoveEffect(pages, targetDocument, targetIndex, updates, affectedEntities);
        });

        it('should return document operation error on pages move if target document cannot be found', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[2].pages[0], documents[3].pages[0]];
            const targetDocument = entities[1];
            const targetIndex = 1;

            setMockStoreState(cloneDeep([entities[2], entities[3]]));

            const action = userActions.pageMove({
                docAction: IdpDocumentAction.MovePage,
                canUndoAction: true,
                pages,
                targetDocumentId: targetDocument.id,
                targetIndex,
            });

            const outcome = systemActions.documentOperationError({
                docAction: action.docAction,
                error: jasmine.any(String),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.MOVE_PAGE_ERROR',
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.movePageEffect$).toBeObservable(expected);
        });

        it("should mark documents deleted on pages move if all it's pages are moved into another document", () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [...documents[2].pages, ...documents[3].pages];
            entities[3].isGenerated = true;
            const targetDocument = entities[1];
            const targetIndex = targetDocument.pages.length;

            const affectedEntities = cloneDeep([entities[2], entities[3], targetDocument]);

            const updates: DocumentStateUpdate[] = [];
            targetDocument.pages = [...targetDocument.pages, ...entities[2].pages, ...entities[3].pages];
            entities[2].pages = [];
            entities[2].markAsDeleted = true;
            entities[3].pages = [];
            entities[3].markAsDeleted = true;
            updates.push(
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: entities[3].id, update: entities[3] },
                { operation: 'update', documentId: targetDocument.id, update: targetDocument }
            );

            testPageMoveEffect(pages, targetDocument, targetIndex, updates, affectedEntities);
        });

        it('should throw an error when page does not exist in any of the affected documents on pages move', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const badPage1 = cloneDeep(documents[2].pages[0]);
            badPage1.documentId = 'bad_document_id';
            const badPage2 = cloneDeep(documents[2].pages[0]);
            badPage2.id = 'bad_page_id';
            const pages = [documents[2].pages[0], badPage1, badPage2];
            const targetDocument = entities[1];
            const targetIndex = targetDocument.pages.length;

            setMockStoreState(cloneDeep([entities[2], targetDocument]));

            const action = userActions.pageMove({
                docAction: IdpDocumentAction.MovePage,
                canUndoAction: true,
                pages,
                targetDocumentId: targetDocument.id,
                targetIndex,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-#-', {}, jasmine.stringMatching(/.+/));

            expect(effects.movePageEffect$).toBeObservable(expected);
        });

        it('should move single page', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[2].pages[0]];
            const targetDocument = entities[1];
            const targetIndex = targetDocument.pages.length;

            const affectedEntities = cloneDeep([entities[2], targetDocument]);

            const updates: DocumentStateUpdate[] = [];
            targetDocument.pages = [...targetDocument.pages, entities[2].pages[0]];
            entities[2].pages = entities[2].pages.slice(1);
            updates.push(
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: targetDocument.id, update: targetDocument }
            );

            testPageMoveEffect(pages, targetDocument, targetIndex, updates, affectedEntities);
        });
    });

    describe('Page Delete', () => {
        it('should delete pages', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];

            const affectedEntities = cloneDeep([entities[1], entities[2]]);

            entities[1].pages[0].markAsDeleted = true;
            entities[2].pages[0].markAsDeleted = true;

            const updates: DocumentStateUpdate[] = [];
            updates.push(
                { operation: 'update', documentId: entities[1].id, update: entities[1] },
                { operation: 'update', documentId: entities[2].id, update: entities[2] }
            );

            testPageDeleteEffect(pages, updates, affectedEntities);
        });

        function testPageDeleteEffect(pages: IdpDocumentPage[], updates: DocumentStateUpdate[], affectedEntities: DocumentEntity[]) {
            setMockStoreState(affectedEntities);

            const action = userActions.pageDelete({
                docAction: IdpDocumentAction.Delete,
                canUndoAction: true,
                pages,
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: jasmine.stringMatching(/IDP_CLASS_VERIFICATION\.USER_FEEDBACK\.PAGE_DELETE_SUCCESS.*/),
                messageArgs: jasmine.any(Object),
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.deletePageEffect$).toBeObservable(expected);
        }

        it('should return document operation error on pages delete if context document cannot be found', () => {
            const documents = mockIdpDocuments();
            const pages = [documents[2].pages[0], documents[3].pages[0]];

            setMockStoreState([]);

            const action = userActions.pageDelete({
                docAction: IdpDocumentAction.Delete,
                canUndoAction: true,
                pages,
            });

            const outcome = systemActions.documentOperationError({
                docAction: action.docAction,
                error: jasmine.any(String),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_DELETE_ERROR',
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.deletePageEffect$).toBeObservable(expected);
        });

        it("should mark documents deleted on pages delete if all it's pages are deleted", () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [...documents[2].pages, ...documents[3].pages];
            entities[3].isGenerated = true;

            const affectedEntities = cloneDeep([entities[2], entities[3]]);

            const updates: DocumentStateUpdate[] = [];
            entities[2].pages = entities[2].pages.map((p) => ({ ...p, markAsDeleted: true }));
            entities[2].markAsDeleted = true;
            entities[3].pages = entities[3].pages.map((p) => ({ ...p, markAsDeleted: true }));
            entities[3].markAsDeleted = true;
            updates.push(
                { operation: 'update', documentId: entities[2].id, update: entities[2] },
                { operation: 'update', documentId: entities[3].id, update: entities[3] }
            );

            testPageDeleteEffect(pages, updates, affectedEntities);
        });

        it('should throw an error when page does not exist in any of the affected documents on pages delete', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const badPage1 = cloneDeep(documents[2].pages[0]);
            badPage1.documentId = 'bad_document_id';
            const badPage2 = cloneDeep(documents[2].pages[0]);
            badPage2.id = 'bad_page_id';
            const pages = [documents[2].pages[0], badPage1, badPage2];

            setMockStoreState(cloneDeep([entities[2]]));

            const action = userActions.pageDelete({
                docAction: IdpDocumentAction.Delete,
                canUndoAction: true,
                pages,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-#-', {}, jasmine.stringMatching(/.+/));

            expect(effects.deletePageEffect$).toBeObservable(expected);
        });

        it('should delete single page', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0]];

            const affectedEntities = cloneDeep([entities[1]]);

            entities[1].pages[0].markAsDeleted = true;

            const updates: DocumentStateUpdate[] = [];
            updates.push({ operation: 'update', documentId: entities[1].id, update: entities[1] });

            testPageDeleteEffect(pages, updates, affectedEntities);
        });
    });

    describe('Page Create Copy', () => {
        it('should create copy of pages', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];

            const affectedEntities = cloneDeep([entities[1], entities[2]]);

            const updates: DocumentStateUpdate[] = [];
            const createdDoc1: DocumentEntity = {
                ...entities[1],
                id: 'mock_page_id_1',
                name: `${entities[1].name}_copy`,
                isGenerated: true,
                classificationClassCandidates: undefined,
                classificationSelectionReason: undefined,
                pages: [{ ...entities[1].pages[0], id: '1_0_mock_page_id_1_page1', name: 'Page 1_0' }],
            };
            const createdDoc2: DocumentEntity = {
                ...entities[2],
                id: 'mock_page_id_2',
                name: `${entities[2].name}_copy`,
                isGenerated: true,
                classificationClassCandidates: undefined,
                classificationSelectionReason: undefined,
                pages: [{ ...entities[2].pages[0], id: '2_0_mock_page_id_2_page1', name: 'Page 2_0' }],
            };
            updates.push(
                { operation: 'create', documentId: createdDoc1.id, update: createdDoc1, createAfterDocId: entities[1].id },
                { operation: 'create', documentId: createdDoc2.id, update: createdDoc2, createAfterDocId: entities[2].id }
            );

            spyOn(effects, 'uuid').and.returnValues('mock_page_id_1', 'mock_page_id_1_page1', 'mock_page_id_2', 'mock_page_id_2_page1');

            testPageCreateCopyEffect(pages, updates, affectedEntities, 10);
        });

        function testPageCreateCopyEffect(
            pages: IdpDocumentPage[],
            updates: DocumentStateUpdate[],
            affectedEntities: DocumentEntity[],
            activePageCount: number
        ) {
            setMockStoreState(affectedEntities);

            store.overrideSelector(selectActivePageCount, activePageCount);

            const action = userActions.pageCreateCopy({
                docAction: IdpDocumentAction.CreateCopy,
                canUndoAction: true,
                pages,
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: jasmine.stringMatching(/IDP_CLASS_VERIFICATION\.USER_FEEDBACK\.PAGE_CREATE_COPY_SUCCESS.*/),
                messageArgs: jasmine.any(Object),
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.createPageCopyEffect$).toBeObservable(expected);
        }

        it('should create copy of pages from the same document', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[1].pages[1]];

            const affectedEntities = cloneDeep([entities[1]]);

            const updates: DocumentStateUpdate[] = [];
            const createdDoc: DocumentEntity = {
                ...entities[1],
                id: 'mock_page_id_1',
                name: `${entities[1].name}_copy`,
                isGenerated: true,
                classificationClassCandidates: undefined,
                classificationSelectionReason: undefined,
                pages: [
                    { ...entities[1].pages[0], id: '1_0_mock_page_id_1_page1', name: 'Page 1_0' },
                    { ...entities[1].pages[1], id: '1_1_mock_uuid_3', name: 'Page 1_1' },
                ],
            };
            updates.push({ operation: 'create', documentId: createdDoc.id, update: createdDoc, createAfterDocId: entities[1].id });

            spyOn(effects, 'uuid').and.returnValues('mock_page_id_1', 'mock_page_id_1_page1', 'mock_uuid_3');

            testPageCreateCopyEffect(pages, updates, affectedEntities, 10);
        });

        it('should create copy of single page', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0]];

            const affectedEntities = cloneDeep([entities[1]]);

            const updates: DocumentStateUpdate[] = [];
            const createdDoc: DocumentEntity = {
                ...entities[1],
                id: 'mock_page_id_1',
                name: `${entities[1].name}_copy`,
                isGenerated: true,
                classificationClassCandidates: undefined,
                classificationSelectionReason: undefined,
                pages: [{ ...entities[1].pages[0], id: '1_0_mock_page_id_1_page1', name: 'Page 1_0' }],
            };
            updates.push({ operation: 'create', documentId: createdDoc.id, update: createdDoc, createAfterDocId: entities[1].id });

            spyOn(effects, 'uuid').and.returnValues('mock_page_id_1', 'mock_page_id_1_page1');

            testPageCreateCopyEffect(pages, updates, affectedEntities, 10);
        });

        it('should return document operation error when page count exceeds maximum', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0]];

            setMockStoreState(cloneDeep([entities[1]]));
            store.overrideSelector(selectActivePageCount, 1000);

            const action = userActions.pageCreateCopy({
                docAction: IdpDocumentAction.CreateCopy,
                canUndoAction: true,
                pages,
            });

            const outcome = systemActions.documentOperationError({
                docAction: action.docAction,
                error: 'Page Create Copy - Exceeds maximum page count',
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_COUNT_EXCEEDED',
                messageArgs: { maxPageCount: 1000 },
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.createPageCopyEffect$).toBeObservable(expected);
        });

        it('should throw an error when page does not exist in any of the affected documents on page create copy', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const badPage1 = cloneDeep(documents[2].pages[0]);
            badPage1.documentId = 'bad_document_id';
            const badPage2 = cloneDeep(documents[2].pages[0]);
            badPage2.id = 'bad_page_id';
            const pages = [documents[2].pages[0], badPage1, badPage2];

            setMockStoreState(cloneDeep([entities[2]]));
            store.overrideSelector(selectActivePageCount, 10);

            const action = userActions.pageCreateCopy({
                docAction: IdpDocumentAction.CreateCopy,
                canUndoAction: true,
                pages,
            });

            actions$ = hot('-a-', { a: action });
            const expected = cold('-#-', {}, jasmine.stringMatching(/.+/));

            expect(effects.createPageCopyEffect$).toBeObservable(expected);
        });

        it('should sort pages by sourcePageIndex before creating copies', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[1], documents[1].pages[0]];

            const affectedEntities = cloneDeep([entities[1]]);

            const updates: DocumentStateUpdate[] = [];
            const createdDoc: DocumentEntity = {
                ...entities[1],
                id: 'mock_page_id_1',
                name: `${entities[1].name}_copy`,
                isGenerated: true,
                classificationClassCandidates: undefined,
                classificationSelectionReason: undefined,
                pages: [
                    { ...entities[1].pages[0], id: '1_0_mock_page_id_1_page1', name: 'Page 1_0' },
                    { ...entities[1].pages[1], id: '1_1_mock_uuid_3', name: 'Page 1_1' },
                ],
            };
            updates.push({ operation: 'create', documentId: createdDoc.id, update: createdDoc, createAfterDocId: entities[1].id });

            spyOn(effects, 'uuid').and.returnValues('mock_page_id_1', 'mock_page_id_1_page1', 'mock_uuid_3');

            testPageCreateCopyEffect(pages, updates, affectedEntities, 10);
        });
    });

    describe('Document Resolve', () => {
        it('should resolve documents', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];

            const affectedEntities = cloneDeep([entities[1], entities[2]]);

            const updates: DocumentStateUpdate[] = [];
            entities[1].markAsResolved = true;
            entities[1].verificationStatus = IdpVerificationStatus.ManualValid;
            entities[1].rejectedReasonId = undefined;
            entities[2].markAsResolved = true;
            entities[2].verificationStatus = IdpVerificationStatus.ManualValid;
            entities[2].rejectedReasonId = undefined;
            updates.push(
                { operation: 'update', documentId: entities[1].id, update: entities[1] },
                { operation: 'update', documentId: entities[2].id, update: entities[2] }
            );

            setMockStoreState(affectedEntities);

            const action = userActions.documentResolve({
                docAction: IdpDocumentAction.Resolve,
                canUndoAction: true,
                pages,
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.RESOLVE_SUCCESS',
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.documentResolveEffect$).toBeObservable(expected);
        });

        it('should return document operation error on documents resolve if context document cannot be found', () => {
            const documents = mockIdpDocuments();
            const pages = [documents[2].pages[0], documents[3].pages[0]];

            setMockStoreState([]);

            const action = userActions.documentResolve({
                docAction: IdpDocumentAction.Resolve,
                canUndoAction: true,
                pages,
            });

            const outcome = systemActions.documentOperationError({
                docAction: action.docAction,
                error: jasmine.any(String),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.RESOLVE_ERROR',
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.documentResolveEffect$).toBeObservable(expected);
        });
    });

    describe('Document Reject', () => {
        it('should reject documents', () => {
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);
            const pages = [documents[1].pages[0], documents[2].pages[0]];

            const affectedEntities = cloneDeep([entities[1], entities[2]]);

            const updates: DocumentStateUpdate[] = [];
            entities[1].classificationConfidence = 1;
            entities[1].markAsResolved = false;
            entities[1].verificationStatus = IdpVerificationStatus.ManualValid;
            entities[1].rejectedReasonId = 'rr1';
            entities[1].rejectNote = 'Rejected!';
            entities[2].classificationConfidence = 1;
            entities[2].markAsResolved = false;
            entities[2].verificationStatus = IdpVerificationStatus.ManualValid;
            entities[2].rejectedReasonId = 'rr1';
            entities[2].rejectNote = 'Rejected!';
            updates.push(
                { operation: 'update', documentId: entities[1].id, update: entities[1] },
                { operation: 'update', documentId: entities[2].id, update: entities[2] }
            );

            setMockStoreState(affectedEntities);

            const action = userActions.documentReject({
                docAction: IdpDocumentAction.Reject,
                canUndoAction: true,
                pages,
                rejectReasonId: 'rr1',
                rejectNote: 'Rejected!',
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.REJECT_SUCCESS',
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.documentRejectEffect$).toBeObservable(expected);
        });

        it('should return document operation error on documents reject if context document cannot be found', () => {
            const documents = mockIdpDocuments();
            const pages = [documents[2].pages[0], documents[3].pages[0]];

            setMockStoreState([]);

            const action = userActions.documentReject({
                docAction: IdpDocumentAction.Reject,
                canUndoAction: true,
                pages,
                rejectReasonId: 'rr1',
            });

            const outcome = systemActions.documentOperationError({
                docAction: action.docAction,
                error: jasmine.any(String),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.REJECT_ERROR',
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.documentRejectEffect$).toBeObservable(expected);
        });

        describe('should set classification confidence based on reject reason id and class presence', () => {
            const testCases = [
                {
                    description: 'to 1 when rejecting unclassified document with reject reason id',
                    rejectReasonId: 'rr1',
                    rejectNote: 'Rejected!',
                    expectedConfidence: 1,
                },
                {
                    description: 'to 0 when removing reject flag from unclassified document',
                    rejectReasonId: undefined,
                    rejectNote: undefined,
                    expectedConfidence: 0,
                },
            ];

            for (const testCase of testCases) {
                it(testCase.description, () => {
                    const documents = mockIdpDocuments();
                    const entities = mockDocumentEntitiesByIdpDocuments(documents);
                    const pages = [documents[1].pages[0]];

                    const affectedEntities = cloneDeep([entities[1]]);
                    affectedEntities[0].class = undefined;

                    const updates: DocumentStateUpdate[] = [];
                    entities[1].class = undefined;
                    entities[1].classificationConfidence = testCase.expectedConfidence;
                    entities[1].markAsResolved = false;
                    entities[1].verificationStatus = IdpVerificationStatus.ManualValid;
                    entities[1].rejectedReasonId = testCase.rejectReasonId;
                    entities[1].rejectNote = testCase.rejectNote;
                    updates.push({ operation: 'update', documentId: entities[1].id, update: entities[1] });

                    setMockStoreState(affectedEntities);

                    const action = userActions.documentReject({
                        docAction: IdpDocumentAction.Reject,
                        canUndoAction: true,
                        pages,
                        rejectReasonId: testCase.rejectReasonId,
                        rejectNote: testCase.rejectNote,
                    });

                    const outcome = systemActions.documentOperationSuccess({
                        docAction: action.docAction,
                        canUndoAction: action.canUndoAction,
                        updates,
                        contextPageIds: pages.map((p) => p.id),
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.REJECT_SUCCESS',
                    });

                    actions$ = hot('       -a-', { a: action });
                    const expected = cold('-b-', { b: outcome });

                    expect(effects.documentRejectEffect$).toBeObservable(expected);
                });
            }
        });
    });

    describe('Document Class Change', () => {
        it('should change class for multiple documents', () => {
            const classes = mockIdpConfigClasses();
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);

            setMockStoreState(cloneDeep(entities), classes);

            const pages = [documents[0].pages[0], documents[1].pages[0]];
            const targetClass = classes[3];

            const updates: DocumentStateUpdate[] = [];
            entities[0].class = targetClass;
            entities[0].classificationConfidence = 1;
            entities[0].verificationStatus = IdpVerificationStatus.ManualValid;
            entities[0].rejectedReasonId = undefined;
            entities[0].markAsResolved = false;
            entities[1].class = targetClass;
            entities[1].classificationConfidence = 1;
            entities[1].verificationStatus = IdpVerificationStatus.ManualValid;
            entities[1].rejectedReasonId = undefined;
            entities[1].markAsResolved = false;
            updates.push(
                { operation: 'update', documentId: entities[0].id, update: entities[0] },
                { operation: 'update', documentId: entities[1].id, update: entities[1] }
            );

            testClassChangeEffect(pages, targetClass, updates);
        });

        function testClassChangeEffect(pages: IdpDocumentPage[], targetClass: IdpConfigClass, updates: DocumentStateUpdate[]) {
            const action = userActions.documentClassChange({
                docAction: IdpDocumentAction.ChangeClass,
                canUndoAction: true,
                pages,
                classId: targetClass.id,
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: jasmine.stringMatching(/IDP_CLASS_VERIFICATION\.USER_FEEDBACK\.CHANGE_CLASS_SUCCESS.*/),
                messageArgs: jasmine.any(Object),
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.classChangeEffect$).toBeObservable(expected);
        }

        it('should change class for single document', () => {
            const classes = mockIdpConfigClasses();
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);

            setMockStoreState(cloneDeep(entities), classes);

            const pages = [documents[0].pages[0]];
            const targetClass = classes[3];

            const updates: DocumentStateUpdate[] = [];
            entities[0].class = targetClass;
            entities[0].classificationConfidence = 1;
            entities[0].verificationStatus = IdpVerificationStatus.ManualValid;
            entities[0].rejectedReasonId = undefined;
            entities[0].markAsResolved = false;
            updates.push({ operation: 'update', documentId: entities[0].id, update: entities[0] });

            testClassChangeEffect(pages, targetClass, updates);
        });

        it('should return document operation error on class change if target class cannot be found', () => {
            const classes = mockIdpConfigClasses();
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);

            setMockStoreState(cloneDeep(entities), []);

            const pages = [documents[0].pages[0]];
            const targetClass = classes[3];

            const action = userActions.documentClassChange({
                docAction: IdpDocumentAction.ChangeClass,
                canUndoAction: true,
                pages,
                classId: targetClass.id,
            });

            const outcome = systemActions.documentOperationError({
                docAction: action.docAction,
                error: jasmine.any(String),
                notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.CHANGE_CLASS_ERROR',
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.classChangeEffect$).toBeObservable(expected);
        });

        it('should set verification status to invalid on change class when changing class to unclassified', () => {
            const classes = mockIdpConfigClasses();
            const documents = mockIdpDocuments();
            const entities = mockDocumentEntitiesByIdpDocuments(documents);

            setMockStoreState(cloneDeep(entities), classes);

            const pages = [documents[0].pages[0]];
            const targetClass = classes[1];

            const updates: DocumentStateUpdate[] = [];
            entities[0].class = targetClass;
            entities[0].classificationConfidence = 0;
            entities[0].verificationStatus = IdpVerificationStatus.ManualInvalid;
            entities[0].rejectedReasonId = undefined;
            entities[0].markAsResolved = false;
            updates.push({ operation: 'update', documentId: entities[0].id, update: entities[0] });

            testClassChangeEffect(pages, targetClass, updates);
        });

        it('should preserve classificationClassCandidates and classificationSelectionReason on class change', () => {
            const classes = mockIdpConfigClasses();
            const candidates = [
                { classId: classes[2].id, className: classes[2].name, confidence: 0.95, reason: 'Looks like this class' },
                { classId: classes[3].id, className: classes[3].name, confidence: 0.8, reason: 'Could also be this' },
            ];
            const documents = mockIdpDocuments();
            documents[0].classificationClassCandidates = candidates;
            documents[0].classificationSelectionReason = 'AUTOWIN';
            const entities = mockDocumentEntitiesByIdpDocuments(documents);

            setMockStoreState(cloneDeep(entities), classes);

            const pages = [documents[0].pages[0]];
            const targetClass = classes[3];

            const updates: DocumentStateUpdate[] = [];
            entities[0].class = targetClass;
            entities[0].classificationConfidence = 1;
            entities[0].verificationStatus = IdpVerificationStatus.ManualValid;
            entities[0].rejectedReasonId = undefined;
            entities[0].markAsResolved = false;
            updates.push({ operation: 'update', documentId: entities[0].id, update: entities[0] });

            const action = userActions.documentClassChange({
                docAction: IdpDocumentAction.ChangeClass,
                canUndoAction: true,
                pages,
                classId: targetClass.id,
            });

            const outcome = systemActions.documentOperationSuccess({
                docAction: action.docAction,
                canUndoAction: action.canUndoAction,
                updates,
                contextPageIds: pages.map((p) => p.id),
                notificationMessage: jasmine.stringMatching(/IDP_CLASS_VERIFICATION\.USER_FEEDBACK\.CHANGE_CLASS_SUCCESS.*/),
                messageArgs: jasmine.any(Object),
            } as any);

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.classChangeEffect$).toBeObservable(expected);

            const emittedUpdate = (outcome as any).updates[0].update;
            expect(emittedUpdate.classificationClassCandidates).toEqual(candidates);
            expect(emittedUpdate.classificationSelectionReason).toBe('AUTOWIN');
        });
    });

    it('should show notification on document operation success', () => {
        const action = systemActions.documentOperationSuccess({
            notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_MERGE_SUCCESS',
            messageArgs: { arg: 'Page 0_0' },
        } as any);

        const outcome = systemActions.notificationShow({
            severity: 'success',
            message: action.notificationMessage,
            messageArgs: action.messageArgs,
        });

        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });

        expect(effects.documentOpSuccessEffect$).toBeObservable(expected);
    });

    it('should show notification on document operation error', () => {
        const action = systemActions.documentOperationError({
            notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_MERGE_ERROR',
            error: { name: 'Error 1', message: 'Error happened!', stack: 'Right here at line 1' },
        } as any);

        const outcome = systemActions.notificationShow({
            severity: 'error',
            message: action.notificationMessage,
            messageArgs: { error: action.error },
        });

        const spyConsoleError = spyOn(console, 'error');

        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });

        expect(effects.documentOpErrorEffect$).toBeObservable(expected);
        expect(spyConsoleError).toHaveBeenCalled();
    });

    describe('Task Data Output', () => {
        it('should update task data', () => {
            const classes = mockIdpConfigClasses();
            const initialDocuments = mockDocumentEntities();

            const initialDocumentsTaskData: IdpTaskData = mapTaskData(initialDocuments);
            initialDocumentsTaskData.batchState.documents[0].classificationReviewStatus = 'ReviewRequired';

            const updatedDocuments = cloneDeep(initialDocuments);

            updatedDocuments[0].class = classes[1];

            updatedDocuments[1].markAsDeleted = true;

            updatedDocuments[2].pages[0].rotation = 90;
            updatedDocuments[2].pages[1].markAsDeleted = true;
            updatedDocuments[2].pages[2].markAsDeleted = true;
            updatedDocuments[2].verificationStatus = IdpVerificationStatus.ManualValid;

            updatedDocuments[3].rejectedReasonId = 'Invalid';

            store.overrideSelector(selectDocumentsRawState, updatedDocuments);
            store.overrideSelector(selectTaskInputData, initialDocumentsTaskData);

            const updatedTaskData: IdpTaskData = mapTaskData(updatedDocuments);
            updatedTaskData.batchState.deletedPages = [...updatedDocuments[1].pages, updatedDocuments[2].pages[1], updatedDocuments[2].pages[2]].map(
                (page) => ({
                    contentFileReferenceIndex: page.contentFileReferenceIndex,
                    sourcePageIndex: page.sourcePageIndex,
                    rotation: 0,
                    width: page.width,
                    height: page.height,
                })
            );

            updatedTaskData.batchState.hasRejectedDocuments = true;
            updatedTaskData.batchState.separationStatus = 'ReviewRequired';
            updatedTaskData.batchState.classificationStatus = 'ReviewRequired';

            updatedTaskData.batchState.documents[0].classificationReviewStatus = 'ReviewRequired';
            updatedTaskData.batchState.documents[0].reprocess = false;
            const bsDocument1 = updatedTaskData.batchState.documents[1];
            bsDocument1.pages = [bsDocument1.pages[0]];
            bsDocument1.reprocess = true;
            bsDocument1.classificationReviewStatus = 'ReviewNotRequired';
            updatedTaskData.batchState.documents[2].reprocess = true;

            const outcome = systemActions.updateDocumentsRotation({
                taskAction: 'Save',
                taskData: updatedTaskData,
                openNextTask: undefined,
            });

            actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
            const expected = cold('-b-', { b: outcome });

            expect(effects.taskDataEffect$).toBeObservable(expected);
        });

        function mapTaskDataDocument(document: DocumentEntity): [ApiDocument, IdpDocumentClassDefinition | undefined, ContentFileReference[]] {
            const { class: _class, verificationStatus, rejectedReasonId, isGenerated, markAsDeleted, ...rest } = document;
            const tdDocument = {
                ...rest,
                classId: document.class?.id,
                className: document.class?.name,
                rejectReasonId: document.rejectedReasonId,
                rejectNote: document.rejectNote,
                markAsRejected: !!document.rejectedReasonId,
                classificationClassCandidates: document.classificationClassCandidates,
                classificationSelectionReason: document.classificationSelectionReason,
                pages: document.pages.map((page) => ({
                    contentFileReferenceIndex: page.contentFileReferenceIndex,
                    sourcePageIndex: page.sourcePageIndex,
                    rotation: ((page.rotation ?? 0) + (page.viewerRotation ?? 0)) % 360,
                    width: page.width,
                    height: page.height,
                })),
                classificationReviewStatus: undefined,
            };

            const tdDocumentClassDefinition = document.class
                ? {
                      id: document.class.id,
                      name: document.class.name,
                      description: document.class.name,
                  }
                : undefined;

            const tdContentFileReferences = document.pages.reduce((acc, page) => {
                acc[page.contentFileReferenceIndex] = { sys_id: page.fileReference };
                return acc;
            }, [] as ContentFileReference[]);

            return [tdDocument, tdDocumentClassDefinition, tdContentFileReferences];
        }

        it('should update task data as classified', () => {
            const taskData: IdpTaskData = {
                batchState: {
                    documents: [
                        {
                            id: 'd_cf3',
                            name: 'Document 3',
                            classId: 'payslips',
                            classificationConfidence: 99,
                            pages: [
                                { contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0, width: 100, height: 100 },
                                { contentFileReferenceIndex: 0, sourcePageIndex: 1, rotation: 0, width: 100, height: 100 },
                            ],
                        },
                    ],
                    contentFileReferences: [{ sys_id: 'cf1' }, { sys_id: 'cf2' }],
                },
                rejectReasons: [],
                configuration: {
                    classificationConfidenceThreshold: 0.9,
                    documentClassDefinitions: [
                        { id: 'payslips', name: 'Payslips', description: "Yup! It's Payslips." },
                        { id: 'contracts', name: 'Contracts', description: 'Contracts.' },
                    ],
                },
            };

            const document = mockDocumentEntities()[2];
            document.verificationStatus = IdpVerificationStatus.ManualValid;

            const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });

            store.overrideSelector(selectDocumentsRawState, [document]);
            store.overrideSelector(selectTaskInputData, taskData);

            const outcome = jasmine.objectContaining({
                taskData: jasmine.objectContaining({
                    batchState: jasmine.objectContaining({
                        separationStatus: 'Separated',
                        classificationStatus: 'Classified',
                    }),
                }),
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.taskDataEffect$).toBeObservable(expected);
        });

        it('should return task data update error if task data cannot be selected', () => {
            const entities = mockDocumentEntities();

            const action = systemActions.taskPrepareUpdate({ taskAction: 'Save' });

            store.overrideSelector(selectDocumentsRawState, [entities[1]]);

            store.overrideSelector(selectTaskInputData, undefined);

            const outcome = systemActions.taskPrepareUpdateError({
                taskAction: 'Save',
                error: 'Task data not found',
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.taskDataEffect$).toBeObservable(expected);
        });

        it('should update task data as classification awaiting', () => {
            const document = mockDocumentEntities()[2];
            document.verificationStatus = IdpVerificationStatus.ManualValid;

            const action = systemActions.taskPrepareUpdate({ taskAction: 'Save' });

            store.overrideSelector(selectDocumentsRawState, [document]);
            store.overrideSelector(selectTaskInputData, mapTaskData([document]));

            const outcome = jasmine.objectContaining({
                taskData: jasmine.objectContaining({
                    batchState: jasmine.objectContaining({
                        classificationStatus: 'Awaiting',
                    }),
                }),
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.taskDataEffect$).toBeObservable(expected);
        });

        describe('should handle task data extraction status updates', () => {
            const classes = mockIdpConfigClasses();
            const shouldSetCases = [
                { initialClass: classes[2], newClass: classes[3] },
                { initialClass: classes[2], newClass: classes[1] },
            ];

            for (const { initialClass, newClass } of shouldSetCases) {
                it(`should set awaiting when initial class is ${getClassName(initialClass)} and new class is ${getClassName(newClass)}`, () => {
                    testTaskDataExtractionStatus('ReviewRequired', 'Awaiting', initialClass, newClass);
                });
            }

            const shouldNotSetCases = [
                { initialClass: undefined, newClass: classes[1] },
                { initialClass: classes[1], newClass: undefined },
            ];

            for (const { initialClass, newClass } of shouldNotSetCases) {
                it(`should not set status when initial class is ${getClassName(initialClass)} and new class is ${getClassName(newClass)}`, () => {
                    testTaskDataExtractionStatus('ReviewRequired', 'ReviewRequired', initialClass, newClass);
                });
            }

            function testTaskDataExtractionStatus(
                initialStatus: 'Awaiting' | 'Extracted' | 'ReviewRequired' | undefined,
                newStatus: string,
                initialClass: IdpConfigClass | undefined,
                newClass: IdpConfigClass | undefined
            ) {
                const document = mockDocumentEntities()[2];
                document.verificationStatus = IdpVerificationStatus.ManualValid;
                document.class = initialClass;

                const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });

                store.overrideSelector(selectDocumentsRawState, [{ ...document, class: newClass }]);
                store.overrideSelector(selectTaskInputData, mapTaskData([document], { batchState: { extractionStatus: initialStatus } }));

                const outcome = jasmine.objectContaining({
                    taskData: jasmine.objectContaining({
                        batchState: jasmine.objectContaining({
                            extractionStatus: newStatus,
                        }),
                    }),
                });

                actions$ = hot('       -a-', { a: action });
                const expected = cold('-b-', { b: outcome });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            }

            function getClassName(documentClass: IdpConfigClass | undefined): string {
                return documentClass ? documentClass.name : 'undefined';
            }
        });

        function mapTaskData(documents: DocumentEntity[], options?: { batchState?: Partial<ClassVerificationBatchState> }): IdpTaskData {
            documents = documents.filter((document) => !document.markAsDeleted);

            const { batchState } = options || {};

            const tdDocuments = [];
            const tdContentFileReferences = [];
            const tdDocumentClassDefinitions = [];
            for (const document of documents) {
                const [tdDocument, tdDocumentClassDefinition, tdDocumentContentFileReferences] = mapTaskDataDocument(document);
                tdDocuments.push(tdDocument);
                if (
                    tdDocumentClassDefinition &&
                    tdDocumentClassDefinition.id !== UNCLASSIFIED_CLASS_ID &&
                    tdDocumentClassDefinitions.findIndex((c) => c.id === tdDocumentClassDefinition.id) === -1
                ) {
                    tdDocumentClassDefinitions.push(tdDocumentClassDefinition);
                }
                for (const [index, contentFileReference] of tdDocumentContentFileReferences.entries()) {
                    tdContentFileReferences[index] = contentFileReference;
                }
            }

            return {
                batchState: {
                    ...batchState,
                    documents: [...tdDocuments, ...(batchState?.documents ?? [])],
                    contentFileReferences: [...tdContentFileReferences, ...(batchState?.contentFileReferences ?? [])],
                },
                rejectReasons: [],
                configuration: {
                    classificationConfidenceThreshold: 0.9,
                    documentClassDefinitions: tdDocumentClassDefinitions,
                },
            };
        }

        it('should retain task data external document properties', () => {
            const document = mockDocumentEntities()[2];
            document.verificationStatus = IdpVerificationStatus.ManualValid;

            const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });

            store.overrideSelector(selectDocumentsRawState, [document]);

            const expectedTaskDataDocumentFieldsProperty = [
                { name: 'field1', value: 'value1', type: 'text' },
                { name: 'field2', value: 'value2', type: 'number' },
            ];
            const mappedTaskData = mapTaskData([document]);
            (mappedTaskData.batchState.documents[0] as any).fields = expectedTaskDataDocumentFieldsProperty;
            store.overrideSelector(selectTaskInputData, mappedTaskData);

            const outcome = jasmine.objectContaining({
                taskData: jasmine.objectContaining({
                    batchState: jasmine.objectContaining({
                        documents: jasmine.arrayContaining([
                            jasmine.objectContaining({
                                fields: expectedTaskDataDocumentFieldsProperty,
                            }),
                        ]),
                    }),
                }),
            });

            actions$ = hot('       -a-', { a: action });
            const expected = cold('-b-', { b: outcome });

            expect(effects.taskDataEffect$).toBeObservable(expected);
        });

        it('should not retain task data external document properties when document changed', () => {
            const classes = mockIdpConfigClasses();
            const document = mockDocumentEntities()[2];
            document.verificationStatus = IdpVerificationStatus.ManualValid;
            document.class = classes[2];

            const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });

            store.overrideSelector(selectDocumentsRawState, [{ ...document, class: classes[3] }]);

            const mappedTaskData = mapTaskData([document]);
            (mappedTaskData.batchState.documents[0] as any).fields = [
                { name: 'field1', value: 'value1', type: 'text' },
                { name: 'field2', value: 'value2', type: 'number' },
            ];
            store.overrideSelector(selectTaskInputData, mappedTaskData);

            actions$ = hot('-a-', { a: action });

            effects.taskDataEffect$.subscribe((result) => {
                switch (result.type) {
                    case systemActions.updateDocumentsRotation.type: {
                        expect((result.taskData.batchState.documents[0] as any).fields).toBeUndefined();
                        break;
                    }
                    default: {
                        fail(`Expected success action, but got: ${result.type}`);
                        break;
                    }
                }
            });

            getTestScheduler().flush();
        });

        it('should not retain task data document transient properties on task complete', () => {
            const document = mockDocumentEntities()[2];

            const action = systemActions.taskPrepareUpdate({ taskAction: 'Complete' });

            store.overrideSelector(selectDocumentsRawState, [document]);

            const mappedTaskData = mapTaskData([document]);
            mappedTaskData.batchState.documents[0].reprocess = true;
            store.overrideSelector(selectTaskInputData, mappedTaskData);

            actions$ = hot('-a-', { a: action });

            effects.taskDataEffect$.subscribe((result) => {
                switch (result.type) {
                    case systemActions.updateDocumentsRotation.type: {
                        expect(result.taskData.batchState.documents[0].reprocess).toBeUndefined();
                        break;
                    }
                    default: {
                        fail(`Expected success action, but got: ${result.type}`);
                        break;
                    }
                }
            });

            getTestScheduler().flush();
        });

        describe('deleted pages handling', () => {
            it('should include deleted page when removed from a document and its copy', () => {
                const page = createMockDocumentEntityPage(0, 0, { markAsDeleted: true });
                const documents = [
                    createMockDocumentEntity('document-main', { withPages: [page] }),
                    createMockDocumentEntity('document-copy', { isGenerated: true, withPages: [page] }),
                ];
                const taskData = mapTaskData(documents);

                store.overrideSelector(selectDocumentsRawState, cloneDeep(documents));
                store.overrideSelector(selectTaskInputData, taskData);

                const expectedDeletedPage = { contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0 };

                const outcome = jasmine.objectContaining({
                    taskData: jasmine.objectContaining({
                        batchState: jasmine.objectContaining({
                            deletedPages: [jasmine.objectContaining(expectedDeletedPage)],
                        }),
                    }),
                });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', { b: outcome });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });

            it('should concatenate existing batch deleted pages with new deleted pages', () => {
                const page = createMockDocumentEntityPage(0, 0, { markAsDeleted: true });
                const documents = [
                    createMockDocumentEntity('document-main', { withPages: [page] }),
                    createMockDocumentEntity('document-copy', { isGenerated: true, withPages: [page] }),
                ];

                const existingDeletedPage = { contentFileReferenceIndex: 1, sourcePageIndex: 5, rotation: 180, width: 100, height: 200 };
                const taskData = mapTaskData(documents, {
                    batchState: {
                        deletedPages: [existingDeletedPage],
                        contentFileReferences: [{ sys_id: 'cf-existing' }],
                    },
                });

                store.overrideSelector(selectDocumentsRawState, cloneDeep(documents));
                store.overrideSelector(selectTaskInputData, taskData);

                const newDeletedPage = { contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0 };

                const outcome = jasmine.objectContaining({
                    taskData: jasmine.objectContaining({
                        batchState: jasmine.objectContaining({
                            deletedPages: [jasmine.objectContaining(existingDeletedPage), jasmine.objectContaining(newDeletedPage)],
                        }),
                    }),
                });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', { b: outcome });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });

            it('should not include deleted pages when an active copy still exists', () => {
                const page = createMockDocumentEntityPage(0, 0);
                const documents = [
                    createMockDocumentEntity('document-main', { withPages: [page] }),
                    createMockDocumentEntity('document-copy', { isGenerated: true, withPages: [page] }),
                ];
                documents[0].pages[0].markAsDeleted = true;
                const taskData = mapTaskData(documents);

                store.overrideSelector(selectDocumentsRawState, cloneDeep(documents));
                store.overrideSelector(selectTaskInputData, taskData);

                const outcome = jasmine.objectContaining({
                    taskData: jasmine.objectContaining({
                        batchState: jasmine.objectContaining({
                            deletedPages: [],
                        }),
                    }),
                });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', { b: outcome });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });

            it('should include deleted pages from fully removed documents', () => {
                const documents = [
                    createMockDocumentEntity('document-1', { withGeneratedPages: { count: 1 } }),
                    createMockDocumentEntity('document-2', { markAsDeleted: true, withGeneratedPages: { count: 2, contentFileReferenceIndex: 1 } }),
                ];
                const taskData = mapTaskData(documents);

                store.overrideSelector(selectDocumentsRawState, cloneDeep(documents));
                store.overrideSelector(selectTaskInputData, taskData);

                const expectedDeletedPages = [
                    jasmine.objectContaining({ contentFileReferenceIndex: 1, sourcePageIndex: 0 }),
                    jasmine.objectContaining({ contentFileReferenceIndex: 1, sourcePageIndex: 1 }),
                ];

                const outcome = jasmine.objectContaining({
                    taskData: jasmine.objectContaining({
                        batchState: jasmine.objectContaining({
                            deletedPages: expectedDeletedPages,
                        }),
                    }),
                });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', { b: outcome });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });
        });

        describe('classification reasoning in task data', () => {
            const mockCandidates = [
                { classId: 'c1', className: 'Class 1', confidence: 0.95, reason: 'Reason 1' },
                { classId: 'c2', className: 'Class 2', confidence: 0.8, reason: 'Reason 2' },
            ];

            function setupReasoningTest(options: {
                entityClassId?: string;
                batchClassId?: string;
                candidates?: ClassificationCandidate[];
                selectionReason?: ClassSelectionReasonCode;
                pageRotationChanged?: boolean;
                isNewDocument?: boolean;
            }) {
                const entityClass = options.entityClassId
                    ? { id: options.entityClassId, name: `Class ${options.entityClassId}`, isSpecialClass: false }
                    : undefined;
                const document = createMockDocumentEntity('doc-reasoning', {
                    class: entityClass,
                    classificationConfidence: 0.95,
                    classificationClassCandidates: options.candidates ?? mockCandidates,
                    classificationSelectionReason: options.selectionReason ?? 'AUTOWIN',
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    withGeneratedPages: { count: 1 },
                });

                if (options.pageRotationChanged) {
                    document.pages[0].rotation = 90;
                }

                store.overrideSelector(selectDocumentsRawState, [document]);

                const batchDoc: any = {
                    id: 'doc-reasoning',
                    name: 'Document doc-reasoning',
                    classId: 'batchClassId' in options ? options.batchClassId : options.entityClassId,
                    className: entityClass?.name,
                    classificationConfidence: 0.95,
                    classificationClassCandidates: options.candidates ?? mockCandidates,
                    classificationSelectionReason: options.selectionReason ?? 'AUTOWIN',
                    pages: [{ contentFileReferenceIndex: 0, sourcePageIndex: 0, rotation: 0, width: 800, height: 1000 }],
                };

                const taskInputData: IdpTaskData = {
                    batchState: {
                        documents: options.isNewDocument ? [] : [batchDoc],
                        contentFileReferences: [{ sys_id: 'file-0' }],
                    },
                    rejectReasons: [],
                    configuration: {
                        documentClassDefinitions: [
                            { id: 'c1', name: 'Class c1' },
                            { id: 'c2', name: 'Class c2' },
                        ],
                    },
                } as unknown as IdpTaskData;

                store.overrideSelector(selectTaskInputData, taskInputData);
                return document;
            }

            it('should preserve reasoning when class is unchanged and reprocess is false', () => {
                setupReasoningTest({ entityClassId: 'c1', batchClassId: 'c1' });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', {
                    b: jasmine.objectContaining({
                        taskData: jasmine.objectContaining({
                            batchState: jasmine.objectContaining({
                                documents: [
                                    jasmine.objectContaining({
                                        classificationClassCandidates: mockCandidates,
                                        classificationSelectionReason: 'AUTOWIN',
                                    }),
                                ],
                            }),
                        }),
                    }),
                });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });

            it('should preserve reasoning when reprocess is true but class is unchanged (page rotation)', () => {
                setupReasoningTest({ entityClassId: 'c1', batchClassId: 'c1', pageRotationChanged: true });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', {
                    b: jasmine.objectContaining({
                        taskData: jasmine.objectContaining({
                            batchState: jasmine.objectContaining({
                                documents: [
                                    jasmine.objectContaining({
                                        classificationClassCandidates: mockCandidates,
                                        classificationSelectionReason: 'AUTOWIN',
                                    }),
                                ],
                            }),
                        }),
                    }),
                });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });

            it('should preserve reasoning when class is manually changed', () => {
                setupReasoningTest({ entityClassId: 'c2', batchClassId: 'c1' });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', {
                    b: jasmine.objectContaining({
                        taskData: jasmine.objectContaining({
                            batchState: jasmine.objectContaining({
                                documents: [
                                    jasmine.objectContaining({
                                        classificationClassCandidates: mockCandidates,
                                        classificationSelectionReason: 'AUTOWIN',
                                    }),
                                ],
                            }),
                        }),
                    }),
                });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });

            it('should preserve reasoning for new documents with no batch match', () => {
                setupReasoningTest({ entityClassId: 'c1', isNewDocument: true });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', {
                    b: jasmine.objectContaining({
                        taskData: jasmine.objectContaining({
                            batchState: jasmine.objectContaining({
                                documents: [
                                    jasmine.objectContaining({
                                        classificationClassCandidates: mockCandidates,
                                        classificationSelectionReason: 'AUTOWIN',
                                    }),
                                ],
                            }),
                        }),
                    }),
                });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });

            it('should preserve reasoning when class changes from unclassified to classified', () => {
                setupReasoningTest({ entityClassId: 'c1', batchClassId: undefined });

                actions$ = hot('-a-', { a: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
                const expected = cold('-b-', {
                    b: jasmine.objectContaining({
                        taskData: jasmine.objectContaining({
                            batchState: jasmine.objectContaining({
                                documents: [
                                    jasmine.objectContaining({
                                        classificationClassCandidates: mockCandidates,
                                        classificationSelectionReason: 'AUTOWIN',
                                    }),
                                ],
                            }),
                        }),
                    }),
                });

                expect(effects.taskDataEffect$).toBeObservable(expected);
            });
        });

        describe('updateRotationEffect$', () => {
            it('should call updateRotationData$ and dispatch taskPrepareUpdateSuccess on Save/Complete when viewerRotation changed', () => {
                // taskData here has already been processed by taskDataEffect$, so rotations are combined (rotation - viewerRotation)
                const taskData: any = {
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

                const allDocuments: IdpDocument[] = [
                    {
                        id: 'd_cf1',
                        name: 'Document 1',
                        class: undefined,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        classificationConfidence: 0,
                        pages: [
                            {
                                id: 'p1',
                                name: 'Page 1 of Document 1',
                                documentId: 'd_cf1',
                                sourcePageIndex: 0,
                                rotation: 90,
                                viewerRotation: 90,
                                fileReference: 'cf1',
                                width: 100,
                                height: 200,
                            },
                            {
                                id: 'p2',
                                name: 'Page 2 of Document 1',
                                documentId: 'd_cf1',
                                sourcePageIndex: 1,
                                rotation: 180,
                                viewerRotation: 0,
                                fileReference: 'cf1',
                                width: 100,
                                height: 200,
                            },
                        ],
                    },
                ];
                const action = systemActions.updateDocumentsRotation({
                    taskAction: 'Save',
                    taskData,
                    openNextTask: false,
                });
                const correlationId = 'corr-id-1';
                const pagesWithIndex = [
                    { contentFileReferenceIndex: 0, pageIndex: 0, rotation: 0 },
                    { contentFileReferenceIndex: 0, pageIndex: 1, rotation: 180 },
                ];
                idpBackendSpy.updateRotationData$.and.returnValue(cold('(a|)', { a: undefined }));

                store.overrideSelector(selectCorrelationId, correlationId);
                store.overrideSelector(selectAllDocuments, allDocuments);

                actions$ = hot('-a-', { a: action });
                const outcome = systemActions.taskPrepareUpdateSuccess({
                    taskAction: 'Save',
                    taskData,
                    openNextTask: false,
                });

                const expected = cold('-b-', { b: outcome });

                expect(effects.updateRotationEffect$).toBeObservable(expected);
                expect(idpBackendSpy.updateRotationData$).toHaveBeenCalledWith(correlationId, ['cf1', 'cf2'], pagesWithIndex);
                expect(idpSharedImageServiceSpy.cleanup).toHaveBeenCalled();
            });

            it('should not call updateRotationData$ if fileReferences is empty', () => {
                const taskData: any = {
                    batchState: {
                        contentFileReferences: [],
                        documents: [],
                    },
                };
                const action = systemActions.updateDocumentsRotation({
                    taskAction: 'Save',
                    taskData,
                    openNextTask: false,
                });
                store.overrideSelector(selectCorrelationId, 'corr-id-2');
                store.overrideSelector(selectAllDocuments, []);

                actions$ = hot('-a-', { a: action });
                const outcome = systemActions.taskPrepareUpdateSuccess({
                    taskAction: 'Save',
                    taskData,
                    openNextTask: false,
                });

                const expected = cold('-b-', { b: outcome });

                expect(effects.updateRotationEffect$).toBeObservable(expected);
            });

            it('should not call updateRotationData$ if viewerRotation is 0 (no user rotation)', () => {
                idpBackendSpy.updateRotationData$.calls.reset();

                const taskData: any = {
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

                const allDocuments: IdpDocument[] = [
                    {
                        id: 'd_cf1',
                        name: 'Document 1',
                        class: undefined,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        classificationConfidence: 0,
                        pages: [
                            {
                                id: 'p1',
                                name: 'Page 1 of Document 1',
                                documentId: 'd_cf1',
                                sourcePageIndex: 0,
                                rotation: 90,
                                viewerRotation: 0,
                                fileReference: 'cf1',
                                width: 100,
                                height: 200,
                            },
                        ],
                    },
                ];
                const action = systemActions.updateDocumentsRotation({
                    taskAction: 'Save',
                    taskData,
                    openNextTask: false,
                });

                store.overrideSelector(selectCorrelationId, 'corr-id-3');
                store.overrideSelector(selectAllDocuments, allDocuments);

                actions$ = hot('-a-', { a: action });
                const outcome = systemActions.taskPrepareUpdateSuccess({
                    taskAction: 'Save',
                    taskData,
                    openNextTask: false,
                });

                const expected = cold('-b-', { b: outcome });

                expect(effects.updateRotationEffect$).toBeObservable(expected);
                expect(idpBackendSpy.updateRotationData$).not.toHaveBeenCalled();
            });

            it('should not call updateRotationData$ if taskAction is not Save/Complete', () => {
                const taskData: any = {
                    batchState: {
                        contentFileReferences: [{ sys_id: 'cf1' }],
                        documents: [],
                    },
                };
                const action = systemActions.updateDocumentsRotation({
                    taskAction: 'Claim',
                    taskData,
                    openNextTask: false,
                });
                store.overrideSelector(selectCorrelationId, 'corr-id-3');
                store.overrideSelector(selectAllDocuments, []);

                actions$ = hot('-a-', { a: action });
                const outcome = systemActions.taskPrepareUpdateSuccess({
                    taskAction: 'Claim',
                    taskData,
                    openNextTask: false,
                });
                const expected = cold('-b-', { b: outcome });

                expect(effects.updateRotationEffect$).toBeObservable(expected);
            });

            it('should dispatch taskPrepareUpdateError on updateRotationData$ error when viewerRotation changed', () => {
                const taskData: any = {
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
                const allDocuments: IdpDocument[] = [
                    {
                        id: 'd_cf1',
                        name: 'Document 1',
                        class: undefined,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        classificationConfidence: 0,
                        pages: [
                            {
                                id: 'p1',
                                name: 'Page 1 of Document 1',
                                documentId: 'd_cf1',
                                sourcePageIndex: 0,
                                rotation: 90,
                                viewerRotation: 90,
                                fileReference: 'cf1',
                                width: 100,
                                height: 200,
                            },
                        ],
                    },
                ];
                const action = systemActions.updateDocumentsRotation({
                    taskAction: 'Save',
                    taskData,
                    openNextTask: false,
                });
                const correlationId = 'corr-id-4';
                idpBackendSpy.updateRotationData$.and.returnValue(cold('#', {}, new Error('fail')));

                store.overrideSelector(selectCorrelationId, correlationId);
                store.overrideSelector(selectAllDocuments, allDocuments);

                actions$ = hot('-a-', { a: action });
                const expected = cold('-b-', {
                    b: systemActions.taskPrepareUpdateError({
                        taskAction: 'Save',
                        error: 'Failed to update rotation data',
                    }),
                });

                expect(effects.updateRotationEffect$).toBeObservable(expected);
                expect(idpSharedImageServiceSpy.cleanup).toHaveBeenCalled();
            });
        });

        describe('pageCutNotificationEffect$', () => {
            it('should emit singular notification when a single page is cut', () => {
                store.overrideSelector(selectAllCutPages, [{ id: 'p1', name: 'Page 1' } as IdpDocumentPage]);

                const action = userActions.pageCut({ pageIds: ['p1'] });
                const outcome = systemActions.notificationShow({
                    severity: 'info',
                    message: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_CUT_SINGULAR',
                    messageArgs: { arg: 'Page 1' },
                });

                actions$ = hot('-a-', { a: action });
                const expected = cold('-b-', { b: outcome });

                expect(effects.pageCutNotificationEffect$).toBeObservable(expected);
            });

            it('should emit plural notification when multiple pages are cut', () => {
                store.overrideSelector(selectAllCutPages, [
                    { id: 'p1', name: 'Page 1' } as IdpDocumentPage,
                    { id: 'p2', name: 'Page 2' } as IdpDocumentPage,
                ]);

                const action = userActions.pageCut({ pageIds: ['p1', 'p2'] });
                const outcome = systemActions.notificationShow({
                    severity: 'info',
                    message: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_CUT_PLURAL',
                    messageArgs: { arg: 2 },
                });

                actions$ = hot('-a-', { a: action });
                const expected = cold('-b-', { b: outcome });

                expect(effects.pageCutNotificationEffect$).toBeObservable(expected);
            });
        });
    });
});

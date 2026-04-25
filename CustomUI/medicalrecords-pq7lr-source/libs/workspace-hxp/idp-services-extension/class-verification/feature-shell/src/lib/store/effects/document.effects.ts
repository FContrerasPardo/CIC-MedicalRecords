/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { ClassVerificationRootState } from '../states/root.state';
import { systemActions, userActions } from '../actions/class-verification.actions';
import { ApiDocument, ClassVerificationBatchState, TransientApiDocument } from '../../models/contracts/class-verification-models';
import { catchError, concatMap, EMPTY, filter, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { DocumentEntity, DocumentEntityPage, isDocumentValid } from '../states/document.state';
import {
    selectActivePageCount,
    selectAllCutPages,
    selectAllDocuments,
    selectClassById,
    selectDocumentEntityStateForIds,
    selectDocumentsRawState,
} from '../selectors/document.selectors';
import { DocumentStateUpdate } from '../models/document-state-updates';
import { v4 } from 'uuid';
import { cloneDeep } from 'es-toolkit/compat';
import { selectCorrelationId, selectTaskInputData } from '../selectors/screen.selectors';
import {
    ApiDocPage,
    IdentifierData,
    IdpBackendService,
    IdpSharedImageLoadingService,
    IdpVerificationStatus,
    getHasMachineTextLayerProperty,
    isValidBatchRotation,
    normalizeRotation,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpDocumentPage, UNCLASSIFIED_CLASS_ID } from '../../models/screen-models';
import { MAX_PAGES } from '../../constants';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';

@Injectable()
export class DocumentEffects {
    private readonly actions$ = inject(Actions);
    private readonly store = inject(Store<ClassVerificationRootState>);
    private readonly idpBackendService = inject(IdpBackendService);
    private readonly idpImageLoadingService = inject(IdpSharedImageLoadingService);
    private readonly featuresService = inject<IFeaturesService>(FeaturesServiceToken);

    loadDocumentEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.screenLoadSuccess),
            map(({ taskData }) => {
                const availableClasses = taskData?.configuration?.documentClassDefinitions || [];
                const taskDocuments = taskData.batchState?.documents || [];
                const documents: DocumentEntity[] = taskDocuments.map((taskDoc) => {
                    const associatedClass = availableClasses.find((c) => c.id === taskDoc.classId);
                    const docClass = associatedClass ? { ...associatedClass, isSpecialClass: false } : undefined;

                    return {
                        id: taskDoc.id,
                        name: taskDoc.name || taskDoc.id,
                        class: docClass,
                        classificationConfidence: taskDoc.classificationConfidence || 0,
                        classificationClassCandidates: taskDoc.classificationClassCandidates,
                        classificationSelectionReason: taskDoc.classificationSelectionReason,
                        markAsDeleted: taskDoc.markAsDeleted || false,
                        rejectedReasonId: taskDoc.markAsRejected === true ? taskDoc.rejectReasonId : undefined,
                        verificationStatus:
                            taskDoc.classificationReviewStatus === 'ReviewRequired'
                                ? IdpVerificationStatus.AutoInvalid
                                : IdpVerificationStatus.AutoValid,
                        isGenerated: false,
                        pages: taskDoc.pages.map((taskPage) => {
                            const pageIdentifierData = this.generatePageIdentifierData(taskPage);
                            return {
                                id: pageIdentifierData.id,
                                name: pageIdentifierData.name,
                                fileReference: taskData.batchState.contentFileReferences[taskPage.contentFileReferenceIndex].sys_id,
                                contentFileReferenceIndex: taskPage.contentFileReferenceIndex,
                                sourcePageIndex: taskPage.sourcePageIndex,
                                rotation: taskPage.rotation,
                                height: taskPage.height,
                                width: taskPage.width,
                            };
                        }),
                    };
                });

                return systemActions.createDocuments({ documents });
            })
        )
    );

    syncRecognitionMetadataEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.createDocuments),
            concatLatestFrom(() => this.store.select(selectCorrelationId)),
            concatLatestFrom(() => this.store.select(selectTaskInputData)),
            concatMap(([[{ documents }, correlationId], taskInputData]) => {
                if (!correlationId || !taskInputData) {
                    return EMPTY;
                }

                const fileReferences = taskInputData.batchState.contentFileReferences.map((ref) => ref.sys_id);
                const pagesNeedingSync: Array<{ contentFileReferenceIndex: number; pageIndex: number; rotation: number }> = [];

                // Prepare page state to dispatch (reset viewerRotation to 0 for all pages)
                const pages = documents.flatMap((doc) =>
                    doc.pages.map((page) => ({
                        pageId: page.id,
                        documentId: doc.id,
                        rotation: normalizeRotation(page.rotation ?? 0),
                        viewerRotation: 0,
                    }))
                );

                // Fetch all file metadata and compare with batch state
                const metadataRequests = fileReferences.map((fileRef) =>
                    this.idpBackendService.getFileMetadata$(correlationId, fileRef).pipe(
                        tap((metadata) => {
                            if (!metadata) {
                                return;
                            }

                            // Check all pages from this file
                            documents.forEach((doc) => {
                                doc.pages.forEach((page) => {
                                    if (page.fileReference === fileRef) {
                                        const pageMetadata = metadata.pages.find((pm) => pm.pageIndex === page.sourcePageIndex);
                                        if (pageMetadata) {
                                            const recognitionRotation = normalizeRotation(pageMetadata.rotation ?? 0);
                                            const batchStateRotation = normalizeRotation(page.rotation ?? 0);

                                            if (!isValidBatchRotation(batchStateRotation)) {
                                                const message =
                                                    `[IDP] Task load: Invalid batch state rotation for page ${page.id}: ` +
                                                    `batchState=${batchStateRotation}° (valid: 0, 90, 180, 270, 360). ` +
                                                    `Using recognition metadata rotation=${recognitionRotation}° instead.`;
                                                console.warn(message);
                                                const pageEntry = pages.find((p) => p.pageId === page.id);
                                                if (pageEntry) {
                                                    pageEntry.rotation = recognitionRotation;
                                                }
                                            } else if (recognitionRotation !== batchStateRotation) {
                                                const message =
                                                    `[IDP] Task load: Rotation mismatch for page ${page.id}: ` +
                                                    `batchState=${batchStateRotation}°, recognition=${recognitionRotation}°. Queuing sync.`;
                                                console.warn(message);
                                                pagesNeedingSync.push({
                                                    contentFileReferenceIndex: page.contentFileReferenceIndex,
                                                    pageIndex: page.sourcePageIndex,
                                                    rotation: batchStateRotation,
                                                });
                                            }
                                        }
                                    }
                                });
                            });
                        }),
                        catchError(() => of(undefined))
                    )
                );

                return forkJoin(metadataRequests.length > 0 ? metadataRequests : [of(undefined)]).pipe(
                    concatMap(() => {
                        // Always dispatch page rotation state to store
                        if (pagesNeedingSync.length === 0) {
                            // No sync needed, just dispatch the state
                            return of(userActions.updatePagesRotation({ pages, taskDataSynced: undefined }));
                        }

                        const syncMessage = `[IDP] Task load: Syncing ${pagesNeedingSync.length} page(s) recognition metadata to match batch state`;
                        console.warn(syncMessage);

                        return this.idpBackendService.updateRotationData$(correlationId, fileReferences, pagesNeedingSync).pipe(
                            map(() => {
                                const successMessage = `[IDP] Task load: Successfully synced recognition metadata for ${pagesNeedingSync.length} page(s)`;
                                console.warn(successMessage);
                                return userActions.updatePagesRotation({ pages, taskDataSynced: undefined });
                            }),
                            catchError((err) => {
                                console.error('[IDP] Task load: Failed to sync recognition metadata:', err);
                                return of(userActions.updatePagesRotation({ pages, taskDataSynced: undefined }));
                            }),
                            finalize(() => this.idpImageLoadingService.cleanup())
                        );
                    })
                );
            })
        )
    );

    private generatePageIdentifierData(source: { contentFileReferenceIndex: number; sourcePageIndex: number }): IdentifierData {
        const fileId = `${source.contentFileReferenceIndex}_${source.sourcePageIndex}`;
        const id = `${fileId}_${this.uuid()}`;
        const name = `Page ${fileId}`;
        return { id, name };
    }

    mergePageEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.pageMerge),
            concatLatestFrom(({ pages, targetDocumentId }) => {
                const uniqueDocumentIds = [...new Set<string>([targetDocumentId, ...pages.map((p) => p.documentId)])];
                return this.store.select(selectDocumentEntityStateForIds(uniqueDocumentIds));
            }),
            map(([{ docAction, canUndoAction, pages, targetDocumentId }, contextDocuments]) => {
                const targetDocument = cloneDeep(contextDocuments.find((d) => d.id === targetDocumentId));
                if (!targetDocument) {
                    return systemActions.documentOperationError({
                        docAction,
                        error: `Merge - Target document not found ${targetDocumentId}`,
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_MERGE_ERROR',
                    });
                }

                const contextPageIds = pages.map((p) => p.id);
                const affectedDocuments: Record<string, typeof targetDocument> = {};

                for (const page of pages) {
                    if (page.documentId === targetDocumentId) {
                        continue;
                    }

                    const sourceDocument = affectedDocuments[page.documentId] || cloneDeep(contextDocuments.find((d) => d.id === page.documentId));
                    const pageIndex = sourceDocument?.pages.findIndex((p) => p.id === page.id);
                    if (!sourceDocument || pageIndex === -1) {
                        throw new Error(`Merge - Page not found ${page.id}`);
                    }

                    const pageState = sourceDocument.pages.splice(pageIndex, 1)[0];
                    targetDocument.pages.push(pageState);

                    sourceDocument.markAsDeleted = sourceDocument.pages.every((p) => p.markAsDeleted);

                    affectedDocuments[sourceDocument.id] = sourceDocument;
                }

                const updates: DocumentStateUpdate[] = Object.entries(affectedDocuments).map(([documentId, document]) => {
                    return {
                        operation: 'update',
                        documentId,
                        update: document,
                    };
                });

                updates.push({
                    operation: 'update',
                    documentId: targetDocumentId,
                    update: targetDocument,
                });

                const notificationMessage = 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_MERGE_SUCCESS';
                const messageArgs = { pageCount: pages.length, documentName: targetDocument.name };

                return systemActions.documentOperationSuccess({
                    docAction,
                    canUndoAction,
                    updates,
                    contextPageIds,
                    notificationMessage,
                    messageArgs,
                });
            })
        )
    );

    splitPageEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.pageSplit),
            concatLatestFrom(({ pages, createAfterDocId }) => {
                const targetDocId = createAfterDocId || pages[0].documentId;
                const uniqueDocumentIds = [...new Set<string>([targetDocId, ...pages.map((p) => p.documentId)])];
                return this.store.select(selectDocumentEntityStateForIds(uniqueDocumentIds));
            }),
            map(([{ docAction, canUndoAction, pages, createAfterDocId }, contextDocuments]) => {
                const targetDocId = createAfterDocId || pages[0].documentId;
                const createAfterDocument = cloneDeep(contextDocuments.find((d) => d.id === targetDocId));
                if (!createAfterDocument) {
                    return systemActions.documentOperationError({
                        docAction,
                        error: `Split - Target document not found ${targetDocId}`,
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_SPLIT_ERROR',
                    });
                }

                const newDocument: DocumentEntity = {
                    ...createAfterDocument,
                    id: this.uuid(),
                    name: `${createAfterDocument.name}_split`,
                    pages: [],
                    isGenerated: true,
                    classificationClassCandidates: undefined,
                    classificationSelectionReason: undefined,
                };

                const contextPageIds = pages.map((p) => p.id);
                const affectedDocuments: Record<string, typeof createAfterDocument> = {};

                for (const page of pages) {
                    const sourceDocument = affectedDocuments[page.documentId] || cloneDeep(contextDocuments.find((d) => d.id === page.documentId));
                    const pageIndex = sourceDocument?.pages.findIndex((p) => p.id === page.id);
                    if (!sourceDocument || pageIndex === -1) {
                        throw new Error(`Split - Page not found ${page.id}`);
                    }

                    const pageToSplit = sourceDocument.pages.splice(pageIndex, 1)[0];
                    newDocument.pages.push(pageToSplit);

                    sourceDocument.markAsDeleted = sourceDocument.pages.every((p) => p.markAsDeleted);

                    affectedDocuments[sourceDocument.id] = sourceDocument;
                }

                const updates: DocumentStateUpdate[] = Object.entries(affectedDocuments).map(([documentId, document]) => {
                    return {
                        operation: 'update',
                        documentId,
                        update: document,
                    };
                });

                updates.push({
                    operation: 'create',
                    documentId: newDocument.id,
                    createAfterDocId: targetDocId,
                    update: newDocument,
                });

                const notificationMessage = 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_SPLIT_SUCCESS_' + (pages.length > 1 ? 'PLURAL' : 'SINGULAR');
                const messageArgs = { arg: pages.length > 1 ? pages.length : pages[0].name };

                return systemActions.documentOperationSuccess({
                    docAction,
                    canUndoAction,
                    updates,
                    contextPageIds,
                    notificationMessage,
                    messageArgs,
                });
            })
        )
    );

    uuid(): string {
        return v4();
    }

    movePageEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.pageMove),
            concatLatestFrom(({ pages, targetDocumentId }) => {
                const uniqueDocumentIds = [...new Set<string>([targetDocumentId, ...pages.map((p) => p.documentId)])];
                return this.store.select(selectDocumentEntityStateForIds(uniqueDocumentIds));
            }),
            map(([{ docAction, canUndoAction, pages, targetDocumentId, targetIndex }, contextDocuments]) => {
                const targetDocument = cloneDeep(contextDocuments.find((d) => d.id === targetDocumentId));
                if (!targetDocument) {
                    return systemActions.documentOperationError({
                        docAction,
                        error: `Move Page - Target document not found ${targetDocumentId}`,
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.MOVE_PAGE_ERROR',
                    });
                }

                const contextPageIds = pages.map((p) => p.id);
                const affectedDocuments: Record<string, typeof targetDocument> = {};

                for (const page of pages) {
                    const sourceDocument =
                        page.documentId === targetDocumentId
                            ? targetDocument
                            : affectedDocuments[page.documentId] || cloneDeep(contextDocuments.find((d) => d.id === page.documentId));
                    const pageIndex = sourceDocument?.pages.findIndex((p) => p.id === page.id);
                    if (!sourceDocument || pageIndex === -1) {
                        throw new Error(`Move Page - Page not found ${page.id}`);
                    }

                    const pageToMove = sourceDocument.pages.splice(pageIndex, 1)[0];
                    targetDocument.pages.splice(targetIndex, 0, pageToMove);
                    targetIndex += 1;

                    sourceDocument.markAsDeleted = sourceDocument.pages.every((p) => p.markAsDeleted);

                    affectedDocuments[sourceDocument.id] = sourceDocument;
                }

                const updates: DocumentStateUpdate[] = Object.entries(affectedDocuments).map(([documentId, document]) => {
                    return {
                        operation: 'update',
                        documentId,
                        update: document,
                    };
                });

                updates.push({
                    operation: 'update',
                    documentId: targetDocumentId,
                    update: targetDocument,
                });

                const notificationMessage = 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.MOVE_PAGE_SUCCESS_' + (pages.length > 1 ? 'PLURAL' : 'SINGULAR');
                const messageArgs = { arg: pages.length > 1 ? pages.length : pages[0].name };

                return systemActions.documentOperationSuccess({
                    docAction,
                    canUndoAction,
                    updates,
                    contextPageIds,
                    notificationMessage,
                    messageArgs,
                });
            })
        )
    );

    // here
    deletePageEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.pageDelete),
            concatLatestFrom(({ pages }) => {
                const uniqueDocumentIds = [...new Set<string>(pages.map((p) => p.documentId))];
                return this.store.select(selectDocumentEntityStateForIds(uniqueDocumentIds));
            }),
            map(([{ docAction, canUndoAction, pages }, contextDocuments]) => {
                if (contextDocuments.length === 0) {
                    return systemActions.documentOperationError({
                        docAction,
                        error: 'Delete Page - No documents found',
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_DELETE_ERROR',
                    });
                }

                const contextPageIds = pages.map((p) => p.id);
                const affectedDocuments: Record<string, DocumentEntity> = {};

                for (const page of pages) {
                    const sourceDocument = affectedDocuments[page.documentId] || cloneDeep(contextDocuments.find((d) => d.id === page.documentId));
                    const pageIndex = sourceDocument?.pages.findIndex((p) => p.id === page.id);
                    if (!sourceDocument || pageIndex === -1) {
                        throw new Error(`Delete Page - Page not found ${page.id}`);
                    }

                    sourceDocument.pages[pageIndex].markAsDeleted = true;

                    sourceDocument.markAsDeleted = sourceDocument.pages.every((p) => p.markAsDeleted);

                    affectedDocuments[sourceDocument.id] = sourceDocument;
                }

                const updates: DocumentStateUpdate[] = Object.entries(affectedDocuments).map(([documentId, document]) => {
                    return {
                        operation: 'update',
                        documentId,
                        update: document,
                    };
                });

                const notificationMessage = 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_DELETE_SUCCESS_' + (pages.length > 1 ? 'PLURAL' : 'SINGULAR');
                const messageArgs = { arg: pages.length > 1 ? pages.length : pages[0].name };

                return systemActions.documentOperationSuccess({
                    docAction,
                    canUndoAction,
                    updates,
                    contextPageIds,
                    notificationMessage,
                    messageArgs,
                });
            })
        )
    );

    createPageCopyEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.pageCreateCopy),
            concatLatestFrom(({ pages }) => {
                const uniqueDocumentIds = [...new Set<string>(pages.map((p) => p.documentId))];
                return this.store.select(selectDocumentEntityStateForIds(uniqueDocumentIds));
            }),
            concatLatestFrom(() => this.store.select(selectActivePageCount)),
            map(([[{ docAction, canUndoAction, pages }, contextDocuments], activePageCount]) => {
                if (activePageCount + pages.length > MAX_PAGES) {
                    return systemActions.documentOperationError({
                        docAction,
                        error: 'Page Create Copy - Exceeds maximum page count',
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_COUNT_EXCEEDED',
                        messageArgs: { maxPageCount: MAX_PAGES },
                    });
                }

                const contextPageIds = pages.map((p) => p.id);
                const documentsToCreate: Map<string, DocumentEntity> = new Map();

                for (const page of [...pages].sort((a, b) => a.sourcePageIndex - b.sourcePageIndex)) {
                    const sourceDocument = cloneDeep(contextDocuments.find((d) => d.id === page.documentId));
                    const sourcePage = sourceDocument?.pages.find((p) => p.id === page.id);
                    if (!sourceDocument || !sourcePage) {
                        throw new Error(`Create Copy - Page not found ${page.id}`);
                    }

                    let documentToCreate = documentsToCreate.get(sourceDocument.id);
                    if (!documentToCreate) {
                        documentToCreate = {
                            ...sourceDocument,
                            id: this.uuid(),
                            name: `${sourceDocument.name}_copy`,
                            pages: [],
                            isGenerated: true,
                            classificationClassCandidates: undefined,
                            classificationSelectionReason: undefined,
                        };
                        documentsToCreate.set(sourceDocument.id, documentToCreate);
                    }

                    const newPageIdentifierData = this.generatePageIdentifierData(sourcePage);
                    documentToCreate.pages.push({ ...sourcePage, id: newPageIdentifierData.id, name: newPageIdentifierData.name });
                }

                const updates: DocumentStateUpdate[] = [];
                for (const [sourceDocumentId, document] of documentsToCreate) {
                    updates.push({
                        operation: 'create',
                        documentId: document.id,
                        update: document,
                        createAfterDocId: sourceDocumentId,
                    });
                }

                const notificationMessage =
                    'IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_CREATE_COPY_SUCCESS_' + (pages.length > 1 ? 'PLURAL' : 'SINGULAR');
                const messageArgs = { arg: pages.length > 1 ? pages.length : pages[0].name };

                return systemActions.documentOperationSuccess({
                    docAction,
                    canUndoAction,
                    updates,
                    contextPageIds,
                    notificationMessage,
                    messageArgs,
                });
            })
        )
    );

    documentResolveEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.documentResolve),
            concatLatestFrom(({ pages }) => {
                const uniqueDocumentIds = [...new Set<string>(pages.map((p) => p.documentId))];
                return this.store.select(selectDocumentEntityStateForIds(uniqueDocumentIds));
            }),
            map(([{ docAction, canUndoAction, pages }, contextDocuments]) => {
                if (contextDocuments.length === 0) {
                    return systemActions.documentOperationError({
                        docAction,
                        error: 'Resolve - No documents found',
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.RESOLVE_ERROR',
                    });
                }

                const contextPageIds = pages.map((p) => p.id);
                const updates: DocumentStateUpdate[] = [];
                for (const doc of contextDocuments) {
                    const updatedDoc = cloneDeep(doc);
                    updatedDoc.markAsResolved = true;
                    updatedDoc.verificationStatus = IdpVerificationStatus.ManualValid;
                    updatedDoc.rejectedReasonId = undefined;
                    updates.push({
                        operation: 'update',
                        documentId: updatedDoc.id,
                        update: updatedDoc,
                    });
                }

                const notificationMessage = 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.RESOLVE_SUCCESS';
                return systemActions.documentOperationSuccess({ docAction, canUndoAction, updates, contextPageIds, notificationMessage });
            })
        )
    );

    documentRejectEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.documentReject),
            concatLatestFrom(({ pages }) => {
                const uniqueDocumentIds = [...new Set<string>(pages.map((p) => p.documentId))];
                return this.store.select(selectDocumentEntityStateForIds(uniqueDocumentIds));
            }),
            map(([{ docAction, canUndoAction, pages, rejectReasonId, rejectNote }, contextDocuments]) => {
                if (contextDocuments.length === 0) {
                    return systemActions.documentOperationError({
                        docAction,
                        error: 'Reject - No documents found',
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.REJECT_ERROR',
                    });
                }

                const contextPageIds = pages.map((p) => p.id);
                const updates: DocumentStateUpdate[] = [];
                for (const doc of contextDocuments) {
                    const updatedDoc = cloneDeep(doc);
                    updatedDoc.classificationConfidence = !!rejectReasonId || !!doc.class ? 1 : 0;
                    updatedDoc.markAsResolved = false;
                    updatedDoc.verificationStatus = IdpVerificationStatus.ManualValid;
                    updatedDoc.rejectedReasonId = rejectReasonId;
                    updatedDoc.rejectNote = rejectNote;
                    updates.push({
                        operation: 'update',
                        documentId: updatedDoc.id,
                        update: updatedDoc,
                    });
                }

                const notificationMessage = 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.REJECT_SUCCESS';
                return systemActions.documentOperationSuccess({ docAction, canUndoAction, updates, contextPageIds, notificationMessage });
            })
        )
    );

    classChangeEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.documentClassChange),
            concatLatestFrom(({ pages }) => {
                const uniqueDocumentIds = [...new Set<string>(pages.map((p) => p.documentId))];
                return this.store.select(selectDocumentEntityStateForIds(uniqueDocumentIds));
            }),
            concatLatestFrom(([{ classId }]) => {
                return this.store.select(selectClassById(classId));
            }),
            map(([[{ docAction, canUndoAction, pages, classId }, contextDocuments], documentClass]) => {
                if (!documentClass) {
                    return systemActions.documentOperationError({
                        docAction,
                        error: `Class Change - Not a valid document class ${classId}`,
                        notificationMessage: 'IDP_CLASS_VERIFICATION.USER_FEEDBACK.CHANGE_CLASS_ERROR',
                    });
                }

                const contextPageIds = pages.map((p) => p.id);
                const updates: DocumentStateUpdate[] = [];
                for (const doc of contextDocuments) {
                    const updatedDoc = cloneDeep(doc);
                    updatedDoc.class = documentClass;
                    updatedDoc.classificationConfidence = documentClass.id === UNCLASSIFIED_CLASS_ID ? 0 : 1;
                    updatedDoc.verificationStatus =
                        documentClass.id === UNCLASSIFIED_CLASS_ID ? IdpVerificationStatus.ManualInvalid : IdpVerificationStatus.ManualValid;
                    updatedDoc.markAsResolved = false;
                    updates.push({
                        operation: 'update',
                        documentId: updatedDoc.id,
                        update: updatedDoc,
                    });
                }

                const notificationMessage =
                    'IDP_CLASS_VERIFICATION.USER_FEEDBACK.CHANGE_CLASS_SUCCESS_' + (contextDocuments.length > 1 ? 'PLURAL' : 'SINGULAR');
                const messageArgs = { className: documentClass.name };

                return systemActions.documentOperationSuccess({
                    docAction,
                    canUndoAction,
                    updates,
                    contextPageIds,
                    notificationMessage,
                    messageArgs,
                });
            })
        )
    );

    documentOpSuccessEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.documentOperationSuccess),
            map(({ notificationMessage, messageArgs }) => {
                return systemActions.notificationShow({ severity: 'success', message: notificationMessage, messageArgs });
            })
        )
    );

    documentOpErrorEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.documentOperationError),
            map(({ error, notificationMessage, messageArgs }) => {
                console.error(error);
                return systemActions.notificationShow({ severity: 'error', message: notificationMessage, messageArgs: { ...messageArgs, error } });
            })
        )
    );

    taskDataEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskPrepareUpdate),
            concatLatestFrom(() => {
                return this.store.select(selectDocumentsRawState);
            }),
            concatLatestFrom(() => {
                return this.store.select(selectTaskInputData);
            }),
            map(([[{ taskAction, openNextTask }, documentEntities], taskInputData]) => {
                if (!taskInputData) {
                    return systemActions.taskPrepareUpdateError({ taskAction, error: 'Task data not found' });
                }

                let hasRejectedDocuments = false;
                let anyWithIssue = false;

                const updatedDocuments: ApiDocument[] = [];

                const existingDeletedPages: ApiDocPage[] = taskInputData.batchState.deletedPages ? [...taskInputData.batchState.deletedPages] : [];
                const markedDeletedPages: DocumentEntityPage[] = [];
                const matchesPage = (a: DocumentEntityPage, b: { contentFileReferenceIndex: number; sourcePageIndex: number }) =>
                    a.contentFileReferenceIndex === b.contentFileReferenceIndex && a.sourcePageIndex === b.sourcePageIndex;
                const hasDeletedPage = (page: DocumentEntityPage): boolean =>
                    markedDeletedPages.some((p) => matchesPage(page, p)) || existingDeletedPages.some((p) => matchesPage(page, p));

                const toPageKey = (page: DocumentEntityPage): string => `${page.contentFileReferenceIndex}_${page.sourcePageIndex}`;
                const existingPagesKeys = new Set<string>();

                for (const document of documentEntities) {
                    if (document.markAsDeleted) {
                        markedDeletedPages.push(...document.pages.filter((page) => !hasDeletedPage(page)));
                        continue;
                    }

                    const matchingBatchDocument = taskInputData.batchState.documents.find((batchDocument) => batchDocument.id === document.id);
                    const updatedReviewStatus =
                        document.verificationStatus === IdpVerificationStatus.ManualValid
                            ? 'ReviewNotRequired'
                            : matchingBatchDocument?.classificationReviewStatus;
                    const isRejected = Boolean(document.rejectedReasonId);
                    hasRejectedDocuments ||= isRejected;
                    anyWithIssue ||= !isDocumentValid(document, taskInputData.configuration.documentClassDefinitions);

                    const update: ApiDocument = {
                        id: document.id,
                        name: document.name,
                        markAsRejected: isRejected,
                        markAsResolved: document.markAsResolved,
                        rejectReasonId: document.rejectedReasonId,
                        rejectNote: document.rejectNote,
                        classId: document.class?.id,
                        className: document.class?.name,
                        classificationConfidence: document.classificationConfidence,
                        classificationReviewStatus: updatedReviewStatus,
                        classificationClassCandidates: document.classificationClassCandidates,
                        classificationSelectionReason: document.classificationSelectionReason,
                        pages: [],
                    };

                    for (const page of document.pages) {
                        if (page.markAsDeleted) {
                            if (!hasDeletedPage(page)) {
                                markedDeletedPages.push(page);
                            }
                            continue;
                        }

                        existingPagesKeys.add(toPageKey(page));
                        update.pages.push(this.mapDocumentPage(page));
                    }

                    update.reprocess = matchingBatchDocument
                        ? matchingBatchDocument.reprocess || !this.isBatchStateDocumentSame(matchingBatchDocument, update)
                        : true;

                    updatedDocuments.push(update.reprocess ? update : { ...matchingBatchDocument, ...update });
                }
                const updatedTaskData = cloneDeep(taskInputData);
                updatedTaskData.batchState.documents = updatedDocuments;
                updatedTaskData.batchState.hasRejectedDocuments = hasRejectedDocuments;
                updatedTaskData.batchState.deletedPages = [
                    ...existingDeletedPages,
                    ...markedDeletedPages.filter((p) => !existingPagesKeys.has(toPageKey(p))).map((p) => this.mapDocumentPage(p)),
                ];
                if (taskAction === 'Complete') {
                    updatedTaskData.batchState.separationStatus = 'Separated';
                    updatedTaskData.batchState.classificationStatus = 'Classified';
                    if (updatedTaskData.batchState.documents.some((document) => document.reprocess)) {
                        updatedTaskData.batchState.extractionStatus = 'Awaiting';
                    }

                    this.deleteTransientBatchStateProperties(updatedTaskData.batchState);
                } else if (anyWithIssue) {
                    updatedTaskData.batchState.separationStatus = 'ReviewRequired';
                    updatedTaskData.batchState.classificationStatus = 'ReviewRequired';
                } else {
                    updatedTaskData.batchState.classificationStatus = 'Awaiting';
                }

                return systemActions.updateDocumentsRotation({ taskAction, taskData: updatedTaskData, openNextTask });
            })
        )
    );

    private mapDocumentPage(page: DocumentEntityPage): ApiDocPage {
        return {
            contentFileReferenceIndex: page.contentFileReferenceIndex,
            sourcePageIndex: page.sourcePageIndex,
            rotation: normalizeRotation((page.rotation ?? 0) - (page.viewerRotation ?? 0)),
            width: page.width,
            height: page.height,
        };
    }

    private isBatchStateDocumentSame(existing: ApiDocument, updated: ApiDocument) {
        if (
            !this.isBatchStateDocumentClassSame(existing, updated) ||
            existing.rejectReasonId !== updated.rejectReasonId ||
            existing.markAsResolved !== updated.markAsResolved ||
            existing.pages.length !== updated.pages.length
        ) {
            return false;
        }

        for (const existingPage of existing.pages) {
            const updatedPage = updated.pages.find(
                (page) =>
                    page.contentFileReferenceIndex === existingPage.contentFileReferenceIndex && page.sourcePageIndex === existingPage.sourcePageIndex
            );
            if (!updatedPage || updatedPage.rotation !== existingPage.rotation) {
                return false;
            }
        }

        return true;
    }

    private isBatchStateDocumentClassSame(existing: ApiDocument, updated: ApiDocument) {
        return existing.classId === undefined || existing.classId === UNCLASSIFIED_CLASS_ID
            ? updated.classId === undefined || updated.classId === UNCLASSIFIED_CLASS_ID
            : existing.classId === updated.classId;
    }

    private deleteTransientBatchStateProperties(batch: ClassVerificationBatchState): void {
        for (const document of batch.documents) {
            const asTransient = document as TransientApiDocument;
            delete asTransient.reprocess;
        }
    }

    updateRotationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.updateDocumentsRotation),
            concatLatestFrom(() => this.store.select(selectCorrelationId)),
            concatLatestFrom(() => this.store.select(selectAllDocuments)),
            concatMap(([[{ taskAction, taskData, openNextTask }, correlationId], allDocuments]) => {
                const isSaveOrComplete = taskAction === 'Save' || taskAction === 'Complete';
                const fileReferences = [...new Set(taskData.batchState.contentFileReferences.map((ref) => ref.sys_id))];
                if (!isSaveOrComplete || fileReferences.length === 0) {
                    return of(systemActions.taskPrepareUpdateSuccess({ taskAction, taskData, openNextTask }));
                }

                const allDocumentsInTask = taskData.batchState.documents;
                const allPagesState = allDocuments.flatMap((doc) => doc.pages ?? []);

                const pageMap = new Map<string, IdpDocumentPage>();
                for (const page of allPagesState) {
                    pageMap.set(`${page.documentId}_${page.sourcePageIndex}_${page.fileReference}`, page);
                }

                // Check if any page has user rotation (viewerRotation !== 0)
                const hasUserRotation = allPagesState.some((page) => (page.viewerRotation ?? 0) !== 0);

                const pagesWithIndex = hasUserRotation
                    ? allDocumentsInTask.flatMap(
                          (doc) =>
                              doc.pages
                                  .map((p) => {
                                      const fileRef = fileReferences[p.contentFileReferenceIndex];
                                      const key = `${doc.id}_${p.sourcePageIndex}_${fileRef}`;
                                      const matchedPage = pageMap.get(key);
                                      if (!matchedPage) {
                                          return undefined;
                                      }
                                      return {
                                          contentFileReferenceIndex: p.contentFileReferenceIndex,
                                          pageIndex: p.sourcePageIndex,
                                          rotation: normalizeRotation(p.rotation ?? 0),
                                      };
                                  })
                                  .filter(Boolean) as { contentFileReferenceIndex: number; pageIndex: number; rotation: number }[]
                      )
                    : [];

                const pages = allPagesState.map((page) => ({
                    pageId: page.id,
                    documentId: page.documentId,
                    rotation: (() => {
                        const fileRefIndex = fileReferences.indexOf(page.fileReference);
                        const matchingDoc = allDocumentsInTask.find((doc: ApiDocument) => doc.id === page.documentId);
                        const matchingPage = matchingDoc?.pages.find(
                            (p: ApiDocPage) => p.sourcePageIndex === page.sourcePageIndex && p.contentFileReferenceIndex === fileRefIndex
                        );
                        return normalizeRotation(matchingPage?.rotation ?? 0);
                    })(),
                    viewerRotation: 0,
                }));

                // Only update recognition metadata if user rotated pages (viewerRotation changed)
                if (!hasUserRotation || pagesWithIndex.length === 0) {
                    this.store.dispatch(userActions.updatePagesRotation({ pages, taskDataSynced: undefined }));
                    return of(systemActions.taskPrepareUpdateSuccess({ taskAction, taskData, openNextTask }));
                }

                return this.idpBackendService.updateRotationData$(correlationId, fileReferences, pagesWithIndex).pipe(
                    map(() => {
                        this.store.dispatch(userActions.updatePagesRotation({ pages, taskDataSynced: undefined }));
                        return systemActions.taskPrepareUpdateSuccess({ taskAction, taskData, openNextTask });
                    }),
                    catchError(() => of(systemActions.taskPrepareUpdateError({ taskAction, error: 'Failed to update rotation data' }))),
                    finalize(() => this.idpImageLoadingService.cleanup())
                );
            })
        )
    );

    uploadedDocumentReceivedMetadataSuccessEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.uploadedDocumentReceivedMetadataSuccess),
            concatLatestFrom(() => this.store.select(selectTaskInputData)),
            // eslint-disable-next-line rxjs/no-unsafe-switchmap
            switchMap(([{ metadata, uploadedDocument }, taskInputData]) => {
                if (!taskInputData) {
                    return [systemActions.taskPrepareUpdateError({ taskAction: 'Save', error: 'Task data not found' })];
                }

                const updatedTaskData = cloneDeep(taskInputData);

                const document: DocumentEntity = {
                    id: uploadedDocument.id,
                    name: uploadedDocument.fileName,
                    isGenerated: true,
                    verificationStatus: IdpVerificationStatus.AutoValid,
                    classificationConfidence: 0,
                    pages: metadata.pages.map((page: any) => {
                        const pageId = `${uploadedDocument.id}_${page.pageIndex}`;

                        return {
                            id: pageId,
                            name: `Page ${pageId}`,
                            rotation: page.rotation,
                            sourcePageIndex: page.pageIndex,
                            fileReference: uploadedDocument.sysId ?? '',
                            contentFileReferenceIndex: updatedTaskData?.batchState.contentFileReferences.length,
                            ...getHasMachineTextLayerProperty(page.hasMachineTextLayer),
                            width: page.imageWidth,
                            height: page.imageHeight,
                        };
                    }),
                };

                updatedTaskData?.batchState.documents.push({
                    id: document.id,
                    name: document.name,
                    markAsDeleted: false,
                    markAsRejected: false,
                    markAsResolved: false,
                    classificationConfidence: 0,
                    pages: document.pages.map((page) => ({
                        contentFileReferenceIndex: updatedTaskData?.batchState.contentFileReferences.length,
                        sourcePageIndex: page.sourcePageIndex,
                        rotation: page.rotation,
                        width: page.width,
                        height: page.height,
                    })),
                });

                updatedTaskData.batchState.contentFileReferences.push({
                    sys_id: uploadedDocument.sysId ?? '',
                    sysfile_blob: undefined,
                });

                return [
                    systemActions.taskPrepareUpdateSuccess({ taskAction: 'Save', taskData: updatedTaskData, openNextTask: false }),
                    systemActions.createDocuments({ documents: [document] }),
                ];
            })
        )
    );

    pageCutNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.pageCut),
            concatLatestFrom(() => [
                this.featuresService.isOn$(WORKSPACE_IDP_HXP.CLASS_VERIFICATION_CUT_INSERT),
                this.store.select(selectAllCutPages),
            ]),
            map(([action, isOn, cutPages]) => ({ action, isOn, cutPages })),
            filter(({ isOn, cutPages }) => !!isOn && cutPages.length > 0),
            map(({ cutPages }) => {
                const isSinglePageCut = cutPages.length === 1;
                return systemActions.notificationShow({
                    severity: 'info',
                    message: `IDP_CLASS_VERIFICATION.USER_FEEDBACK.PAGE_CUT_${isSinglePageCut ? 'SINGULAR' : 'PLURAL'}`,
                    messageArgs: { arg: isSinglePageCut ? cutPages[0].name : cutPages.length },
                });
            })
        )
    );
}

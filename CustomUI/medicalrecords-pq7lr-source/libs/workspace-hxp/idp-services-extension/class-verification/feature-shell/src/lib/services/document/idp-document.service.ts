/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Observable, asapScheduler, combineLatest, of } from 'rxjs';
import { distinctUntilChanged, map, observeOn, shareReplay, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { IdpDocument, IdpDocumentAction, IdpDocumentPage } from '../../models/screen-models';
import { Store } from '@ngrx/store';
import {
    selectActivePageCount,
    selectAllCutPages,
    selectAllDocuments,
    selectAllDocumentsForClass,
    selectAllDocumentsValid,
    selectAllSelectedDocuments,
    selectAllSelectedPages,
    selectDocumentsGroupedByClass,
    selectSelectedDocumentClass,
} from '../../store/selectors/document.selectors';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { userActions } from '../../store/actions/class-verification.actions';
import { IdpScreenViewFilter, IdpScreenViewSortOption } from '../../models/common-models';
import { selectFullScreen, selectSortOption, selectViewFilter } from '../../store/selectors/screen.selectors';
import { selectCanRedo, selectCanUndo } from '../../store/selectors/undo-redo.selectors';
import { IdpPagesMetadata } from '../../store/models/document-state-updates';

@Injectable()
export class IdpDocumentService {
    readonly allDocuments$: Observable<IdpDocument[]>;
    readonly allPages$: Observable<IdpDocumentPage[]>;
    readonly allDocumentsForSelectedClass$: Observable<IdpDocument[]>;
    readonly selectedDocuments$: Observable<IdpDocument[]>;
    readonly allPagesForSelectedClass$: Observable<IdpDocumentPage[]>;
    readonly selectedPages$: Observable<IdpDocumentPage[]>;
    readonly allDocumentsValid$: Observable<boolean>;
    readonly documentViewFilter$: Observable<IdpScreenViewFilter>;
    readonly fullScreenMode$: Observable<boolean>;
    readonly undoRedoState$: Observable<{ canUndo: boolean; canRedo: boolean }>;
    readonly activePageCount$: Observable<number>;
    readonly cutPages$: Observable<IdpDocumentPage[]>;

    private readonly store = inject(Store);

    constructor() {
        this.allDocuments$ = this.store.select(selectAllDocuments).pipe(takeUntilDestroyed());

        this.allPages$ = this.allDocuments$.pipe(map((documents) => documents.flatMap((d) => d.pages)));

        this.allDocumentsForSelectedClass$ = combineLatest([
            this.store.select(selectSelectedDocumentClass).pipe(distinctUntilChanged((prev, curr) => prev?.id === curr?.id)),
            this.store.select(selectViewFilter),
        ]).pipe(
            takeUntilDestroyed(),
            switchMap(([selectedClass, viewFilter]) => {
                if (!selectedClass) {
                    return of([]);
                }

                return this.store.select(selectAllDocumentsForClass(selectedClass?.id)).pipe(
                    map((docs) => {
                        if (viewFilter === IdpScreenViewFilter.All) {
                            return docs;
                        }
                        return docs.filter((doc) => doc.hasIssue);
                    })
                );
            }),
            shareReplay({ refCount: true, bufferSize: 1 })
        );

        this.allPagesForSelectedClass$ = this.allDocumentsForSelectedClass$.pipe(
            map((documents) => documents.flatMap((doc) => doc.pages)),
            shareReplay({ refCount: true, bufferSize: 1 })
        );

        this.allDocumentsValid$ = this.store.select(selectAllDocumentsValid).pipe(takeUntilDestroyed());
        this.selectedDocuments$ = this.store.select(selectAllSelectedDocuments).pipe(takeUntilDestroyed());
        this.selectedPages$ = this.store.select(selectAllSelectedPages).pipe(takeUntilDestroyed());
        this.documentViewFilter$ = this.store.select(selectViewFilter).pipe(takeUntilDestroyed());
        this.fullScreenMode$ = this.store.select(selectFullScreen).pipe(takeUntilDestroyed());

        this.undoRedoState$ = combineLatest([
            this.store.select(selectCanUndo).pipe(distinctUntilChanged()),
            this.store.select(selectCanRedo).pipe(distinctUntilChanged()),
        ]).pipe(
            map(([canUndo, canRedo]) => ({ canUndo, canRedo })),
            takeUntilDestroyed()
        );

        // Update selected pages when document list filtered by class changes
        this.allDocumentsForSelectedClass$
            .pipe(
                observeOn(asapScheduler),
                map((docs) => docs.map((d) => d.id)),
                distinctUntilChanged((prev, curr) => prev?.join(',') === curr?.join(',')),
                withLatestFrom(this.selectedPages$),
                withLatestFrom(this.getSortOption())
            )
            .subscribe(([[docsInSelectedClass, selectedPages], sortOption]) => {
                const filteredSelectedPages = selectedPages.filter((p) => docsInSelectedClass.includes(p.documentId));
                if (sortOption === IdpScreenViewSortOption.Classes && filteredSelectedPages.length !== selectedPages.length) {
                    this.setSelectedPages(filteredSelectedPages.map((p) => p.id));
                }
            });

        this.activePageCount$ = this.store.select(selectActivePageCount).pipe(takeUntilDestroyed());
        this.cutPages$ = this.store.select(selectAllCutPages).pipe(takeUntilDestroyed());
    }

    setDocumentSortOption(option: IdpScreenViewSortOption) {
        this.store.dispatch(userActions.sortOptionChange({ option }));
    }

    setSelectedPages(pageIds: string[]) {
        this.store.dispatch(userActions.pageSelect({ pageIds }));
    }

    toggleExpandDocument(documentId: string) {
        this.store.dispatch(userActions.documentExpandToggle({ documentId }));
    }

    togglePreviewedDocument(documentId?: string) {
        this.store.dispatch(userActions.documentPreviewToggle({ documentId }));
    }

    toggleDraggedDocument(documentId: string) {
        this.store.dispatch(userActions.documentDragToggle({ documentId }));
    }

    resetPageSelection() {
        this.store.dispatch(userActions.pageSelect({ pageIds: [] }));
    }

    setDocumentViewFilter(viewFilter: IdpScreenViewFilter) {
        this.store.dispatch(userActions.viewFilterChange({ filter: viewFilter }));
    }

    toggleViewFilter() {
        this.store.dispatch(userActions.viewFilterToggle());
    }

    changeFullScreen(fullScreen: boolean) {
        this.store.dispatch(userActions.changeFullScreen({ fullScreen }));
    }

    updatePagesRotation(pages: IdpPagesMetadata[], taskDataSynced: boolean) {
        this.store.dispatch(userActions.updatePagesRotation({ pages, taskDataSynced }));
    }

    setDocumentClass(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[], classId: string) {
        this.store.dispatch(userActions.documentClassChange({ docAction, canUndoAction, pages, classId }));
    }

    deletePages(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[]) {
        this.store.dispatch(userActions.pageDelete({ docAction, canUndoAction, pages }));
    }

    movePages(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[], targetDocumentId: string, targetIndex: number) {
        this.store.dispatch(userActions.pageMove({ docAction, canUndoAction, pages, targetDocumentId, targetIndex }));
    }

    movePagesAndCreate(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[], createAfterDocId: string) {
        this.store.dispatch(userActions.pageSplit({ docAction, canUndoAction, pages, createAfterDocId }));
    }

    splitDocument(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[]) {
        this.store.dispatch(userActions.pageSplit({ docAction, canUndoAction, pages }));
    }

    mergeDocuments(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[], targetDocumentId: string) {
        this.store.dispatch(userActions.pageMerge({ docAction, canUndoAction, pages, targetDocumentId }));
    }

    markResolved(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[]) {
        this.store.dispatch(userActions.documentResolve({ docAction, canUndoAction, pages }));
    }

    markRejected(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[], rejectReasonId: string, rejectNote?: string) {
        this.store.dispatch(userActions.documentReject({ docAction, canUndoAction, pages, rejectReasonId, rejectNote }));
        this.store.dispatch(userActions.pageSelect({ pageIds: [] }));
    }

    removeDocumentFlag(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[]) {
        this.store.dispatch(userActions.documentReject({ docAction, canUndoAction, pages }));
        this.store.dispatch(userActions.pageSelect({ pageIds: [] }));
    }

    getDocumentsForClass(classId: string) {
        return this.store.select(selectAllDocumentsForClass(classId));
    }

    getAllDocumentsGroupedByClass() {
        return this.store.select(selectDocumentsGroupedByClass);
    }

    getSortOption() {
        return this.store.select(selectSortOption);
    }

    undoAction() {
        this.store.dispatch(userActions.undoAction());
    }

    redoAction() {
        this.store.dispatch(userActions.redoAction());
    }

    copyDocumentDetailsToClipboard(documentId: string) {
        this.store.dispatch(userActions.copyDocumentDetailsToClipboard({ documentId }));
    }

    createPageCopies(docAction: IdpDocumentAction, canUndoAction: boolean, pages: IdpDocumentPage[]) {
        this.store.dispatch(userActions.pageCreateCopy({ docAction, canUndoAction, pages }));
    }

    cutSelectedPages(): void {
        this.selectedPages$
            .pipe(take(1))
            .subscribe((selectedPages) => this.store.dispatch(userActions.pageCut({ pageIds: selectedPages.map((p) => p.id) })));
    }

    clearCutPages(): void {
        this.store.dispatch(userActions.pageCut({ pageIds: [] }));
    }

    insertCutPages(targetDocumentId: string, targetIndex: number) {
        this.cutPages$.pipe(take(1)).subscribe((pages) => {
            this.movePages(IdpDocumentAction.InsertPage, true, pages, targetDocumentId, targetIndex);
        });
    }
}

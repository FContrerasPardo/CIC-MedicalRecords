/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/*
 * Unit tests for IdpDocumentToolbarService
 */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IdpDocumentToolbarService, MessageTemplate } from './idp-document-toolbar.service';
import { BehaviorSubject, of } from 'rxjs';
import { IdpConfigClass, IdpDocument, IdpDocumentAction, IdpDocumentPage, UNCLASSIFIED_CLASS_ID } from '../../models/screen-models';
import { IdpShortcut, IdpShortcutAction, IdpShortcutService } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { DestroyRef } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { IdpDocumentService } from './idp-document.service';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { createMockDocument } from '../../models/mocked/mocked-documents';

describe('IdpDocumentToolbarService', () => {
    let service: IdpDocumentToolbarService;
    let mockDocumentService: jasmine.SpyObj<IdpDocumentService>;
    let mockShortcutService: jasmine.SpyObj<IdpShortcutService>;
    let mockMatDialog: jasmine.SpyObj<MatDialog>;

    let mockDocumentServiceSelectedPages$: BehaviorSubject<IdpDocumentPage[]>;
    let mockDocumentServiceSelectedDocuments$: BehaviorSubject<IdpDocument[]>;
    let mockDocumentServiceAllDocuments$: BehaviorSubject<IdpDocument[]>;
    let mockDocumentServiceUndoRedoState$: BehaviorSubject<{ canUndo: boolean; canRedo: boolean }>;
    let mockDocumentServiceFullScreenMode$: BehaviorSubject<boolean>;
    let mockActivePageCount$: BehaviorSubject<number>;
    let mockCutPages$: BehaviorSubject<IdpDocumentPage[]>;
    let mockReasoningFlag$: BehaviorSubject<boolean>;

    function mockMatDialogReturn(value: any) {
        const spyDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
        spyDialogRef.afterClosed.and.returnValue(of(value));
        mockMatDialog.open.and.returnValue(spyDialogRef);
    }

    beforeEach(() => {
        mockDocumentServiceSelectedPages$ = new BehaviorSubject<IdpDocumentPage[]>([]);
        mockDocumentServiceSelectedDocuments$ = new BehaviorSubject<IdpDocument[]>([]);
        mockDocumentServiceAllDocuments$ = new BehaviorSubject<IdpDocument[]>([]);
        mockDocumentServiceUndoRedoState$ = new BehaviorSubject<{ canUndo: boolean; canRedo: boolean }>({ canUndo: false, canRedo: false });
        mockDocumentServiceFullScreenMode$ = new BehaviorSubject<boolean>(false);
        mockActivePageCount$ = new BehaviorSubject<number>(0);
        mockCutPages$ = new BehaviorSubject<IdpDocumentPage[]>([]);
        mockReasoningFlag$ = new BehaviorSubject<boolean>(true);
        mockDocumentService = jasmine.createSpyObj<IdpDocumentService>(
            'IdpDocumentService',
            [
                'undoAction',
                'redoAction',
                'setDocumentClass',
                'deletePages',
                'splitDocument',
                'mergeDocuments',
                'movePages',
                'movePagesAndCreate',
                'markResolved',
                'markRejected',
                'removeDocumentFlag',
                'toggleViewFilter',
                'createPageCopies',
            ],
            {
                selectedPages$: mockDocumentServiceSelectedPages$.asObservable(),
                selectedDocuments$: mockDocumentServiceSelectedDocuments$.asObservable(),
                allDocuments$: mockDocumentServiceAllDocuments$.asObservable(),
                undoRedoState$: mockDocumentServiceUndoRedoState$.asObservable(),
                fullScreenMode$: mockDocumentServiceFullScreenMode$.asObservable(),
                activePageCount$: mockActivePageCount$.asObservable(),
                cutPages$: mockCutPages$.asObservable(),
            }
        );

        mockShortcutService = jasmine.createSpyObj<IdpShortcutService>('IdpShortcutService', ['getShortcutForEvent']);

        mockMatDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open'], { openDialogs: [] });

        TestBed.configureTestingModule({
            providers: [
                IdpDocumentToolbarService,
                { provide: DestroyRef, useValue: { onDestroy: () => {} } },
                { provide: MatDialog, useValue: mockMatDialog },
                { provide: IdpDocumentService, useValue: mockDocumentService },
                { provide: FeaturesServiceToken, useValue: { isOn$: () => mockReasoningFlag$.asObservable() } },
                { provide: IdpShortcutService, useValue: mockShortcutService },
            ],
        });

        service = TestBed.inject(IdpDocumentToolbarService);
    });

    function getLatestItems(): any[] {
        let latest: any[] = [];
        service.documentToolBarItems$.subscribe((v) => (latest = v)).unsubscribe();
        return latest;
    }

    it('should disable "Undo/Redo" when cannot "Undo/Redo" and enable when possible', () => {
        mockDocumentServiceUndoRedoState$.next({ canUndo: true, canRedo: false });
        const items1 = getLatestItems();
        const undo1 = items1.find((i) => i.action === IdpDocumentAction.Undo);
        const redo1 = items1.find((i) => i.action === IdpDocumentAction.Redo);
        expect(undo1.disabled).toBeFalse();
        expect(redo1.disabled).toBeTrue();

        mockDocumentServiceUndoRedoState$.next({ canUndo: false, canRedo: true });
        const items2 = getLatestItems();
        const undo2 = items2.find((i) => i.action === IdpDocumentAction.Undo);
        const redo2 = items2.find((i) => i.action === IdpDocumentAction.Redo);
        expect(undo2.disabled).toBeTrue();
        expect(redo2.disabled).toBeFalse();
    });

    it('should enable "Change Class" when at least one page selected', () => {
        const document1 = createMockDocument('document1', 2);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        const items = getLatestItems();
        const cc = items.find((i) => i.action === IdpDocumentAction.ChangeClass);
        expect(cc.disabled).toBeFalse();
    });

    it('should enable "Split" only when single document or subset of its pages selected', () => {
        const document1 = createMockDocument('document1', 4);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document1.pages[1]]);
        const items1 = getLatestItems();
        const split1 = items1.find((i) => i.action === IdpDocumentAction.Split);
        expect(split1.disabled).toBeFalse();

        mockDocumentServiceSelectedPages$.next([...document1.pages]);
        const items2 = getLatestItems();
        const split2 = items2.find((i) => i.action === IdpDocumentAction.Split);
        expect(split2.disabled).toBeTrue();
    });

    it('should enable "Merge" when pages from multiple documents selected', () => {
        const document1 = createMockDocument('document1', 2);
        const document2 = createMockDocument('document2', 3);
        mockDocumentServiceAllDocuments$.next([document1, document2]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document2.pages[0]]);
        const merge = getLatestItems().find((i) => i.action === IdpDocumentAction.Merge);
        expect(merge.disabled).toBeFalse();
    });

    it('should enable "Delete" when any pages selected', () => {
        const document1 = createMockDocument('document1', 1);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        const del = getLatestItems().find((i) => i.action === IdpDocumentAction.Delete);
        expect(del.disabled).toBeFalse();
    });

    it('should enable "Flag" when at least one unflagged document selected or only one flagged', () => {
        const document1 = createMockDocument('document1', 1, { rejectedReasonId: 'r1' });
        const document2 = createMockDocument('document2', 1);
        mockDocumentServiceAllDocuments$.next([document1, document2]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document2.pages[0]]);
        const flag1 = getLatestItems().find((i) => i.action === IdpDocumentAction.Reject);
        expect(flag1.disabled).toBeTrue();

        mockDocumentServiceAllDocuments$.next([document1, { ...document2, rejectedReasonId: 'r2' }]);
        const flag2 = getLatestItems().find((i) => i.action === IdpDocumentAction.Reject);
        expect(flag2.disabled).toBeTrue();

        mockDocumentServiceAllDocuments$.next([document1]);
        const flag3 = getLatestItems().find((i) => i.action === IdpDocumentAction.Reject);
        expect(flag3.disabled).toBeFalse();

        mockDocumentServiceAllDocuments$.next([document2]);
        const flag4 = getLatestItems().find((i) => i.action === IdpDocumentAction.Reject);
        expect(flag4.disabled).toBeFalse();

        mockDocumentServiceAllDocuments$.next([{ ...document1, rejectedReasonId: undefined }, document2]);
        const flag5 = getLatestItems().find((i) => i.action === IdpDocumentAction.Reject);
        expect(flag5.disabled).toBeFalse();
    });

    it('should enable "Resolve" when all selected documents have issues and class not unclassified', () => {
        const document1 = createMockDocument('document1', 1, { hasIssue: true });
        const document2 = createMockDocument('document2', 1, { hasIssue: true });
        mockDocumentServiceAllDocuments$.next([document1, document2]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document2.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1, document2]);
        const resolve1 = getLatestItems().find((i) => i.action === IdpDocumentAction.Resolve);
        expect(resolve1.disabled).toBeFalse();
    });

    it('should disable "Resolve" when any selected document has unclassified class', () => {
        const document1 = createMockDocument('document1', 1, { hasIssue: true, class: { id: 'class1' } as IdpConfigClass });
        const document2 = createMockDocument('document2', 1, { hasIssue: true, class: { id: UNCLASSIFIED_CLASS_ID } as IdpConfigClass });
        mockDocumentServiceAllDocuments$.next([document1, document2]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document2.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1, document2]);
        const resolve = getLatestItems().find((i) => i.action === IdpDocumentAction.Resolve);
        expect(resolve.disabled).toBeTrue();
    });

    it('should disable "Resolve" when document has no class', () => {
        const document1 = createMockDocument('document1', 1, { hasIssue: true });
        document1.class = undefined;
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1]);
        const resolve = getLatestItems().find((i) => i.action === IdpDocumentAction.Resolve);
        expect(resolve.disabled).toBeTrue();
    });

    it('should disable "Resolve" when document has no issue', () => {
        const document1 = createMockDocument('document1', 1, { hasIssue: false });
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1]);
        const resolve = getLatestItems().find((i) => i.action === IdpDocumentAction.Resolve);
        expect(resolve.disabled).toBeTrue();
    });

    it('should call undoAction on "Undo"', () => {
        mockDocumentServiceUndoRedoState$.next({ canUndo: true, canRedo: false });
        const undo = getLatestItems().find((i) => i.action === IdpDocumentAction.Undo);
        undo.onClick$.next();
        expect(mockDocumentService.undoAction).toHaveBeenCalled();
    });

    it('should open change class dialog and call setDocumentClass on "Change Class"', () => {
        spyOn(service, 'openChangeClassDialog').and.callThrough();

        mockMatDialogReturn({ id: 'new_class' });

        const document1 = createMockDocument('document1', 1);
        const document2 = createMockDocument('document2', 1);
        mockDocumentServiceAllDocuments$.next([document1, document2]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1, document2]);
        const item = getLatestItems().find((i) => i.action === IdpDocumentAction.ChangeClass);
        item.onClick$.next();
        expect(service.openChangeClassDialog).toHaveBeenCalled();
        expect(mockDocumentService.setDocumentClass).toHaveBeenCalledWith(IdpDocumentAction.ChangeClass, true, [document1.pages[0]], 'new_class');
    });

    it('should delete pages on "Delete"', () => {
        mockMatDialogReturn(true);

        const document1 = createMockDocument('document1', 2);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        const item = getLatestItems().find((i) => i.action === IdpDocumentAction.Delete);
        item.onClick$.next();
        expect(mockDocumentService.deletePages).toHaveBeenCalledWith(IdpDocumentAction.Delete, true, [document1.pages[0]]);
    });

    it('should mark pages resolved on "Resolve"', () => {
        const document1 = createMockDocument('document1', 1, { hasIssue: true });
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1]);
        const item = getLatestItems().find((i) => i.action === IdpDocumentAction.Resolve);
        item.onClick$.next();
        expect(mockDocumentService.markResolved).toHaveBeenCalledWith(IdpDocumentAction.Resolve, true, [document1.pages[0]]);
    });

    it('should mark pages rejected on "Reject"', () => {
        const document1 = createMockDocument('document1', 1);
        const document2 = createMockDocument('document2', 1);
        mockDocumentServiceAllDocuments$.next([document1, document2]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document2.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1, document2]);

        mockMatDialogReturn({ rejectReason: { id: 'reason1' }, rejectNote: 'note 1' });

        const item = getLatestItems().find((i) => i.action === IdpDocumentAction.Reject);
        item.onClick$.next();
        expect(mockDocumentService.markRejected).toHaveBeenCalledWith(
            IdpDocumentAction.Reject,
            true,
            [document1.pages[0], document2.pages[0]],
            'reason1',
            'note 1'
        );
    });

    it('should remove document flag when "Reject" dialog returns shouldRemoveFlag', () => {
        const document1 = createMockDocument('document1', 1, { rejectedReasonId: 'reason1', rejectNote: 'old note' });
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1]);

        mockMatDialogReturn({ shouldRemoveFlag: true });

        const item = getLatestItems().find((i) => i.action === IdpDocumentAction.Reject);
        item.onClick$.next();
        expect(mockDocumentService.removeDocumentFlag).toHaveBeenCalledWith(IdpDocumentAction.Reject, true, [document1.pages[0]]);
        expect(mockDocumentService.markRejected).not.toHaveBeenCalled();
    });

    it('should handle keyboard shortcut for "Delete"', () => {
        mockMatDialogReturn(true);

        const document1 = createMockDocument('document1', 1);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        mockShortcutService.getShortcutForEvent.and.returnValue({ action: IdpShortcutAction.PageDelete } as IdpShortcut);
        const handled = service.handleShortcutAction(new KeyboardEvent('keydown', { key: 'Delete' }));
        expect(handled).toBeTrue();
        expect(mockDocumentService.deletePages).toHaveBeenCalled();
    });

    it('should return false when no shortcut mapped', () => {
        mockShortcutService.getShortcutForEvent.and.returnValue(undefined);
        const handled = service.handleShortcutAction(new KeyboardEvent('keydown', { key: 'x' }));
        expect(handled).toBeFalse();
    });

    it('should call redoAction on "Redo"', () => {
        mockDocumentServiceUndoRedoState$.next({ canUndo: false, canRedo: true });
        const items = getLatestItems();
        const redo = items.find((i) => i.action === IdpDocumentAction.Redo);
        expect(redo.disabled).toBeFalse();
        redo.onClick$.next();
        expect(mockDocumentService.redoAction).toHaveBeenCalled();
    });

    it('should call splitDocument on "Split"', () => {
        const document1 = createMockDocument('document1', 4);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document1.pages[1]]);
        mockDocumentServiceSelectedDocuments$.next([document1]);
        const splitItem = getLatestItems().find((i) => i.action === IdpDocumentAction.Split);
        expect(splitItem.disabled).toBeFalse();
        splitItem.onClick$.next();
        expect(mockDocumentService.splitDocument).toHaveBeenCalledWith(IdpDocumentAction.Split, true, [document1.pages[0], document1.pages[1]]);
    });

    it('should call mergeDocuments on "Merge"', () => {
        const document1 = createMockDocument('document1', 2);
        const document2 = createMockDocument('document2', 2);
        mockDocumentServiceAllDocuments$.next([document1, document2]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document2.pages[0]]);
        const mergeItem = getLatestItems().find((i) => i.action === IdpDocumentAction.Merge);
        expect(mergeItem.disabled).toBeFalse();
        mergeItem.onClick$.next();
        expect(mockDocumentService.mergeDocuments).toHaveBeenCalledWith(
            IdpDocumentAction.Merge,
            true,
            [document1.pages[0], document2.pages[0]],
            document1.pages[0].documentId
        );
    });

    it('should pre-populate reject dialog data when single rejected document selected', () => {
        const document1 = createMockDocument('document1', 2, { rejectedReasonId: 'reason3', rejectNote: 'existing note' });
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1]);
        const rejectItem = getLatestItems().find((i) => i.action === IdpDocumentAction.Reject);
        expect(rejectItem.disabled).toBeFalse();

        mockMatDialogReturn({ rejectReason: { id: document1.rejectedReasonId }, rejectNote: document1.rejectNote });

        rejectItem.onClick$.next();
        expect(mockMatDialog.open).toHaveBeenCalledWith(
            jasmine.anything(),
            jasmine.objectContaining({ data: jasmine.objectContaining({ rejectReasonId: 'reason3', rejectNote: 'existing note' }) })
        );
    });

    it('should not perform action when toolbar item clicked with no selected pages', () => {
        mockDocumentServiceSelectedPages$.next([]);
        const deleteItem = getLatestItems().find((i) => i.action === IdpDocumentAction.Delete);
        deleteItem.onClick$.next();
        expect(mockDocumentService.deletePages).not.toHaveBeenCalled();
    });

    it('should not open dialog in openChangeClassDialog if a dialog is already open', () => {
        const document1 = createMockDocument('document1', 1);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);

        mockMatDialog.openDialogs.push({} as MatDialogRef<any>);

        service.openChangeClassDialog([document1.pages[0]], IdpDocumentAction.ChangeClass, ['existingClass']);
        expect(mockMatDialog.open).not.toHaveBeenCalled();
    });

    it('should not open dialog in deletePages if a dialog i already open', () => {
        const document1 = createMockDocument('document1', 1);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);

        mockMatDialog.openDialogs.push({} as MatDialogRef<any>);

        service.deletePages([document1.pages[0]], IdpDocumentAction.Delete);
        expect(mockMatDialog.open).not.toHaveBeenCalled();
    });

    it('should not open dialog in handleRejectPage when a dialog is already open', () => {
        const document1 = createMockDocument('document1', 1);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);

        mockMatDialog.openDialogs.push({} as MatDialogRef<any>);

        service.handleRejectPage([document1.pages[0]], IdpDocumentAction.Reject);
        expect(mockMatDialog.open).not.toHaveBeenCalled();
    });

    it('should return false for handleShortcutAction when event is undefined', () => {
        const result = service.handleShortcutAction(undefined as unknown as KeyboardEvent);
        expect(result).toBeFalse();
    });

    it('should return false for handleShortcutAction when dialog open', () => {
        mockMatDialog.openDialogs.push({} as MatDialogRef<any>);

        mockShortcutService.getShortcutForEvent.and.returnValue({ action: IdpShortcutAction.PageDelete } as IdpShortcut);

        const result = service.handleShortcutAction(new KeyboardEvent('keydown', { key: 'Delete' }));
        expect(result).toBeFalse();
        expect(mockDocumentService.deletePages).not.toHaveBeenCalled();
    });

    it('should toggle view filter for IssueOnlyFilter shortcut when not full screen', () => {
        mockDocumentServiceFullScreenMode$.next(false);
        mockShortcutService.getShortcutForEvent.and.returnValue({ action: IdpShortcutAction.IssueOnlyFilter } as IdpShortcut);
        const result = service.handleShortcutAction(new KeyboardEvent('keydown', { key: 'i' }));
        expect(result).toBeTrue();
        expect(mockDocumentService.toggleViewFilter).toHaveBeenCalled();
    });

    it('should call splitDocument on handlePageSplit', () => {
        const document1 = createMockDocument('document1', 3);
        const pages = [document1.pages[0], document1.pages[1]];
        service.handlePageSplit(pages, IdpDocumentAction.Split);
        expect(mockDocumentService.splitDocument).toHaveBeenCalledWith(IdpDocumentAction.Split, true, pages);
    });

    it('should call mergeDocuments on handlePageMerge', () => {
        const document1 = createMockDocument('document1', 2);
        const document2 = createMockDocument('document2', 2);
        const pages = [document1.pages[0], document2.pages[0]];
        service.handlePageMerge(pages, IdpDocumentAction.Merge);
        expect(mockDocumentService.mergeDocuments).toHaveBeenCalledWith(IdpDocumentAction.Merge, true, pages, pages[0].documentId);
    });

    it('should call movePagesAndCreate on handleMovePageAndCreateNewDoc', () => {
        const document1 = createMockDocument('document1', 2);
        const pages = [document1.pages[0]];
        service.handleMovePageAndCreateNewDoc(pages, 'targetDocument');
        expect(mockDocumentService.movePagesAndCreate).toHaveBeenCalledWith(IdpDocumentAction.MovePageAndCreate, true, pages, 'targetDocument');
    });

    it('should call movePages on handleMovePages', () => {
        const document1 = createMockDocument('document1', 3);
        const pages = [document1.pages[1]];
        service.handleMovePages(pages, 'targetDocument', 5);
        expect(mockDocumentService.movePages).toHaveBeenCalledWith(IdpDocumentAction.MovePage, true, pages, 'targetDocument', 5);
    });

    it('should call createPageCopies on handleCreateCopy', () => {
        const document1 = createMockDocument('document1', 5);
        const pages = [document1.pages[0], document1.pages[1]];
        service.handleCreateCopy(pages, IdpDocumentAction.CreateCopy);
        expect(mockDocumentService.createPageCopies).toHaveBeenCalledWith(IdpDocumentAction.CreateCopy, true, pages);
    });

    it('should call createPageCopies on "Create Copy" toolbar action click', () => {
        const document1 = createMockDocument('document1', 10);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0], document1.pages[1]]);
        mockDocumentServiceSelectedDocuments$.next([document1]);
        mockActivePageCount$.next(50);

        const createCopyItem = getLatestItems().find((i) => i.action === IdpDocumentAction.CreateCopy);
        expect(createCopyItem.disabled).toBeFalse();
        createCopyItem.onClick$.next();

        expect(mockDocumentService.createPageCopies).toHaveBeenCalledWith(IdpDocumentAction.CreateCopy, true, [
            document1.pages[0],
            document1.pages[1],
        ]);
    });

    it('should handle "Create Copy" keyboard shortcut', () => {
        const document1 = createMockDocument('document1', 5);
        mockDocumentServiceAllDocuments$.next([document1]);
        mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
        mockDocumentServiceSelectedDocuments$.next([document1]);
        mockActivePageCount$.next(10);

        mockShortcutService.getShortcutForEvent.and.returnValue({ action: IdpShortcutAction.PageCreateCopy } as IdpShortcut);
        const handled = service.handleShortcutAction(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, shiftKey: true }));

        expect(handled).toBeTrue();
        expect(mockDocumentService.createPageCopies).toHaveBeenCalled();
    });

    describe('toolbarMessageTemplate$', () => {
        function getTemplateEmission(): MessageTemplate | undefined {
            let latest: MessageTemplate | undefined;
            const subscription = service.toolbarMessageTemplate$.subscribe((value) => (latest = value));
            tick();
            subscription.unsubscribe();
            return latest;
        }

        it('should emit singular cut pages message when exactly one page is cut', fakeAsync(() => {
            const document = createMockDocument('document1', 2);
            mockCutPages$.next([document.pages[0]]);

            const template = getTemplateEmission();

            expect(template?.key).toBe('IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.CUT_PAGES_MESSAGE_SINGULAR');
            expect(template?.args).toBeUndefined();
        }));

        it('should emit plural cut pages message when more than one page is cut', fakeAsync(() => {
            const document = createMockDocument('document1', 3);
            mockCutPages$.next([document.pages[0], document.pages[1]]);

            const template = getTemplateEmission();

            expect(template?.key).toBe('IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.CUT_PAGES_MESSAGE_PLURAL');
            expect(template?.args).toEqual({ count: '2' });
        }));

        it('should emit selected pages message when no cut pages present', fakeAsync(() => {
            const document = createMockDocument('document1', 4);
            mockCutPages$.next([]);
            mockDocumentServiceSelectedPages$.next([document.pages[0], document.pages[1], document.pages[2]]);

            const template = getTemplateEmission();

            expect(template?.key).toBe('IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.SELECTED_PAGES_MESSAGE');
            expect(template?.args).toEqual({ count: '3' });
        }));
    });

    describe('getCreateCopyActionState', () => {
        it('should return enabled true when one document selected and result does not exceed MAX_PAGES', () => {
            const document1 = createMockDocument('document1', 10);
            const selectedPages = [document1.pages[0], document1.pages[1]];
            const activePageCount = 50;

            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockActivePageCount$.next(activePageCount);
            mockDocumentServiceSelectedPages$.next(selectedPages);

            const items = getLatestItems();
            const createCopy = items.find((i) => i.action === IdpDocumentAction.CreateCopy);

            expect(createCopy.disabled).toBeFalse();
            expect(createCopy.showWhenDisabled).toBeUndefined();
            expect(createCopy.showWhenDisabledTooltip).toBeUndefined();
        });

        it('should return enabled false with showWhenDisabled true when one document selected and result exceeds MAX_PAGES', () => {
            const document1 = createMockDocument('document1', 10);
            const selectedPages = [document1.pages[0], document1.pages[1], document1.pages[2]];
            const activePageCount = 999;

            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockActivePageCount$.next(activePageCount);
            mockDocumentServiceSelectedPages$.next(selectedPages);

            const items = getLatestItems();
            const createCopy = items.find((i) => i.action === IdpDocumentAction.CreateCopy);

            expect(createCopy.disabled).toBeTrue();
            expect(createCopy.showWhenDisabled).toBeTrue();
            expect(createCopy.showWhenDisabledTooltip).toBeDefined();
            expect(createCopy.showWhenDisabledTooltip?.key).toBe('IDP_CLASS_VERIFICATION.DOCUMENT_TOOLBAR.CREATE_COPY_DISABLED_MAX_PAGES');
            expect(createCopy.showWhenDisabledTooltip?.args?.maxPageCount).toBe('1000');
        });

        it('should return enabled true when one document selected and result exactly equals MAX_PAGES', () => {
            const document1 = createMockDocument('document1', 10);
            const selectedPages = [document1.pages[0], document1.pages[1]];
            const activePageCount = 998;

            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockActivePageCount$.next(activePageCount);
            mockDocumentServiceSelectedPages$.next(selectedPages);

            const items = getLatestItems();
            const createCopy = items.find((i) => i.action === IdpDocumentAction.CreateCopy);

            expect(createCopy.disabled).toBeFalse();
            expect(createCopy.showWhenDisabled).toBeUndefined();
            expect(createCopy.showWhenDisabledTooltip).toBeUndefined();
        });

        it('should return enabled false without showWhenDisabled when multiple documents selected', () => {
            const document1 = createMockDocument('document1', 5);
            const document2 = createMockDocument('document2', 5);
            const selectedPages = [document1.pages[0], document2.pages[0]];

            mockDocumentServiceAllDocuments$.next([document1, document2]);
            mockDocumentServiceSelectedDocuments$.next([document1, document2]);
            mockActivePageCount$.next(10);
            mockDocumentServiceSelectedPages$.next(selectedPages);

            const items = getLatestItems();
            const createCopy = items.find((i) => i.action === IdpDocumentAction.CreateCopy);

            expect(createCopy.disabled).toBeTrue();
            expect(createCopy.showWhenDisabled).toBeUndefined();
            expect(createCopy.showWhenDisabledTooltip).toBeUndefined();
        });

        it('should return enabled false without showWhenDisabled when no documents selected', () => {
            mockDocumentServiceAllDocuments$.next([]);
            mockDocumentServiceSelectedDocuments$.next([]);
            mockActivePageCount$.next(10);
            mockDocumentServiceSelectedPages$.next([]);

            const items = getLatestItems();
            const createCopy = items.find((i) => i.action === IdpDocumentAction.CreateCopy);

            expect(createCopy.disabled).toBeTrue();
            expect(createCopy.showWhenDisabled).toBeUndefined();
            expect(createCopy.showWhenDisabledTooltip).toBeUndefined();
        });
    });

    describe('ViewReasoning', () => {
        it('should include ViewReasoning item when feature flag is on', () => {
            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            expect(viewReasoning).toBeTruthy();
        });

        it('should exclude ViewReasoning item when feature flag is off', () => {
            mockReasoningFlag$.next(false);
            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            expect(viewReasoning).toBeFalsy();
        });

        it('should enable ViewReasoning when exactly 1 document with selectionReason is selected', () => {
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'AUTOWIN',
                classificationClassCandidates: [{ classId: 'c1', className: 'Class 1', confidence: 0.95, reason: 'test' }],
            });
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);

            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            expect(viewReasoning?.disabled).toBeFalse();
        });

        it('should disable ViewReasoning when multiple documents are selected', () => {
            const document1 = createMockDocument('doc1', 1, { classificationSelectionReason: 'AUTOWIN' });
            const document2 = createMockDocument('doc2', 1, { classificationSelectionReason: 'AUTOWIN' });
            mockDocumentServiceAllDocuments$.next([document1, document2]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0], document2.pages[0]]);

            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            expect(viewReasoning?.disabled).toBeTrue();
        });

        it('should disable ViewReasoning when no documents are selected', () => {
            mockDocumentServiceAllDocuments$.next([]);
            mockDocumentServiceSelectedPages$.next([]);

            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            expect(viewReasoning?.disabled).toBeTrue();
        });

        it('should disable ViewReasoning when single document has no classificationSelectionReason', () => {
            const document1 = createMockDocument('doc1', 1);
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);

            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            expect(viewReasoning?.disabled).toBeTrue();
        });

        it('should enable ViewReasoning when single document has selectionReason but null candidates', () => {
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'DEFAULT_CLASS_ID',
                classificationClassCandidates: null,
            });
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);

            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            expect(viewReasoning?.disabled).toBeFalse();
        });

        it('should open reasoning dialog with correct data on ViewReasoning click', fakeAsync(() => {
            const candidates = [{ classId: 'c1', className: 'Invoice', confidence: 0.95, reason: 'Looks like an invoice' }];
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'AUTOWIN',
                classificationClassCandidates: candidates,
            });
            document1.class = { id: 'c1', name: 'Invoice', isSpecialClass: false, reviewThreshold: 0.8 };
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockMatDialogReturn(undefined);

            tick();

            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            viewReasoning?.onClick$.next();
            tick();

            expect(mockMatDialog.open).toHaveBeenCalled();
            const dialogData = mockMatDialog.open.calls.mostRecent().args[1]?.data as any;
            expect(dialogData.selectionReason).toBe('AUTOWIN');
            expect(dialogData.documentName).toBe(document1.name);
            expect(dialogData.candidates.length).toBe(1);
            expect(dialogData.candidates[0].name).toBe('Invoice');
            expect(dialogData.candidates[0].confidence).toBe('95%');
            expect(dialogData.candidates[0].reason).toBe('Looks like an invoice');
            expect(dialogData.candidates[0].isSelected).toBeTrue();
        }));

        it('should mark first candidate as selected (AI winner), not by classId match', fakeAsync(() => {
            const candidates = [
                { classId: 'c1', className: 'Invoice', confidence: 0.95, reason: 'Top candidate' },
                { classId: 'c2', className: 'Contract', confidence: 0.8, reason: 'Second candidate' },
            ];
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'AUTOWIN',
                classificationClassCandidates: candidates,
            });
            document1.class = { id: 'c2', name: 'Contract', isSpecialClass: false };
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockMatDialogReturn(undefined);

            tick();
            const items = getLatestItems();
            items.find((i) => i.action === IdpDocumentAction.ViewReasoning)?.onClick$.next();
            tick();

            const dialogData = mockMatDialog.open.calls.mostRecent().args[1]?.data as any;
            expect(dialogData.candidates[0].isSelected).toBeTrue();
            expect(dialogData.candidates[1].isSelected).toBeFalse();
        }));

        it('should not mark any candidate as selected for unclassified documents (doc.class is undefined)', fakeAsync(() => {
            const candidates = [
                { classId: 'c1', className: 'Invoice', confidence: 0.28, reason: 'test' },
                { classId: 'c2', className: 'Contract', confidence: 0.15, reason: 'second' },
            ];
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'BELOW_ASSIGNMENT_THRESHOLD',
                classificationClassCandidates: candidates,
            });
            document1.class = undefined;
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockMatDialogReturn(undefined);

            tick();
            const items = getLatestItems();
            items.find((i) => i.action === IdpDocumentAction.ViewReasoning)?.onClick$.next();
            tick();

            const dialogData = mockMatDialog.open.calls.mostRecent().args[1]?.data as any;
            expect(dialogData.candidates[0].isSelected).toBeFalse();
            expect(dialogData.candidates[1].isSelected).toBeFalse();
        }));

        it('should not mark any candidate as selected for unclassified documents (doc.class is null)', fakeAsync(() => {
            const candidates = [{ classId: 'c1', className: 'Invoice', confidence: 0.4, reason: 'test' }];
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'BELOW_ASSIGNMENT_THRESHOLD',
                classificationClassCandidates: candidates,
            });
            document1.class = null as any;
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockMatDialogReturn(undefined);

            tick();
            const items = getLatestItems();
            items.find((i) => i.action === IdpDocumentAction.ViewReasoning)?.onClick$.next();
            tick();

            const dialogData = mockMatDialog.open.calls.mostRecent().args[1]?.data as any;
            expect(dialogData.candidates[0].isSelected).toBeFalse();
        }));

        it('should open dialog with empty candidates when classificationClassCandidates is null', fakeAsync(() => {
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'DEFAULT_CLASS_ID',
                classificationClassCandidates: null,
            });
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockMatDialogReturn(undefined);

            tick();
            const items = getLatestItems();
            items.find((i) => i.action === IdpDocumentAction.ViewReasoning)?.onClick$.next();
            tick();

            expect(mockMatDialog.open).toHaveBeenCalled();
            const dialogData = mockMatDialog.open.calls.mostRecent().args[1]?.data as any;
            expect(dialogData.selectionReason).toBe('DEFAULT_CLASS_ID');
            expect(dialogData.candidates.length).toBe(0);
        }));

        it('should format 0 confidence as 0% and 1.0 confidence as 100%', fakeAsync(() => {
            const candidates = [
                { classId: 'c1', className: 'Zero', confidence: 0, reason: null },
                { classId: 'c2', className: 'Full', confidence: 1.0, reason: null },
            ];
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'AUTOWIN',
                classificationClassCandidates: candidates,
            });
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockMatDialogReturn(undefined);

            tick();
            const items = getLatestItems();
            items.find((i) => i.action === IdpDocumentAction.ViewReasoning)?.onClick$.next();
            tick();

            const dialogData = mockMatDialog.open.calls.mostRecent().args[1]?.data as any;
            expect(dialogData.candidates[0].confidence).toBe('0%');
            expect(dialogData.candidates[1].confidence).toBe('100%');
        }));

        it('should not open reasoning dialog when another dialog is already open', fakeAsync(() => {
            const document1 = createMockDocument('doc1', 1, {
                classificationSelectionReason: 'AUTOWIN',
                classificationClassCandidates: [{ classId: 'c1', className: 'Invoice', confidence: 0.95, reason: 'test' }],
            });
            mockDocumentServiceAllDocuments$.next([document1]);
            mockDocumentServiceSelectedPages$.next([document1.pages[0]]);
            mockDocumentServiceSelectedDocuments$.next([document1]);
            mockMatDialog.openDialogs.push({} as MatDialogRef<any>);
            mockMatDialog.open.calls.reset();

            tick();
            const items = getLatestItems();
            items.find((i) => i.action === IdpDocumentAction.ViewReasoning)?.onClick$.next();
            tick();

            expect(mockMatDialog.open).not.toHaveBeenCalled();
            mockMatDialog.openDialogs.length = 0;
        }));

        it('should have displayOrder of 3', () => {
            const items = getLatestItems();
            const viewReasoning = items.find((i) => i.action === IdpDocumentAction.ViewReasoning);
            expect(viewReasoning?.displayOrder).toBe(3);
            expect(viewReasoning?.icon).toBe('info');
        });
    });
});

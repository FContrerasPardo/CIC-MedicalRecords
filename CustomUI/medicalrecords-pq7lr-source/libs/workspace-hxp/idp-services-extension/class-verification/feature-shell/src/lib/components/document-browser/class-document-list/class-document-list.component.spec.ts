/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IdpDocumentToolbarService } from '../../../services/document/idp-document-toolbar.service';
import { IdpDocumentService } from '../../../services/document/idp-document.service';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { FeaturesServiceToken, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { mockIdpDocuments } from '../../../models/mocked/mocked-documents';
import { NoopTranslateModule } from '@alfresco/adf-core';
import {
    IdpKeyboardNavAction,
    IdpKeyboardNavigationService,
    IdpKeyboardNavActionTypeInternal,
} from '../../../services/document/idp-keyboard-navigation.service';
import { IdpDocumentMultiselectService } from '../../../services/document/idp-document-multiselect.service';
import { IdpNavSelectionType } from '../../../models/common-models';
import { ClassDocumentListComponent } from './class-document-list.component';
import { IdpDocument, IdpDocumentPage } from '../../../models/screen-models';
import { IdpShortcutAction } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpDocumentDragDropService } from '../../../services/document/idp-drag-drop.service';
import { mockIdpConfigClasses } from '../../../models/mocked/mocked-classes';
import { DocumentListComponent } from '../document-list/document-list.component';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';

type DocumentData = IdpDocument & { allPagesSelected: boolean };

describe('ClassDocumentListComponent', () => {
    let component: ClassDocumentListComponent;
    let fixture: ComponentFixture<ClassDocumentListComponent>;
    let idpDocumentToolbarServiceMock: jasmine.SpyObj<IdpDocumentToolbarService>;
    let idpDocumentServiceMock: jasmine.SpyObj<IdpDocumentService>;
    let idpDocumentMultiselectServiceMock: any;
    let idpKeyboardNavigationServiceMock: jasmine.SpyObj<IdpKeyboardNavigationService>;
    let idpDocumentDragDropServiceMock: any;
    let allDocumentsForSelectedClass: IdpDocument[];
    let mockedAction: IdpKeyboardNavAction;
    let allPagesForSelectedClass: IdpDocumentPage[];
    let selectedPages: IdpDocumentPage[];
    let actionSubject$: Subject<IdpKeyboardNavAction>;
    let selectedPagesSubject: BehaviorSubject<IdpDocumentPage[]>;

    beforeEach(() => {
        const mockedDocuments = mockIdpDocuments();
        allDocumentsForSelectedClass = [mockedDocuments[1], mockedDocuments[2]];
        for (const page of allDocumentsForSelectedClass[0].pages) {
            page.isSelected = true;
        }
        allDocumentsForSelectedClass[0].isExpanded = true;
        allDocumentsForSelectedClass[1].isExpanded = false;

        allPagesForSelectedClass = allDocumentsForSelectedClass.flatMap((d) => d.pages);
        selectedPages = allDocumentsForSelectedClass[0].pages;

        mockedAction = {
            type: IdpKeyboardNavActionTypeInternal.Expand,
            currentActiveInfo: { id: 'test', activeContext: undefined },
            selectionAction: 'single',
            event: undefined,
            containerContext: {
                contextId: mockedDocuments[1].class?.id as string,
                contextType: 'class',
            },
            itemContext: {
                contextId: 'test',
                contextType: 'document',
            },
            data: undefined,
        };

        actionSubject$ = new Subject<IdpKeyboardNavAction>();
        selectedPagesSubject = new BehaviorSubject<IdpDocumentPage[]>([]);

        idpDocumentToolbarServiceMock = jasmine.createSpyObj<IdpDocumentToolbarService>('IdpDocumentToolbarService', [
            'handleMovePageAndCreateNewDoc',
            'handlePageSplit',
            'handlePageSplit',
            'handleMovePages',
        ]);

        idpDocumentServiceMock = jasmine.createSpyObj<IdpDocumentService>(
            'IdpDocumentService',
            [
                'toggleExpandDocument',
                'getDocumentsForClass',
                'togglePreviewedDocument',
                'updatePagesRotation',
                'copyDocumentDetailsToClipboard',
                'cutSelectedPages',
                'clearCutPages',
            ],
            {
                allPagesForSelectedClass$: of(allPagesForSelectedClass),
                selectedDocuments$: of(allDocumentsForSelectedClass),
                selectedPages$: selectedPagesSubject.asObservable(),
                allDocumentsForSelectedClass$: of(allDocumentsForSelectedClass),
                cutPages$: of([]),
            }
        );
        idpDocumentServiceMock.getDocumentsForClass.and.returnValue(of(allDocumentsForSelectedClass));

        idpDocumentMultiselectServiceMock = {
            clearSelection: jasmine.createSpy('clearSelection').and.returnValue(of([])),
            selectAll: jasmine.createSpy('selectAll').and.returnValue(of([])),
            documentSelected: jasmine.createSpy('documentSelected'),
            pageSelected: jasmine
                .createSpy('pageSelected')
                .and.callFake((pageId: string, mode: IdpNavSelectionType, toggle = false) => ({ pageId, mode, toggle })),
        };

        idpDocumentDragDropServiceMock = {
            addDropList: jasmine.createSpy('addDropList').and.callThrough(),
            removeDropList: jasmine.createSpy('removeDropList').and.callThrough(),
            lists$: of([]),
            draggingObject$: of({}),
            isDragging$: of(false),
            setDraggingState: jasmine.createSpy('setDraggingState'),
            setDraggingTarget: jasmine.createSpy('setDraggingTarget'),
        };

        idpKeyboardNavigationServiceMock = jasmine.createSpyObj<IdpKeyboardNavigationService>(
            'IdpKeyboardNavigationService',
            ['registerContext', 'unregisterContext'],
            {
                action$: actionSubject$.asObservable(),
            }
        );

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, ClassDocumentListComponent, SatIconModule],
            providers: [
                { provide: IdpDocumentDragDropService, useValue: idpDocumentDragDropServiceMock },
                { provide: IdpDocumentMultiselectService, useValue: idpDocumentMultiselectServiceMock },
                { provide: IdpKeyboardNavigationService, useValue: idpKeyboardNavigationServiceMock },
                { provide: IdpDocumentToolbarService, useValue: idpDocumentToolbarServiceMock },
                { provide: IdpDocumentService, useValue: idpDocumentServiceMock },
                provideMockFeatureFlags({
                    [WORKSPACE_IDP_HXP.CLASSIFICATION_SETTINGS]: true,
                    [WORKSPACE_IDP_HXP.CLASS_VERIFICATION_CUT_INSERT]: true,
                }),
                {
                    provide: FeaturesServiceToken,
                    useValue: { isOn$: () => of(true), getFlags$: () => of([]) },
                },
            ],
        });

        fixture = TestBed.createComponent(ClassDocumentListComponent);
        component = fixture.componentInstance;
        component.classId = mockedDocuments[1].class?.id as string;
        fixture.detectChanges();
    });

    it('should set correct documents', fakeAsync(() => {
        const documents: DocumentData[] = [];
        component.documents$.subscribe((data) => {
            documents.push(...data);
        });
        tick(2000);

        expect(documents.length).toBe(allDocumentsForSelectedClass.length);
        expect(documents[0]).toEqual({
            ...allDocumentsForSelectedClass[0],
            allPagesSelected: true,
        });
        expect(documents[1]).toEqual({
            ...allDocumentsForSelectedClass[1],
            allPagesSelected: false,
        });
    }));

    it('should unregister context on destroy', () => {
        fixture.destroy();
        expect(idpKeyboardNavigationServiceMock.unregisterContext).toHaveBeenCalled();
    });

    it('should register context after init', () => {
        component.ngAfterViewInit();
        expect(idpKeyboardNavigationServiceMock.registerContext).toHaveBeenCalled();
    });

    it('should call document selected on onItemMouseUp with ctrlKey or metaKey', () => {
        const document = allDocumentsForSelectedClass[0];
        const action = mockedAction;
        action.data = { ...selectedPages[0], isSelected: true };
        action.type = IdpShortcutAction.NavigateSelectDown;
        action.selectionAction = 'multi';

        const element = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-document__0"]') as HTMLElement;

        actionSubject$.next(action);
        element.dispatchEvent(new MouseEvent('mouseup', { ctrlKey: true }));
        fixture.detectChanges();

        expect(idpDocumentMultiselectServiceMock.documentSelected).toHaveBeenCalledWith(document.id, 'multi', true);

        actionSubject$.next(action);
        element.dispatchEvent(new MouseEvent('mouseup', { metaKey: true }));
        fixture.detectChanges();

        expect(idpDocumentMultiselectServiceMock.documentSelected).toHaveBeenCalledWith(document.id, 'multi', true);
    });

    it('should return from toggleList if item is expanded and force operation is expand ', () => {
        const item = { ...allDocumentsForSelectedClass[0], isExpanded: true };

        component.toggleList(item, 'expand');

        expect(idpDocumentServiceMock.toggleExpandDocument).not.toHaveBeenCalled();
    });

    it('should return from toggleList if item is not expanded and force operation is collapse ', () => {
        const item = { ...allDocumentsForSelectedClass[0], isExpanded: false };

        component.toggleList(item, 'collapse');

        expect(idpDocumentServiceMock.toggleExpandDocument).not.toHaveBeenCalled();
    });

    it('should call toggleExpandDocument from toggleList', () => {
        const item = { ...allDocumentsForSelectedClass[0], isExpanded: false };

        component.toggleList(item);

        expect(idpDocumentServiceMock.toggleExpandDocument).toHaveBeenCalledOnceWith(item.id);
    });

    it('should emit canCutPages$ based on selected pages', fakeAsync(() => {
        const values: boolean[] = [];
        component.canCutPages$.subscribe((value) => values.push(value));

        const emptySelectedPages: IdpDocumentPage[] = [];
        selectedPagesSubject.next(emptySelectedPages);
        tick();

        const sameDocumentPages = selectedPages.slice(0, 2).map((page) => ({ ...page, documentId: 'doc-1' }));
        selectedPagesSubject.next(sameDocumentPages);
        tick();

        const mixedDocumentPages = [
            { ...selectedPages[0], documentId: 'doc-1' },
            { ...selectedPages[1], documentId: 'doc-2' },
        ];
        selectedPagesSubject.next(mixedDocumentPages);
        tick();

        expect(values).toEqual([false, false, true, false]);
    }));

    it('should return from onNavigationAction if contextType is not page', () => {
        const action = mockedAction;
        action.type = IdpShortcutAction.SelectAllContextOnly;
        action.itemContext.contextType = 'class';

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.selectAll).not.toHaveBeenCalled();
    });

    it('should return from onNavigationAction if item does not exist', () => {
        const action = mockedAction;
        action.data = undefined;
        action.type = IdpShortcutAction.SelectAllContextOnly;

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.selectAll).not.toHaveBeenCalled();
    });

    it('should call selectAll with document argument', () => {
        const action = mockedAction;
        action.type = IdpShortcutAction.SelectAllContextOnly;
        action.data = selectedPages[0];

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.selectAll).toHaveBeenCalledOnceWith('document');
    });

    it('should cut pages when PageCut shortcut is triggered', () => {
        idpDocumentServiceMock.cutSelectedPages.calls.reset();
        component.isCutInsertFeatureOn = true;
        const document = allDocumentsForSelectedClass[0];
        const action: IdpKeyboardNavAction = {
            ...mockedAction,
            type: IdpShortcutAction.PageCut,
            data: document,
            itemContext: { ...mockedAction.itemContext, contextId: document.id },
            currentActiveInfo: { id: document.id, activeContext: undefined },
        };

        actionSubject$.next(action);

        expect(idpDocumentServiceMock.cutSelectedPages).toHaveBeenCalled();
    });

    it('should clear cut pages when PageCutClear shortcut is triggered', () => {
        idpDocumentServiceMock.clearCutPages.calls.reset();
        component.isCutInsertFeatureOn = true;
        const document = allDocumentsForSelectedClass[0];
        const action: IdpKeyboardNavAction = {
            ...mockedAction,
            type: IdpShortcutAction.PageCutClear,
            data: document,
            itemContext: { ...mockedAction.itemContext, contextId: document.id },
            currentActiveInfo: { id: document.id, activeContext: undefined },
        };

        actionSubject$.next(action);

        expect(idpDocumentServiceMock.clearCutPages).toHaveBeenCalled();
    });

    it('should open context menu when OpenContextMenu shortcut is triggered', () => {
        component.isCutInsertFeatureOn = true;
        const document = allDocumentsForSelectedClass[0];
        const action: IdpKeyboardNavAction = {
            ...mockedAction,
            type: IdpShortcutAction.OpenContextMenu,
            data: document,
            itemContext: { ...mockedAction.itemContext, contextId: document.id },
            currentActiveInfo: { id: document.id, activeContext: undefined },
        };

        const documentList = fixture.debugElement.query(By.directive(DocumentListComponent)).componentInstance as DocumentListComponent;
        spyOn(documentList, 'openContextMenuForDocument').and.callThrough();

        actionSubject$.next(action);

        expect(documentList.openContextMenuForDocument).toHaveBeenCalledWith(document.id);
    });

    it('should call toggleList', () => {
        const action = mockedAction;
        action.type = IdpKeyboardNavActionTypeInternal.Expand;
        action.data = selectedPages[0];

        spyOn(component, 'toggleList').and.callThrough();

        actionSubject$.next(action);

        expect(component.toggleList).toHaveBeenCalledOnceWith(action.data as IdpDocument, 'expand');
    });

    it('should call toggleList with expand argument', () => {
        const action = mockedAction;
        action.type = IdpKeyboardNavActionTypeInternal.Expand;
        action.data = selectedPages[0];

        spyOn(component, 'toggleList').and.callThrough();

        actionSubject$.next(action);

        expect(component.toggleList).toHaveBeenCalledOnceWith(action.data as IdpDocument, 'expand');
    });

    it('should call toggleList with collapse argument', () => {
        const action = mockedAction;
        action.type = IdpShortcutAction.Collapse;
        action.data = {
            ...selectedPages[0],
            isExpanded: true,
        };

        spyOn(component, 'toggleList').and.callThrough();

        actionSubject$.next(action);

        expect(component.toggleList).toHaveBeenCalledOnceWith(action.data as IdpDocument, 'collapse');
    });

    it('should call next on collapseContainer', () => {
        const action = mockedAction;
        action.type = IdpKeyboardNavActionTypeInternal.Collapse;
        action.data = {
            ...selectedPages[0],
            isExpanded: false,
        };

        spyOn(component.collapseContainer, 'next').and.callThrough();

        actionSubject$.next(action);

        expect(component.collapseContainer.next).toHaveBeenCalled();
        expect(idpDocumentMultiselectServiceMock.selectAll).not.toHaveBeenCalled();
    });

    it('should return from onNavigationAction if activeItemId is not defined', () => {
        const action = mockedAction;
        action.type = IdpKeyboardNavActionTypeInternal.Collapse;
        action.data = {
            ...selectedPages[0],
            isExpanded: false,
        };
        action.selectionAction = 'multi';
        action.currentActiveInfo = {
            id: '',
            activeContext: undefined,
        };

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.documentSelected).not.toHaveBeenCalled();
    });

    it('should call clearSelection on documentMultiselectService if selectionAction is none', () => {
        const action = mockedAction;
        action.type = IdpKeyboardNavActionTypeInternal.Collapse;
        action.data = {
            ...selectedPages[0],
            isExpanded: false,
        };
        action.selectionAction = 'none';
        action.currentActiveInfo = {
            id: 'test',
            activeContext: {
                contextType: 'root',
                contextId: '',
            },
        };

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.clearSelection).toHaveBeenCalled();
    });

    it('should format document name', () => {
        const document = mockIdpDocuments()[0];
        document.id = '123apple5678banana';
        const documentClasses = mockIdpConfigClasses();

        const expectedId = '123apple';
        const unclassifiedDocumentName = 'IDP_CLASS_VERIFICATION.DOCUMENT_LIST.UNCLASSIFIED_DOCUMENT_NAME';
        const rejectedDocumentName = 'IDP_CLASS_VERIFICATION.DOCUMENT_LIST.REJECTED_DOCUMENT_NAME';

        document.class = undefined;
        const nameForUndefinedClass = component.formatDocumentName(document);
        expect(nameForUndefinedClass).toBe(`${unclassifiedDocumentName} - ${expectedId}`);

        document.class = documentClasses[1];
        const nameForUnclassifiedClass = component.formatDocumentName(document);
        expect(nameForUnclassifiedClass).toBe(`${unclassifiedDocumentName} - ${expectedId}`);

        document.class = documentClasses[0];
        const nameForRejectedClass = component.formatDocumentName(document);
        expect(nameForRejectedClass).toBe(`${rejectedDocumentName} - ${expectedId}`);

        document.class = documentClasses[2];
        document.rejectedReasonId = 'reject-reason-1';
        const nameForRejectedClassByRejectedReasonId = component.formatDocumentName(document);
        expect(nameForRejectedClassByRejectedReasonId).toBe(`${rejectedDocumentName} - ${expectedId}`);

        document.rejectedReasonId = undefined;
        const nameForPayslipsClass = component.formatDocumentName(document);
        expect(nameForPayslipsClass).toBe(`Payslips - ${expectedId}`);
    });

    it('should trigger onMouseEnter and call toggleList', fakeAsync(() => {
        idpDocumentDragDropServiceMock.isDragging$ = of(true);
        idpDocumentDragDropServiceMock.draggingObject$ = of({ pages: [] });

        const doc = { ...allDocumentsForSelectedClass[0], allPagesSelected: true };
        component.onMouseEnter(doc);

        fixture.detectChanges();

        tick(2000);

        expect(idpDocumentServiceMock.togglePreviewedDocument).toHaveBeenCalled();
        expect(idpDocumentDragDropServiceMock.setDraggingTarget).toHaveBeenCalled();
    }));

    it('should trigger onMouseEnter and return before calling toggleList', fakeAsync(() => {
        idpDocumentDragDropServiceMock.isDragging$ = of(false);
        const doc = { ...allDocumentsForSelectedClass[0], allPagesSelected: true };
        spyOn(component, 'toggleList').and.callThrough();
        spyOn(component, 'onMouseEnter').and.callThrough();
        component.onMouseEnter(doc);

        fixture.detectChanges();

        tick(2000);

        expect(idpDocumentServiceMock.togglePreviewedDocument).not.toHaveBeenCalled();
        expect(idpDocumentDragDropServiceMock.setDraggingTarget).not.toHaveBeenCalled();
    }));

    it('should trigger onPageCollapseRequest', () => {
        const item = { ...allDocumentsForSelectedClass[0], allPagesSelected: true, isExpanded: false };

        spyOn(component, 'toggleList').and.callThrough();

        component.onPageCollapseRequest(item);

        expect(component.toggleList).toHaveBeenCalledOnceWith(item, 'collapse');
    });

    it('should copy document id on document double click', () => {
        const document = allDocumentsForSelectedClass[0];

        component.onDoubleClick(document);

        expect(idpDocumentServiceMock.copyDocumentDetailsToClipboard).toHaveBeenCalledOnceWith(document.id);
    });

    it('should cut pages when onPagesCut is called', () => {
        component.isCutInsertFeatureOn = true;
        component.onPagesCut();

        expect(idpDocumentServiceMock.cutSelectedPages).toHaveBeenCalled();
    });
});

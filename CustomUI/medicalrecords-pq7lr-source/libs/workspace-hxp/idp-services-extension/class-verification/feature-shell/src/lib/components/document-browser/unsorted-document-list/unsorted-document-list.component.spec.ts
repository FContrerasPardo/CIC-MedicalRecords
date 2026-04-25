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
import { mockIdpDocuments } from '../../../models/mocked/mocked-documents';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { IdpKeyboardNavAction, IdpKeyboardNavigationService } from '../../../services/document/idp-keyboard-navigation.service';
import { IdpDocumentMultiselectService } from '../../../services/document/idp-document-multiselect.service';
import { IdpNavSelectionType } from '../../../models/common-models';
import { UnsortedDocumentListComponent } from './unsorted-document-list.component';
import { IdpDocument, IdpDocumentPage, UNSORTED_DOCUMENT_LIST_ID } from '../../../models/screen-models';
import { IdpDocumentDragDropService } from '../../../services/document/idp-drag-drop.service';
import {
    IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN,
    IdpShortcut,
    IdpShortcutAction,
    IdpShortcutService,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { InjectionToken } from '@angular/core';
import { provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { IdpDocumentClassService } from '../../../services/document-class/idp-document-class.service';
import { DocumentListComponent } from '../document-list/document-list.component';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('UnsortedDocumentListViewComponent', () => {
    let component: UnsortedDocumentListComponent;
    let fixture: ComponentFixture<UnsortedDocumentListComponent>;
    let idpDocumentToolbarServiceMock: jasmine.SpyObj<IdpDocumentToolbarService>;
    let idpDocumentServiceMock: jasmine.SpyObj<IdpDocumentService>;
    let idpDocumentMultiselectServiceMock: any;
    let idpKeyboardNavigationServiceMock: jasmine.SpyObj<IdpKeyboardNavigationService>;
    let idpDocumentClassServiceMock: jasmine.SpyObj<IdpDocumentClassService>;
    let idpDocumentDragDropServiceMock: any;
    let allDocumentsForSelectedClass: IdpDocument[];
    let allPagesForSelectedClass: IdpDocumentPage[];
    let selectedPages: IdpDocumentPage[];
    let actionSubject$: Subject<IdpKeyboardNavAction>;
    let selectedPagesSubject: BehaviorSubject<IdpDocumentPage[]>;
    let mockedAction: IdpKeyboardNavAction;

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

        actionSubject$ = new Subject<IdpKeyboardNavAction>();
        selectedPagesSubject = new BehaviorSubject<IdpDocumentPage[]>([]);
        mockedAction = {
            type: IdpShortcutAction.NavigateSelectDown,
            currentActiveInfo: { id: 'test', activeContext: undefined },
            selectionAction: 'single',
            event: undefined,
            containerContext: {
                contextId: UNSORTED_DOCUMENT_LIST_ID,
                contextType: 'class',
            },
            itemContext: {
                contextId: 'test',
                contextType: 'document',
            },
            data: undefined,
        };

        const mockDocGroups: Record<string, IdpDocument[]> = {
            class1: [mockedDocuments[0], mockedDocuments[1]],
            class2: [mockedDocuments[2], mockedDocuments[3]],
        };

        idpDocumentToolbarServiceMock = jasmine.createSpyObj<IdpDocumentToolbarService>(
            'IdpDocumentToolbarService',
            ['handleMovePageAndCreateNewDoc', 'handlePageSplit', 'handlePageSplit', 'handleMovePages'],
            {
                documentToolBarItems$: of([]),
                toolbarMessageTemplate$: of({ key: 'TEMPLATE.KEY' }),
            }
        );

        idpDocumentServiceMock = jasmine.createSpyObj<IdpDocumentService>(
            'IdpDocumentService',
            [
                'toggleExpandDocument',
                'getDocumentsForClass',
                'togglePreviewedDocument',
                'updatePagesRotation',
                'getAllDocumentsGroupedByClass',
                'cutSelectedPages',
                'clearCutPages',
            ],
            {
                selectedDocuments$: of(allDocumentsForSelectedClass),
                allPagesForSelectedClass$: of(allPagesForSelectedClass),
                selectedPages$: selectedPagesSubject.asObservable(),
                allDocumentsForSelectedClass$: of(allDocumentsForSelectedClass),
                documentViewFilter$: of('OnlyIssues'),
                allDocuments$: of(mockedDocuments),
                cutPages$: of([]),
            }
        );
        idpDocumentServiceMock.getDocumentsForClass.and.returnValue(of(allDocumentsForSelectedClass));
        idpDocumentServiceMock.getAllDocumentsGroupedByClass.and.returnValue(of(mockDocGroups));

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

        idpDocumentClassServiceMock = jasmine.createSpyObj<IdpDocumentClassService>('IdpDocumentClassService', ['setSelectedClass'], {
            selectedClass$: of(mockedDocuments[0].class),
        });

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, UnsortedDocumentListComponent, SatIconModule, MatIconTestingModule],
            providers: [
                { provide: IdpDocumentDragDropService, useValue: idpDocumentDragDropServiceMock },
                { provide: IdpDocumentMultiselectService, useValue: idpDocumentMultiselectServiceMock },
                { provide: IdpKeyboardNavigationService, useValue: idpKeyboardNavigationServiceMock },
                { provide: IdpDocumentToolbarService, useValue: idpDocumentToolbarServiceMock },
                { provide: IdpDocumentService, useValue: idpDocumentServiceMock },
                { provide: IdpShortcutService, useClass: IdpShortcutService },
                { provide: IdpDocumentClassService, useValue: idpDocumentClassServiceMock },
                { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: new InjectionToken<IdpShortcut[]>('IDP_SCREEN_SHORTCUTS') },
                provideMockFeatureFlags({
                    [WORKSPACE_IDP_HXP.CLASSIFICATION_SETTINGS]: true,
                    [WORKSPACE_IDP_HXP.CLASS_VERIFICATION_CUT_INSERT]: true,
                }),
            ],
        });

        fixture = TestBed.createComponent(UnsortedDocumentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should filter documents by OnlyIssues filter', fakeAsync(() => {
        let result: any[] = [];
        component.documents$.subscribe((docs) => (result = docs));
        tick();

        expect(result.length).toBe(2);
        expect(result[0].hasIssue).toBeTrue();
        expect(result[1].hasIssue).toBeTrue();
    }));

    it('should set selected document count', fakeAsync(() => {
        let result = 0;
        component.selectedDocumentsCount$.subscribe((count) => (result = count));
        tick();

        expect(result).toBe(allDocumentsForSelectedClass.length);
    }));

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

    it('should cut pages when PageCut shortcut is received', () => {
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

    it('should clear cut pages when PageCutClear shortcut is received', () => {
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

    it('should open context menu when OpenContextMenu shortcut is received', () => {
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

    it('should cut pages via onPagesCut', () => {
        component.isCutInsertFeatureOn = true;
        component.onPagesCut();

        expect(idpDocumentServiceMock.cutSelectedPages).toHaveBeenCalled();
    });
});

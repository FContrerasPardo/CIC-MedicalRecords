/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ClassListComponent } from './class-list.component';
import { of, BehaviorSubject, Subject } from 'rxjs';
import { IdpDocumentService } from '../../../services/document/idp-document.service';
import { IdpDocumentClassService } from '../../../services/document-class/idp-document-class.service';
import {
    IdpKeyboardNavigationService,
    IdpKeyboardNavAction,
    IdpKeyboardNavActionTypeInternal,
} from '../../../services/document/idp-keyboard-navigation.service';
import { IdpDocumentActionToolBarItems, IdpDocumentToolbarService } from '../../../services/document/idp-document-toolbar.service';
import { DragPlaceholderMetadata, IdpDocumentDragDropService } from '../../../services/document/idp-drag-drop.service';
import { IdpDocumentMultiselectService } from '../../../services/document/idp-document-multiselect.service';
import { DocumentClassMetadata, IdpDocument, IdpDocumentAction, IdpDocumentPage } from '../../../models/screen-models';
import { IdpScreenViewSortOption } from '../../../models/common-models';
import { IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, IdpShortcutAction, IdpShortcutService } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ClassListComponent', () => {
    let fixture: ComponentFixture<ClassListComponent>;
    let component: ClassListComponent;

    const toolbarActions: IdpDocumentActionToolBarItems[] = [
        {
            label: 'ChangeClass',
            icon: 'icon 1',
            action: IdpDocumentAction.ChangeClass,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'static',
            displayOn: 'footer',
            displayOrder: 0,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.ChangeClass,
        },
        {
            label: 'Redo',
            icon: 'Redo',
            action: IdpDocumentAction.Redo,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'dynamic',
            displayOn: 'header',
            displayOrder: 0,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.Redo,
        },
        {
            label: 'Merge',
            icon: 'icon 3',
            action: IdpDocumentAction.Merge,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'dynamic',
            displayOn: 'footer',
            displayOrder: 1,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.PageMerge,
        },
        {
            label: 'Undo',
            icon: 'Undo',
            action: IdpDocumentAction.Undo,
            disabled: false,
            onClick$: new Subject<void>(),
            renderType: 'dynamic',
            displayOn: 'header',
            displayOrder: 1,
            showDividerBefore: true,
            shortcutAction: IdpShortcutAction.Undo,
        },
    ];

    // Mocks
    let idpDocumentServiceMock: jasmine.SpyObj<IdpDocumentService>;
    let idpDocumentClassServiceMock: any;
    let idpKeyboardNavigationServiceMock: any;
    let idpDocumentToolbarServiceMock: any;
    let idpDocumentDragDropServiceMock: any;
    let idpDocumentMultiselectServiceMock: any;

    // Subjects/Streams
    let classesSubject: BehaviorSubject<DocumentClassMetadata[]>;
    let selectedClassSubject: BehaviorSubject<any>;
    let actionSubject$: Subject<IdpKeyboardNavAction>;
    let listsSubject: BehaviorSubject<string[]>;
    let isDraggingSubject: BehaviorSubject<boolean>;
    let draggingObjectSubject: BehaviorSubject<any>;
    let draggingTargetSubject: BehaviorSubject<any>;
    let draggingTargetPageSubject: BehaviorSubject<IdpDocumentPage | undefined>;

    const classes: DocumentClassMetadata[] = [
        { id: 'c1', name: 'Class 1', issuesCount: 0, documentsCount: 0, isExpanded: false, canExpand: true, disabled: false } as any,
        { id: 'c2', name: 'Class 2', issuesCount: 2, documentsCount: 3, isExpanded: false, canExpand: true, disabled: false } as any,
    ];

    beforeEach(() => {
        // Document Service mock
        idpDocumentServiceMock = jasmine.createSpyObj<IdpDocumentService>('IdpDocumentService', [
            'getSortOption',
            'resetPageSelection',
            'togglePreviewedDocument',
            'setDocumentClass',
            'getDocumentsForClass',
        ]);
        idpDocumentServiceMock.getSortOption.and.returnValue(of(IdpScreenViewSortOption.Classes));
        idpDocumentServiceMock.getDocumentsForClass.and.returnValue(of([]));
        (idpDocumentServiceMock as any).documentViewFilter$ = of('All');
        (idpDocumentServiceMock as any).selectedDocuments$ = of([]);
        (idpDocumentServiceMock as any).selectedPages$ = of([]);

        // Document Class Service mock
        classesSubject = new BehaviorSubject<DocumentClassMetadata[]>(classes);
        selectedClassSubject = new BehaviorSubject<any>(undefined);
        idpDocumentClassServiceMock = {
            documentClassMetadata$: classesSubject.asObservable(),
            selectedClass$: selectedClassSubject.asObservable(),
            setSelectedClass: jasmine.createSpy('setSelectedClass'),
            toggleExpandClass: jasmine.createSpy('toggleExpandClass'),
            togglePreviewClass: jasmine.createSpy('togglePreviewClass'),
        };

        // Keyboard Navigation Service mock
        actionSubject$ = new Subject<IdpKeyboardNavAction>();
        idpKeyboardNavigationServiceMock = {
            action$: actionSubject$.asObservable(),
            registerContext: jasmine.createSpy('registerContext'),
            unregisterContext: jasmine.createSpy('unregisterContext'),
        };

        idpDocumentToolbarServiceMock = {
            handleMovePages: jasmine.createSpy('handleMovePages'),
            handleRejectPage: jasmine.createSpy('handleRejectPage'),
            documentToolBarItems$: of(toolbarActions),
            toolbarMessageTemplate$: of({ key: 'TEMPLATE.KEY' }),
        };

        // DragDrop Service mock
        listsSubject = new BehaviorSubject<string[]>([]);
        isDraggingSubject = new BehaviorSubject<boolean>(false);
        draggingObjectSubject = new BehaviorSubject<any>({});
        draggingTargetSubject = new BehaviorSubject<any>({});
        draggingTargetPageSubject = new BehaviorSubject<IdpDocumentPage | undefined>(undefined);

        const dragPlaceholderMeta$ = new BehaviorSubject<DragPlaceholderMetadata>({} as any);

        idpDocumentDragDropServiceMock = {
            lists$: listsSubject.asObservable(),
            isDragging$: isDraggingSubject.asObservable(),
            draggingObject$: draggingObjectSubject.asObservable(),
            draggingTarget$: draggingTargetSubject.asObservable(),
            draggingTargetPage$: draggingTargetPageSubject.asObservable(),
            dragPlaceholderMetadata$: dragPlaceholderMeta$.asObservable(),
            addDropList: jasmine.createSpy('addDropList'),
            removeDropList: jasmine.createSpy('removeDropList'),
            setDraggingTarget: jasmine.createSpy('setDraggingTarget'),
            setDraggingObject: jasmine.createSpy('setDraggingObject'),
            setDraggingState: jasmine.createSpy('setDraggingState'),
        };

        // IdpDocumentMultiselectService mock
        idpDocumentMultiselectServiceMock = {
            clearSelection: jasmine.createSpy('clearSelection'),
            documentSelected: jasmine.createSpy('documentSelected'),
            pageSelected: jasmine.createSpy('pageSelected'),
            selectAll: jasmine.createSpy('selectAll'),
        };

        TestBed.configureTestingModule({
            imports: [ClassListComponent, NoopTranslateModule, SatIconModule, MatIconTestingModule],
            providers: [
                IdpShortcutService,
                { provide: IDP_SCREEN_SHORTCUTS_INJECTION_TOKEN, useValue: [] },
                { provide: IdpDocumentService, useValue: idpDocumentServiceMock },
                { provide: IdpDocumentClassService, useValue: idpDocumentClassServiceMock },
                { provide: IdpKeyboardNavigationService, useValue: idpKeyboardNavigationServiceMock },
                { provide: IdpDocumentToolbarService, useValue: idpDocumentToolbarServiceMock },
                { provide: IdpDocumentDragDropService, useValue: idpDocumentDragDropServiceMock },
                { provide: IdpDocumentMultiselectService, useValue: idpDocumentMultiselectServiceMock },
                {
                    provide: FeaturesServiceToken,
                    useValue: { isOn$: () => of(false) },
                },
            ],
        });

        fixture = TestBed.createComponent(ClassListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should ignore mouse enter when not dragging; set preview and target when dragging pages', () => {
        const item = { ...classes[0] } as DocumentClassMetadata;

        // Not dragging
        component.onMouseEnter(item, false);
        expect(idpDocumentDragDropServiceMock.setDraggingTarget).not.toHaveBeenCalled();
        expect(idpDocumentClassServiceMock.togglePreviewClass).not.toHaveBeenCalled();

        // Dragging with pages
        isDraggingSubject.next(true);
        draggingObjectSubject.next({ pages: [{ id: 'p1' }] as IdpDocumentPage[] });
        component.onMouseEnter(item, true);
        expect(idpDocumentDragDropServiceMock.setDraggingTarget).toHaveBeenCalledWith({ class: item });
        expect(idpDocumentClassServiceMock.togglePreviewClass).toHaveBeenCalledWith(item.id);

        component.onMouseLeave();
        expect(component.isHoveredWithDrag(item)).toBeFalse();
    });

    it('should call onItemListChanged when item clicked (not disabled)', () => {
        const item = { ...classes[0], disabled: false } as DocumentClassMetadata;
        spyOn<any>(component, 'onItemListChanged');
        component.onItemClicked(item, new MouseEvent('click'));
        expect((component as any).onItemListChanged).toHaveBeenCalledWith(item, 'toggle');
    });

    it('should not call onItemListChanged when item is disabled', () => {
        const item = { ...classes[0], disabled: true } as DocumentClassMetadata;
        spyOn<any>(component, 'onItemListChanged');
        component.onItemClicked(item, new MouseEvent('click'));
        expect((component as any).onItemListChanged).not.toHaveBeenCalled();
    });

    it('should call onItemKeyDown via onContainerKeyDown for first item', () => {
        const spy = spyOn(component, 'onItemKeyDown');
        const evt = new KeyboardEvent('keydown');
        component.onContainerKeyDown(classes, evt);
        expect(spy).toHaveBeenCalledWith(classes[0], evt);
    });

    it('toggleList should toggle expansion, reset selection on collapse, and update selected class', () => {
        const item = { ...classes[0], isExpanded: false } as DocumentClassMetadata;
        component.toggleList(item, 'toggle');
        expect(item.isExpanded).toBeTrue();
        expect(idpDocumentClassServiceMock.setSelectedClass).toHaveBeenCalledWith(item.id);
        expect(idpDocumentClassServiceMock.toggleExpandClass).toHaveBeenCalledWith(item.id);

        // Collapse
        component.toggleList(item, 'toggle');
        expect(item.isExpanded).toBeFalse();
        expect(idpDocumentServiceMock.resetPageSelection).toHaveBeenCalled();
    });

    it('onDocumentCollapseRequest should collapse the provided item', () => {
        const item = { ...classes[0], isExpanded: true } as DocumentClassMetadata;
        spyOn(component, 'toggleList');
        component.onDocumentCollapseRequest(item);
        expect(component.toggleList).toHaveBeenCalledWith(item, 'collapse');
    });

    it('onDrop should move pages to target document at correct index', fakeAsync(() => {
        const targetDoc: IdpDocument = {
            id: 'doc1',
            pages: [{ id: 'p1' } as any, { id: 'p2' } as any, { id: 'p3' } as any],
        } as any;

        draggingObjectSubject.next({ pages: [{ id: 'x' } as any] });
        draggingTargetSubject.next({ document: targetDoc });
        draggingTargetPageSubject.next({ id: 'p2' } as any);

        const dropEvent: any = { isPointerOverContainer: true };
        component.onDrop(dropEvent);
        tick();

        expect(idpDocumentToolbarServiceMock.handleMovePages).toHaveBeenCalledWith([{ id: 'x' } as any], 'doc1', 1);
        // Clear dragging state
        expect(idpDocumentDragDropServiceMock.setDraggingObject).toHaveBeenCalledWith({});
        expect(idpDocumentDragDropServiceMock.setDraggingTarget).toHaveBeenCalledWith({});
        expect(idpDocumentServiceMock.togglePreviewedDocument).toHaveBeenCalled();
        expect(idpDocumentClassServiceMock.togglePreviewClass).toHaveBeenCalled();
    }));

    it('onDrop should change class when sort is not Original', fakeAsync(() => {
        idpDocumentServiceMock.getSortOption.and.returnValue(of(IdpScreenViewSortOption.Classes));
        fixture = TestBed.createComponent(ClassListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        const draggingDoc: IdpDocument = { id: 'd1', pages: [{ id: 'p' } as any], class: { id: 'c1' } as any } as any;
        draggingObjectSubject.next({ documents: [draggingDoc] });
        draggingTargetSubject.next({ class: { id: 'c2' } });

        component.onDrop({ isPointerOverContainer: true } as any);
        tick();

        expect(idpDocumentServiceMock.setDocumentClass).toHaveBeenCalledWith(IdpDocumentAction.ChangeClass, true, draggingDoc.pages, 'c2');
    }));

    it('onNavigationAction should handle expand/collapse and selection', () => {
        const item = { ...classes[0] } as DocumentClassMetadata;
        spyOn<any>(component, 'onItemListChanged');
        spyOn(component, 'toggleList');

        // Expand
        actionSubject$.next({
            type: IdpKeyboardNavActionTypeInternal.Expand,
            currentActiveInfo: { id: 'c1', activeContext: undefined },
            selectionAction: 'single',
            event: undefined,
            containerContext: { contextId: '', contextType: 'root' },
            itemContext: { contextId: 'c1', contextType: 'class' },
            data: item,
        });
        expect((component as any).onItemListChanged).toHaveBeenCalledWith(item, 'select');

        // Collapse
        actionSubject$.next({
            type: IdpKeyboardNavActionTypeInternal.Collapse,
            currentActiveInfo: { id: 'c1', activeContext: undefined },
            selectionAction: 'single',
            event: undefined,
            containerContext: { contextId: '', contextType: 'root' },
            itemContext: { contextId: 'c1', contextType: 'class' },
            data: item,
        });
        expect(component.toggleList).toHaveBeenCalledWith(item, 'collapse');

        // Selection side-effect
        actionSubject$.next({
            type: IdpShortcutAction.Collapse,
            currentActiveInfo: { id: 'c2', activeContext: undefined },
            selectionAction: 'single',
            event: undefined,
            containerContext: { contextId: '', contextType: 'root' },
            itemContext: { contextId: 'c1', contextType: 'class' },
            data: item,
        } as any);
        expect(idpDocumentClassServiceMock.setSelectedClass).toHaveBeenCalledWith('c2');
    });

    it('should show lock icon when ignoreForAuto is true', fakeAsync(() => {
        const lockedClass: DocumentClassMetadata = {
            id: 'locked',
            name: 'Locked Class',
            issuesCount: 0,
            documentsCount: 0,
            isExpanded: false,
            canExpand: true,
            disabled: false,
            ignoreForAuto: true,
        } as any;

        classesSubject.next([...classes, lockedClass]);
        fixture.detectChanges();
        tick();

        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        const ignoredClassIcons = compiled.querySelectorAll('.idp-ignored-class-icon');
        expect(ignoredClassIcons.length).toBeGreaterThan(0);
    }));

    it('should not show lock icon when ignoreForAuto is false or undefined', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        const compiled = fixture.nativeElement as HTMLElement;
        const ignoredClassIcons = compiled.querySelectorAll('.idp-ignored-class-icon');
        expect(ignoredClassIcons.length).toBe(0);
    }));
});

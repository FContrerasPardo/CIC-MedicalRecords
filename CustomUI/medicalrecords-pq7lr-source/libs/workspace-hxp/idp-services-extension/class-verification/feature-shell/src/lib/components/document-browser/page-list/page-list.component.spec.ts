/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { QueryList } from '@angular/core';
import { IdpDocumentToolbarService } from '../../../services/document/idp-document-toolbar.service';
import { IdpDocumentService } from '../../../services/document/idp-document.service';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { mockIdpDocuments } from '../../../models/mocked/mocked-documents';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { PageListComponent } from './page-list.component';
import {
    IdpKeyboardNavAction,
    IdpKeyboardNavigationService,
    IdpKeyboardNavActionTypeInternal,
} from '../../../services/document/idp-keyboard-navigation.service';
import { IdpDocumentMultiselectService } from '../../../services/document/idp-document-multiselect.service';
import { IdpDocumentPage, IdpDocumentAction } from '../../../models/screen-models';
import { IdpShortcutAction } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { DragPlaceholderMetadata, IdpDocumentDragDropService } from '../../../services/document/idp-drag-drop.service';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { ListItemComponent } from '../../list-item/list-item.component';
import { PageComponent, PagesInsertEvent } from '../page/page.component';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';

describe('PageListComponent', () => {
    let component: PageListComponent;
    let fixture: ComponentFixture<PageListComponent>;
    let idpDocumentToolbarServiceMock: jasmine.SpyObj<IdpDocumentToolbarService>;
    let idpDocumentDragDropServiceMock: jasmine.SpyObj<IdpDocumentDragDropService>;
    let idpDocumentServiceMock: jasmine.SpyObj<IdpDocumentService>;
    let idpDocumentMultiselectServiceMock: jasmine.SpyObj<IdpDocumentMultiselectService>;
    let idpKeyboardNavigationServiceMock: jasmine.SpyObj<IdpKeyboardNavigationService>;
    let actionSubject$: Subject<IdpKeyboardNavAction>;
    let cutPagesSubject: BehaviorSubject<IdpDocumentPage[]>;

    const mockedDocuments = mockIdpDocuments();
    const documentId = mockedDocuments[1].id;
    const allPagesForSelectedClass = [...mockedDocuments[1].pages, ...mockedDocuments[2].pages];
    const selectedPages = [allPagesForSelectedClass[0], allPagesForSelectedClass[1]];
    const getMockedAction = (): IdpKeyboardNavAction => {
        return {
            type: IdpKeyboardNavActionTypeInternal.Expand,
            currentActiveInfo: { id: 'test', activeContext: undefined },
            selectionAction: 'single',
            event: undefined,
            containerContext: {
                contextId: documentId,
                contextType: 'document',
            },
            itemContext: {
                contextId: 'test',
                contextType: 'page',
            },
            data: selectedPages[0],
        };
    };

    beforeEach(() => {
        idpDocumentToolbarServiceMock = jasmine.createSpyObj<IdpDocumentToolbarService>('IdpDocumentToolbarService', ['handlePageSplit']);

        actionSubject$ = new Subject<IdpKeyboardNavAction>();
        cutPagesSubject = new BehaviorSubject<IdpDocumentPage[]>([]);

        idpDocumentMultiselectServiceMock = jasmine.createSpyObj<IdpDocumentMultiselectService>('IdpDocumentMultiselectService', [
            'selectAll',
            'pageSelected',
        ]);

        idpKeyboardNavigationServiceMock = jasmine.createSpyObj<IdpKeyboardNavigationService>(
            'IdpKeyboardNavigationService',
            ['registerContext', 'unregisterContext'],
            {
                action$: actionSubject$.asObservable(),
            }
        );

        idpDocumentServiceMock = jasmine.createSpyObj<IdpDocumentService>(
            'IdpDocumentService',
            ['copyDocumentDetailsToClipboard', 'cutSelectedPages', 'insertCutPages', 'clearCutPages'],
            {
                allPagesForSelectedClass$: of(allPagesForSelectedClass),
                selectedPages$: of(selectedPages),
                allPages$: of(mockedDocuments.flatMap((d) => d.pages)),
                cutPages$: cutPagesSubject.asObservable(),
            }
        );

        idpDocumentDragDropServiceMock = jasmine.createSpyObj<IdpDocumentDragDropService>(
            'IdpDocumentDragDropService',
            ['setDraggingState', 'setDraggingObject', 'setDraggingTarget', 'setDraggingTargetPage'],
            {
                dragPlaceholderMetadata$: of({} as DragPlaceholderMetadata),
                isDragging$: of(false),
            }
        );

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, PageListComponent, SatIconModule],
            providers: [
                { provide: IdpDocumentMultiselectService, useValue: idpDocumentMultiselectServiceMock },
                { provide: IdpKeyboardNavigationService, useValue: idpKeyboardNavigationServiceMock },
                { provide: IdpDocumentToolbarService, useValue: idpDocumentToolbarServiceMock },
                { provide: IdpDocumentService, useValue: idpDocumentServiceMock },
                { provide: IdpDocumentDragDropService, useValue: idpDocumentDragDropServiceMock },
                {
                    provide: FeaturesServiceToken,
                    useValue: { isOn$: () => of(true), getFlags$: () => of([]) },
                },
            ],
        });

        fixture = TestBed.createComponent(PageListComponent);
        component = fixture.componentInstance;
        component.documentId = documentId;
        fixture.detectChanges();
    });

    it('should set correct pages', fakeAsync(() => {
        const pages: IdpDocumentPage[] = [];
        const selectedPagesIds = new Set(selectedPages.map((page) => page.id));
        component.pages$.subscribe((data) => {
            pages.push(...data);
        });
        tick(2000);

        expect(pages.length).toBe(mockedDocuments[1].pages.length);
        expect(pages[0]).toEqual({
            ...mockedDocuments[1].pages[0],
            isSelected: selectedPagesIds.has(mockedDocuments[1].pages[0].id),
        });
        expect(pages[1]).toEqual({
            ...mockedDocuments[1].pages[1],
            isSelected: selectedPagesIds.has(mockedDocuments[1].pages[1].id),
        });
    }));

    it('should emit canInsertPages$ state when cut pages change', fakeAsync(() => {
        const emitted: boolean[] = [];
        const subscription = component.canInsertPages$.subscribe((value) => emitted.push(value));

        cutPagesSubject.next([selectedPages[0]]);
        cutPagesSubject.next([]);

        flush();

        expect(emitted).toEqual([false, true, false]);
        subscription.unsubscribe();
    }));

    it('should trigger onItemKeyDown', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        prepareEvent('[data-automation-id="idp-list-item-page__0"]', 'onItemKeyDown', event);
        expect(component.onItemKeyDown).toHaveBeenCalledOnceWith({ ...selectedPages[0], isSelected: true }, event);
    });

    it('should trigger onContainerKeyDown', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        prepareEvent('[data-automation-id="idp-page-list"]', 'onContainerKeyDown', event);
        expect(component.onContainerKeyDown).toHaveBeenCalledOnceWith(
            selectedPages.map((p) => ({ ...p, isSelected: true })),
            event
        );
    });

    it('should trigger onItemMouseDown', () => {
        const event = new MouseEvent('mousedown');
        prepareEvent('[data-automation-id="idp-list-item-page__0"]', 'onItemMouseDown', event);
        expect(component.onItemMouseDown).toHaveBeenCalledOnceWith({ ...selectedPages[0], isSelected: true }, event);
    });

    it('should not emit click event on onItemMouseDown when right mouse button on selected item clicked', fakeAsync(() => {
        const componentClickEvent$ = idpKeyboardNavigationServiceMock.registerContext.calls.mostRecent().args[0].clickEvent$;
        const nextClickEventSpy = jasmine.createSpy('next');
        const subscription = componentClickEvent$.subscribe({
            next: nextClickEventSpy,
        });

        const event = new MouseEvent('mousedown', { button: 2 });
        spyOn(event, 'preventDefault');
        spyOn(event, 'stopPropagation');

        prepareEvent('[data-automation-id="idp-list-item-page__0"]', 'onItemMouseDown', event);

        tick();

        expect(component.onItemMouseDown).toHaveBeenCalledOnceWith({ ...selectedPages[0], isSelected: true }, event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(nextClickEventSpy).not.toHaveBeenCalled();
        subscription.unsubscribe();
    }));

    it('should trigger onItemMouseUp without ctrlKey and metaKey', () => {
        const event = new MouseEvent('mouseup', { ctrlKey: false, metaKey: false, shiftKey: true });
        prepareEvent('[data-automation-id="idp-list-item-page__0"]', 'onItemMouseUp', event);

        expect(component.onItemMouseUp).toHaveBeenCalledOnceWith({ ...selectedPages[0], isSelected: true }, event);
        expect(idpDocumentMultiselectServiceMock.pageSelected).not.toHaveBeenCalled();
    });

    it('should trigger onItemMouseUp with metaKey', () => {
        testMouseUpWithKeysPositive(false, true);
    });

    it('should trigger onItemMouseUp with ctrlKey', () => {
        testMouseUpWithKeysPositive(true, false);
    });

    it('should trigger onItemMouseUp with metaKey and ctrlKey', () => {
        testMouseUpWithKeysPositive(true, true);
    });

    it('should unregister context on destroy', () => {
        fixture.destroy();
        expect(idpKeyboardNavigationServiceMock.unregisterContext).toHaveBeenCalled();
    });

    it('should register context after init', () => {
        component.ngAfterViewInit();
        expect(idpKeyboardNavigationServiceMock.registerContext).toHaveBeenCalled();
    });

    it('should keep child page list items in sync with the view children', () => {
        const pageComponentA = { pageListItem: {} as ListItemComponent } as PageComponent;
        const pageComponentB = { pageListItem: {} as ListItemComponent } as PageComponent;
        const pageComponentC = { pageListItem: {} as ListItemComponent } as PageComponent;
        const pageComponentsQueryList = new QueryList<PageComponent>();
        pageComponentsQueryList.reset([pageComponentA, pageComponentB]);

        component.childPageComponents = pageComponentsQueryList;

        component.ngAfterViewInit();

        expect(component.childPageListItems.toArray()).toEqual([pageComponentA.pageListItem, pageComponentB.pageListItem]);

        pageComponentsQueryList.reset([pageComponentC]);
        pageComponentsQueryList.notifyOnChanges();

        expect(component.childPageListItems.toArray()).toEqual([pageComponentC.pageListItem]);
    });

    it('should trigger onDragStarted', () => {
        const event = new Event('cdkDragStarted');
        spyOn(component, 'onDragStarted').and.callThrough();
        testDragging(true, event);
        expect(component.onDragStarted).toHaveBeenCalled();
    });

    it('should trigger onDragStopped', () => {
        const event = new Event('cdkDragReleased');
        spyOn(component, 'onDragStopped').and.callThrough();
        testDragging(false, event);
        expect(component.onDragStopped).toHaveBeenCalled();
    });

    it('should trigger handlePageSplit in onPageSplitAllAbove', fakeAsync(() => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.PageSplitAllAbove;
        const pages: IdpDocumentPage[] = [];
        component.pages$.subscribe((data) => {
            pages.push(...data);
        });
        tick(2000);
        const item = selectedPages[0];
        const index = pages.findIndex((page) => page.id === item.id);
        const items = pages.splice(0, index + 1);
        action.data = item;

        actionSubject$.next(action);

        expect(idpDocumentToolbarServiceMock.handlePageSplit).toHaveBeenCalledOnceWith(items, IdpDocumentAction.Split);
    }));

    it('should return from onNavigationAction if contextType is not page', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.SelectAllContextOnly;
        action.itemContext.contextType = 'class';

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.selectAll).not.toHaveBeenCalled();
    });

    it('should return from onNavigationAction if item does not exist', () => {
        const action = getMockedAction();
        action.data = undefined;
        action.type = IdpShortcutAction.SelectAllContextOnly;

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.selectAll).not.toHaveBeenCalled();
    });

    it('should call selectAll with page argument', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.SelectAllContextOnly;
        action.data = selectedPages[0];

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.selectAll).toHaveBeenCalledOnceWith('page', documentId);
    });

    it('should call selectAll with document argument', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.SelectAllContextAll;

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.selectAll).toHaveBeenCalledOnceWith('document');
    });

    it('should call next for collapseContainer if type is IdpKeyboardNavActionTypeInternal.Collapse', () => {
        const action = getMockedAction();
        action.type = IdpKeyboardNavActionTypeInternal.Collapse;

        spyOn(component.collapseContainer, 'next').and.callThrough();

        actionSubject$.next(action);

        expect(component.collapseContainer.next).toHaveBeenCalled();
        expect(idpDocumentMultiselectServiceMock.selectAll).not.toHaveBeenCalled();
    });

    it('should call next for collapseContainer if type is IdpShortcutAction.Collapse', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.Collapse;

        spyOn(component.collapseContainer, 'next').and.callThrough();

        actionSubject$.next(action);

        expect(component.collapseContainer.next).toHaveBeenCalled();
        expect(idpDocumentMultiselectServiceMock.selectAll).not.toHaveBeenCalled();
    });

    it('should call handlePageSplit if type is IdpShortcutAction.PageSplitAllAbove', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.PageSplitAllAbove;

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.selectAll).not.toHaveBeenCalled();
        expect(idpDocumentToolbarServiceMock.handlePageSplit).toHaveBeenCalled();
    });

    it('should cut pages when shortcut PageCut is triggered', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.PageCut;
        component.isCutInsertFeatureOn = true;

        actionSubject$.next(action);

        expect(idpDocumentServiceMock.cutSelectedPages).toHaveBeenCalled();
    });

    it('should clear cut pages when shortcut PageCutClear is triggered', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.PageCutClear;
        component.isCutInsertFeatureOn = true;

        actionSubject$.next(action);

        expect(idpDocumentServiceMock.clearCutPages).toHaveBeenCalled();
    });

    it('should open context menu when shortcut OpenContextMenu is triggered', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.OpenContextMenu;
        component.isCutInsertFeatureOn = true;
        const pageComponent = {
            page: selectedPages[0],
            openContextMenu: jasmine.createSpy('openContextMenu'),
            pageListItem: {} as ListItemComponent,
        } as unknown as PageComponent;
        const pageComponentsQueryList = new QueryList<PageComponent>();
        pageComponentsQueryList.reset([pageComponent]);
        component.childPageComponents = pageComponentsQueryList;

        actionSubject$.next(action);

        expect(pageComponent.openContextMenu).toHaveBeenCalledTimes(1);
    });

    it('should return from onNavigationAction if currentActiveInfo.id is empty', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.IssueOnlyFilter;
        action.selectionAction = 'multi';
        action.currentActiveInfo.id = '';

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.pageSelected).not.toHaveBeenCalled();
    });

    it('should return from onNavigationAction if selectionItem is none', () => {
        const action = getMockedAction();
        action.type = IdpShortcutAction.IssueOnlyFilter;
        action.selectionAction = 'none';

        actionSubject$.next(action);

        expect(idpDocumentMultiselectServiceMock.pageSelected).not.toHaveBeenCalled();
    });

    const testDragging = (dragState: boolean, event: Event) => {
        const element = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-page__0"]') as HTMLElement;
        element.focus();
        element.dispatchEvent(event);
        fixture.detectChanges();

        expect(idpDocumentDragDropServiceMock.setDraggingState).toHaveBeenCalledOnceWith(dragState);
    };

    const testMouseUpWithKeysPositive = (ctrlKey: boolean, metaKey: boolean) => {
        const action = getMockedAction();
        action.selectionAction = 'multi';
        action.data = { ...selectedPages[0], isSelected: true } as IdpDocumentPage;

        actionSubject$.next(action);

        const event = new MouseEvent('mouseup', { ctrlKey: ctrlKey, metaKey: metaKey });

        prepareEvent('.idp-list-item-page', 'onItemMouseUp', event);

        expect(component.onItemMouseUp).toHaveBeenCalledOnceWith({ ...selectedPages[0], isSelected: true }, event);
        expect(idpDocumentMultiselectServiceMock.pageSelected).toHaveBeenCalledWith(selectedPages[0].id, 'multi', true);
    };

    const prepareEvent = (selector: string, funcName: keyof PageListComponent, event: UIEvent) => {
        const element = fixture.debugElement.nativeElement.querySelector(selector) as HTMLElement;
        spyOn(component, funcName as any).and.callThrough();
        element.focus();
        element.dispatchEvent(event);

        fixture.detectChanges();
    };

    it('should copy document id on document double click', () => {
        const element = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-page__0"]') as HTMLElement;

        spyOn(component, 'onDoubleClick').and.callThrough();

        element.dispatchEvent(new MouseEvent('dblclick'));
        fixture.detectChanges();

        expect(component.onDoubleClick).toHaveBeenCalledTimes(1);
        expect(idpDocumentServiceMock.copyDocumentDetailsToClipboard).toHaveBeenCalledOnceWith(component.documentId);
    });

    it('should call cutSelectedPages when onPagesCut executes with feature enabled', () => {
        component.isCutInsertFeatureOn = true;

        component.onPagesCut();

        expect(idpDocumentServiceMock.cutSelectedPages).toHaveBeenCalledTimes(1);
    });

    it('should insert cut pages above the target page', fakeAsync(() => {
        component.isCutInsertFeatureOn = true;

        const targetPage = mockedDocuments[1].pages[1];
        const event: PagesInsertEvent = { documentId, pageId: targetPage.id };
        const expectedIndex = mockedDocuments[1].pages.findIndex((page) => page.id === targetPage.id);

        component.onPagesInsertAbove(event);

        expect(idpDocumentServiceMock.insertCutPages).toHaveBeenCalledOnceWith(documentId, expectedIndex);
    }));

    it('should insert cut pages below the target page', fakeAsync(() => {
        component.isCutInsertFeatureOn = true;

        const targetPage = mockedDocuments[1].pages[0];
        const event: PagesInsertEvent = { documentId, pageId: targetPage.id };
        const expectedIndex = mockedDocuments[1].pages.findIndex((page) => page.id === targetPage.id) + 1;

        component.onPagesInsertBelow(event);

        expect(idpDocumentServiceMock.insertCutPages).toHaveBeenCalledOnceWith(documentId, expectedIndex);
    }));

    it('should open context menu for first page when openContextMenuForFirstPage is called', () => {
        component.isCutInsertFeatureOn = true;
        const firstPageComponent = {
            page: selectedPages[0],
            openContextMenu: jasmine.createSpy('openContextMenu'),
            pageListItem: {} as ListItemComponent,
        } as unknown as PageComponent;
        const secondPageComponent = {
            page: selectedPages[1],
            openContextMenu: jasmine.createSpy('openContextMenu'),
            pageListItem: {} as ListItemComponent,
        } as unknown as PageComponent;
        const pageComponentsQueryList = new QueryList<PageComponent>();
        pageComponentsQueryList.reset([firstPageComponent, secondPageComponent]);
        component.childPageComponents = pageComponentsQueryList;

        component.openContextMenuForFirstPage();

        expect(firstPageComponent.openContextMenu).toHaveBeenCalledTimes(1);
        expect(secondPageComponent.openContextMenu).not.toHaveBeenCalled();
    });
});

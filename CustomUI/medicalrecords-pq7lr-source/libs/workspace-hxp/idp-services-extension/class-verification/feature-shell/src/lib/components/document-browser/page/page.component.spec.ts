/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { PageComponent } from './page.component';
import { By } from '@angular/platform-browser';
import { createMockPage } from '../../../models/mocked/mocked-documents';
import { PageContextMenuComponent } from '../page-context-menu/page-context-menu.component';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';

describe('PageComponent', () => {
    let component: PageComponent;
    let fixture: ComponentFixture<PageComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [PageComponent, NoopAnimationsModule, NoopTranslateModule, SatIconModule],
            providers: [
                provideMockFeatureFlags({
                    [WORKSPACE_IDP_HXP.CLASS_VERIFICATION_CUT_INSERT]: true,
                }),
            ],
        });

        fixture = TestBed.createComponent(PageComponent);
        component = fixture.componentInstance;
        component.page = createMockPage('doc-1', 0);
        component.pageIndex = 0;
        component.canCutPages = true;
        component.canInsertPages = true;
        component.isCutInsertFeatureOn = true;
        fixture.detectChanges();
    });

    it('should emit pageMouseEnter events', fakeAsync(() => {
        const spy = jasmine.createSpy('pageMouseEnter');
        component.pageMouseEnter.subscribe(spy);

        component.onItemMouseEnter();

        tick();

        expect(spy).toHaveBeenCalledWith(component.page);
    }));

    it('should emit mouse down events with page payload', fakeAsync(() => {
        const spy = jasmine.createSpy('pageMouseDown');
        component.pageMouseDown.subscribe(spy);
        const event = new MouseEvent('mousedown');

        component.onItemMouseDown(event);

        tick();

        expect(spy).toHaveBeenCalledWith({ page: component.page, event });
    }));

    it('should emit mouse up events with page payload', fakeAsync(() => {
        const spy = jasmine.createSpy('pageMouseUp');
        component.pageMouseUp.subscribe(spy);
        const event = new MouseEvent('mouseup');

        component.onItemMouseUp(event);

        tick();

        expect(spy).toHaveBeenCalledWith({ page: component.page, event });
    }));

    it('should emit keyboard events with page payload', fakeAsync(() => {
        const spy = jasmine.createSpy('pageKeyDown');
        component.pageKeyDown.subscribe(spy);
        const event = new KeyboardEvent('keydown', { key: 'Enter' });

        component.onItemKeyDown(event);

        tick();

        expect(spy).toHaveBeenCalledWith({ page: component.page, event });
    }));

    it('should emit double click events', fakeAsync(() => {
        const spy = jasmine.createSpy('pageMouseDoubleClick');
        component.pageMouseDoubleClick.subscribe(spy);

        component.onDoubleClick();

        tick();

        expect(spy).toHaveBeenCalled();
    }));

    it('should emit pagesCut events', fakeAsync(() => {
        const spy = jasmine.createSpy('pagesCut');
        component.pagesCut.subscribe(spy);

        component.onPagesCut();

        tick();

        expect(spy).toHaveBeenCalled();
    }));

    it('should emit pagesInsertedAbove with document and page identifiers', fakeAsync(() => {
        const spy = jasmine.createSpy('pagesInsertedAbove');
        component.pagesInsertedAbove.subscribe(spy);

        component.onPagesInsertAbove();

        tick();

        expect(spy).toHaveBeenCalledWith({ documentId: component.page.documentId, pageId: component.page.id });
    }));

    it('should emit pagesInsertedBelow with document and page identifiers', fakeAsync(() => {
        const spy = jasmine.createSpy('pagesInsertedBelow');
        component.pagesInsertedBelow.subscribe(spy);

        component.onPagesInsertBelow();

        tick();

        expect(spy).toHaveBeenCalledWith({ documentId: component.page.documentId, pageId: component.page.id });
    }));

    it('should store canInsertPages state when context menu opens', () => {
        component.canInsertPages = true;

        component.onPageContextMenuOpened();

        expect(component.frozenCanInsertPages).toBeTrue();
    });

    it('should focus the list item when the context menu closes', () => {
        const focusSpy = spyOn(component.pageListItem, 'focus');

        component.onPageContextMenuClosed();

        expect(focusSpy).toHaveBeenCalled();
    });

    it('should open context menu on contextmenu event', async () => {
        component.canCutPages = true;

        const pageContextMenu = fixture.debugElement.query(By.directive(PageContextMenuComponent)).componentInstance;
        const pageContextMenuOpenSpy = spyOn(pageContextMenu, 'openContextMenuAt');

        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 10 });
        spyOn(event, 'preventDefault');
        spyOn(event, 'stopPropagation');

        component.onContextMenu(event);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(pageContextMenuOpenSpy).toHaveBeenCalledWith(100, 10);
    });

    it('should open context menu', async () => {
        component.canCutPages = true;

        const pageContextMenu = fixture.debugElement.query(By.directive(PageContextMenuComponent)).componentInstance;
        const pageContextMenuOpenSpy = spyOn(pageContextMenu, 'openContextMenu');

        component.openContextMenu();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(pageContextMenuOpenSpy).toHaveBeenCalled();
    });
});

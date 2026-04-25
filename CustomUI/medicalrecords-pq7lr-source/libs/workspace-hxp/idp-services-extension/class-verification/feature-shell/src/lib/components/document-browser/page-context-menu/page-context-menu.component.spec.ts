/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PageContextMenuComponent } from './page-context-menu.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatMenuHarness, MatMenuItemHarness } from '@angular/material/menu/testing';
import { MatMenuTrigger } from '@angular/material/menu';

describe('PageContextMenuComponent', () => {
    let fixture: ComponentFixture<PageContextMenuComponent>;
    let component: PageContextMenuComponent;
    const getMenuAutomationIds = async () => {
        const overlay = TestbedHarnessEnvironment.documentRootLoader(fixture);

        const loader = TestbedHarnessEnvironment.loader(fixture);
        const menu = await loader.getHarness(MatMenuHarness);
        await menu.open();

        const items = await overlay.getAllHarnesses(MatMenuItemHarness.with({ selector: '[data-automation-id^="idp-page-context-menu-item-"]' }));

        const ids = await Promise.all(
            items.map(async (item) => {
                const host = await item.host();
                const dataset = (await host.getProperty('dataset')) as DOMStringMap | null;
                return dataset?.['automationId'] ?? null;
            })
        );

        return ids.filter((id): id is string => !!id);
    };

    const getMatMenuTrigger = () => fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [PageContextMenuComponent, NoopAnimationsModule, NoopTranslateModule],
        });

        fixture = TestBed.createComponent(PageContextMenuComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should show cut option when canCut is true', async () => {
        fixture.componentRef.setInput('canCut', true);
        fixture.componentRef.setInput('canInsert', false);
        fixture.detectChanges();

        expect(await getMenuAutomationIds()).toEqual(['idp-page-context-menu-item-cut']);
    });

    it('should hide cut option when canCut is false', async () => {
        fixture.componentRef.setInput('canCut', false);
        fixture.componentRef.setInput('canInsert', false);
        fixture.detectChanges();

        expect(await getMenuAutomationIds()).toEqual([]);
    });

    it('should show insert options when canInsert is true', async () => {
        fixture.componentRef.setInput('canCut', false);
        fixture.componentRef.setInput('canInsert', true);
        fixture.detectChanges();

        expect(await getMenuAutomationIds()).toEqual(['idp-page-context-menu-item-insert-above', 'idp-page-context-menu-item-insert-below']);
    });

    it('should hide insert options when canInsert is false', async () => {
        fixture.componentRef.setInput('canCut', false);
        fixture.componentRef.setInput('canInsert', false);
        fixture.detectChanges();

        expect(await getMenuAutomationIds()).toEqual([]);
    });

    it('should emit pagesCut event when pagesCut menu item is clicked', fakeAsync(() => {
        const cutSpy = jasmine.createSpy('pagesCut');
        component.pagesCut.subscribe(cutSpy);

        fixture.componentRef.setInput('canCut', true);
        fixture.detectChanges();

        component.onCutPages();

        tick();

        expect(cutSpy).toHaveBeenCalled();
    }));

    it('should emit insertAbove event when insertAbove menu item is clicked', fakeAsync(() => {
        const insertAboveSpy = jasmine.createSpy('pagesInsertedAbove');
        component.pagesInsertedAbove.subscribe(insertAboveSpy);

        fixture.componentRef.setInput('canInsert', true);
        fixture.detectChanges();

        component.onInsertPagesAbove();

        tick();

        expect(insertAboveSpy).toHaveBeenCalled();
    }));

    it('should emit insertBelow event when insertBelow menu item is clicked', fakeAsync(() => {
        const insertBelowSpy = jasmine.createSpy('pagesInsertedBelow');
        component.pagesInsertedBelow.subscribe(insertBelowSpy);

        fixture.componentRef.setInput('canInsert', true);
        fixture.detectChanges();

        component.onInsertPagesBelow();

        tick();

        expect(insertBelowSpy).toHaveBeenCalled();
    }));

    it('should emit menuOpened event when onMenuOpened is called', fakeAsync(() => {
        const menuOpenedSpy = jasmine.createSpy('menuOpened');
        component.menuOpened.subscribe(menuOpenedSpy);

        component.onMenuOpened();

        tick();

        expect(menuOpenedSpy).toHaveBeenCalled();
    }));

    it('should emit menuClosed event when onMenuClosed is called', fakeAsync(() => {
        const menuClosedSpy = jasmine.createSpy('menuClosed');
        component.menuClosed.subscribe(menuClosedSpy);

        component.onMenuClosed();

        tick();

        expect(menuClosedSpy).toHaveBeenCalled();
    }));

    it('should compute host bounds and call openContextMenuAt when openContextMenu is invoked', () => {
        const openContextMenuAtSpy = spyOn(component, 'openContextMenuAt');
        const hostElement = fixture.nativeElement as HTMLElement;
        const parentElement = hostElement.parentElement ?? hostElement;
        spyOn(parentElement, 'getBoundingClientRect').and.returnValue({ top: 40, right: 140, height: 60 } as DOMRect);

        component.openContextMenu();

        expect(openContextMenuAtSpy).toHaveBeenCalledWith(130, 70);
    });

    it('should not open menu when canCut is false in openContextMenuAt', () => {
        component.canCut = false;
        const trigger = getMatMenuTrigger();
        const openMenuSpy = spyOn(trigger, 'openMenu');

        component.openContextMenuAt(200, 300);

        expect(component.position).toEqual({ x: '0px', y: '0px' });
        expect(openMenuSpy).not.toHaveBeenCalled();
    });

    it('should position trigger and open menu when canCut is true in openContextMenuAt', () => {
        component.canCut = true;
        const trigger = getMatMenuTrigger();
        const openMenuSpy = spyOn(trigger, 'openMenu');

        component.openContextMenuAt(250, 150);

        expect(component.position).toEqual({ x: '250px', y: '150px' });
        expect(openMenuSpy).toHaveBeenCalled();
    });
});

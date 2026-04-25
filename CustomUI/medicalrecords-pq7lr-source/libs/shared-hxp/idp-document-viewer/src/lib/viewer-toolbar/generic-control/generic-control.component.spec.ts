/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericControlComponent } from './generic-control.component';
import { ViewerService } from '../../services/viewer.service';
import { ViewerToolbarService } from '../../services/viewer-toolbar.service';
import { BehaviorSubject } from 'rxjs';
import { getDefaultStateData, StateData } from '../../models/state-data';
import { ConfigDefault } from '../../models/config-default';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { ToolbarItem, ToolbarItemTypes } from '../../models/toolbar';
import { ToolbarConfig } from '../../models/toolbar-config';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { userLayoutOptionsFromString } from '../../models/layout';
import { EventTypes } from '../../models/events';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('GenericControlComponent', () => {
    let component: GenericControlComponent;
    let fixture: ComponentFixture<GenericControlComponent>;
    let mockViewerState$: BehaviorSubject<StateData>;
    let menuTrigger: MatMenuTrigger;

    beforeEach(async () => {
        mockViewerState$ = new BehaviorSubject<StateData>(getDefaultStateData(ConfigDefault));

        const mockViewerService = {
            viewerState$: mockViewerState$.asObservable(),
            changeUserSelectedLayout: jest.fn(),
            changeViewerState: jest.fn(),
            changeToolbarItemSelectionState: jest.fn(),
        };
        const mockViewerToolbarService = {
            focusToolbarItem$: new BehaviorSubject(null).asObservable(),
        };
        await TestBed.configureTestingModule({
            imports: [
                GenericControlComponent,
                NoopTranslateModule,
                NoopAnimationsModule,
                CommonModule,
                MatIconTestingModule,
                MatButtonModule,
                MatMenuModule,
                MatTooltipModule,
            ],
            providers: [
                { provide: ViewerService, useValue: mockViewerService },
                { provide: ViewerToolbarService, useValue: mockViewerToolbarService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        mockViewerState$.complete();
        fixture.destroy();
    });

    it('should have nativeElement', async () => {
        await fixture.whenStable();
        const compiled = fixture.nativeElement;
        const genericControlToolbarElement = compiled.querySelector('.idp-generic-control-container');
        expect(genericControlToolbarElement).not.toBeNull();
        expect(genericControlToolbarElement.classList).toContain('idp-left-right');

        expect(compiled.querySelector('.idp-toolbar-button')).not.toBeNull();
    });

    it('should have menu button exist and open up menu on click', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.LayoutChange);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        const compiled = fixture.nativeElement as HTMLElement;
        const matMenuElement = compiled.querySelector('.idp-menu-button');
        expect(matMenuElement).not.toBeNull();

        const menuButton = fixture.debugElement.query(By.css('.idp-menu-button'));
        menuButton.triggerEventHandler('click');
        menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
        menuTrigger.openMenu();
        fixture.detectChanges();

        const menuContainerElement = fixture.debugElement.query(By.css('.idp-menu-item-container'));
        expect(menuContainerElement).not.toBeNull();
        const labelElement = menuContainerElement.nativeElement.querySelector('.idp-menu-item-container__label');
        expect(labelElement).not.toBeNull();

        expect(component.toolbarItem).not.toBeNull();
        const toolbarItem = component.toolbarItem as ToolbarItem;
        expect(toolbarItem.type).toEqual(ToolbarItemTypes.LayoutChange);
        expect(toolbarItem.enabled).toEqual(true);
        expect(toolbarItem.subItems).not.toBeNull();
        const subItems = toolbarItem.subItems as { [key: string]: { enabled: boolean } };
        const gridSubItem = subItems['grid'];
        const verticalSubItem = subItems['vertical_scrolling'];
        const horizontalSubItem = subItems['horizontal_scrolling'];
        expect(gridSubItem?.enabled).toBe(false);
        expect(verticalSubItem?.enabled).toBe(false);
        expect(horizontalSubItem?.enabled).toBe(false);
    });

    it('should call onMenuItemClick when a menu item is clicked', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.LayoutChange);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        component.onMenuItemClick = jest.fn();
        const menuButton = fixture.debugElement.query(By.css('.idp-menu-button'));
        menuButton.triggerEventHandler('click');
        menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
        menuTrigger.openMenu();
        fixture.detectChanges();

        const menuItem = fixture.debugElement.query(By.css('.idp-menu-item-button'));
        menuItem.nativeElement.dispatchEvent(new Event('click', { bubbles: true }));
        fixture.detectChanges();

        expect(component.onMenuItemClick).toHaveBeenCalled();
    });

    it('should select the correct subitem when a menu item grid layout is clicked', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.LayoutChange);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        const menuButton = fixture.debugElement.query(By.css('.idp-menu-button'));
        menuButton.triggerEventHandler('click');
        menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
        menuTrigger.openMenu();
        fixture.detectChanges();

        const menuItem = fixture.debugElement.query(By.css('#Grid'));
        menuItem.nativeElement.dispatchEvent(new Event('click', { bubbles: true }));
        fixture.detectChanges();

        const layoutType = userLayoutOptionsFromString('Grid');
        const service = TestBed.inject(ViewerService);
        expect(service.changeUserSelectedLayout).toHaveBeenCalledWith(layoutType);
    });

    it('should select the correct subitem when a menu item horizontal layout is clicked', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.LayoutChange);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        const menuButton = fixture.debugElement.query(By.css('.idp-menu-button'));
        menuButton.triggerEventHandler('click');
        menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
        menuTrigger.openMenu();
        fixture.detectChanges();

        const menuItem = fixture.debugElement.query(By.css('#Single_Horizontal'));
        menuItem.nativeElement.dispatchEvent(new Event('click', { bubbles: true }));
        fixture.detectChanges();

        const layoutType = userLayoutOptionsFromString('Single_Horizontal');
        const service = TestBed.inject(ViewerService);
        expect(service.changeUserSelectedLayout).toHaveBeenCalledWith(layoutType);
    });

    it('should call onToolbarAction when FullScreen toolbar button is clicked', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.FullScreen);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        component.onToolbarAction = jest.fn();
        const toolbarButton = fixture.debugElement.query(By.css('#FullScreen'));
        toolbarButton.triggerEventHandler('click');
        fixture.detectChanges();

        expect(component.onToolbarAction).toHaveBeenCalled();
    });

    it('should change fullscreen state when FullScreen toolbar action is triggered', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.FullScreen);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        const service = TestBed.inject(ViewerService);
        component.onToolbarAction(item);
        fixture.detectChanges();

        const newFullScreen = !component.currentViewerState?.fullscreen;
        expect(service.changeViewerState).toHaveBeenCalledWith(
            { fullscreen: newFullScreen },
            newFullScreen ? EventTypes.FullScreenEnter : EventTypes.FullScreenExit
        );
    });

    it('should call onToolbarAction when Rotate toolbar button is clicked', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.Rotate);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        component.onToolbarAction = jest.fn();
        const toolbarButton = fixture.debugElement.query(By.css('#Rotate'));
        toolbarButton.triggerEventHandler('click');
        fixture.detectChanges();

        expect(component.onToolbarAction).toHaveBeenCalled();
    });

    it('should rotate the document when Rotate toolbar action is triggered', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.Rotate);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true, config: { step: 90 } };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        const service = TestBed.inject(ViewerService);
        component.onToolbarAction(item);
        fixture.detectChanges();

        const newRotation = (component.currentViewerState?.rotationStep || 0) % 360;
        expect(service.changeViewerState).toHaveBeenCalledWith({ rotationStep: newRotation }, EventTypes.RotationChanged);
    });

    it('should call onToolbarAction when BestFit toolbar button is clicked', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.BestFit);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        component.onToolbarAction = jest.fn();
        const toolbarButton = fixture.debugElement.query(By.css('#BestFit'));
        toolbarButton.triggerEventHandler('click');
        fixture.detectChanges();

        expect(component.onToolbarAction).toHaveBeenCalled();
    });

    it('should toggle best fit state when BestFit toolbar action is triggered', async () => {
        const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.BestFit);
        fixture = TestBed.createComponent(GenericControlComponent);
        component = fixture.componentInstance;
        if (item) {
            component.toolbarItem = { ...item, enabled: true };
        }
        fixture.detectChanges();
        await fixture.whenStable();
        const service = TestBed.inject(ViewerService);
        component.onToolbarAction(item);
        fixture.detectChanges();

        const newBestFit = !component.currentViewerState?.bestFit;
        expect(service.changeViewerState).toHaveBeenCalledWith({ bestFit: newBestFit }, EventTypes.Resize);
    });

    describe('Menu Keyboard Navigation', () => {
        beforeEach(async () => {
            const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.LayoutChange);
            fixture = TestBed.createComponent(GenericControlComponent);
            component = fixture.componentInstance;
            if (item) {
                component.toolbarItem = { ...item, enabled: true };
            }
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should trigger onMenuOpened when menu trigger opens', async () => {
            jest.spyOn(component, 'onMenuOpened');
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();

            expect(component.onMenuOpened).toHaveBeenCalled();
        });

        it('should trigger onMenuClosed when menu trigger closes', async () => {
            jest.spyOn(component, 'onMenuClosed');
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();

            menuTrigger.closeMenu();
            fixture.detectChanges();

            expect(component.onMenuClosed).toHaveBeenCalled();
        });

        it('should call onMenuKeydown when keydown event is triggered on menu item', async () => {
            jest.spyOn(component, 'onMenuKeydown');
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();

            const menuItem = fixture.debugElement.query(By.css('.idp-menu-item-button'));
            const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
            menuItem.nativeElement.dispatchEvent(keydownEvent);
            fixture.detectChanges();

            expect(component.onMenuKeydown).toHaveBeenCalled();
        });

        it('should prevent default and stop propagation for ArrowDown key', async () => {
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();
            await fixture.whenStable();

            component.onMenuOpened();

            const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
            jest.spyOn(event, 'preventDefault');
            jest.spyOn(event, 'stopPropagation');

            component.onMenuKeydown(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        it('should prevent default and stop propagation for ArrowUp key', async () => {
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();
            await fixture.whenStable();

            component.onMenuOpened();

            const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
            jest.spyOn(event, 'preventDefault');
            jest.spyOn(event, 'stopPropagation');

            component.onMenuKeydown(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        it('should prevent default for non-arrow keys like Home', async () => {
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();
            await fixture.whenStable();

            component.onMenuOpened();

            const event = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
            jest.spyOn(event, 'preventDefault');
            jest.spyOn(event, 'stopPropagation');

            component.onMenuKeydown(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        it('should prevent default for non-arrow keys like End', async () => {
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();
            await fixture.whenStable();

            component.onMenuOpened();

            const event = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
            jest.spyOn(event, 'preventDefault');
            jest.spyOn(event, 'stopPropagation');

            component.onMenuKeydown(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        it('should not throw error when onMenuKeydown is called before menu is opened', () => {
            const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

            expect(() => component.onMenuKeydown(event)).not.toThrow();
        });

        it('should handle keyboard navigation after menu is opened and closed', async () => {
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();

            component.onMenuOpened();

            menuTrigger.closeMenu();
            fixture.detectChanges();

            component.onMenuClosed();

            const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
            expect(() => component.onMenuKeydown(event)).not.toThrow();
        });

        it('should handle all supported navigation keys without errors', async () => {
            menuTrigger = fixture.debugElement.query(By.directive(MatMenuTrigger)).injector.get(MatMenuTrigger);
            menuTrigger.openMenu();
            fixture.detectChanges();
            await fixture.whenStable();

            component.onMenuOpened();

            const navigationKeys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Tab'];

            for (const key of navigationKeys) {
                const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
                expect(() => component.onMenuKeydown(event)).not.toThrow();
            }
        });
    });
});

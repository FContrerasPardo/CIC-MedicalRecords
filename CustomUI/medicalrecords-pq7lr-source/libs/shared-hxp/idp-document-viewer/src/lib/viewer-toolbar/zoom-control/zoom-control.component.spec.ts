/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ZoomControlComponent } from './zoom-control.component';
import { ViewerService } from '../../services/viewer.service';
import { BehaviorSubject } from 'rxjs';
import { getDefaultStateData, StateData } from '../../models/state-data';
import { ConfigDefault } from '../../models/config-default';
import { ToolbarPosition } from '../../models/config-options';
import { UserLayoutOptions } from '../../models/layout';
import { ToolbarConfig } from '../../models/toolbar-config';
import { ToolbarControlPosition, ToolbarItem, ToolbarItemTypes } from '../../models/toolbar';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { By } from '@angular/platform-browser';
import { EventTypes } from '../../models/events';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const getZoomToolbarItem = (): ToolbarItem => {
    const item = Object.values(ToolbarConfig).find((tbItem) => tbItem.type === ToolbarItemTypes.Zoom);
    if (!item) {
        throw new Error('Zoom toolbar item not found in ToolbarConfig');
    }
    return item;
};

describe('ZoomControlComponent', () => {
    let component: ZoomControlComponent;
    let fixture: ComponentFixture<ZoomControlComponent>;
    let mockViewerState$: BehaviorSubject<StateData>;

    beforeEach(async () => {
        mockViewerState$ = new BehaviorSubject<StateData>(getDefaultStateData(ConfigDefault));

        const mockViewerService = {
            viewerState$: mockViewerState$.asObservable(),
            changeViewerState: jest.fn(),
            viewerConfig: ConfigDefault,
        };

        await TestBed.configureTestingModule({
            imports: [NoopTranslateModule, MatIconTestingModule],
            providers: [{ provide: ViewerService, useValue: mockViewerService }],
        }).compileComponents();

        fixture = TestBed.createComponent(ZoomControlComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        mockViewerState$.complete();
    });

    const setupZoomItem = (zoomLevel: number): ToolbarItem => {
        const item = getZoomToolbarItem();
        component.toolbarItem = item;
        component.currentViewerState = { currentZoomLevel: zoomLevel } as StateData;
        fixture.detectChanges();
        return item;
    };


    it('should have nativeElement', async () => {
        await fixture.whenStable();
        const compiled = fixture.nativeElement;
        const zoomToolbarElement = compiled.querySelector('.idp-zoom-container');
        expect(zoomToolbarElement).not.toBeNull();
        expect(compiled.querySelector('.idp-zoom-input input')).not.toBeNull();
        expect(zoomToolbarElement.classList).toContain('idp-left-right');
    });

    it('should have zoom in and zoom out button exist and disabled', async () => {
        const item = getZoomToolbarItem();
        fixture = TestBed.createComponent(ZoomControlComponent);
        component = fixture.componentInstance;
        component.toolbarItem = { ...item, enabled: true };
        fixture.detectChanges();
        await fixture.whenStable();

        const compiled = fixture.nativeElement;
        expect(compiled.querySelector('#zoom_in')).not.toBeNull();
        expect(compiled.querySelector('#zoom_out')).not.toBeNull();

        const toolbarItem = component.toolbarItem;
        expect(toolbarItem).toBeDefined();
        expect(toolbarItem?.type).toEqual(ToolbarItemTypes.Zoom);
        const subItems = toolbarItem?.subItems;
        expect(subItems).toBeDefined();
        expect(subItems?.['zoom_in']?.enabled).toBe(false);
        expect(subItems?.['zoom_out']?.enabled).toBe(false);
    });

    it('should zoom in and zoom out button have proper order', async () => {
        const item = getZoomToolbarItem();
        fixture = TestBed.createComponent(ZoomControlComponent);
        component = fixture.componentInstance;
        component.toolbarItem = {
            ...item,
            subItems: {
                zoom_in: { id: 'zoom_in', icon: '', label: '', enabled: false, order: 1 },
                zoom_out: { id: 'zoom_out', icon: '', label: '', enabled: false, order: 2 },
            },
        };
        fixture.detectChanges();
        await fixture.whenStable();

        const zoomInButton = fixture.debugElement.query(By.css('#zoom_in'));
        expect(zoomInButton).not.toBeNull();
        expect(zoomInButton.attributes['order']).toEqual('1');

        const zoomOutButton = fixture.debugElement.query(By.css('#zoom_out'));
        expect(zoomOutButton).not.toBeNull();
        expect(zoomOutButton.attributes['order']).toEqual('2');
    });

    it('should have default zoom level 100', (done) => {
        mockViewerState$.next(getDefaultStateData({ ...ConfigDefault, toolbarPosition: ToolbarPosition.Right }));
        fixture.detectChanges();

        component.currentViewerState$.subscribe((state) => {
            expect(state.currentLayout.type).toEqual(UserLayoutOptions.Single_Vertical);
            expect(state.currentToolbarPosition).toEqual('right');
            expect(state.currentZoomLevel).toEqual(100);
            done();
        });
    });

    describe('onToolbarAction', () => {
        it('should zoom in when zoom_in subitem is triggered', () => {
            const item = setupZoomItem(100);
            jest.spyOn(component, 'onZoomChange');

            component.onToolbarAction(item, item.subItems?.['zoom_in']);
            expect(component.onZoomChange).toHaveBeenCalledWith(125, item);
        });

        it('should zoom out when zoom_out subitem is triggered', () => {
            const item = setupZoomItem(100);
            jest.spyOn(component, 'onZoomChange');

            component.onToolbarAction(item, item.subItems?.['zoom_out']);
            expect(component.onZoomChange).toHaveBeenCalledWith(75, item);
        });

        it('should not change zoom level if subitem is not provided', () => {
            const item = setupZoomItem(100);
            jest.spyOn(component, 'onZoomChange');

            component.onToolbarAction(item);
            expect(component.onZoomChange).toHaveBeenCalledWith(100, item);
        });

        it('should snap to next zoom step when zoom in from non-standard level', () => {
            const item = setupZoomItem(123);
            jest.spyOn(component, 'onZoomChange');

            component.onToolbarAction(item, item.subItems?.['zoom_in']);
            expect(component.onZoomChange).toHaveBeenCalledWith(125, item);
        });

        it('should snap to previous zoom step when zoom out from non-standard level', () => {
            const item = setupZoomItem(97);
            jest.spyOn(component, 'onZoomChange');

            component.onToolbarAction(item, item.subItems?.['zoom_out']);
            expect(component.onZoomChange).toHaveBeenCalledWith(75, item);
        });
    });

    describe('onZoomChange', () => {
        it('should reset to current zoom level if input is invalid', () => {
            const item = setupZoomItem(100);
            const zoomInput = fixture.debugElement.query(By.css('.idp-zoom-input input'));

            component.onZoomChange('invalid', item);
            expect(zoomInput.nativeElement.value).toBe('100');
        });

        it('should reset to current zoom level if value is out of bounds', () => {
            const item = setupZoomItem(100);
            const zoomInput = fixture.debugElement.query(By.css('.idp-zoom-input input'));

            component.onZoomChange(600, item);
            expect(zoomInput.nativeElement.value).toBe('100');
        });

        it('should apply zoom level and notify service if value is within bounds', async () => {
            const mockViewerService = TestBed.inject(ViewerService);
            const item = setupZoomItem(125);
            await fixture.whenStable();

            const zoomInput = fixture.debugElement.query(By.css('.idp-zoom-input input'));
            component.onZoomChange(125, item);

            expect(zoomInput.nativeElement.value).toBe('100');
            expect(mockViewerService.changeViewerState).toHaveBeenCalledWith({ currentZoomLevel: 125 }, EventTypes.ZoomChanged);
        });

        it('should reset to current zoom level if zoomConfig is invalid', () => {
            const item = setupZoomItem(100);
            const zoomInput = fixture.debugElement.query(By.css('.idp-zoom-input input'));

            component.onZoomChange('invalid', item);
            expect(zoomInput.nativeElement.value).toBe('100');
        });
    });

    describe('blur behavior', () => {
        it('should reset input value to current zoom level on blur if input is invalid', () => {
            setupZoomItem(100);
            const zoomInput = fixture.debugElement.query(By.css('.idp-zoom-input input')).nativeElement;

            zoomInput.value = 'invalid';
            zoomInput.dispatchEvent(new Event('blur'));
            expect(zoomInput.value).toBe('100');
        });

        it('should keep input value on blur if input is valid', () => {
            setupZoomItem(100);
            component.inputValue = '125';

            const zoomInput = fixture.debugElement.query(By.css('.idp-zoom-input input')).nativeElement;
            zoomInput.value = '125';
            fixture.detectChanges();

            zoomInput.dispatchEvent(new Event('blur'));
            expect(zoomInput.value).toBe('125');
        });

        it('should reset input value on blur if input is empty', () => {
            setupZoomItem(100);
            const zoomInput = fixture.debugElement.query(By.css('.idp-zoom-input input')).nativeElement;

            zoomInput.value = '';
            zoomInput.dispatchEvent(new Event('blur'));
            expect(zoomInput.value).toBe('100');
        });
    });

    it('should display zoomOut first for top/bottom position and zoomIn first for left/right position', async () => {
        const zoomItem: ToolbarItem = {
            type: ToolbarItemTypes.Zoom,
            enabled: true,
            icon: '',
            label: '',
            canStaySelected: false,
            selected: false,
            order: 1,
            position: ToolbarControlPosition.Start,
            displayType: 'button',
            eventType: EventTypes.ZoomChanged,
            subItems: {
                zoom_in: { id: 'zoom_in', icon: 'zoom_in', label: 'Zoom In', enabled: true, order: 1 },
                zoom_out: { id: 'zoom_out', icon: 'zoom_out', label: 'Zoom Out', enabled: true, order: 2 },
            },
        };

        component.toolbarItem = zoomItem;
        mockViewerState$.next({ ...getDefaultStateData(ConfigDefault), currentToolbarPosition: ToolbarPosition.Top, currentZoomLevel: 100 });
        fixture.detectChanges();
        await fixture.whenStable();

        let buttons = fixture.debugElement.queryAll(By.css('.idp-zoom-container button'));
        expect(buttons.length).toBe(2);
        expect(buttons[0].attributes['id']).toBe('zoom_out');
        expect(buttons[1].attributes['id']).toBe('zoom_in');

        mockViewerState$.next({ ...getDefaultStateData(ConfigDefault), currentToolbarPosition: ToolbarPosition.Left, currentZoomLevel: 100 });
        fixture.detectChanges();
        await fixture.whenStable();

        buttons = fixture.debugElement.queryAll(By.css('.idp-zoom-container button'));
        expect(buttons.length).toBe(2);
        expect(buttons[0].attributes['id']).toBe('zoom_in');
        expect(buttons[1].attributes['id']).toBe('zoom_out');
    });
});

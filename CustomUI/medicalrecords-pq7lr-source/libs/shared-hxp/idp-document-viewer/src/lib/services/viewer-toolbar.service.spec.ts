/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule, NoopTranslationService } from '@alfresco/adf-core';
import { TestBed } from '@angular/core/testing';
import { ViewerToolbarService } from './viewer-toolbar.service';
import { ViewerService } from './viewer.service';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { ConfigDefault } from '../models/config-default';
import { ToolbarItemTypes } from '../models/toolbar';
import { LayoutDirection, LayoutType, UserLayoutOptions } from '../models/layout';
import { StateData } from '../models/state-data';
import { ViewerShortcutAction, ViewerShortcutService } from './viewer-shortcut.service';
import { ViewerLayerType } from '../models/viewer-layer';

describe('ViewerToolbarService', () => {
    let service: ViewerToolbarService;
    let shortcutService: ViewerShortcutService;
    let mockViewerState$: BehaviorSubject<Partial<StateData>>;
    let mockViewerKeyboardEvent$: BehaviorSubject<Partial<KeyboardEvent>>;
    let mockDatasource$: BehaviorSubject<any>;

    beforeEach(() => {
        mockViewerState$ = new BehaviorSubject<Partial<StateData>>({
            currentLayout: { type: UserLayoutOptions.Single_Vertical },
            defaultZoomConfig: { min: 25, max: 300, step: 25 },
            currentZoomLevel: 100,
            pageNavInfo: { currentPageIndex: 1, totalPages: 5 },
            selectedToolbarItems: [ToolbarItemTypes.LayoutChange],
        });

        mockViewerKeyboardEvent$ = new BehaviorSubject<Partial<KeyboardEvent>>({
            key: 'L',
            code: 'KeyL',
        });

        mockDatasource$ = new BehaviorSubject({
            documents: [
                {
                    id: 'doc1',
                    name: 'Document 1',
                    pages: [
                        { id: 'page1', name: 'Page 1', isSelected: true, disableRotation: false },
                        { id: 'page2', name: 'Page 2', isSelected: true, disableRotation: false },
                    ],
                },
            ],
            loadImageFn: () => of({}),
            loadThumbnailFn: () => of(''),
        });

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [
                NoopTranslationService,
                ViewerService,
                ViewerToolbarService,
                ViewerShortcutService,
                {
                    provide: ViewerService,
                    useValue: {
                        viewerLayout$: of({
                            type: LayoutType.SingleScrollable,
                            columns: 1,
                            rows: 1,
                            layoutDirection: LayoutDirection.Vertical,
                            availableActions: [
                                ToolbarItemTypes.Zoom,
                                ToolbarItemTypes.Rotate,
                                ToolbarItemTypes.LayoutChange,
                                ToolbarItemTypes.FullScreen,
                                ToolbarItemTypes.PageNavigation,
                                ToolbarItemTypes.BestFit,
                            ],
                        }),
                        viewerState$: mockViewerState$.asObservable(),
                        datasource$: mockDatasource$.asObservable(),
                        changeViewerState: jest.fn(),
                        changeUserSelectedLayout: jest.fn(),
                        viewerConfig: ConfigDefault,
                        viewerKeyboardEvent$: mockViewerKeyboardEvent$.asObservable(),
                    },
                },
            ],
        });
        service = TestBed.inject(ViewerToolbarService);
        shortcutService = TestBed.inject(ViewerShortcutService);
    });

    afterEach(() => {
        mockViewerState$.complete();
        mockDatasource$.complete();
    });

    it('should initialize viewerToolbarItems$', (done) => {
        service.viewerToolbarItems$.subscribe((items) => {
            expect(items.length).toBeGreaterThan(0);
            done();
        });
    });

    it('should update toolbar items of LayoutChange based on viewer state', (done) => {
        service.viewerToolbarItems$.subscribe((items) => {
            const layoutChangeItem = items.find((item) => item.type === ToolbarItemTypes.LayoutChange);
            expect(layoutChangeItem).toBeTruthy();
            expect(layoutChangeItem?.enabled).toBe(true);
            const subItems = layoutChangeItem?.subItems as { [key: string]: { enabled: boolean } };
            const gridSubItem = subItems['grid'];
            const verticalScrollingSubItem = subItems['vertical_scrolling'];
            const horizontalScrollingSubItem = subItems['horizontal_scrolling'];
            expect(gridSubItem?.enabled).toBe(true);
            expect(verticalScrollingSubItem?.enabled).toBe(true);
            expect(horizontalScrollingSubItem?.enabled).toBe(true);
            done();
        });
    });

    it('should enable/disable subItems of Zoom based on state', (done) => {
        service.viewerToolbarItems$.subscribe((items) => {
            const zoomItem = items.find((item) => item.type === ToolbarItemTypes.Zoom);
            expect(zoomItem).toBeTruthy();
            const subItems = zoomItem?.subItems as { [key: string]: { enabled: boolean } };
            const zoomInSubItem = subItems['zoom_in'];
            const zoomOutSubItem = subItems['zoom_out'];
            expect(zoomInSubItem?.enabled).toBe(true);
            expect(zoomOutSubItem?.enabled).toBe(true);
            done();
        });
    });

    it('should enable Rotate and Fullscreen based on state', (done) => {
        service.viewerToolbarItems$.subscribe((items) => {
            const rotateItem = items.find((item) => item.type === ToolbarItemTypes.Rotate);
            expect(rotateItem).toBeTruthy();
            expect(rotateItem?.enabled).toBe(true);

            const fullScreenItem = items.find((item) => item.type === ToolbarItemTypes.FullScreen);
            expect(fullScreenItem).toBeTruthy();
            expect(fullScreenItem?.enabled).toBe(true);
            done();
        });
    });

    it('should select BestFit toolbar item when bestFit is true', (done) => {
        mockViewerState$.next({
            currentLayout: { type: UserLayoutOptions.SinglePage },
            currentZoomLevel: 100,
            pageNavInfo: { currentPageIndex: 1, totalPages: 5 },
            selectedToolbarItems: [ToolbarItemTypes.BestFit],
            bestFit: true,
        });
        service = TestBed.inject(ViewerToolbarService);

        service.viewerToolbarItems$.subscribe((items) => {
            const bestFitItem = items.find((item) => item.type === ToolbarItemTypes.BestFit);
            expect(bestFitItem).toBeTruthy();
            expect(bestFitItem?.selected).toBe(true);
            done();
        });
    });

    it('should not select BestFit toolbar item when bestFit is false', (done) => {
        mockViewerState$.next({
            currentLayout: { type: UserLayoutOptions.SinglePage },
            currentZoomLevel: 100,
            pageNavInfo: { currentPageIndex: 1, totalPages: 5 },
            selectedToolbarItems: [],
            bestFit: false,
        });
        service = TestBed.inject(ViewerToolbarService);

        service.viewerToolbarItems$.subscribe((items) => {
            const bestFitItem = items.find((item) => item.type === ToolbarItemTypes.BestFit);
            expect(bestFitItem).toBeTruthy();
            expect(bestFitItem?.selected).toBe(false);
            done();
        });
    });

    it('should not select LayoutChange toolbar item when bestFit is true', () => {
        mockViewerState$.next({
            currentLayout: { type: UserLayoutOptions.SinglePage },
            currentZoomLevel: 100,
            pageNavInfo: { currentPageIndex: 1, totalPages: 5 },
            selectedToolbarItems: [ToolbarItemTypes.BestFit],
            bestFit: true,
        });
        service = TestBed.inject(ViewerToolbarService);

        service.viewerToolbarItems$.subscribe((items) => {
            const layoutChangeItem = items.find((item) => item.type === ToolbarItemTypes.LayoutChange);
            expect(layoutChangeItem).toBeTruthy();
            expect(layoutChangeItem?.selected).toBe(false);
        });
    });

    it('should select text only layer', () => {
        mockViewerState$.next({
            currentLayout: { type: UserLayoutOptions.SinglePage },
            currentLayer: ViewerLayerType.TextOnly,
            currentZoomLevel: 100,
            pageNavInfo: { currentPageIndex: 1, totalPages: 5 },
        });
        service = TestBed.inject(ViewerToolbarService);

        service.viewerToolbarItems$.subscribe((items) => {
            const layerSelectionItem = items.find((item) => item.type === ToolbarItemTypes.LayerSelection);
            expect(layerSelectionItem).toBeTruthy();
            const subItemsTextLayer = layerSelectionItem?.subItems as { [key: string]: { id: string; selected: boolean } };
            expect(subItemsTextLayer['image'].id).toBe('image');
            expect(subItemsTextLayer['image'].selected).toBeFalsy();
            expect(subItemsTextLayer['text'].id).toBe('text');
            expect(subItemsTextLayer['text'].selected).toBeTruthy();
        });
    });

    it('should select image layer', () => {
        mockViewerState$.next({
            currentLayout: { type: UserLayoutOptions.SinglePage },
            currentLayer: ViewerLayerType.Image,
            currentZoomLevel: 100,
            pageNavInfo: { currentPageIndex: 1, totalPages: 5 },
        });
        service = TestBed.inject(ViewerToolbarService);

        service.viewerToolbarItems$.subscribe((items) => {
            const layerSelectionItem = items.find((item) => item.type === ToolbarItemTypes.LayerSelection);
            expect(layerSelectionItem).toBeTruthy();
            const subItemsTextLayer = layerSelectionItem?.subItems as { [key: string]: { id: string; selected: boolean } };
            expect(subItemsTextLayer['image'].id).toBe('image');
            expect(subItemsTextLayer['image'].selected).toBeTruthy();
            expect(subItemsTextLayer['text'].id).toBe('text');
            expect(subItemsTextLayer['text'].selected).toBeFalsy();
        });
    });

    it('should handle text layer change shortcut action', async () => {
        const event = new KeyboardEvent('keydown', { key: 'W' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.Text,
            toolbarItemType: ToolbarItemTypes.LayerSelection,
        });

        mockViewerKeyboardEvent$.next(event);

        await firstValueFrom(service.viewerToolbarItems$).then((items) => {
            const layerSelectionItem = items.find((item) => item.type === ToolbarItemTypes.LayerSelection);
            expect(layerSelectionItem).toBeTruthy();
            const subItems = layerSelectionItem?.subItems as { [key: string]: { enabled: boolean; shortcutKey: string } };
            const textSubItem = subItems['text'];
            expect(textSubItem?.enabled).toBe(true);
            expect(textSubItem.shortcutKey).toBe('(SHIFT + W)');
        });
    });

    it('should handle image layer change shortcut action', async () => {
        const event = new KeyboardEvent('keydown', { key: 'I' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.Image,
            toolbarItemType: ToolbarItemTypes.LayerSelection,
        });

        mockViewerKeyboardEvent$.next(event);

        await firstValueFrom(service.viewerToolbarItems$).then((items) => {
            const layerSelectionItem = items.find((item) => item.type === ToolbarItemTypes.LayerSelection);
            expect(layerSelectionItem).toBeTruthy();
            const subItems = layerSelectionItem?.subItems as { [key: string]: { enabled: boolean; shortcutKey: string } };
            const imageSubItem = subItems['image'];
            expect(imageSubItem?.enabled).toBe(true);
            expect(imageSubItem.shortcutKey).toBe('(SHIFT + I)');
        });
    });

    it('should handle LayoutChange shortcut action', (done) => {
        const event = new KeyboardEvent('keydown', { key: 'L' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.LayoutChange,
            toolbarItemType: ToolbarItemTypes.LayoutChange,
        });

        mockViewerKeyboardEvent$.next(event);

        service.viewerToolbarItems$.subscribe((items) => {
            const layoutChangeItem = items.find((item) => item.type === ToolbarItemTypes.LayoutChange);
            expect(layoutChangeItem).toBeTruthy();
            expect(layoutChangeItem?.enabled).toBe(true);
            done();
        });
    });

    it('should handle ZoomIn shortcut action', (done) => {
        const event = new KeyboardEvent('keydown', { key: '+' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.ZoomIn,
            toolbarItemType: ToolbarItemTypes.Zoom,
        });

        mockViewerKeyboardEvent$.next(event);

        service.viewerToolbarItems$.subscribe((items) => {
            const zoomItem = items.find((item) => item.type === ToolbarItemTypes.Zoom);
            expect(zoomItem).toBeTruthy();
            const subItems = zoomItem?.subItems as { [key: string]: { enabled: boolean } };
            const zoomInSubItem = subItems['zoom_in'];
            expect(zoomInSubItem?.enabled).toBe(true);
            done();
        });
    });

    it('should handle ZoomOut shortcut action', (done) => {
        const event = new KeyboardEvent('keydown', { key: '-' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.ZoomOut,
            toolbarItemType: ToolbarItemTypes.Zoom,
        });

        mockViewerKeyboardEvent$.next(event);

        service.viewerToolbarItems$.subscribe((items) => {
            const zoomItem = items.find((item) => item.type === ToolbarItemTypes.Zoom);
            expect(zoomItem).toBeTruthy();
            const subItems = zoomItem?.subItems as { [key: string]: { enabled: boolean } };
            const zoomOutSubItem = subItems['zoom_out'];
            expect(zoomOutSubItem?.enabled).toBe(true);
            done();
        });
    });

    it('should handle Rotate shortcut action', (done) => {
        const event = new KeyboardEvent('keydown', { key: 'R' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.Rotate,
            toolbarItemType: ToolbarItemTypes.Rotate,
        });

        mockViewerKeyboardEvent$.next(event);

        service.viewerToolbarItems$.subscribe((items) => {
            const rotateItem = items.find((item) => item.type === ToolbarItemTypes.Rotate);
            expect(rotateItem).toBeTruthy();
            expect(rotateItem?.enabled).toBe(true);
            done();
        });
    });

    it('should handle FullScreen shortcut action', (done) => {
        const event = new KeyboardEvent('keydown', { key: 'F' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.FullScreen,
            toolbarItemType: ToolbarItemTypes.FullScreen,
        });

        mockViewerKeyboardEvent$.next(event);

        service.viewerToolbarItems$.subscribe((items) => {
            const fullScreenItem = items.find((item) => item.type === ToolbarItemTypes.FullScreen);
            expect(fullScreenItem).toBeTruthy();
            expect(fullScreenItem?.enabled).toBe(true);
            done();
        });
    });

    it('should handle BestFit shortcut action', (done) => {
        const event = new KeyboardEvent('keydown', { key: 'B' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.BestFit,
            toolbarItemType: ToolbarItemTypes.BestFit,
        });

        mockViewerKeyboardEvent$.next(event);

        service.viewerToolbarItems$.subscribe((items) => {
            const bestFitItem = items.find((item) => item.type === ToolbarItemTypes.BestFit);
            expect(bestFitItem).toBeTruthy();
            expect(bestFitItem?.enabled).toBe(true);
            done();
        });
    });

    it('should handle NavigateNextPage shortcut action', (done) => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            toolbarItemType: ToolbarItemTypes.PageNavigation,
        });

        mockViewerKeyboardEvent$.next(event);

        service.viewerToolbarItems$.subscribe((items) => {
            const pageNavItem = items.find((item) => item.type === ToolbarItemTypes.PageNavigation);
            expect(pageNavItem).toBeTruthy();
            const subItems = pageNavItem?.subItems as { [key: string]: { enabled: boolean } };
            const nextPageSubItem = subItems['next'];
            expect(nextPageSubItem?.enabled).toBe(true);
            done();
        });
    });

    it('should handle NavigatePreviousPage shortcut action', (done) => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        shortcutService.getShortcutForEvent = jest.fn().mockReturnValue({
            action: ViewerShortcutAction.NavigatePreviousPage,
            toolbarItemType: ToolbarItemTypes.PageNavigation,
        });

        mockViewerKeyboardEvent$.next(event);

        service.viewerToolbarItems$.subscribe((items) => {
            const pageNavItem = items.find((item) => item.type === ToolbarItemTypes.PageNavigation);
            expect(pageNavItem).toBeTruthy();
            const subItems = pageNavItem?.subItems as { [key: string]: { enabled: boolean } };
            const prevPageSubItem = subItems['previous'];
            expect(prevPageSubItem?.enabled).toBe(true);
            done();
        });
    });

    describe('Rotate button enablement', () => {
        const getRotateButtonEnabledState = async (): Promise<boolean> => {
            const items = await firstValueFrom(service.viewerToolbarItems$);
            return items.find((item) => item.type === ToolbarItemTypes.Rotate)?.enabled ?? false;
        };

        it('should disable Rotate button when text only mode is selected', async () => {
            mockViewerState$.next({
                currentLayout: { type: UserLayoutOptions.SinglePage },
                currentLayer: ViewerLayerType.TextOnly,
                currentZoomLevel: 100,
                pageNavInfo: { currentPageIndex: 1, totalPages: 5 },
                selectedToolbarItems: [],
            });

            await expect(getRotateButtonEnabledState()).resolves.toBe(false);
        });

        it('should enable Rotate button when image mode is selected', async () => {
            mockViewerState$.next({
                currentLayout: { type: UserLayoutOptions.SinglePage },
                currentLayer: ViewerLayerType.Image,
                currentZoomLevel: 100,
                pageNavInfo: { currentPageIndex: 1, totalPages: 5 },
                selectedToolbarItems: [],
            });

            await expect(getRotateButtonEnabledState()).resolves.toBe(true);
        });

        describe('when disableRotation is set on pages', () => {
            it('should disable Rotate button in single page layout when current page has disableRotation: true', async () => {
                mockDatasource$.next({
                    documents: [
                        {
                            id: 'doc1',
                            name: 'Document 1',
                            pages: [
                                { id: 'page1', name: 'Page 1', isSelected: true, disableRotation: true },
                                { id: 'page2', name: 'Page 2', isSelected: true, disableRotation: false },
                            ],
                        },
                    ],
                    loadImageFn: () => of({}),
                    loadThumbnailFn: () => of(''),
                });

                mockViewerState$.next({
                    currentLayout: { type: UserLayoutOptions.SinglePage },
                    currentLayer: ViewerLayerType.Image,
                    currentZoomLevel: 100,
                    pageNavInfo: { currentPageIndex: 0, totalPages: 2 },
                    selectedToolbarItems: [],
                });

                await expect(getRotateButtonEnabledState()).resolves.toBe(false);
            });

            it('should enable Rotate button in single page layout when currentPageIndex is 0 and current page can rotate even if another page cannot', async () => {
                mockDatasource$.next({
                    documents: [
                        {
                            id: 'doc1',
                            name: 'Document 1',
                            pages: [
                                { id: 'page1', name: 'Page 1', isSelected: true, disableRotation: false },
                                { id: 'page2', name: 'Page 2', isSelected: true, disableRotation: true },
                            ],
                        },
                    ],
                    loadImageFn: () => of({}),
                    loadThumbnailFn: () => of(''),
                });

                mockViewerState$.next({
                    currentLayout: { type: UserLayoutOptions.SinglePage },
                    currentLayer: ViewerLayerType.Image,
                    currentZoomLevel: 100,
                    pageNavInfo: { currentPageIndex: 0, totalPages: 2 },
                    selectedToolbarItems: [],
                });

                await expect(getRotateButtonEnabledState()).resolves.toBe(true);
            });

            it('should enable Rotate button in single page layout when current page can rotate even if another page cannot', async () => {
                mockDatasource$.next({
                    documents: [
                        {
                            id: 'doc1',
                            name: 'Document 1',
                            pages: [
                                { id: 'page1', name: 'Page 1', isSelected: true, disableRotation: true },
                                { id: 'page2', name: 'Page 2', isSelected: true, disableRotation: false },
                            ],
                        },
                    ],
                    loadImageFn: () => of({}),
                    loadThumbnailFn: () => of(''),
                });

                mockViewerState$.next({
                    currentLayout: { type: UserLayoutOptions.SinglePage },
                    currentLayer: ViewerLayerType.Image,
                    currentZoomLevel: 100,
                    pageNavInfo: { currentPageIndex: 1, totalPages: 2 },
                    selectedToolbarItems: [],
                });

                await expect(getRotateButtonEnabledState()).resolves.toBe(true);
            });

            it('should disable Rotate button in multi-page layout when all pages are rotation-disabled', async () => {
                mockDatasource$.next({
                    documents: [
                        {
                            id: 'doc1',
                            name: 'Document 1',
                            pages: [
                                { id: 'page1', name: 'Page 1', isSelected: true, disableRotation: true },
                                { id: 'page2', name: 'Page 2', isSelected: true, disableRotation: true },
                            ],
                        },
                    ],
                    loadImageFn: () => of({}),
                    loadThumbnailFn: () => of(''),
                });

                mockViewerState$.next({
                    currentLayout: { type: UserLayoutOptions.Single_Vertical },
                    currentLayer: ViewerLayerType.Image,
                    currentZoomLevel: 100,
                    pageNavInfo: { currentPageIndex: 0, totalPages: 2 },
                    selectedToolbarItems: [],
                });

                await expect(getRotateButtonEnabledState()).resolves.toBe(false);
            });

            it('should keep Rotate button enabled in multi-page layout when at least one page can rotate', async () => {
                mockDatasource$.next({
                    documents: [
                        {
                            id: 'doc1',
                            name: 'Document 1',
                            pages: [
                                { id: 'page1', name: 'Page 1', isSelected: true, disableRotation: true },
                                { id: 'page2', name: 'Page 2', isSelected: true, disableRotation: false },
                            ],
                        },
                    ],
                    loadImageFn: () => of({}),
                    loadThumbnailFn: () => of(''),
                });

                mockViewerState$.next({
                    currentLayout: { type: UserLayoutOptions.Single_Vertical },
                    currentLayer: ViewerLayerType.Image,
                    currentZoomLevel: 100,
                    pageNavInfo: { currentPageIndex: 0, totalPages: 2 },
                    selectedToolbarItems: [],
                });

                await expect(getRotateButtonEnabledState()).resolves.toBe(true);
            });
        });
    });

    describe('Focus toolbar item', () => {
        it('should emit toolbar item type when requestFocusOnToolbarItem is called', async () => {
            const focusPromise = firstValueFrom(service.focusToolbarItem$);
            service.requestFocusOnToolbarItem(ToolbarItemTypes.ThumbnailViewer);

            const itemType = await focusPromise;
            expect(itemType).toBe(ToolbarItemTypes.ThumbnailViewer);
        });

        it('should emit different toolbar item types', async () => {
            const emittedTypes: ToolbarItemTypes[] = [];
            const subscription = service.focusToolbarItem$.subscribe((itemType) => {
                emittedTypes.push(itemType);
            });

            service.requestFocusOnToolbarItem(ToolbarItemTypes.ThumbnailViewer);
            service.requestFocusOnToolbarItem(ToolbarItemTypes.BestFit);

            subscription.unsubscribe();
            expect(emittedTypes).toEqual([ToolbarItemTypes.ThumbnailViewer, ToolbarItemTypes.BestFit]);
        });
    });
});

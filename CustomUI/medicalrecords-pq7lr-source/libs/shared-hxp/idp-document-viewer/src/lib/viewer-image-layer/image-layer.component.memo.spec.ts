/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ImageLayerComponent } from './image-layer.component';
import { LayoutType } from '../models/layout';
import { ToolbarConfig } from '../models/toolbar-config';
import { ViewerLayerService } from '../services/viewer-layer.service';
import { ViewerService } from '../services/viewer.service';
import { ResizeObserverService } from '../services/resize-observer.service';

class MockResizeObserverService {
    observe = jest.fn().mockReturnValue(of());
    unobserve = jest.fn();
}

class ViewerServiceStub {
    initialDatasource = {
        documents: [
            {
                id: 'doc-1',
                name: 'Doc 1',
                pages: [
                    { id: 'p1', name: 'p1' },
                    { id: 'p2', name: 'p2' },
                ],
            },
        ],
        loadImageFn: (pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }),
    };
    datasource$ = new BehaviorSubject<any>(this.initialDatasource);

    initialViewerState = {
        pageNavInfo: { currentPageIndex: undefined },
        bestFit: true,
        rotationStep: 0,
        fullscreen: false,
        selectedToolbarItems: [],
        currentLayout: { type: LayoutType.SinglePage },
        currentZoomLevel: 1,
    };
    viewerState$ = new BehaviorSubject<any>(this.initialViewerState);

    viewerLayout$ = new BehaviorSubject<any>({ type: LayoutType.SinglePage, layoutDirection: undefined, columns: 1, rows: 1 });
    viewerConfig = { defaultZoomLevel: 1 };
    totalPageCount$ = new BehaviorSubject<number>(2);

    changeViewerState() {}
}

class ViewerLayerServiceStub {
    private layers: any[] = [];
    layersChanged$ = new BehaviorSubject(this.layers);
    registerLayer(layer: any) {
        this.layers = [...this.layers, layer];
        this.layersChanged$.next(this.layers);
    }
    unregisterLayer() {}
    getLayers() {
        return this.layers;
    }
}

describe('ImageLayerComponent memoization', () => {
    let viewerService: ViewerServiceStub;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ImageLayerComponent],
            providers: [
                { provide: ViewerService, useClass: ViewerServiceStub },
                { provide: ViewerLayerService, useClass: ViewerLayerServiceStub },
                { provide: ResizeObserverService, useClass: MockResizeObserverService },
            ],
        }).compileComponents();

        viewerService = TestBed.inject(ViewerService) as any;
    });

    it('calls loadImageFn once per page across viewer state changes', () => {
        const loadImageSpy = jest
            .fn()
            .mockImplementation((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));
        viewerService.datasource$.next({
            ...viewerService.initialDatasource,
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe(() => {});
        // multiple viewer state changes should not trigger new factory executions for same pages
        let state = { ...viewerService.initialViewerState } as any;
        state = { ...state, bestFit: false };
        viewerService.viewerState$.next(state);
        state = { ...state, rotationStep: 1 };
        viewerService.viewerState$.next(state);
        state = { ...state, fullscreen: true };
        viewerService.viewerState$.next(state);
        state = { ...state, selectedToolbarItems: [ToolbarConfig.ThumbnailViewer.type] };
        viewerService.viewerState$.next(state);
        state = { ...state, currentLayout: { type: LayoutType.SingleScrollable, layoutDirection: 'Vertical' } };
        viewerService.viewerState$.next(state);

        expect(loadImageSpy.mock.calls.length).toBe(2);
        const calledPages1 = new Set(loadImageSpy.mock.calls.map((args) => args[0]));
        expect(calledPages1).toEqual(new Set(['p1', 'p2']) as any);
        sub.unsubscribe();
    });

    it('clears memo and calls loadImageFn again when datasource documents change', () => {
        const loadImageSpy = jest
            .fn()
            .mockImplementation((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));
        viewerService.datasource$.next({
            documents: [{ id: 'doc-1', name: 'Doc 1', pages: [{ id: 'p1', name: 'p1' }] }],
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe(() => {});
        expect(loadImageSpy.mock.calls.length).toBe(1);

        // Change documents set -> component clears memo
        viewerService.datasource$.next({
            documents: [{ id: 'doc-2', name: 'Doc 2', pages: [{ id: 'p3', name: 'p3' }] }],
            loadImageFn: loadImageSpy,
        });

        expect(loadImageSpy.mock.calls.length).toBe(2);
        const calledPages2 = new Set(loadImageSpy.mock.calls.map((args) => args[0]));
        expect(calledPages2).toEqual(new Set(['p1', 'p3']) as any);
        sub.unsubscribe();
    });

    it('clears memo and calls loadImageFn again when page viewerRotation changes', () => {
        const loadImageSpy = jasmine
            .createSpy('loadImageFn')
            .and.callFake((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1', viewerRotation: 0 },
                        { id: 'p2', name: 'p2', viewerRotation: 0 },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe(() => {});
        expect(loadImageSpy.calls.count()).toBe(2);
        loadImageSpy.calls.reset();

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1', viewerRotation: 90 },
                        { id: 'p2', name: 'p2', viewerRotation: 0 },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        expect(loadImageSpy.calls.count()).toBe(2);
        expect(loadImageSpy.calls.allArgs()).toEqual([['p1'], ['p2']]);
        sub.unsubscribe();
    });

    it('does not clear memo when page viewerRotation remains the same', () => {
        const loadImageSpy = jasmine
            .createSpy('loadImageFn')
            .and.callFake((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1', viewerRotation: 90 },
                        { id: 'p2', name: 'p2', viewerRotation: 180 },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe(() => {});
        expect(loadImageSpy.calls.count()).toBe(2);
        loadImageSpy.calls.reset();

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1 updated', viewerRotation: 90 },
                        { id: 'p2', name: 'p2 updated', viewerRotation: 180 },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        expect(loadImageSpy.calls.count()).toBe(0);
        sub.unsubscribe();
    });

    it('correctly generates rotation key using flatMap for multiple documents', () => {
        const loadImageSpy = jasmine
            .createSpy('loadImageFn')
            .and.callFake((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1', viewerRotation: 90 },
                        { id: 'p2', name: 'p2', viewerRotation: 0 },
                    ],
                },
                {
                    id: 'doc-2',
                    name: 'Doc 2',
                    pages: [
                        { id: 'p3', name: 'p3', viewerRotation: 180 },
                        { id: 'p4', name: 'p4', viewerRotation: 270 },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe(() => {});
        expect(loadImageSpy.calls.count()).toBe(4);
        loadImageSpy.calls.reset();

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1', viewerRotation: 90 },
                        { id: 'p2', name: 'p2', viewerRotation: 0 },
                    ],
                },
                {
                    id: 'doc-2',
                    name: 'Doc 2',
                    pages: [
                        { id: 'p3', name: 'p3', viewerRotation: 180 },
                        { id: 'p4', name: 'p4', viewerRotation: 0 },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        expect(loadImageSpy.calls.count()).toBe(4);
        sub.unsubscribe();
    });

    it('handles empty documents array without errors', () => {
        const loadImageSpy = jasmine
            .createSpy('loadImageFn')
            .and.callFake((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));

        viewerService.datasource$.next({
            documents: [],
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe((images) => {
            expect(images).toEqual([]);
        });
        expect(loadImageSpy.calls.count()).toBe(0);
        sub.unsubscribe();
    });

    it('handles documents with empty pages array without errors', () => {
        const loadImageSpy = jasmine
            .createSpy('loadImageFn')
            .and.callFake((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe((images) => {
            expect(images).toEqual([]);
        });
        expect(loadImageSpy.calls.count()).toBe(0);
        sub.unsubscribe();
    });

    it('handles pages with undefined viewerRotation as 0', () => {
        const loadImageSpy = jasmine
            .createSpy('loadImageFn')
            .and.callFake((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1' },
                        { id: 'p2', name: 'p2', viewerRotation: null },
                        { id: 'p3', name: 'p3', viewerRotation: 0 },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe(() => {});
        expect(loadImageSpy.calls.count()).toBe(3);
        loadImageSpy.calls.reset();

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1', viewerRotation: 0 },
                        { id: 'p2', name: 'p2', viewerRotation: undefined },
                        { id: 'p3', name: 'p3', viewerRotation: null },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        expect(loadImageSpy.calls.count()).toBe(0);
        sub.unsubscribe();
    });

    it('clears memo when adding a new page with rotation', () => {
        const loadImageSpy = jasmine
            .createSpy('loadImageFn')
            .and.callFake((pageId: string) => of({ blobUrl: `blob:${pageId}`, width: 100, height: 100, correctionAngle: 0 }));

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [{ id: 'p1', name: 'p1', viewerRotation: 0 }],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        const fixture = TestBed.createComponent(ImageLayerComponent);
        const comp = fixture.componentInstance;

        const sub = comp.displayImages$.subscribe(() => {});
        expect(loadImageSpy.calls.count()).toBe(1);
        loadImageSpy.calls.reset();

        viewerService.datasource$.next({
            documents: [
                {
                    id: 'doc-1',
                    name: 'Doc 1',
                    pages: [
                        { id: 'p1', name: 'p1', viewerRotation: 0 },
                        { id: 'p2', name: 'p2', viewerRotation: 90 },
                    ],
                },
            ],
            loadImageFn: loadImageSpy,
        });

        expect(loadImageSpy.calls.count()).toBe(2);
        sub.unsubscribe();
    });
});

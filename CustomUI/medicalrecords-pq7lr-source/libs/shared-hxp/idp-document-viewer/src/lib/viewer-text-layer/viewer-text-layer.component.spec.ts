/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ViewerTextLayerComponent, TooltipInfo } from './viewer-text-layer.component';
import { ViewerTextLayerService } from '../services/viewer-text-layer.service';
import { ViewerService } from '../services/viewer.service';
import { ResizeObserverService } from '../services/resize-observer.service';
import { ViewerLayerService } from '../services/viewer-layer.service';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { StateData } from '../models/state-data';
import { ViewerLayerHostData, ViewerLayerType } from '../models/viewer-layer';
import { HighlightPrimitive } from '../models/text-layer/highlight-primitive';
import { RubberBandPrimitive } from '../models/text-layer/rubber-band-primitive';
import { By } from '@angular/platform-browser';
import { NgZone } from '@angular/core';
import { ViewerTextData, ViewerTextHighlightData } from '../models/text-layer/ocr-candidate';
import { ConfigOptions } from '../models/config-options';

const viewerStateSubject$ = new BehaviorSubject<Partial<StateData>>({ rotationStep: 90, currentZoomLevel: 100 });

class MockViewerService implements Partial<ViewerService> {
    datasource$ = of({
        documents: [
            {
                id: 'doc1',
                name: 'document 1',
                pages: [
                    { id: 'p1', name: 'page 1', isSelected: true, rotation: 90 },
                    { id: 'p2', name: 'page 2', isSelected: false, rotation: 90 },
                ],
            },
        ],
        loadImageFn: () => ({ width: 800, height: 600, blobUrl: '', viewerRotation: 0, skew: 0 }),
        loadThumbnailFn: () => '',
        loadPageOcrFn: () => [],
    });

    viewerState$ = viewerStateSubject$.asObservable() as Observable<StateData>;
    viewerConfig = { defaultZoomLevel: 100 } as ConfigOptions;
}

class MockViewerLayerService implements Partial<ViewerLayerService> {
    registerLayer = jest.fn();
    unregisterLayer = jest.fn();
    getLayers() {
        return [{ type: ViewerLayerType.TextSuperImposed, order: 2 }];
    }
}

class MockResizeObserverService implements Partial<ResizeObserverService> {
    observe = jest.fn().mockReturnValue(of({} as unknown as ResizeObserverEntry));
    unobserve = jest.fn();
}

const rubberBandCreatedSubject$ = new Subject<ViewerTextData>();
const highlightsDeletedSubject$ = new Subject<ViewerTextData[]>();

class MockViewerTextLayerService implements Partial<ViewerTextLayerService> {
    initialize = jest.fn();
    onResize = jest.fn();
    onMouseMove = jest.fn();
    onMouseDown = jest.fn();
    onMouseUp = jest.fn();
    onMouseClick = jest.fn();
    onMouseLeave = jest.fn();
    setAutoNavigationToHighlight = jest.fn();
    setHandleClipboard = jest.fn();
    tooltip$ = tooltipSubject$.asObservable();
    scaledActiveHighlights$ = highlightSubject$.asObservable();
    rubberBandAreaSelection$ = rubberBandSubject$.asObservable();
    rubberBandCreated$ = rubberBandCreatedSubject$.asObservable();
    selectedHighlightIds$ = selectedHighlightIdsSubject$.asObservable();
    highlightsDeleted$ = highlightsDeletedSubject$.asObservable();
    textSelection$ = textSelectionSubject$.asObservable();
}

const tooltipSubject$ = new Subject<TooltipInfo[]>();
const mockTooltip: TooltipInfo = { text: 'tooltip', top: 10, left: 20, width: 30, height: 40, rotation: -0, scale: 1 };

const highlightSubject$ = new Subject<HighlightPrimitive[]>();
const mockHighlightPrimitive = HighlightPrimitive.fromTextData({
    text: 'text',
    top: 10,
    left: 20,
    width: 30,
    height: 40,
    pageId: '1',
});

const selectedHighlightIdsSubject$ = new Subject<Set<string>>();

const rubberBandSubject$ = new Subject<RubberBandPrimitive>();
const mockRubberBandPrimitive = RubberBandPrimitive.newInstance(20, 10, 30, 40, 1);
mockRubberBandPrimitive.setText('text', '1');

const textSelectionSubject$ = new Subject<ViewerTextHighlightData>();
const mockTextSelection: ViewerTextHighlightData = {
    text: 'text',
    pageId: '1',
    rect: {
        actual: { top: 10, left: 20, width: 30, height: 40 },
        scaled: { top: 10, left: 20, width: 30, height: 40 },
        scale: 1,
    },
};

describe('ViewerTextLayerComponent', () => {
    let component: ViewerTextLayerComponent;
    let fixture: ComponentFixture<ViewerTextLayerComponent>;
    let viewerTextLayerService: ViewerTextLayerService;
    let resizeObserverService: ResizeObserverService;

    const hostData: ViewerLayerHostData = {
        documentId: 'doc1',
        pageId: 'p1',
        contentNaturalWidth: 500,
        contentNaturalHeight: 1000,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [],
            providers: [
                { provide: ViewerTextLayerService, useClass: MockViewerTextLayerService },
                { provide: ResizeObserverService, useClass: MockResizeObserverService },
                { provide: ViewerLayerService, useClass: MockViewerLayerService },
                { provide: ViewerService, useClass: MockViewerService },
            ],
        })
            .overrideComponent(ViewerTextLayerComponent, { set: { providers: [] } })
            .compileComponents();

        fixture = TestBed.createComponent(ViewerTextLayerComponent);
        component = fixture.componentInstance;
        component.host = hostData;
        component.canvasElement = { nativeElement: document.createElement('canvas') };
        fixture.detectChanges();

        viewerTextLayerService = TestBed.inject(ViewerTextLayerService);
        resizeObserverService = TestBed.inject(ResizeObserverService);

        const ngZone = TestBed.inject(NgZone);
        jest.spyOn(ngZone, 'runOutsideAngular').mockImplementation((fn) => fn());
        jest.spyOn(ngZone, 'run').mockImplementation((fn) => fn());
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should initialize with host', () => {
        expect(viewerTextLayerService.initialize).toHaveBeenCalledWith(hostData);
        expect(resizeObserverService.observe).toHaveBeenCalled();
    });

    it('should handle mouse events', () => {
        const event = new MouseEvent('click');

        component.onMouseMove(event);
        component.onMouseDown(event);
        component.onMouseUp(event);
        component.onMouseClick(event);
        component.onMouseLeave(event);

        expect(viewerTextLayerService.onMouseMove).toHaveBeenCalledWith(event);
        expect(viewerTextLayerService.onMouseDown).toHaveBeenCalledWith(event);
        expect(viewerTextLayerService.onMouseUp).toHaveBeenCalledWith(event);
        expect(viewerTextLayerService.onMouseClick).toHaveBeenCalledWith(event);
        expect(viewerTextLayerService.onMouseLeave).toHaveBeenCalledWith(event);
    });

    it('should handle resize when valid size info emits', fakeAsync(() => {
        // Ensure zoom is at default 100%
        viewerStateSubject$.next({ rotationStep: 90, currentZoomLevel: 100 });

        const sizeChange = {
            contentRect: { width: 100, height: 200 },
        } as unknown as ResizeObserverEntry;

        (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));

        component.ngAfterViewInit();
        tick(100);

        expect(component.canvasWidth).toBe(100);
        expect(component.canvasHeight).toBe(200);
        expect(viewerTextLayerService.onResize).toHaveBeenCalledWith({
            width: 100,
            height: 200,
            top: 0,
            left: 0,
        });
    }));

    it('should not resize when invalid size info emits', () => {
        const sizeChange = {
            contentRect: { width: 0, height: 100 },
        } as unknown as ResizeObserverEntry;

        (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));

        component.ngAfterViewInit();

        expect(component.canvasWidth).toBe(0);
        expect(component.canvasHeight).toBe(0);
        expect(viewerTextLayerService.onResize).not.toHaveBeenCalled();
    });

    it('should handle tooltip', (done) => {
        component.toolTips$.subscribe((data) => {
            expect(data).toEqual([mockTooltip]);
            fixture.detectChanges();
            const tooltipElement = fixture.debugElement.query(By.css('.idp-viewer-text-layer__text-tooltip'));
            expect(tooltipElement.nativeElement.textContent).toContain(mockTooltip.text);
            done();
        });

        tooltipSubject$.next([mockTooltip]);
    });

    it('should handle highlights', fakeAsync(() => {
        const highlightOutputSpy = jest.spyOn(component.activeHighlightInfoChange, 'emit');
        const highlightDrawSpy = jest.spyOn(mockHighlightPrimitive, 'draw');

        const sizeChange = {
            contentRect: { width: 100, height: 200 },
        } as unknown as ResizeObserverEntry;
        (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));
        component.ngAfterViewInit();

        selectedHighlightIdsSubject$.next(new Set());
        highlightSubject$.next([mockHighlightPrimitive]);

        tick(100);

        expect(highlightOutputSpy).toHaveBeenCalledWith({
            highlights: [mockHighlightPrimitive.toTextHighlightData()],
            rotation: 90,
        });
        expect(highlightDrawSpy).toHaveBeenCalled();
    }));

    it('should handle rubber band', fakeAsync(() => {
        const rubberBandDrawSpy = jest.spyOn(mockRubberBandPrimitive, 'draw');
        rubberBandSubject$.next(mockRubberBandPrimitive);

        tick(100);

        expect(rubberBandDrawSpy).toHaveBeenCalled();
    }));

    it('should draw redaction highlights during rubber band drawing', fakeAsync(() => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;
        component.canvasElement = { nativeElement: canvas };
        jest.spyOn(component, 'canvasContext', 'get').mockReturnValue(context);

        const redactionHighlight = HighlightPrimitive.fromTextData({
            text: 'redacted',
            top: 10,
            left: 20,
            width: 30,
            height: 40,
            pageId: '1',
            highlightState: 'REDACTION',
        });

        const redactionDrawSpy = jest.spyOn(redactionHighlight, 'draw');
        const rubberBandDrawSpy = jest.spyOn(mockRubberBandPrimitive, 'draw');

        const sizeChange = {
            contentRect: { width: 100, height: 200 },
        } as unknown as ResizeObserverEntry;
        (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));
        component.ngAfterViewInit();

        selectedHighlightIdsSubject$.next(new Set());
        highlightSubject$.next([redactionHighlight]);
        tick(100);

        rubberBandSubject$.next(mockRubberBandPrimitive);
        tick(100);

        expect(rubberBandDrawSpy).toHaveBeenCalled();
        expect(redactionDrawSpy).toHaveBeenCalled();
    }));

    it('should handle text selection', fakeAsync(() => {
        const textSelectionOutputSpy = jest.spyOn(component.textSelected, 'emit');
        textSelectionSubject$.next(mockTextSelection);

        tick(100);

        expect(textSelectionOutputSpy).toHaveBeenCalledWith(mockTextSelection);
    }));

    it('should handle autoNavigationToHighlight input change', () => {
        component.autoNavigationToHighlight = true;
        expect(viewerTextLayerService.setAutoNavigationToHighlight).toHaveBeenCalledWith(true);

        component.autoNavigationToHighlight = false;
        expect(viewerTextLayerService.setAutoNavigationToHighlight).toHaveBeenCalledWith(false);
    });

    it('should handle handleClipboard input change', () => {
        component.handleClipboard = true;
        expect(viewerTextLayerService.setHandleClipboard).toHaveBeenCalledWith(true);

        component.handleClipboard = false;
        expect(viewerTextLayerService.setHandleClipboard).toHaveBeenCalledWith(false);
    });

    it('should emit rubberBandCreated when viewerTextService rubberBandCreated$ emits', fakeAsync(() => {
        const rubberBandOutputSpy = jest.spyOn(component.rubberBandCreated, 'emit');
        const mockRubberBandData: ViewerTextData = {
            text: 'drawn text',
            pageId: 'p1',
            left: 10,
            top: 20,
            width: 50,
            height: 30,
            highlightState: 'REDACTION',
            id: 'rb-1',
            isSelectable: true,
        };

        rubberBandCreatedSubject$.next(mockRubberBandData);
        tick(100);

        expect(rubberBandOutputSpy).toHaveBeenCalledWith(mockRubberBandData);
    }));

    it('should emit highlightsDeleted when viewerTextService highlightsDeleted$ emits', fakeAsync(() => {
        const highlightsDeletedOutputSpy = jest.spyOn(component.highlightsDeleted, 'emit');
        const mockDeletedHighlights: ViewerTextData[] = [
            {
                text: 'deleted',
                pageId: 'p1',
                left: 10,
                top: 20,
                width: 50,
                height: 30,
                highlightState: 'REDACTION',
                id: 'del-1',
            },
        ];

        highlightsDeletedSubject$.next(mockDeletedHighlights);
        tick(100);

        expect(highlightsDeletedOutputSpy).toHaveBeenCalledWith(mockDeletedHighlights);
    }));

    describe('Canvas scaling for high zoom levels', () => {
        beforeEach(() => {
            // Reset zoom level before each test
            viewerStateSubject$.next({ rotationStep: 90, currentZoomLevel: 100 });
        });

        it('should scale canvas dimensions by zoom factor', fakeAsync(() => {
            const sizeChange = {
                contentRect: { width: 100, height: 200 },
            } as unknown as ResizeObserverEntry;
            (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));

            component.ngAfterViewInit();
            tick(100);

            // At 100% zoom, canvas dimensions should match content rect
            expect(component.canvasWidth).toBe(100);
            expect(component.canvasHeight).toBe(200);

            // Change zoom to 150%
            viewerStateSubject$.next({ rotationStep: 90, currentZoomLevel: 150 });
            tick(100);

            // Canvas dimensions should be scaled by 1.5x
            expect(component.canvasWidth).toBe(150);
            expect(component.canvasHeight).toBe(300);
        }));

        it('should scale canvas dimensions by zoom factor at 200% zoom', fakeAsync(() => {
            const sizeChange = {
                contentRect: { width: 100, height: 200 },
            } as unknown as ResizeObserverEntry;
            (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));

            component.ngAfterViewInit();
            tick(100);

            // Change zoom to 200%
            viewerStateSubject$.next({ rotationStep: 90, currentZoomLevel: 200 });
            tick(100);

            // Canvas dimensions should be scaled by 2x
            expect(component.canvasWidth).toBe(200);
            expect(component.canvasHeight).toBe(400);
        }));

        it('should apply scale transform when drawing highlights at high zoom', fakeAsync(() => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d') as CanvasRenderingContext2D;
            const scaleSpy = jest.spyOn(context, 'scale');
            const setTransformSpy = jest.spyOn(context, 'setTransform');

            component.canvasElement = { nativeElement: canvas };
            jest.spyOn(component, 'canvasContext', 'get').mockReturnValue(context);

            const sizeChange = {
                contentRect: { width: 100, height: 200 },
            } as unknown as ResizeObserverEntry;
            (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));

            component.ngAfterViewInit();
            tick(100);

            // Change zoom to 150%
            viewerStateSubject$.next({ rotationStep: 90, currentZoomLevel: 150 });
            tick(100);

            // Emit highlights to trigger drawing
            selectedHighlightIdsSubject$.next(new Set());
            highlightSubject$.next([mockHighlightPrimitive]);
            tick(100);

            // Should reset transform and then apply scale
            expect(setTransformSpy).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
            expect(scaleSpy).toHaveBeenCalledWith(1.5, 1.5);
        }));

        it('should apply scale transform when drawing rubber band at high zoom', fakeAsync(() => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d') as CanvasRenderingContext2D;
            const scaleSpy = jest.spyOn(context, 'scale');
            const setTransformSpy = jest.spyOn(context, 'setTransform');

            component.canvasElement = { nativeElement: canvas };
            jest.spyOn(component, 'canvasContext', 'get').mockReturnValue(context);

            const sizeChange = {
                contentRect: { width: 100, height: 200 },
            } as unknown as ResizeObserverEntry;
            (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));

            component.ngAfterViewInit();
            tick(100);

            // Change zoom to 200%
            viewerStateSubject$.next({ rotationStep: 90, currentZoomLevel: 200 });
            tick(100);

            // Emit rubber band to trigger drawing
            rubberBandSubject$.next(mockRubberBandPrimitive);
            tick(100);

            // Should reset transform and then apply scale
            expect(setTransformSpy).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
            expect(scaleSpy).toHaveBeenCalledWith(2, 2);
        }));

        it('should pass logical dimensions to draw methods', fakeAsync(() => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d') as CanvasRenderingContext2D;
            component.canvasElement = { nativeElement: canvas };
            jest.spyOn(component, 'canvasContext', 'get').mockReturnValue(context);

            const highlightDrawSpy = jest.spyOn(mockHighlightPrimitive, 'draw');

            const sizeChange = {
                contentRect: { width: 100, height: 200 },
            } as unknown as ResizeObserverEntry;
            (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));

            component.ngAfterViewInit();
            tick(100);

            // Change zoom to 150%
            viewerStateSubject$.next({ rotationStep: 90, currentZoomLevel: 150 });
            tick(100);

            // Emit highlights to trigger drawing
            selectedHighlightIdsSubject$.next(new Set());
            highlightSubject$.next([mockHighlightPrimitive]);
            tick(100);

            // Draw should be called with logical dimensions (not scaled canvas dimensions)
            expect(highlightDrawSpy).toHaveBeenCalledWith(context, { width: 100, height: 200 });
        }));

        it('should not scale canvas when zoom is at default level', fakeAsync(() => {
            const sizeChange = {
                contentRect: { width: 100, height: 200 },
            } as unknown as ResizeObserverEntry;
            (resizeObserverService.observe as jest.Mock).mockReturnValue(of(sizeChange));

            component.ngAfterViewInit();
            tick(100);

            // Ensure zoom is at 100%
            viewerStateSubject$.next({ rotationStep: 90, currentZoomLevel: 100 });
            tick(100);

            // Canvas dimensions should match content rect (scale factor = 1)
            expect(component.canvasWidth).toBe(100);
            expect(component.canvasHeight).toBe(200);
        }));
    });
});

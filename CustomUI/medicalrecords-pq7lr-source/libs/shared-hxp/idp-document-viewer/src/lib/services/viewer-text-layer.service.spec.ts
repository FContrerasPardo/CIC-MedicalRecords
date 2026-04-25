/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { ViewerTextLayerService } from './viewer-text-layer.service';
import { ViewerService } from './viewer.service';
import { ViewerLayerHostData } from '../models/viewer-layer';
import { BehaviorSubject, firstValueFrom, of, Subject } from 'rxjs';
import { ViewerTextData } from '../models/text-layer/ocr-candidate';
import { Rect, TextRect } from '../models/text-layer/size';
import { DrawStyles } from '../models/text-layer/drawing-config';
import { ConfigDefault } from '../models/config-default';
import { getDefaultStateData } from '../models/state-data';
import { HighlightPrimitive } from '../models/text-layer/highlight-primitive';
import { RubberBandPrimitive } from '../models/text-layer/rubber-band-primitive';
import { Clipboard } from '@angular/cdk/clipboard';
import { NoopTranslateModule, NotificationService } from '@alfresco/adf-core';
import { ViewerModifierKey, ViewerShortcutAction, ViewerShortcutService } from './viewer-shortcut.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChangeDetectorRef, Injectable } from '@angular/core';
import { ResponseFormat } from '../models/datasource';

const mockChangeDetector = {
    detectChanges: jest.fn(),
};

describe('Idp Viewer ViewerTextLayerService', () => {
    let service: ViewerTextLayerService;
    let viewerService: ViewerService;
    let clipboard: Clipboard;
    let shortcutService: ViewerShortcutService;
    const mockViewerKeyboardEvent$ = new BehaviorSubject<KeyboardEvent>(new KeyboardEvent('keydown'));
    const mockTextLayout = 'This is the text layout';
    class MockViewerService implements Partial<ViewerService> {
        viewerState$ = of(getDefaultStateData(ConfigDefault));
        datasource$ = of({
            documents: [
                {
                    id: 'doc1',
                    name: 'document 1',
                    pages: [
                        { id: 'p1', name: 'page 1', isSelected: true },
                        { id: 'p2', name: 'page 2', isSelected: false },
                    ],
                },
            ],
            loadImageFn: () => ({ width: 800, height: 600, blobUrl: '', viewerRotation: 0, skew: 0 }),
            loadThumbnailFn: () => '',
            loadPageOcrFn: (_pageId: string, format: ResponseFormat) => {
                if (format === ResponseFormat.TextLayout) {
                    return mockTextLayout;
                }
                return [
                    { pageId: 'p1', text: 'text 1', top: 10, left: 20, width: 30, height: 40 },
                    { pageId: 'p1', text: 'text 2', top: 50, left: 60, width: 70, height: 80 },
                ];
            },
        });
        changePageById = jest.fn();
        viewerKeyboardEvent$ = mockViewerKeyboardEvent$.asObservable();
    }

    const hostData: ViewerLayerHostData = {
        documentId: 'doc1',
        pageId: 'p1',
        contentNaturalWidth: 500,
        contentNaturalHeight: 1000,
    };

    const currentSizeInfo: Rect = { top: 0, left: 0, width: 250, height: 500 };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, NoopAnimationsModule],
            providers: [
                ViewerTextLayerService,
                { provide: ChangeDetectorRef, useValue: mockChangeDetector },
                { provide: ViewerService, useClass: MockViewerService },
                Clipboard,
                NotificationService,
                ViewerShortcutService,
            ],
        });

        service = TestBed.inject(ViewerTextLayerService);
        viewerService = TestBed.inject(ViewerService);
        shortcutService = TestBed.inject(ViewerShortcutService);
        clipboard = TestBed.inject(Clipboard);
    });

    it('should throw error with invalid host data', () => {
        const invalidHostData: ViewerLayerHostData = {
            documentId: '',
            pageId: '',
            contentNaturalWidth: -1,
            contentNaturalHeight: -1,
        };

        expect(() => service.initialize(invalidHostData)).toThrow();
    });

    it('should set and get back scaled active highlights', fakeAsync(() => {
        const highlights: ViewerTextData[] = [
            { pageId: 'p1', text: 'text 1', top: 10, left: 20, width: 30, height: 40, highlightState: DrawStyles.DEFAULT },
        ];

        let scaledHighlight: HighlightPrimitive | undefined;

        service.scaledActiveHighlights$.subscribe((items) => {
            scaledHighlight = items[0];
        });

        service.setActivePrimitives(highlights);
        expect(scaledHighlight).toBeUndefined();

        service.onResize(currentSizeInfo);
        service.initialize(hostData);

        tick(100);

        expect(scaledHighlight?.actualRect).toEqual({
            top: highlights[0].top,
            left: highlights[0].left,
            width: highlights[0].width,
            height: highlights[0].height,
        });
        expect(scaledHighlight?.rect).toEqual({
            top: highlights[0].top / 2,
            left: highlights[0].left / 2,
            width: highlights[0].width / 2,
            height: highlights[0].height / 2,
        });
    }));

    it('should emit tooltip text on hover over text', fakeAsync(() => {
        let result: TextRect | undefined;
        service.tooltip$.subscribe((data) => {
            result = data[0];
        });

        service.onResize(currentSizeInfo);
        service.initialize(hostData);

        service.onMouseMove({ offsetX: 20, offsetY: 10, buttons: 0 } as unknown as MouseEvent);
        tick(100);
        expect(result).toEqual({ text: 'text 1', top: 30, left: 10, width: 15, height: 20 });

        service.onMouseMove({ offsetX: 50, offsetY: 5, buttons: 0 } as unknown as MouseEvent);
        tick(100);
        expect(result).toBeUndefined();

        service.onMouseMove({ offsetX: 50, offsetY: 60, buttons: 0 } as unknown as MouseEvent);
        tick(100);
        expect(result).toEqual({ text: 'text 2', top: 70, left: 30, width: 35, height: 40 });
    }));

    it('should draw rubber band on mouse down and up', fakeAsync(() => {
        const expectedRubberBandRect: Rect = { top: 4, left: 15, width: 121, height: 132 };
        let rubberBandResult: RubberBandPrimitive | undefined;
        (service.rubberBandAreaSelection$ as Subject<RubberBandPrimitive | undefined>).subscribe((data) => {
            rubberBandResult = data;
        });

        let textSelectionResult: string | undefined;
        service.textSelection$.subscribe((data) => {
            textSelectionResult = data.text;
        });

        service.onResize({ top: 0, left: 0, width: 500, height: 1000 });
        service.initialize(hostData);
        tick(100);

        service.onMouseDown({ offsetX: 5, offsetY: 5, button: 0 } as unknown as MouseEvent);
        tick(50);
        expect(rubberBandResult).toBeUndefined();

        service.onMouseMove({ offsetX: 5, offsetY: 5 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 100, offsetY: 100 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 200, offsetY: 200 } as unknown as MouseEvent);
        tick(100);
        expect(rubberBandResult?.rect).toEqual({ top: 5, left: 5, width: 195, height: 195 });

        service.onMouseUp({ offsetX: 200, offsetY: 200, button: 0 } as unknown as MouseEvent);
        tick(50);
        expect(rubberBandResult?.rect).toEqual(expectedRubberBandRect);

        service.onMouseClick({ offsetX: 100, offsetY: 100 } as unknown as MouseEvent);
        service.onMouseClick({ offsetX: 100, offsetY: 100 } as unknown as MouseEvent);
        tick(500);
        expect(rubberBandResult?.rect).toEqual(expectedRubberBandRect);
        expect(textSelectionResult).toEqual('text 1 text 2');

        service.onMouseDown({ offsetX: 350, offsetY: 350, button: 0 } as unknown as MouseEvent);
        tick(50);
        expect(rubberBandResult).toBeUndefined();
    }));

    it('should not create normal rubber band when drag starts inside a redaction highlight', fakeAsync(() => {
        let rubberBandResult: RubberBandPrimitive | undefined;
        (service.rubberBandAreaSelection$ as Subject<RubberBandPrimitive | undefined>).subscribe((data) => {
            rubberBandResult = data;
        });

        const redactionHighlight: ViewerTextData = {
            pageId: 'p1',
            text: 'REDACTED',
            top: 50,
            left: 50,
            width: 100,
            height: 100,
            highlightState: DrawStyles.REDACTION,
        };

        service.onResize({ top: 0, left: 0, width: 500, height: 1000 });
        service.initialize(hostData);
        service.setActivePrimitives([redactionHighlight]);
        tick(100);

        // mouseDown inside the redaction highlight area (scaled coords at scale=1)
        service.onMouseDown({ offsetX: 80, offsetY: 80, button: 0 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 80, offsetY: 80 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 120, offsetY: 120 } as unknown as MouseEvent);
        tick(100);
        service.onMouseUp({ offsetX: 120, offsetY: 120, button: 0 } as unknown as MouseEvent);
        tick(50);

        expect(rubberBandResult).toBeUndefined();
    }));

    it('should emit text selected on mouse double click text selection', (done) => {
        service.textSelection$.subscribe((data) => {
            expect(data).toEqual({
                pageId: 'p1',
                text: 'text 1',
                rect: {
                    actual: { top: 10, left: 20, width: 30, height: 40 },
                    scaled: { top: 5, left: 10, width: 15, height: 20 },
                    scale: 0.5,
                },
                additionalData: undefined,
            });
            done();
        });

        service.onResize(currentSizeInfo);
        service.initialize(hostData);

        service.onMouseClick({ offsetX: 20, offsetY: 10 } as unknown as MouseEvent);
        service.onMouseClick({ offsetX: 20, offsetY: 10 } as unknown as MouseEvent);
    });

    it('should change page if active highlight is not on current page', fakeAsync(() => {
        const highlights: ViewerTextData[] = [
            { pageId: 'p2', text: 'text 1', top: 10, left: 20, width: 30, height: 40, highlightState: DrawStyles.DEFAULT },
        ];
        service.setAutoNavigationToHighlight(true);
        service.initialize(hostData);
        tick(100);
        service.setActivePrimitives(highlights);

        expect(viewerService.changePageById).toHaveBeenCalledWith('p2');
    }));

    it('should not change page if auto navigation to highlight is disabled', fakeAsync(() => {
        const highlights: ViewerTextData[] = [
            { pageId: 'p2', text: 'text 1', top: 10, left: 20, width: 30, height: 40, highlightState: DrawStyles.DEFAULT },
        ];
        service.setAutoNavigationToHighlight(false);
        service.initialize(hostData);
        tick(100);
        service.setActivePrimitives(highlights);

        expect(viewerService.changePageById).not.toHaveBeenCalled();
    }));

    it('should copy text to clipboard on mouse double click on text', (done) => {
        jest.spyOn(clipboard, 'copy');

        service.textSelection$.subscribe((data) => {
            expect(data).toEqual({
                pageId: 'p1',
                text: 'text 1',
                rect: {
                    actual: { top: 10, left: 20, width: 30, height: 40 },
                    scaled: { top: 5, left: 10, width: 15, height: 20 },
                    scale: 0.5,
                },
                additionalData: undefined,
            });
            expect(clipboard.copy).toHaveBeenCalled();
            done();
        });

        service.onResize(currentSizeInfo);
        service.initialize(hostData);
        service.setActivePrimitives([]);

        service.onMouseClick({ offsetX: 20, offsetY: 10 } as unknown as MouseEvent);
        service.onMouseClick({ offsetX: 20, offsetY: 10 } as unknown as MouseEvent);
    });

    it('should not copy text to clipboard on mouse double click on text when handle clipboard is false', async () => {
        jest.spyOn(clipboard, 'copy');
        service.setHandleClipboard(false);

        service.onResize(currentSizeInfo);
        service.initialize(hostData);

        service.onMouseClick({ offsetX: 20, offsetY: 10 } as unknown as MouseEvent);
        service.onMouseClick({ offsetX: 20, offsetY: 10 } as unknown as MouseEvent);

        const textSelection = await firstValueFrom(service.textSelection$);
        expect(textSelection).toBeDefined();
        expect(clipboard.copy).not.toHaveBeenCalled();
    });

    it('should copy text to clipboard on ctrl + c on rubber-banded area', fakeAsync(() => {
        jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
            action: ViewerShortcutAction.CopyToClipboard,
            key: 'c',
            modifierKeys: [ViewerModifierKey.ctrlKey],
            category: 'viewer_general',
            description: '',
        });

        jest.spyOn(clipboard, 'copy');

        let rubberBandResult: RubberBandPrimitive | undefined;
        (service.rubberBandAreaSelection$ as Subject<RubberBandPrimitive | undefined>).subscribe((data) => {
            rubberBandResult = data;
        });

        service.onResize({ top: 0, left: 0, width: 500, height: 1000 });
        service.initialize(hostData);
        tick(100);

        service.onMouseDown({ offsetX: 5, offsetY: 5, button: 0 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 5, offsetY: 5 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 100, offsetY: 100 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 200, offsetY: 200 } as unknown as MouseEvent);
        tick(100);
        expect(rubberBandResult?.rect).toEqual({ top: 5, left: 5, width: 195, height: 195 });
        service.onMouseUp({ offsetX: 200, offsetY: 200, button: 0 } as unknown as MouseEvent);
        tick(50);

        expect(rubberBandResult).toBeDefined();

        mockViewerKeyboardEvent$.next(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));

        expect(shortcutService.getShortcutForEvent).toHaveBeenCalled();

        expect(clipboard.copy).toHaveBeenCalled();

        flush();
    }));

    it('should not copy text to clipboard on ctrl + c on rubber-banded area', fakeAsync(() => {
        jest.spyOn(shortcutService, 'getShortcutForEvent').mockReturnValue({
            action: ViewerShortcutAction.CopyToClipboard,
            key: 'c',
            modifierKeys: [ViewerModifierKey.ctrlKey],
            category: 'viewer_general',
            description: '',
        });

        jest.spyOn(clipboard, 'copy');
        service.setHandleClipboard(false);

        service.onResize({ top: 0, left: 0, width: 500, height: 1000 });
        service.initialize(hostData);
        tick(100);

        service.onMouseDown({ offsetX: 5, offsetY: 5, button: 0 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 5, offsetY: 5 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 100, offsetY: 100 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 200, offsetY: 200 } as unknown as MouseEvent);
        tick(100);
        service.onMouseUp({ offsetX: 200, offsetY: 200, button: 0 } as unknown as MouseEvent);
        tick(50);

        mockViewerKeyboardEvent$.next(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));

        expect(shortcutService.getShortcutForEvent).toHaveBeenCalled();
        expect(clipboard.copy).not.toHaveBeenCalled();

        flush();
    }));

    it('should emit text layout data as string from OCR datasource', async () => {
        service.onResize(currentSizeInfo);
        service.initialize(hostData);

        const layout = await firstValueFrom(service.textLayoutData$);
        expect(layout).toBe(mockTextLayout);
    });

    it('should emit rubberBandCreated$ when rubber band is completed with text', fakeAsync(() => {
        const rubberBandResults: unknown[] = [];
        service.rubberBandCreated$.subscribe((data) => rubberBandResults.push(data));

        service.onResize({ top: 0, left: 0, width: 500, height: 1000 });
        service.initialize(hostData);
        tick(100);

        service.onMouseDown({ offsetX: 20, offsetY: 10, button: 0 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 20, offsetY: 10 } as unknown as MouseEvent);
        tick(50);
        service.onMouseMove({ offsetX: 60, offsetY: 55 } as unknown as MouseEvent);
        tick(100);
        service.onMouseUp({ offsetX: 60, offsetY: 55, button: 0 } as unknown as MouseEvent);
        tick(50);

        expect(rubberBandResults.length).toBeGreaterThan(0);
        expect(rubberBandResults[0]).toHaveProperty('pageId', 'p1');
        expect(rubberBandResults[0]).toHaveProperty('text');
    }));

    it('should emit rubberBandCreated$ with pageId and isSelectable when rubber band completes in redaction draw mode', fakeAsync(() => {
        const mockViewerState = getDefaultStateData(ConfigDefault);
        (mockViewerState as any).redactionDrawMode = true;
        (mockViewerState as any).showRedaction = true;

        @Injectable()
        class MockViewerServiceRedaction extends (ViewerService as any) {
            viewerState$ = of(mockViewerState);
            datasource$ = of({
                documents: [{ id: 'doc1', name: 'doc 1', pages: [{ id: 'p1', name: 'page 1', isSelected: true }] }],
                loadImageFn: () => ({ width: 800, height: 600, blobUrl: '', viewerRotation: 0, skew: 0 }),
                loadThumbnailFn: () => '',
                loadPageOcrFn: (_pageId: string, format: ResponseFormat) =>
                    format === ResponseFormat.TextLayout ? mockTextLayout : [{ pageId: 'p1', text: 't', top: 10, left: 20, width: 30, height: 40 }],
            });
            changePageById = jest.fn();
            viewerKeyboardEvent$ = mockViewerKeyboardEvent$.asObservable();
        }

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, NoopAnimationsModule],
            providers: [
                ViewerTextLayerService,
                { provide: ChangeDetectorRef, useValue: mockChangeDetector },
                { provide: ViewerService, useClass: MockViewerServiceRedaction },
                Clipboard,
                NotificationService,
                ViewerShortcutService,
            ],
        });

        const testService = TestBed.inject(ViewerTextLayerService);
        const rubberBandResults: ViewerTextData[] = [];
        testService.rubberBandCreated$.subscribe((d) => rubberBandResults.push(d));

        testService.onResize({ top: 0, left: 0, width: 500, height: 1000 });
        testService.initialize(hostData);
        tick(100);

        testService.onMouseDown({ offsetX: 20, offsetY: 10, button: 0 } as unknown as MouseEvent);
        tick(50);
        testService.onMouseMove({ offsetX: 20, offsetY: 10 } as unknown as MouseEvent);
        tick(50);
        testService.onMouseMove({ offsetX: 60, offsetY: 55 } as unknown as MouseEvent);
        tick(100);
        testService.onMouseUp({ offsetX: 60, offsetY: 55, button: 0 } as unknown as MouseEvent);
        tick(50);

        expect(rubberBandResults.length).toBeGreaterThan(0);
        expect(rubberBandResults[0]).toHaveProperty('pageId');
        expect(rubberBandResults[0]).toHaveProperty('isSelectable', true);
    }));

    it('should expose rubberBandCreated$ and highlightsDeleted$ observables', () => {
        expect(service.rubberBandCreated$).toBeDefined();
        expect(service.highlightsDeleted$).toBeDefined();
        expect(service.selectedHighlightIds$).toBeDefined();
    });

    it('should show notification with count when selectable highlight is clicked', fakeAsync(() => {
        const notificationService = TestBed.inject(NotificationService);
        jest.spyOn(notificationService, 'showInfo');

        const selectableHighlights: ViewerTextData[] = [
            { pageId: 'p1', text: 'redacted', top: 10, left: 20, width: 30, height: 40, highlightState: DrawStyles.REDACTION, isSelectable: true, id: 'h1' },
        ];

        service.onResize(currentSizeInfo);
        service.initialize(hostData);
        tick(100);

        service.setActivePrimitives(selectableHighlights);
        tick(100);

        service.onMouseClick({ offsetX: 15, offsetY: 10 } as unknown as MouseEvent);
        tick(500);

        expect(notificationService.showInfo).toHaveBeenCalledWith('VIEWER.SERVICES.VIEWER.REDACTION_SELECTED', undefined, { count: 1 });
    }));

    it('should show notification with count when multiple selectable highlights are selected via ctrl+click', fakeAsync(() => {
        const notificationService = TestBed.inject(NotificationService);
        jest.spyOn(notificationService, 'showInfo');

        const selectableHighlights: ViewerTextData[] = [
            { pageId: 'p1', text: 'redacted1', top: 10, left: 20, width: 30, height: 40, highlightState: DrawStyles.REDACTION, isSelectable: true, id: 'h1' },
            { pageId: 'p1', text: 'redacted2', top: 100, left: 120, width: 30, height: 40, highlightState: DrawStyles.REDACTION, isSelectable: true, id: 'h2' },
        ];

        service.onResize(currentSizeInfo);
        service.initialize(hostData);
        tick(100);

        service.setActivePrimitives(selectableHighlights);
        tick(100);

        service.onMouseClick({ offsetX: 15, offsetY: 10 } as unknown as MouseEvent);
        tick(500);

        expect(notificationService.showInfo).toHaveBeenCalledWith('VIEWER.SERVICES.VIEWER.REDACTION_SELECTED', undefined, { count: 1 });

        service.onMouseClick({ offsetX: 65, offsetY: 55, ctrlKey: true } as unknown as MouseEvent);
        tick(500);

        expect(notificationService.showInfo).toHaveBeenCalledWith('VIEWER.SERVICES.VIEWER.REDACTION_SELECTED', undefined, { count: 2 });
    }));

    it('should show notification with count when selected highlights are deleted via Delete key', fakeAsync(() => {
        const notificationService = TestBed.inject(NotificationService);
        jest.spyOn(notificationService, 'showInfo');

        const deletedResults: ViewerTextData[][] = [];
        service.highlightsDeleted$.subscribe((data) => deletedResults.push(data));

        const selectableHighlights: ViewerTextData[] = [
            { pageId: 'p1', text: 'redacted', top: 10, left: 20, width: 30, height: 40, highlightState: DrawStyles.REDACTION, isSelectable: true, id: 'h1' },
        ];

        service.onResize(currentSizeInfo);
        service.initialize(hostData);
        tick(100);

        service.setActivePrimitives(selectableHighlights);
        tick(100);

        service.onMouseClick({ offsetX: 15, offsetY: 10 } as unknown as MouseEvent);
        tick(500);

        (notificationService.showInfo as jest.Mock).mockClear();

        mockViewerKeyboardEvent$.next(new KeyboardEvent('keydown', { key: 'Delete' }));
        tick(100);

        expect(deletedResults.length).toBe(1);
        expect(deletedResults[0].length).toBe(1);
        expect(notificationService.showInfo).toHaveBeenCalledWith('VIEWER.SERVICES.VIEWER.REDACTION_DELETED', undefined, { count: 1 });
    }));

    it('should show notification with count when selected highlights are deleted via Backspace key', fakeAsync(() => {
        const notificationService = TestBed.inject(NotificationService);
        jest.spyOn(notificationService, 'showInfo');

        const deletedResults: ViewerTextData[][] = [];
        service.highlightsDeleted$.subscribe((data) => deletedResults.push(data));

        const selectableHighlights: ViewerTextData[] = [
            { pageId: 'p1', text: 'redacted', top: 10, left: 20, width: 30, height: 40, highlightState: DrawStyles.REDACTION, isSelectable: true, id: 'h1' },
        ];

        service.onResize(currentSizeInfo);
        service.initialize(hostData);
        tick(100);

        service.setActivePrimitives(selectableHighlights);
        tick(100);

        service.onMouseClick({ offsetX: 15, offsetY: 10 } as unknown as MouseEvent);
        tick(500);

        (notificationService.showInfo as jest.Mock).mockClear();

        mockViewerKeyboardEvent$.next(new KeyboardEvent('keydown', { key: 'Backspace' }));
        tick(100);

        expect(deletedResults.length).toBe(1);
        expect(notificationService.showInfo).toHaveBeenCalledWith('VIEWER.SERVICES.VIEWER.REDACTION_DELETED', undefined, { count: 1 });
    }));

    it('should not show delete notification when no highlights are selected', fakeAsync(() => {
        const notificationService = TestBed.inject(NotificationService);
        jest.spyOn(notificationService, 'showInfo');

        service.onResize(currentSizeInfo);
        service.initialize(hostData);
        tick(100);

        mockViewerKeyboardEvent$.next(new KeyboardEvent('keydown', { key: 'Delete' }));
        tick(100);

        expect(notificationService.showInfo).not.toHaveBeenCalledWith(
            'VIEWER.SERVICES.VIEWER.REDACTION_DELETED',
            expect.anything(),
            expect.anything()
        );
    }));
});

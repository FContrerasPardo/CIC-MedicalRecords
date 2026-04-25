/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    NgZone,
    Output,
    ViewChild,
} from '@angular/core';
import { HighlightPrimitive } from '../models/text-layer/highlight-primitive';
import { asyncScheduler, BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, observeOn } from 'rxjs/operators';
import { Rect, TextRect } from '../models/text-layer/size';
import { ViewerLayerHostData, ViewerLayerType } from '../models/viewer-layer';
import { ViewerTextLayerService } from '../services/viewer-text-layer.service';
import { ViewerTextData, ViewerTextHighlightData, ViewerTextHighlightInfo } from '../models/text-layer/ocr-candidate';
import { DrawingMethods } from '../models/text-layer/drawing-methods';
import { ViewerService } from '../services/viewer.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RubberBandPrimitive } from '../models/text-layer/rubber-band-primitive';
import { ResizeObserverService } from '../services/resize-observer.service';
import { ViewerLayerService } from '../services/viewer-layer.service';
import { CommonModule } from '@angular/common';
import { DrawStyles } from '../models/text-layer/drawing-config';

export type TooltipInfo = TextRect & { rotation: number; scale: number };

const LAYER_TYPE = ViewerLayerType.TextSuperImposed;

@Component({
    selector: 'hyland-idp-viewer-text-layer',
    templateUrl: './viewer-text-layer.component.html',
    styleUrls: ['./viewer-text-layer.component.scss'],
    imports: [CommonModule],
    providers: [ResizeObserverService],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewerTextLayerComponent implements AfterViewInit {
    @Input() host!: ViewerLayerHostData;

    @Input() set autoNavigationToHighlight(value: boolean) {
        this.viewerTextService.setAutoNavigationToHighlight(value);
    }

    @Input() set handleClipboard(value: boolean) {
        this.viewerTextService.setHandleClipboard(value);
    }

    @Output() activeHighlightInfoChange = new EventEmitter<ViewerTextHighlightInfo>();
    @Output() textSelected = new EventEmitter<ViewerTextHighlightData>();
    @Output() rubberBandCreated = new EventEmitter<ViewerTextData>();
    @Output() highlightsDeleted = new EventEmitter<ViewerTextData[]>();

    @ViewChild('canvas') canvasElement?: ElementRef<HTMLCanvasElement>;
    get canvasContext(): CanvasRenderingContext2D | undefined {
        return this.canvasElement?.nativeElement?.getContext('2d') ?? undefined;
    }

    canvasWidth = 0;
    canvasHeight = 0;
    currentScaleFactor = 1;
    private readonly scaleFactor$ = new BehaviorSubject<number>(1);
    private currentRedactionHighlights: HighlightPrimitive[] = [];
    private currentRubberBand: RubberBandPrimitive | undefined;

    readonly toolTips$: Observable<TooltipInfo[]>;
    readonly toolTipUniquenessFn = (_: number, item: TooltipInfo) => `${item.height}+${item.width}+${item.left}+${item.top}`;
    private readonly destroyRef: DestroyRef = inject(DestroyRef);
    private readonly zone: NgZone = inject(NgZone);
    private readonly viewerService: ViewerService = inject(ViewerService);
    private readonly viewerTextService: ViewerTextLayerService = inject(ViewerTextLayerService);
    private readonly viewerLayerService: ViewerLayerService = inject(ViewerLayerService);
    private readonly resizeObserverService: ResizeObserverService = inject(ResizeObserverService);
    private changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);
    private readonly resized$ = new Subject<Rect>();

    constructor() {
        const registeredLayers = this.viewerLayerService.getLayers();
        if (!registeredLayers.some((layer) => layer.type === LAYER_TYPE)) {
            throw new Error(`${LAYER_TYPE} layer is not registered.`);
        }

        // Track zoom level changes to update scale factor
        this.viewerService.viewerState$.pipe(
            map((state) => state.currentZoomLevel / this.viewerService.viewerConfig.defaultZoomLevel),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe((scaleFactor) => {
            this.currentScaleFactor = scaleFactor;
            this.scaleFactor$.next(scaleFactor);
        });

        combineLatest([this.resized$, this.scaleFactor$]).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(([rect, scaleFactor]) => {
            // Scale canvas buffer by the zoom factor to maintain crisp rendering
            this.canvasWidth = Math.round(rect.width * scaleFactor);
            this.canvasHeight = Math.round(rect.height * scaleFactor);
            this.changeDetector.markForCheck();

            this.viewerTextService.onResize(rect);
        });

        this.toolTips$ = combineLatest([
            this.viewerTextService.tooltip$,
            this.viewerService.viewerState$.pipe(
                map((state) => state.currentZoomLevel),
                distinctUntilChanged()
            ),
            this.viewerService.viewerState$.pipe(
                map((state) => state.rotationStep),
                distinctUntilChanged()
            ),
        ]).pipe(
            takeUntilDestroyed(this.destroyRef),
            map(([tooltips, zoom]) => {
                if (!tooltips) {
                    return [];
                }

                return tooltips.map((tooltip) => ({
                    ...tooltip,
                    rotation: -(this.host.viewerRotation ?? 0),
                    scale: 100 / zoom,
                }));
            })
        );

        combineLatest([
            this.viewerTextService.scaledActiveHighlights$.pipe(debounceTime(50)),
            this.viewerTextService.selectedHighlightIds$.pipe(debounceTime(0)),
            this.viewerService.viewerState$.pipe(
                map((s) => s.rotationStep),
                distinctUntilChanged()
            ),
            this.resized$,
            this.scaleFactor$,
        ])
            .pipe(debounceTime(50), takeUntilDestroyed(this.destroyRef))
            .subscribe(([highlights, selectedIds, rotation]) => {
                this.drawActiveHighlights(highlights, selectedIds);

                this.currentRedactionHighlights = highlights.filter(
                    h => h.drawingConfig.state === DrawStyles.REDACTION || h.drawingConfig.state === DrawStyles.REDACTION_INACTIVE
                );

                const textHighlights = highlights.map((highlight) => highlight.toTextHighlightData());
                this.activeHighlightInfoChange.emit({ highlights: textHighlights, rotation });
            });

        this.destroyRef.onDestroy(() => {
            if (this.canvasElement?.nativeElement) {
                this.resizeObserverService.unobserve(this.canvasElement.nativeElement);
            }
        });

        this.viewerTextService.textSelection$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((info) => this.textSelected.emit(info));

        this.viewerTextService.rubberBandCreated$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => this.rubberBandCreated.emit(data));

        this.viewerTextService.highlightsDeleted$.pipe(
            observeOn(asyncScheduler),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe((data) => this.highlightsDeleted.emit(data));

        this.viewerTextService.rubberBandAreaSelection$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(this.drawRubberBand.bind(this));
    }

    ngAfterViewInit(): void {
        this.initializeWithHost();
        this.observeResize();
    }

    onMouseMove(event: MouseEvent): void {
        this.viewerTextService.onMouseMove(event);
    }

    onMouseDown(event: MouseEvent): void {
        this.viewerTextService.onMouseDown(event);
    }

    onMouseUp(event: MouseEvent): void {
        this.viewerTextService.onMouseUp(event);
    }

    onMouseClick(event: MouseEvent): void {
        this.viewerTextService.onMouseClick(event);
    }

    onMouseLeave(event: MouseEvent): void {
        this.viewerTextService.onMouseLeave(event);
    }

    private initializeWithHost(): void {
        if (!this.host) {
            throw new Error(`"host" input is required for ${LAYER_TYPE} layer.`);
        }

        this.viewerTextService.initialize(this.host);
    }

    private observeResize(): void {
        if (!this.canvasElement?.nativeElement) {
            return;
        }

        this.resizeObserverService.observe(this.canvasElement.nativeElement).subscribe((sizeChange) => {
            const elementBoundingRect = sizeChange?.target?.getBoundingClientRect();

            const width = sizeChange?.contentRect.width ?? 0;
            const height = sizeChange?.contentRect.height ?? 0;
            const top = elementBoundingRect?.top ?? sizeChange?.contentRect.top ?? 0;
            const left = elementBoundingRect?.left ?? sizeChange?.contentRect.left ?? 0;

            if (width === 0 || height === 0) {
                return;
            }

            this.resized$.next({ width, height, top, left });
        });
    }

    private drawActiveHighlights(highlights: HighlightPrimitive[], selectedIds: Set<string>): void {
        const context = this.canvasContext;
        if (!context) {
            return;
        }
        context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        context.scale(this.currentScaleFactor, this.currentScaleFactor); // Scale for high-res rendering
        const logicalWidth = this.canvasWidth / this.currentScaleFactor;
        const logicalHeight = this.canvasHeight / this.currentScaleFactor;
        for (const highlight of highlights) {
            highlight.draw(context, { width: logicalWidth, height: logicalHeight });
            const highlightId = highlight.getHighlightId();
            if (highlight.isSelectable && highlightId && selectedIds.has(highlightId)) {
                DrawingMethods.drawSelectionBorder(context, highlight, 4);
            }
        }

        if (this.currentRubberBand) {
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.scale(this.currentScaleFactor, this.currentScaleFactor);
            this.currentRubberBand.draw(context, { width: logicalWidth, height: logicalHeight });
        }

        this.changeDetector.detectChanges();
    }

    private drawRubberBand(rubberBand: RubberBandPrimitive | undefined): void {
        this.currentRubberBand = rubberBand;
        this.zone.run(() => {
            const context = this.canvasContext;
            if (!context) {
                return;
            }
            context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
            context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

            if (rubberBand) {
                context.scale(this.currentScaleFactor, this.currentScaleFactor); // Scale for high-res rendering
                const logicalWidth = this.canvasWidth / this.currentScaleFactor;
                const logicalHeight = this.canvasHeight / this.currentScaleFactor;
                rubberBand.draw(context, { width: logicalWidth, height: logicalHeight });
            }

            // Draw redaction highlights after rubber band to keep them visible on top
            if (this.currentRedactionHighlights.length > 0) {
                context.setTransform(1, 0, 0, 1, 0, 0);
                context.globalCompositeOperation = 'source-over';

                context.scale(this.currentScaleFactor, this.currentScaleFactor);
                const logicalWidth = this.canvasWidth / this.currentScaleFactor;
                const logicalHeight = this.canvasHeight / this.currentScaleFactor;

                for (const highlight of this.currentRedactionHighlights) {
                    highlight.draw(context, { width: logicalWidth, height: logicalHeight });
                }
            }
        });
    }
}

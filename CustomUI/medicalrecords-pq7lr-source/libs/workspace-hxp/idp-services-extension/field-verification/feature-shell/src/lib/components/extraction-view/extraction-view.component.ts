/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AsyncPipe, CommonModule } from '@angular/common';
import {
    AfterViewInit,
    afterNextRender,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    Injector,
    signal,
    ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    IdpViewerComponent,
    IdpViewerDatasourceOcr,
    IdpViewerToolbarPosition,
    IdpViewerConfigOptions,
    IdpViewerUserLayoutOptions,
    IdpViewerTextLayerComponent,
    IdpViewerContentLayerDirective,
    IdpViewerTextData,
    IdpViewerTextHighlightState,
    IdpViewerEvent,
    IdpViewerTextHighlightData,
    IdpViewerOcrCandidate,
    IdpViewerEventTypes,
    IdpViewerLayerType,
    IdpViewerFooterStickyActionComponent,
    IdpViewerToolbarItemTypes,
    IdpViewerShortcutAction,
    IdpViewerModifierKey,
} from '@hyland/idp-document-viewer';
import {
    RejectDocumentDialogData,
    RejectDocumentDialogComponent,
    ResponseFormat,
    ShortcutBrowserDialogComponent,
    TaskHeaderComponent,
    TaskHeaderTrailingContentDirective,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { TranslatePipe } from '@ngx-translate/core';
import { isEqual } from 'es-toolkit';
import { BehaviorSubject, combineLatest, fromEvent, Observable, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, startWith, switchMap, take, tap, withLatestFrom } from 'rxjs/operators';
import { MetadataPanelComponent } from '../metadata-panel/metadata-panel.component';
import { ExtractionTableComponent } from '../extraction-table/extraction-table.component';
import { ActionHistoryService } from '../../services/action-history.service';
import { IdpImageLoadingService } from '../../services/image/idp-image-loading.service';
import { GroupSelectionType, IdpDocument, IdpField, IdpTable, TableGroupSelection } from '../../models/screen-models';
import { findOcrMatches, IdpVerificationService } from '../../services/verification/verification.service';
import { IdpViewerEventBusService } from '../../services/viewer/idp-viewer-event-bus.service';
import { IdpRedactionService, LocatedField, RedactionHighlight } from '../../services/redaction/idp-redaction.service';
import { IdpPagesMetadata } from '../../store/actions/field-verification.actions';
import Split from 'split.js';
import { MatButtonModule } from '@angular/material/button';
import { TablePanelMode, TablePanelStateService } from '../../services/table-panel-state/table-panel-state.service';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { IconModule } from '@alfresco/adf-core';

@Component({
    selector: 'hyland-idp-extraction-view',
    templateUrl: './extraction-view.component.html',
    styleUrls: ['./extraction-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        TaskHeaderComponent,
        TaskHeaderTrailingContentDirective,
        MetadataPanelComponent,
        ExtractionTableComponent,
        IdpViewerComponent,
        IdpViewerFooterStickyActionComponent,
        IdpViewerContentLayerDirective,
        IdpViewerTextLayerComponent,
        TranslatePipe,
        MatButtonModule,
        IconModule,
        MatTooltipModule,
        AsyncPipe,
    ],
})
export class ExtractionViewComponent implements AfterViewInit {
    @ViewChild('activeTable') activeTable?: ExtractionTableComponent;
    @ViewChild('viewerHScrollProxy') viewerHScrollProxyRef?: ElementRef<HTMLElement>;

    readonly document$: Observable<IdpDocument>;
    readonly activeField$: Observable<IdpField | undefined>;
    readonly activeTable$: Observable<IdpTable | undefined>;
    readonly currentPageOcrWords$: Observable<IdpViewerOcrCandidate[]>;
    readonly viewerDatasource$: Observable<IdpViewerDatasourceOcr>;
    showTextLayer = true;

    get viewerHighlights() {
        return this._viewerHighlights;
    }
    private set viewerHighlights(value) {
        this._viewerHighlights = value;
    }
    private _viewerHighlights: IdpViewerTextData[] = [];

    readonly viewerTextSelected = new EventEmitter<IdpViewerTextHighlightData>();
    readonly fieldValuePending = new BehaviorSubject<{ field: IdpField; pendingValue: string } | null>(null);
    readonly viewerEvent$ = new EventEmitter<IdpViewerEvent<object>>();

    private readonly verificationService = inject(IdpVerificationService);
    private readonly imageLoadingService = inject(IdpImageLoadingService);
    private readonly history = inject(ActionHistoryService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly dialogService = inject(MatDialog);
    private readonly injector = inject(Injector);
    private readonly tablePanelStateService = inject(TablePanelStateService);
    private readonly viewerEventBus = inject(IdpViewerEventBusService);
    private readonly redactionService = inject(IdpRedactionService);
    private readonly featureService = inject<IFeaturesService>(FeaturesServiceToken);

    readonly viewerConfiguration: Partial<IdpViewerConfigOptions> = {
        toolbarPosition: IdpViewerToolbarPosition.Right,
        defaultLayoutType: {
            type: IdpViewerUserLayoutOptions.SinglePage,
            availableActions: [
                IdpViewerToolbarItemTypes.ThumbnailViewer,
                IdpViewerToolbarItemTypes.PageNavigation,
                IdpViewerToolbarItemTypes.LayerSelection,
                IdpViewerToolbarItemTypes.Zoom,
                IdpViewerToolbarItemTypes.Rotate,
                IdpViewerToolbarItemTypes.FullScreen,
            ],
        },
    };

    readonly tableGroupSelection = new Subject<TableGroupSelection>();
    readonly keyboardEvent$: Observable<KeyboardEvent>;

    // Expose table panel state service signals
    readonly TablePanelMode = TablePanelMode;
    readonly tablePanelMode = this.tablePanelStateService.mode;
    readonly tablePanelHeight = this.tablePanelStateService.height;
    readonly tablePanelTransitioning = this.tablePanelStateService.transitioning;
    renderTableContent = false;
    readonly tableLoadingShellRows = Array.from({ length: 3 }, (_, index) => index + 1);
    readonly tableLoadingShellColumns = Array.from({ length: 8 }, (_, index) => index + 1);
    instanceHorizontal?: Split.Instance;
    private currentVisibleTableId = '';
    private resizeHandleMouseDown = false;
    private resizeStartY = 0;
    private resizeStartHeight = 0;
    private tableContentMountFrameId?: number;

    /** Mirrored horizontal scrollbar strip below the table panel (viewer still overlays; native bar can sit under the table). */
    readonly viewerHScrollProxyVisible = signal(false);
    readonly viewerHScrollSpacerWidth = signal(0);
    readonly viewerHScrollStripPx = 12;

    private viewerScrollEl: HTMLElement | null = null;
    private viewerHScrollResizeObserver?: ResizeObserver;

    private readonly onViewerScrollElScroll = (): void => {
        const proxy = this.viewerHScrollProxyRef?.nativeElement;
        if (proxy && this.viewerScrollEl) {
            proxy.scrollLeft = this.viewerScrollEl.scrollLeft;
        }
    };

    private readonly idpRedactionFeature = WORKSPACE_IDP_HXP.REDACTION;

    constructor() {
        effect(() => {
            this.tablePanelMode();
            afterNextRender(() => this.updateViewerScrollProxy(), { injector: this.injector });
        });

        this.featureService
            .isOn$(this.idpRedactionFeature)
            .pipe(
                filter(Boolean),
                take(1),
                tap(() => {
                    this.viewerConfiguration.defaultLayoutType?.availableActions?.push(IdpViewerToolbarItemTypes.RedactionToggle);
                    this.viewerConfiguration.shortcutOverrides = {
                        [IdpViewerShortcutAction.RedactionToggle]: {
                            key: 'b',
                            modifierKeys: [IdpViewerModifierKey.shiftKey],
                        },
                    };
                }),
                switchMap(() => this.viewerEvent$),
                takeUntilDestroyed()
            )
            .subscribe((event) => this.viewerEventBus.emit(event));

        this.activeField$ = this.verificationService.activeField$.pipe(takeUntilDestroyed(this.destroyRef));
        this.activeTable$ = this.verificationService.activeTable$.pipe(takeUntilDestroyed(this.destroyRef));

        const getOcr$ = (pageId: string, responseFormat?: ResponseFormat) => {
            return this.imageLoadingService.getPageOcrData$(pageId, responseFormat).pipe(
                takeUntilDestroyed(this.destroyRef),
                filter(isDefined),
                map((ocrData) => {
                    if (!ocrData) {
                        return [];
                    }
                    if (responseFormat === ResponseFormat.TextLayout) {
                        return ocrData.layout;
                    }
                    return ocrData.words.map((w) => ({
                        ...w.boundingBox,
                        pageId,
                        text: w.text,
                    }));
                })
            );
        };

        this.document$ = this.verificationService.document$.pipe(takeUntilDestroyed(this.destroyRef));

        this.viewerDatasource$ = this.document$.pipe(
            map((document: IdpDocument) => {
                return {
                    id: document.id,
                    name: document.name,
                    pages: document.pages.map((page) => {
                        const disableRotation = page.hasMachineTextLayer;
                        return {
                            id: page.id,
                            name: page.name,
                            viewerRotation: page.viewerRotation ?? 0,
                            isSelected: page.isSelected,
                            panelClasses: page.hasIssue ? ['idp-viewer__issue-page'] : [],
                            ...(disableRotation === undefined ? {} : { disableRotation }),
                        };
                    }),
                };
            }),
            distinctUntilChanged(isEqual),
            map(
                (document) =>
                    ({
                        documents: [document],
                        loadImageFn: (pageId: string) => {
                            return this.imageLoadingService.getImageDataForPage$(pageId).pipe(filter(isDefined));
                        },
                        loadThumbnailFn: (pageId: string) => {
                            return this.imageLoadingService.getImageDataForPage$(pageId, true).pipe(
                                filter(isDefined),
                                map((data) => data.blobUrl)
                            );
                        },
                        loadPageOcrFn: getOcr$,
                    }) satisfies IdpViewerDatasourceOcr
            )
        );

        const currentPageIndex$ = this.viewerEvent$.pipe(
            filter(isPageSelectedEvent),
            map((event) => event.data?.newValue?.pageNavInfo?.currentPageIndex),
            filter(isDefined),
            startWith(0) // start with first page by default
        );
        const currentPageId$ = combineLatest([currentPageIndex$, this.document$]).pipe(
            map(([index, document]) => document.pages[index].id),
            distinctUntilChanged()
        );
        this.currentPageOcrWords$ = currentPageId$.pipe(
            switchMap((pageId) => getOcr$(pageId, ResponseFormat.Ocr) as Observable<IdpViewerOcrCandidate[]>)
        );

        const activeTableGroup$ = this.tableGroupSelection.pipe(
            startWith({ type: GroupSelectionType.None }),
            distinctUntilChanged(isEqual),
            takeUntilDestroyed(this.destroyRef)
        );

        let previousPageIndex = 0;
        const activeFieldHighlight$ = combineLatest([
            this.verificationService.activeField$,
            currentPageIndex$,
            this.redactionService.activeFieldRedactionHighlight$,
        ]).pipe(
            withLatestFrom(this.document$),
            map(([[field, pageIndex, fieldRedactionHighlight], document]) => {
                const pageChanging = previousPageIndex !== pageIndex;
                previousPageIndex = pageIndex;

                if (!isLocatedField(field)) {
                    return undefined;
                }

                const boxPageIndex = field.boundingBox.pageIndex ?? document.pages.findIndex((page) => page.id === field.boundingBox.pageId);

                if (pageChanging && pageIndex !== boxPageIndex) {
                    return undefined;
                }

                const pageId = field.boundingBox.pageId || document.pages[boxPageIndex].id;
                return resolveActiveFieldHighlight(field, pageId, fieldRedactionHighlight, !this.showTextLayer);
            }),
            distinctUntilChanged(isEqual)
        );

        const typeaheadHighlights$ = combineLatest([this.fieldValuePending, currentPageId$]).pipe(
            switchMap(([update, pageId]) => {
                if (!update?.pendingValue) {
                    return of([]); // no current typeahead
                }
                if (update.field.boundingBox && update.field.value === update.pendingValue) {
                    return of([]); // field already has matching box
                }
                return getOcr$(pageId, ResponseFormat.Ocr).pipe(
                    map(function* (ocrWords) {
                        if (!Array.isArray(ocrWords)) {
                            return;
                        }
                        let index = 0;
                        for (const ocrMatch of findOcrMatches(ocrWords, update.pendingValue, false, update.field.value === update.pendingValue)) {
                            if (ocrMatch.length > 0) {
                                for (const word of ocrMatch) {
                                    yield {
                                        ...word,
                                        highlightState: index === 0 ? IdpViewerTextHighlightState.PRIMARY : IdpViewerTextHighlightState.SECONDARY,
                                    };
                                }
                                index++;
                            }
                        }
                    })
                );
            }),
            distinctUntilChanged(isEqual)
        );

        // Create highlights for table group selections
        const activeTableGroupHighlights$ = combineLatest([activeTableGroup$, currentPageIndex$, this.document$]).pipe(
            switchMap(([groupSelection, pageIndex, document]) => {
                if (groupSelection.type === GroupSelectionType.None || !groupSelection.tableId) {
                    return of([]); // No group selected
                }

                // Get the table data
                return this.verificationService.getTableById$(groupSelection.tableId).pipe(
                    map((table) => {
                        if (!table) {
                            return [];
                        }

                        const highlights: IdpViewerTextData[] = [];

                        const relevantCells = this.getRelevantTableCells(table, groupSelection);
                        for (const cell of relevantCells) {
                            if (cell.boundingBox) {
                                const boxPageIndex =
                                    cell.boundingBox.pageIndex ?? document.pages.findIndex((page) => page.id === cell.boundingBox?.pageId);
                                if (pageIndex === boxPageIndex) {
                                    highlights.push({
                                        ...cell.boundingBox,
                                        text: cell.value == null ? '' : String(cell.value),
                                        pageId: cell.boundingBox.pageId || document.pages[boxPageIndex]?.id,
                                        highlightState: cell.hasIssue ? IdpViewerTextHighlightState.INVALID : IdpViewerTextHighlightState.VALID,
                                    });
                                }
                            }
                        }

                        return highlights;
                    }),
                    catchError(() => of([]))
                );
            }),
            startWith([]),
            distinctUntilChanged(isEqual)
        );

        this.viewerEvent$
            .pipe(
                filter((event) => event.type === IdpViewerEventTypes.ViewChanged),
                map((event) => (event.data?.newValue as { currentLayer?: IdpViewerLayerType })?.currentLayer),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((currentLayer) => {
                this.showTextLayer = currentLayer !== IdpViewerLayerType.TextOnly;
            });

        this.viewerEvent$
            .pipe(
                filter((event) => event.type === IdpViewerEventTypes.RotationChanged),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((event) => {
                const pages: IdpPagesMetadata[] =
                    event.data?.dataSourceRef
                        ?.filter((pageDataSource) => pageDataSource?.pageId)
                        .map((pageDataSource) => ({
                            pageId: pageDataSource.pageId,
                            documentId: pageDataSource.documentId,
                            viewerRotation: pageDataSource.viewerRotation,
                        })) ?? [];
                if (pages.length === 0) {
                    return;
                }
                this.verificationService.updatePagesRotation(pages, false);
            });

        combineLatest([activeFieldHighlight$, typeaheadHighlights$, activeTableGroupHighlights$, this.redactionService.redactionHighlights$])
            .pipe(
                map(([activeFieldHighlight, typeaheadHighlights, tableGroupHighlights, redactionHighlights]) => {
                    const hasTableGroupSelection = tableGroupHighlights.length > 0;
                    const shouldIncludeActiveField = activeFieldHighlight && !hasTableGroupSelection;
                    return [
                        ...(shouldIncludeActiveField ? [activeFieldHighlight] : []),
                        ...typeaheadHighlights,
                        ...tableGroupHighlights,
                        ...redactionHighlights,
                    ];
                }),
                distinctUntilChanged(isEqual),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((viewerHighlights) => (this.viewerHighlights = viewerHighlights));

        // Clear table group selection when individual field is selected
        this.verificationService.activeField$
            .pipe(
                filter((field) => !!field), // Only when a field is actually selected
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                // Clear any table group selection when an individual field is selected
                this.tableGroupSelection.next({ type: GroupSelectionType.None });
            });

        this.viewerTextSelected
            .pipe(withLatestFrom(this.verificationService.activeField$), takeUntilDestroyed(this.destroyRef))
            .subscribe(([highlight, field]) => {
                if (field) {
                    const boundingBox = { ...expandedBoundingBox(highlight.rect.actual), pageId: highlight.pageId };
                    // Always set confidence to 1 on manual update
                    const updatedField = { ...field, value: highlight.text, boundingBox, confidence: 1 };
                    this.verificationService.updateField(updatedField, boundingBox);
                    this.fieldValuePending.next({ field: updatedField, pendingValue: updatedField.value });
                    this.verificationService.selectField(updatedField, true);
                }
            });

        this.destroyRef.onDestroy(() => {
            if (this.tableContentMountFrameId !== undefined) {
                cancelAnimationFrame(this.tableContentMountFrameId);
            }
            this.instanceHorizontal?.destroy();
            this.imageLoadingService.cleanup();
            this.viewerHScrollResizeObserver?.disconnect();
            this.detachViewerScrollListener();
        });

        this.keyboardEvent$ = fromEvent<KeyboardEvent>(document, 'keyup').pipe(filter((event) => !event.repeat));
    }

    ngAfterViewInit() {
        // Listen for field type changes
        this.activeField$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((field) => {
            const tableId = field?.dataType === 'Table' ? field.id : field?.tableId;
            const switchedTable = !!tableId && tableId !== this.currentVisibleTableId;
            const isTableHidden = this.tablePanelMode() === TablePanelMode.Hidden;

            if (tableId && (isTableHidden || switchedTable)) {
                this.openTablePane(tableId);
            } else if (!tableId && !isTableHidden) {
                this.closeTable();
            }
        });

        // Initialize horizontal split after first image is loaded to ensure viewer has proper dimensions
        this.viewerEvent$
            .pipe(
                filter((event) => event.type === IdpViewerEventTypes.ImageLoaded),
                take(1)
            )
            .subscribe(() => {
                this.instanceHorizontal = Split(['#split-left', '#split-right'], {
                    sizes: [25, 75],
                    direction: 'horizontal',
                    gutterSize: 10,
                    minSize: 446, // enough to accommodate a two-column metadata panel
                    gutter: (_, direction) => {
                        const gutter = document.createElement('div');
                        gutter.className = `gutter gutter-${direction}`;
                        gutter.dataset['automationId'] = 'idp-viewer-horizontal-splitter-bar';
                        return gutter;
                    },
                });
            });

        this.setupViewerScrollProxy();
    }

    private setupViewerScrollProxy(): void {
        const scrollProxyRefreshEvents: readonly string[] = [
            IdpViewerEventTypes.ImageLoaded,
            IdpViewerEventTypes.ZoomChanged,
            IdpViewerEventTypes.Resize,
            IdpViewerEventTypes.ViewChanged,
            IdpViewerEventTypes.PageSelected,
            IdpViewerEventTypes.LayoutChanged,
            IdpViewerEventTypes.RotationChanged,
        ];
        this.viewerEvent$
            .pipe(
                filter((event) => scrollProxyRefreshEvents.includes(event.type)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                afterNextRender(() => this.updateViewerScrollProxy(), { injector: this.injector });
            });

        afterNextRender(
            () => {
                const splitTop = document.querySelector('#split-top');
                if (splitTop) {
                    this.viewerHScrollResizeObserver = new ResizeObserver(() => this.updateViewerScrollProxy());
                    this.viewerHScrollResizeObserver.observe(splitTop);
                }
                this.updateViewerScrollProxy();
            },
            { injector: this.injector }
        );
    }

    private findViewerHorizontalScrollElement(root: HTMLElement): HTMLElement | null {
        const inner = root.querySelector('.idp-viewer-container') as HTMLElement | null;
        const outer = root.querySelector('.idp-viewer__container') as HTMLElement | null;
        if (inner && inner.scrollWidth > inner.clientWidth) {
            return inner;
        }
        if (outer && outer.scrollWidth > outer.clientWidth) {
            return outer;
        }
        return inner ?? outer;
    }

    private detachViewerScrollListener(): void {
        if (this.viewerScrollEl) {
            this.viewerScrollEl.removeEventListener('scroll', this.onViewerScrollElScroll);
        }
        this.viewerScrollEl = null;
    }

    private updateViewerScrollProxy(): void {
        const splitTop = document.querySelector('#split-top');
        if (!splitTop) {
            this.viewerHScrollProxyVisible.set(false);
            this.viewerHScrollSpacerWidth.set(0);
            this.detachViewerScrollListener();
            return;
        }

        this.detachViewerScrollListener();

        const mode = this.tablePanelMode();
        const tableAllowsProxy = mode !== TablePanelMode.Hidden && mode !== TablePanelMode.Maximized;

        const scrollEl = this.findViewerHorizontalScrollElement(splitTop as HTMLElement);
        this.viewerScrollEl = scrollEl;

        if (!scrollEl || !tableAllowsProxy) {
            this.viewerHScrollProxyVisible.set(false);
            this.viewerHScrollSpacerWidth.set(0);
            this.cdr.markForCheck();
            return;
        }

        const needsHScroll = scrollEl.scrollWidth > scrollEl.clientWidth + 1;
        this.viewerHScrollSpacerWidth.set(scrollEl.scrollWidth);
        this.viewerHScrollProxyVisible.set(needsHScroll);

        if (!needsHScroll) {
            this.viewerScrollEl = null;
            this.cdr.markForCheck();
            return;
        }

        scrollEl.addEventListener('scroll', this.onViewerScrollElScroll, { passive: true });
        afterNextRender(
            () => {
                const proxy = this.viewerHScrollProxyRef?.nativeElement;
                if (proxy && scrollEl) {
                    proxy.scrollLeft = scrollEl.scrollLeft;
                }
            },
            { injector: this.injector }
        );
        this.cdr.markForCheck();
    }

    onViewerHScrollProxyScroll(): void {
        const proxy = this.viewerHScrollProxyRef?.nativeElement;
        if (proxy && this.viewerScrollEl) {
            this.viewerScrollEl.scrollLeft = proxy.scrollLeft;
        }
    }

    onTableGroupSelectionChanged(groupSelection: { type: GroupSelectionType; index?: number; tableId?: string }) {
        this.tableGroupSelection.next(groupSelection);
    }

    @HostListener('keydown.control.z')
    onUndo() {
        this.history.undo();
    }
    @HostListener('keydown.control.y')
    onRedo() {
        this.history.redo();
    }

    onShortcutBrowserClick() {
        if (this.dialogService.openDialogs.length > 0) {
            return;
        }

        ShortcutBrowserDialogComponent.openDialog(this.dialogService, { injector: this.injector });
    }

    private readonly cdr = inject(ChangeDetectorRef);

    private openTablePane(tableId: string) {
        if (this.tableContentMountFrameId !== undefined) {
            cancelAnimationFrame(this.tableContentMountFrameId);
            this.tableContentMountFrameId = undefined;
        }

        this.currentVisibleTableId = tableId;
        this.tablePanelStateService.setDefault();
        this.renderTableContent = false;
        this.cdr.markForCheck();
        this.scheduleTransitionEnd();

        this.tableContentMountFrameId = requestAnimationFrame(() => {
            this.tableContentMountFrameId = requestAnimationFrame(() => {
                this.tableContentMountFrameId = undefined;
                if (this.currentVisibleTableId !== tableId) {
                    return;
                }
                this.renderTableContent = true;
                this.cdr.markForCheck();
            });
        });
    }

    maximizeTable(): void {
        this.tablePanelStateService.maximize();
        this.scheduleTransitionEnd();
    }

    minimizeTable(): void {
        this.tablePanelStateService.minimize();
        this.scheduleTransitionEnd();
    }

    setDefaultView(): void {
        this.tablePanelStateService.setDefault();
        this.scheduleTransitionEnd();
    }

    private scheduleTransitionEnd(): void {
        this.cdr.markForCheck();
        afterNextRender(
            () => {
                this.tablePanelStateService.endTransition();
            },
            { injector: this.injector }
        );
    }

    closeTable(): void {
        if (this.tableContentMountFrameId !== undefined) {
            cancelAnimationFrame(this.tableContentMountFrameId);
            this.tableContentMountFrameId = undefined;
        }
        this.tablePanelStateService.hide();
        this.currentVisibleTableId = '';
        this.renderTableContent = false;
        this.cdr.markForCheck();
    }

    onResizeHandleMouseDown(event: MouseEvent): void {
        this.resizeHandleMouseDown = true;
        this.resizeStartY = event.clientY;
        this.resizeStartHeight = this.tablePanelHeight();
        this.tablePanelStateService.endTransition(); // Disable transition during drag
        event.preventDefault();
    }

    @HostListener('document:mousemove', ['$event'])
    onResizeHandleMouseMove(event: MouseEvent): void {
        if (!this.resizeHandleMouseDown) {
            return;
        }

        const viewerContainer = document.querySelector('#split-top') as HTMLElement;
        if (!viewerContainer) {
            return;
        }

        const viewerHeight = viewerContainer.clientHeight;
        const deltaY = this.resizeStartY - event.clientY; // Positive = dragging up
        const deltaPercent = (deltaY / viewerHeight) * 100;

        // Calculate new height (drag up increases coverage, drag down decreases)
        const newHeight = this.resizeStartHeight + deltaPercent;

        this.tablePanelStateService.setHeight(newHeight);
        this.cdr.markForCheck();
        event.preventDefault();
    }

    @HostListener('document:mouseup')
    onResizeHandleMouseUp(): void {
        if (this.resizeHandleMouseDown) {
            this.resizeHandleMouseDown = false;
        }
    }

    private getRelevantTableCells(table: any, groupSelection: TableGroupSelection) {
        const cells = [];
        switch (groupSelection.type) {
            case GroupSelectionType.Table: {
                for (const row of table.rows) {
                    cells.push(...row.rowCells);
                }
                break;
            }
            case GroupSelectionType.Row: {
                if (groupSelection.index !== undefined) {
                    const selectedRow = table.rows[groupSelection.index];
                    if (selectedRow) {
                        cells.push(...selectedRow.rowCells);
                    }
                }
                break;
            }
            case GroupSelectionType.Column: {
                for (const row of table.rows) {
                    if (groupSelection.index !== undefined) {
                        const cell = row.rowCells[groupSelection.index];
                        if (cell) {
                            cells.push(cell);
                        }
                    }
                }
                break;
            }
        }
        return cells;
    }

    onFlagDocument(data?: RejectDocumentDialogData) {
        const shouldCompleteTask = !data;

        const dialogConfig: MatDialogConfig = {
            data,
            injector: this.injector,
            width: '600px',
            height: '80%',
            restoreFocus: true,
        };
        const dialogRef = this.dialogService.open(RejectDocumentDialogComponent, dialogConfig);
        return dialogRef
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((result) => {
                if (result?.rejectReason) {
                    this.verificationService.updateRejectReason(result.rejectReason.id, result.rejectNote, shouldCompleteTask);
                } else if (result?.shouldRemoveFlag) {
                    this.verificationService.removeDocumentFlag();
                }
            });
    }
}

function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}

type Rect = IdpViewerTextHighlightData['rect']['actual'];

function expandedBoundingBox<T extends Rect>(rect: T) {
    const left = Math.floor(rect.left);
    const top = Math.floor(rect.top);
    const addedWidth = rect.left - left;
    const addedHeight = rect.top - top;
    return {
        ...rect,
        left,
        top,
        width: Math.ceil(rect.width + addedWidth),
        height: Math.ceil(rect.height + addedHeight),
    };
}

interface PageSelectedData {
    pageNavInfo: {
        currentPageIndex: number | undefined;
        totalPages: number;
    };
}
function isPageSelectedEvent(event: IdpViewerEvent<any>): event is IdpViewerEvent<PageSelectedData> {
    return event.type === 'PageSelected';
}

function isLocatedField(field: IdpField | undefined): field is LocatedField {
    return field?.boundingBox != null;
}

// Field highlight is suppressed when the redaction box is fully covering it —
// i.e. redaction is visible and this field is currently selected.
function isFieldHighlightSuppressedByRedaction(redactionHighlight: RedactionHighlight | undefined, isTextLayer: boolean): boolean {
    return !isTextLayer && redactionHighlight?.isActiveRedaction === true;
}

// When a field has a redaction but isn't selected, we show an outline around
// the redaction box so the user can see where the redaction sits while still
// being able to read the field value beneath it.
function redactionOutlineHighlight(field: IdpField, redactionHighlight: RedactionHighlight, pageId: string): IdpViewerTextData {
    return {
        ...redactionHighlight, // use padded redaction bounding box
        isBorder: true, // outline only — field content visible beneath
        text: field.value ?? '',
        pageId,
        highlightState: fieldHighlightState(field),
    };
}

function normalFieldHighlight(field: LocatedField, pageId: string): IdpViewerTextData {
    return {
        ...field.boundingBox,
        text: field.value ?? '',
        pageId,
        highlightState: fieldHighlightState(field),
    };
}

function fieldHighlightState(field: IdpField): IdpViewerTextHighlightState {
    return field.hasIssue ? IdpViewerTextHighlightState.INVALID : IdpViewerTextHighlightState.VALID;
}

function resolveActiveFieldHighlight(
    field: LocatedField,
    pageId: string,
    redactionHighlight: RedactionHighlight | undefined,
    isTextLayer = false
): IdpViewerTextData | undefined {
    if (isFieldHighlightSuppressedByRedaction(redactionHighlight, isTextLayer)) {
        return undefined;
    }
    if (redactionHighlight) {
        return redactionOutlineHighlight(field, redactionHighlight, pageId);
    }
    return normalFieldHighlight(field, pageId);
}

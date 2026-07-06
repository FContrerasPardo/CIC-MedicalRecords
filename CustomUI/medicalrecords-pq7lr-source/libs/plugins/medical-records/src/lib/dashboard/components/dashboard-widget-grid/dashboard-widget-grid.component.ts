import { CdkDragDrop, CdkDragEnd, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
    DashboardContainerConfig,
    DashboardContainerLayoutMode,
    DashboardLayoutState,
    DashboardPageConfig,
    DashboardThemeConfig,
    DashboardWidgetCanvasRect,
    DashboardWidgetConfig,
    DashboardWidgetId,
} from '../../definitions/dashboard-widget.model';
import { ProcessAttentionItem } from '../../definitions/process-attention.model';
import { DashboardThemeService } from '../../services/dashboard-theme.service';
import { DashboardContentLoadContextService } from '../../services/dashboard-content-load-context.service';
import {
    collectContainerDropIds,
    containerDropId,
    containerLayoutGridColumns,
    findContainer,
    layoutModeSupportsCanvas,
    LAYOUT_SCHEMA_VERSION,
    legacySectionForLayoutMode,
    pageContainersDropId,
    PALETTE_DROP_ID,
    resolveActivePageId,
} from '../../utils/dashboard-layout-structure.util';
import { normalizeWidgetColumnSpan, resolveWidgetColumnSpan } from '../../utils/dashboard-widget-span.util';
import {
    CANVAS_ROW_HEIGHT_PX,
    canvasRectStyle,
    clampCanvasRect,
    containerCanvasMinRows,
    packContainerCanvas,
    resolveCanvasRect,
    resolveWidgetRowSpan,
} from '../../utils/dashboard-widget-canvas.util';
import { DashboardGaugeWidgetComponent } from '../widgets/dashboard-gauge-widget/dashboard-gauge-widget.component';
import { DashboardChartWidgetComponent } from '../widgets/dashboard-chart-widget/dashboard-chart-widget.component';
import { DashboardLinkCardWidgetComponent } from '../widgets/dashboard-link-card-widget/dashboard-link-card-widget.component';
import { DashboardMetricWidgetComponent } from '../widgets/dashboard-metric-widget/dashboard-metric-widget.component';
import { DashboardProcessListWidgetComponent } from '../widgets/dashboard-process-list-widget/dashboard-process-list-widget.component';
import { DashboardTableWidgetComponent } from '../widgets/dashboard-table-widget/dashboard-table-widget.component';
import { DashboardTaskRecentListWidgetComponent } from '../widgets/dashboard-task-recent-list-widget/dashboard-task-recent-list-widget.component';
import { DashboardTaskStatusSummaryWidgetComponent } from '../widgets/dashboard-task-status-summary-widget/dashboard-task-status-summary-widget.component';
import { DashboardKpiStripComponent } from '../dashboard-kpi-strip/dashboard-kpi-strip.component';
import { DashboardDateRangeFilterComponent } from '../dashboard-period-pills/dashboard-period-pills.component';

@Component({
    selector: 'medical-records-dashboard-widget-grid',
    standalone: true,
    host: {
        '[class.edit-mode-host]': 'editMode',
    },
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        DragDropModule,
        DashboardMetricWidgetComponent,
        DashboardGaugeWidgetComponent,
        DashboardChartWidgetComponent,
        DashboardTableWidgetComponent,
        DashboardProcessListWidgetComponent,
        DashboardLinkCardWidgetComponent,
        DashboardTaskStatusSummaryWidgetComponent,
        DashboardTaskRecentListWidgetComponent,
        DashboardKpiStripComponent,
        DashboardDateRangeFilterComponent,
    ],
    templateUrl: './dashboard-widget-grid.component.html',
    styleUrls: ['./dashboard-widget-grid.component.scss'],
})
export class DashboardWidgetGridComponent implements OnChanges, OnInit {
    @Input({ required: true }) pages: DashboardPageConfig[] = [];
    @Input({ required: true }) widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {};
    @Input() activePageId = '';
    @Input() theme?: DashboardThemeConfig;
    @Input() layoutSourceDocumentId?: string | null;
    @Input() editMode = false;
    @Input() selectedWidgetId: DashboardWidgetId | null = null;
    @Input() selectedContainerId: string | null = null;
    @Input() activeContainerId: string | null = null;
    @Input() selectedPageId: string | null = null;

    @Output() processSelected = new EventEmitter<ProcessAttentionItem>();
    @Output() layoutChange = new EventEmitter<DashboardLayoutState>();
    @Output() widgetSelect = new EventEmitter<DashboardWidgetId>();
    @Output() widgetRemove = new EventEmitter<DashboardWidgetId>();
    @Output() activePageChange = new EventEmitter<string>();
    @Output() pageSelect = new EventEmitter<string>();
    @Output() containerSelect = new EventEmitter<string>();
    @Output() containerActivate = new EventEmitter<string>();
    @Output() addPage = new EventEmitter<void>();
    @Output() addContainer = new EventEmitter<void>();
    @Output() removePage = new EventEmitter<string>();
    @Output() removeContainer = new EventEmitter<string>();

    readonly canvasRowHeight = CANVAS_ROW_HEIGHT_PX;
    readonly containerDropId = containerDropId;
    readonly pageContainersDropId = pageContainersDropId;

    private activeCanvasInteraction: {
        widgetId: DashboardWidgetId;
        containerId: string;
        layoutMode: DashboardContainerLayoutMode;
        kind: 'move' | 'resize';
        startX: number;
        startY: number;
        origin: DashboardWidgetCanvasRect;
        gridCols: number;
        canvasWidth: number;
    } | null = null;

    private suppressWidgetSelectUntil = 0;
    private canvasInteractionMoved = false;
    private readonly visitedPageIds = new Set<string>();

    constructor(
        private readonly hostRef: ElementRef<HTMLElement>,
        private readonly themeService: DashboardThemeService,
        private readonly contentLoadContext: DashboardContentLoadContextService
    ) {}

    ngOnInit(): void {
        this.ensureContainerCanvasRects();
        if (this.resolvedActivePageId) {
            this.visitedPageIds.add(this.resolvedActivePageId);
        }
        this.syncContentLoadContext();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['editMode']?.currentValue) {
            this.ensureContainerCanvasRects();
        }
        if (changes['theme']) {
            if (this.theme) {
                this.themeService.setThemeFromLayout({
                    pages: this.pages,
                    widgets: this.widgets,
                    theme: this.theme,
                });
            }
            this.themeService.applyToHost(this.hostRef.nativeElement);
        }
        if (changes['pages'] && !this.activePageId && this.pages.length) {
            this.activePageChange.emit(this.pages[0].id);
        }
        if (changes['activePageId'] && this.resolvedActivePageId) {
            this.visitedPageIds.add(this.resolvedActivePageId);
            this.contentLoadContext.setActivePageId(this.resolvedActivePageId, this.editMode);
        }
        if (changes['pages'] || changes['widgets'] || changes['activePageId']) {
            this.syncContentLoadContext();
        }
        if (changes['pages'] || changes['widgets']) {
            this.ensureContainerCanvasRects();
        }
        if (changes['pages']) {
            const pageIds = new Set(this.pages.map((page) => page.id));
            for (const id of [...this.visitedPageIds]) {
                if (!pageIds.has(id)) {
                    this.visitedPageIds.delete(id);
                }
            }
        }
    }

    canRemovePage(): boolean {
        return this.pages.length > 1;
    }

    canRemoveContainer(page: DashboardPageConfig): boolean {
        return page.containers.length > 1;
    }

    onRemovePage(pageId: string, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (!this.canRemovePage()) {
            return;
        }
        this.removePage.emit(pageId);
    }

    onRemoveContainer(containerId: string, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.removeContainer.emit(containerId);
    }

    get sectionDropIds(): string[] {
        return collectContainerDropIds(this.pages, this.editMode);
    }

    get resolvedActivePageId(): string {
        return resolveActivePageId(this.pages, this.activePageId);
    }

    get activePage(): DashboardPageConfig | undefined {
        return this.pages.find((page) => page.id === this.resolvedActivePageId);
    }

    isPageVisited(pageId: string): boolean {
        return this.visitedPageIds.has(pageId);
    }

    isPageActive(pageId: string): boolean {
        return pageId === this.resolvedActivePageId;
    }

    private syncContentLoadContext(): void {
        if (!this.pages.length) {
            return;
        }
        this.contentLoadContext.registerLayout(
            this.pages,
            this.widgets,
            this.resolvedActivePageId,
            this.editMode
        );
    }

    trackByPageId(_: number, page: DashboardPageConfig): string {
        return page.id;
    }

    trackByContainerId(_: number, container: DashboardContainerConfig): string {
        return container.id;
    }

    trackByWidgetId(_: number, widgetId: DashboardWidgetId): DashboardWidgetId {
        return widgetId;
    }

    selectPage(pageId: string): void {
        if (pageId !== this.resolvedActivePageId) {
            this.visitedPageIds.add(pageId);
            this.activePageChange.emit(pageId);
        }
    }

    openPageSettings(pageId: string, event: Event): void {
        event.stopPropagation();
        if (this.editMode) {
            this.pageSelect.emit(pageId);
        }
        if (pageId !== this.resolvedActivePageId) {
            this.visitedPageIds.add(pageId);
            this.activePageChange.emit(pageId);
        }
    }

    isPageSelectedForSettings(pageId: string): boolean {
        return this.editMode && this.selectedPageId === pageId && !this.selectedContainerId;
    }

    isContainerSelected(containerId: string): boolean {
        return this.selectedContainerId === containerId;
    }

    isPaletteTarget(containerId: string): boolean {
        return this.editMode && this.activeContainerId === containerId;
    }

    activateContainer(containerId: string, event: Event): void {
        event.stopPropagation();
        if (this.editMode) {
            this.containerActivate.emit(containerId);
        }
    }

    selectContainer(containerId: string, event: Event): void {
        event.stopPropagation();
        this.containerSelect.emit(containerId);
    }

    toggleContainer(container: DashboardContainerConfig, event: Event): void {
        event.stopPropagation();
        const pages = this.pages.map((page) => ({
            ...page,
            containers: page.containers.map((entry) =>
                entry.id === container.id ? { ...entry, collapsed: !entry.collapsed } : entry
            ),
        }));
        this.emitLayout(pages);
    }

    isMetricCompact(container: DashboardContainerConfig): boolean {
        return container.layoutMode === 'grid-4' || container.layoutMode === 'kpi-strip';
    }

    containerGridClass(container: DashboardContainerConfig): Record<string, boolean> {
        return {
            'widget-canvas--freeform': this.useCanvasLayout(container),
            'container-grid--12': container.layoutMode === 'grid-12',
            'container-grid--4': container.layoutMode === 'grid-4',
            'container-grid--list': container.layoutMode === 'list',
        };
    }

    widgetSlotStyle(widgetId: DashboardWidgetId, container: DashboardContainerConfig): Record<string, string> {
        const config = this.widgets[widgetId];
        if (!config) {
            return { gridColumn: 'span 4' };
        }

        const style: Record<string, string> = {};
        if (config.cardHeightPx) {
            style['minHeight'] = `${config.cardHeightPx}px`;
        }

        if (this.useCanvasLayout(container)) {
            return { ...canvasRectStyle(resolveCanvasRect(config, container.layoutMode)), ...style };
        }

        const span = resolveWidgetColumnSpan(config, container.layoutMode);
        const rowSpan = resolveWidgetRowSpan(config);
        return { gridColumn: `span ${span}`, gridRow: `span ${rowSpan}`, ...style };
    }

    useCanvasLayout(container: DashboardContainerConfig): boolean {
        if (!layoutModeSupportsCanvas(container.layoutMode)) {
            return false;
        }
        if (this.editMode) {
            return true;
        }
        return container.widgetIds.some((id) => !!this.widgets[id]?.canvasRect);
    }

    containerCanvasStyle(container: DashboardContainerConfig): Record<string, string> {
        if (!this.useCanvasLayout(container)) {
            return {};
        }
        const rows = containerCanvasMinRows(container.widgetIds, this.widgets, container.layoutMode);
        const gap = 20;
        return {
            gridAutoRows: `${CANVAS_ROW_HEIGHT_PX}px`,
            minHeight: `${rows * CANVAS_ROW_HEIGHT_PX + Math.max(0, rows - 1) * gap}px`,
        };
    }

    onCanvasMoveStart(event: PointerEvent, widgetId: DashboardWidgetId, container: DashboardContainerConfig): void {
        if (!this.editMode || !this.useCanvasLayout(container)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.startCanvasInteraction(event, widgetId, container, 'move');
    }

    onCanvasResizeStart(event: PointerEvent, widgetId: DashboardWidgetId, container: DashboardContainerConfig): void {
        if (!this.editMode || !this.useCanvasLayout(container)) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.startCanvasInteraction(event, widgetId, container, 'resize');
    }

    @HostListener('document:pointermove', ['$event'])
    onCanvasPointerMove(event: PointerEvent): void {
        if (!this.activeCanvasInteraction) {
            return;
        }
        const { widgetId, kind, startX, startY, origin, gridCols, canvasWidth, layoutMode } = this.activeCanvasInteraction;
        const colWidth = canvasWidth / gridCols;
        const deltaCol = Math.round((event.clientX - startX) / colWidth);
        const deltaRow = Math.round((event.clientY - startY) / CANVAS_ROW_HEIGHT_PX);
        if (deltaCol !== 0 || deltaRow !== 0) {
            this.canvasInteractionMoved = true;
        }
        let rect = { ...origin };
        if (kind === 'move') {
            rect = { ...origin, col: origin.col + deltaCol, row: origin.row + deltaRow };
        } else {
            rect = {
                ...origin,
                colSpan: origin.colSpan + deltaCol,
                rowSpan: origin.rowSpan + deltaRow,
            };
        }
        this.patchWidgetCanvas(widgetId, clampCanvasRect(rect, gridCols), layoutMode);
    }

    @HostListener('document:pointerup')
    @HostListener('document:pointercancel')
    onCanvasPointerEnd(): void {
        if (this.canvasInteractionMoved) {
            this.suppressWidgetSelectUntil = Date.now() + 300;
        }
        this.activeCanvasInteraction = null;
        this.canvasInteractionMoved = false;
    }

    onWidgetDragEnded(event: CdkDragEnd): void {
        if (Math.hypot(event.distance.x, event.distance.y) > 4) {
            this.suppressWidgetSelectUntil = Date.now() + 300;
        }
    }

    private startCanvasInteraction(
        event: PointerEvent,
        widgetId: DashboardWidgetId,
        container: DashboardContainerConfig,
        kind: 'move' | 'resize'
    ): void {
        const config = this.widgets[widgetId];
        const canvas = (event.currentTarget as HTMLElement).closest('.widget-canvas--freeform') as HTMLElement | null;
        if (!config || !canvas) {
            return;
        }
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        this.activeCanvasInteraction = {
            widgetId,
            containerId: container.id,
            layoutMode: container.layoutMode,
            kind,
            startX: event.clientX,
            startY: event.clientY,
            origin: resolveCanvasRect(config, container.layoutMode),
            gridCols: containerLayoutGridColumns(container.layoutMode),
            canvasWidth: canvas.clientWidth,
        };
    }

    private patchWidgetCanvas(
        widgetId: DashboardWidgetId,
        rect: DashboardWidgetCanvasRect,
        layoutMode: DashboardContainerLayoutMode
    ): void {
        const current = this.widgets[widgetId];
        if (!current) {
            return;
        }
        const widgets = {
            ...this.widgets,
            [widgetId]: normalizeWidgetColumnSpan(
                {
                    ...current,
                    canvasRect: rect,
                    gridColumnSpan: rect.colSpan,
                    gridRowSpan: rect.rowSpan,
                },
                layoutMode
            ),
        };
        this.emitLayout(this.pages, widgets);
    }

    private ensureContainerCanvasRects(): void {
        if (!this.editMode) {
            return;
        }
        let pages = this.pages;
        let widgets = { ...this.widgets };
        let changed = false;

        for (const page of pages) {
            for (const container of page.containers) {
                if (!layoutModeSupportsCanvas(container.layoutMode)) {
                    continue;
                }
                const ids = container.widgetIds;
                if (!ids.length || ids.every((id) => widgets[id]?.canvasRect)) {
                    continue;
                }
                const packed = packContainerCanvas(ids, widgets, container.layoutMode);
                for (const id of ids) {
                    if (widgets[id] && !widgets[id].canvasRect) {
                        widgets[id] = normalizeWidgetColumnSpan(
                            {
                                ...widgets[id],
                                canvasRect: packed[id],
                                gridColumnSpan: packed[id].colSpan,
                                gridRowSpan: packed[id].rowSpan,
                            },
                            container.layoutMode
                        );
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            this.emitLayout(pages, widgets);
        }
    }

    isSelected(widgetId: DashboardWidgetId): boolean {
        return this.selectedWidgetId === widgetId;
    }

    onProcessSelected(item: ProcessAttentionItem): void {
        this.processSelected.emit(item);
    }

    selectWidget(widgetId: DashboardWidgetId, event?: Event): void {
        if (Date.now() < this.suppressWidgetSelectUntil) {
            event?.preventDefault();
            event?.stopPropagation();
            return;
        }
        event?.stopPropagation();
        if (this.editMode) {
            this.widgetSelect.emit(widgetId);
        }
    }

    removeWidget(widgetId: DashboardWidgetId, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.widgetRemove.emit(widgetId);
    }

    onContainerReorderDrop(event: CdkDragDrop<DashboardContainerConfig[]>): void {
        if (!this.editMode || event.previousIndex === event.currentIndex) {
            return;
        }

        const page = this.activePage;
        if (!page) {
            return;
        }

        const pages = this.clonePages();
        const active = pages.find((entry) => entry.id === page.id);
        if (!active) {
            return;
        }

        moveItemInArray(active.containers, event.previousIndex, event.currentIndex);
        this.emitLayout(pages);
    }

    onContainerDragEnded(event: CdkDragEnd): void {
        if (Math.hypot(event.distance.x, event.distance.y) > 4) {
            this.suppressWidgetSelectUntil = Date.now() + 300;
        }
    }

    onContainerDrop(containerId: string, event: CdkDragDrop<DashboardWidgetId[]>): void {
        if (!this.editMode) {
            return;
        }

        const pages = this.clonePages();
        const target = findContainer(pages, containerId);
        if (!target) {
            return;
        }

        const targetList = target.container.widgetIds;

        if (event.previousContainer === event.container) {
            moveItemInArray(targetList, event.previousIndex, event.currentIndex);
            this.emitLayout(pages);
            return;
        }

        const previousId = event.previousContainer.id;
        if (previousId === PALETTE_DROP_ID) {
            return;
        }

        let sourceList: DashboardWidgetId[] | null = null;
        let sourceContainer: DashboardContainerConfig | null = null;
        for (const page of pages) {
            for (const entry of page.containers) {
                if (containerDropId(entry.id) === previousId) {
                    sourceList = entry.widgetIds;
                    sourceContainer = entry;
                    break;
                }
            }
        }

        if (!sourceList || !sourceContainer) {
            return;
        }

        transferArrayItem(sourceList, targetList, event.previousIndex, event.currentIndex);
        const movedId = targetList[event.currentIndex];
        const widgets = {
            ...this.widgets,
            [movedId]: normalizeWidgetColumnSpan(
                {
                    ...this.widgets[movedId],
                    containerId: target.container.id,
                    section: legacySectionForLayoutMode(target.container.layoutMode),
                },
                target.container.layoutMode
            ),
        };
        this.emitLayout(pages, widgets);
    }

    private clonePages(): DashboardPageConfig[] {
        return this.pages.map((page) => ({
            ...page,
            containers: page.containers.map((container) => ({
                ...container,
                widgetIds: [...container.widgetIds],
            })),
        }));
    }

    private emitLayout(
        pages: DashboardPageConfig[],
        widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = this.widgets
    ): void {
        this.layoutChange.emit({
            version: LAYOUT_SCHEMA_VERSION,
            pages,
            activePageId: this.resolvedActivePageId,
            widgets,
            theme: this.theme ?? this.themeService.theme,
            layoutSourceDocumentId: this.layoutSourceDocumentId ?? null,
        });
    }
}

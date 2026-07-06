import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DashboardBuilderPaletteComponent } from '../../dashboard/components/dashboard-builder-palette/dashboard-builder-palette.component';
import { DashboardBuilderThemePanelComponent } from '../../dashboard/components/dashboard-builder-theme-panel/dashboard-builder-theme-panel.component';
import { DashboardBuilderLayoutSourcePanelComponent } from '../../dashboard/components/dashboard-builder-layout-source-panel/dashboard-builder-layout-source-panel.component';
import { DashboardBuilderStructureEditorModalComponent } from '../../dashboard/components/dashboard-builder-structure-editor-modal/dashboard-builder-structure-editor-modal.component';
import { DashboardBuilderWidgetEditorModalComponent } from '../../dashboard/components/dashboard-builder-widget-editor-modal/dashboard-builder-widget-editor-modal.component';
import { DashboardWidgetGridComponent } from '../../dashboard/components/dashboard-widget-grid/dashboard-widget-grid.component';
import {
    DashboardContainerConfig,
    DashboardContainerLayoutMode,
    DashboardLayoutState,
    DashboardPageConfig,
    DashboardThemeConfig,
    DashboardWidgetConfig,
    DashboardWidgetId,
    DashboardWidgetType,
} from '../../dashboard/definitions/dashboard-widget.model';
import { coerceLegacyLocalizedText } from '../../dashboard/mappers/dashboard-widget-text';
import { syncLegacyChartFromBindings, mergeBindingsPatch } from '../../dashboard/mappers/dashboard-widget-bindings.mapper';
import { DashboardLayoutService, DashboardLayoutDocumentInfo } from '../../dashboard/services/dashboard-layout.service';
import { DashboardThemeService } from '../../dashboard/services/dashboard-theme.service';
import {
    collectContainerDropIds,
    findContainer,
    collectWidgetIdsFromPage,
    removeContainerFromPages,
    removePageFromPages,
    removeWidgetFromPages,
    removeWidgetsFromRecord,
    resolveActiveContainerId,
    resolveActivePageId,
    resolveContainerLayoutMode,
} from '../../dashboard/utils/dashboard-layout-structure.util';
import { mergeSeriesStyle, resolveTheme } from '../../dashboard/utils/dashboard-theme.util';

@Component({
    selector: 'medical-records-dashboard-builder-shell',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        DashboardBuilderThemePanelComponent,
        DashboardBuilderLayoutSourcePanelComponent,
        DashboardBuilderPaletteComponent,
        DashboardWidgetGridComponent,
        DashboardBuilderWidgetEditorModalComponent,
        DashboardBuilderStructureEditorModalComponent,
    ],
    templateUrl: './dashboard-builder-shell.component.html',
    styleUrls: ['./dashboard-builder-shell.component.scss'],
})
export class DashboardBuilderShellComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild(DashboardBuilderLayoutSourcePanelComponent)
    layoutSourcePanel?: DashboardBuilderLayoutSourcePanelComponent;

    layout: DashboardLayoutState;
    layoutLoading = true;
    layoutSaving = false;
    layoutCopying = false;
    layoutLoadSource: 'repo' | 'default' = 'default';
    activeLayoutDocument: DashboardLayoutDocumentInfo | null = null;
    selectedWidgetId: DashboardWidgetId | null = null;
    selectedContainerId: string | null = null;
    selectedPageId: string | null = null;
    editorModalOpen = false;
    structureModalOpen = false;
    structureModalMode: 'tab' | 'container' = 'tab';
    savedMessage = '';
    savedMessageParams: Record<string, string> = {};
    activeContainerId = '';
    paletteDockStyle: Record<string, string> = {};
    builderStyle: Record<string, string> = {};

    readonly containerLayoutModes: DashboardContainerLayoutMode[] = ['kpi-strip', 'grid-12', 'grid-4', 'list'];

    private scrollParent: HTMLElement | null = null;
    private dockResizeObserver?: ResizeObserver;
    private langChangeSub?: Subscription;
    private readonly syncPaletteDockPosition = (): void => {
        const builder = this.hostRef.nativeElement.querySelector('.dashboard-builder') as HTMLElement | null;
        if (!builder) {
            return;
        }

        const dock = builder.querySelector('.dashboard-builder__palette-dock') as HTMLElement | null;
        const rect = builder.getBoundingClientRect();
        const bottomOffset = window.innerWidth <= 960 ? 12 : 16;
        const dockHeight = dock?.offsetHeight ?? 0;
        const reservedBottom = dockHeight + bottomOffset + 20;

        this.ngZone.run(() => {
            this.paletteDockStyle = {
                left: `${Math.max(rect.left, 0)}px`,
                width: `${Math.max(rect.width, 0)}px`,
                bottom: `${bottomOffset}px`,
            };
            this.builderStyle = {
                paddingBottom: `${Math.max(reservedBottom, 112)}px`,
            };
            this.cdr.markForCheck();
        });
    };

    constructor(
        private readonly layoutService: DashboardLayoutService,
        private readonly translate: TranslateService,
        private readonly themeService: DashboardThemeService,
        private readonly hostRef: ElementRef<HTMLElement>,
        private readonly ngZone: NgZone,
        private readonly cdr: ChangeDetectorRef
    ) {
        this.layout = this.layoutService.getLayout();
        this.selectedPageId = resolveActivePageId(this.layout.pages, this.layout.activePageId);
        this.syncActiveContainer();
    }

    ngOnInit(): void {
        this.langChangeSub = this.translate.onLangChange.subscribe(() => {
            setTimeout(() => this.syncPaletteDockPosition(), 0);
        });

        this.layoutService.reloadLayout().subscribe({
            next: (layout) => {
                this.layout = layout;
                this.layoutLoadSource = this.layoutService.getLayoutLoadSource();
                this.activeLayoutDocument = this.layoutService.getActiveLayoutDocumentInfo();
                this.selectedPageId = resolveActivePageId(layout.pages, layout.activePageId);
                this.syncActiveContainer();
                this.applyTheme();
                this.layoutLoading = false;
            },
            error: () => {
                this.layout = this.layoutService.getLayout();
                this.layoutLoadSource = 'default';
                this.activeLayoutDocument = this.layoutService.getActiveLayoutDocumentInfo();
                this.layoutLoading = false;
                this.applyTheme();
            },
        });
    }

    onLayoutDocumentApply(documentId: string): void {
        this.layoutLoading = true;
        this.savedMessage = '';
        this.layoutService.reloadLayout(documentId).subscribe({
            next: (layout) => {
                this.layout = layout;
                this.layoutLoadSource = this.layoutService.getLayoutLoadSource();
                this.activeLayoutDocument = this.layoutService.getActiveLayoutDocumentInfo();
                this.selectedPageId = resolveActivePageId(layout.pages, layout.activePageId);
                this.syncActiveContainer();
                this.applyTheme();
                this.layoutLoading = false;
                this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.LAYOUT_SOURCE.RELOAD_DONE';
            },
            error: () => {
                this.layoutLoading = false;
                this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.LAYOUT_SOURCE.RELOAD_ERROR';
            },
        });
    }

    onLayoutDocumentsRefresh(): void {
        this.activeLayoutDocument = this.layoutService.getActiveLayoutDocumentInfo();
    }

    onLayoutDocumentCopy(): void {
        if (this.layoutCopying || this.layoutLoading || this.layoutSaving) {
            return;
        }

        const sourceDocumentId =
            this.layoutService.getSaveTargetDocumentId() ??
            this.layoutService.getPreferredLayoutDocumentId();
        const fileName = this.layoutService.getLayoutSaveFileName();

        if (!sourceDocumentId || !fileName.trim()) {
            this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.LAYOUT_SOURCE.COPY_ERROR';
            this.savedMessageParams = {};
            return;
        }

        this.layoutCopying = true;
        this.savedMessage = '';
        this.savedMessageParams = {};
        void this.layoutService
            .copyLayoutDocument(sourceDocumentId, fileName)
            .then((layout) => {
                this.layout = layout;
                this.layoutLoadSource = 'repo';
                this.activeLayoutDocument = this.layoutService.getActiveLayoutDocumentInfo();
                this.selectedPageId = resolveActivePageId(layout.pages, layout.activePageId);
                this.syncActiveContainer();
                this.applyTheme();
                this.savedMessageParams = {
                    fileName: this.activeLayoutDocument?.title ?? fileName,
                };
                this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.LAYOUT_SOURCE.COPY_DONE';
                void this.layoutSourcePanel?.loadDocuments();
            })
            .catch((error: Error) => {
                const code = error?.message ?? '';
                if (code === 'dashboard-layout-copy-same-name') {
                    this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.LAYOUT_SOURCE.COPY_ERROR_SAME_NAME';
                } else if (code === 'dashboard-layout-copy-duplicate-name') {
                    this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.LAYOUT_SOURCE.COPY_ERROR_DUPLICATE';
                } else {
                    this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.LAYOUT_SOURCE.COPY_ERROR';
                }
                this.savedMessageParams = {};
            })
            .finally(() => {
                this.layoutCopying = false;
            });
    }

    ngAfterViewInit(): void {
        this.scrollParent = this.hostRef.nativeElement.closest('.medical-records-experience');
        this.syncPaletteDockPosition();

        window.addEventListener('resize', this.syncPaletteDockPosition, { passive: true });
        this.scrollParent?.addEventListener('scroll', this.syncPaletteDockPosition, { passive: true });

        if (typeof ResizeObserver !== 'undefined') {
            const builder = this.hostRef.nativeElement.querySelector('.dashboard-builder');
            const dock = this.hostRef.nativeElement.querySelector('.dashboard-builder__palette-dock');
            if (builder) {
                this.dockResizeObserver = new ResizeObserver(this.syncPaletteDockPosition);
                this.dockResizeObserver.observe(builder);
                if (dock) {
                    this.dockResizeObserver.observe(dock);
                }
            }
        }
    }

    ngOnDestroy(): void {
        this.langChangeSub?.unsubscribe();
        window.removeEventListener('resize', this.syncPaletteDockPosition);
        this.scrollParent?.removeEventListener('scroll', this.syncPaletteDockPosition);
        this.dockResizeObserver?.disconnect();
    }

    get theme(): DashboardThemeConfig {
        return this.layout.theme ?? resolveTheme();
    }

    get sectionDropIds(): string[] {
        return collectContainerDropIds(this.layout.pages);
    }

    get activePageId(): string {
        return resolveActivePageId(this.layout.pages, this.layout.activePageId);
    }

    get activeTabLabel(): string {
        return this.layout.pages.find((page) => page.id === this.activePageId)?.label ?? '';
    }

    get activeSectionTitle(): string {
        return findContainer(this.layout.pages, this.activeContainerId)?.container.title ?? '';
    }

    get selectedWidget(): DashboardWidgetConfig | null {
        if (!this.selectedWidgetId) {
            return null;
        }
        return this.layout.widgets[this.selectedWidgetId] ?? null;
    }

    get selectedContainer(): DashboardContainerConfig | null {
        if (!this.selectedContainerId) {
            return null;
        }
        return findContainer(this.layout.pages, this.selectedContainerId)?.container ?? null;
    }

    get selectedPage(): DashboardPageConfig | null {
        if (!this.selectedPageId) {
            return null;
        }
        return this.layout.pages.find((page) => page.id === this.selectedPageId) ?? null;
    }

    get selectedWidgetContainerLayoutMode(): DashboardContainerLayoutMode | undefined {
        const widget = this.selectedWidget;
        if (!widget) {
            return undefined;
        }
        return resolveContainerLayoutMode(widget, this.layout.pages);
    }

    onLayoutChange(layout: DashboardLayoutState): void {
        this.layout = {
            ...layout,
            theme: layout.theme ?? this.layout.theme,
            layoutSourceDocumentId: layout.layoutSourceDocumentId ?? this.layout.layoutSourceDocumentId ?? null,
        };
        this.applyTheme();
        this.savedMessage = '';
        queueMicrotask(() => this.syncPaletteDockPosition());
    }

    onActivePageChange(pageId: string): void {
        this.layout = { ...this.layout, activePageId: pageId };
        this.selectedPageId = pageId;
        this.selectedContainerId = null;
        this.structureModalOpen = false;
        this.syncActiveContainer();
        this.savedMessage = '';
    }

    onPageSelect(pageId: string): void {
        this.selectedPageId = pageId;
        this.selectedContainerId = null;
        this.selectedWidgetId = null;
        this.editorModalOpen = false;
        this.structureModalMode = 'tab';
        this.structureModalOpen = true;
        if (pageId !== this.activePageId) {
            this.layout = { ...this.layout, activePageId: pageId };
            this.syncActiveContainer();
        }
        this.savedMessage = '';
    }

    onContainerSelect(containerId: string): void {
        this.selectedContainerId = containerId;
        this.selectedPageId = null;
        this.activeContainerId = containerId;
        this.selectedWidgetId = null;
        this.editorModalOpen = false;
        this.structureModalMode = 'container';
        this.structureModalOpen = true;
    }

    onContainerActivate(containerId: string): void {
        this.activeContainerId = containerId;
        this.savedMessage = '';
    }

    closeStructureModal(): void {
        this.structureModalOpen = false;
    }

    onThemeChange(patch: Partial<DashboardThemeConfig>): void {
        const current = this.theme;
        const merged = resolveTheme({
            ...current,
            ...patch,
            brand: { ...current.brand, ...patch.brand },
            defaultSeriesStyle: patch.defaultSeriesStyle
                ? mergeSeriesStyle(current.defaultSeriesStyle, patch.defaultSeriesStyle)
                : current.defaultSeriesStyle,
            statusColors: { ...current.statusColors, ...patch.statusColors },
        });
        this.layout = { ...this.layout, theme: merged };
        this.applyTheme();
        this.savedMessage = '';
    }

    private applyTheme(): void {
        this.themeService.setThemeFromLayout(this.layout);
        this.themeService.applyToHost(this.hostRef.nativeElement);
    }

    onWidgetSelect(widgetId: DashboardWidgetId): void {
        this.selectedWidgetId = widgetId;
        this.selectedContainerId = null;
        this.selectedPageId = null;
        this.structureModalOpen = false;
        this.editorModalOpen = true;
        const widget = this.layout.widgets[widgetId];
        if (widget?.containerId) {
            this.activeContainerId = widget.containerId;
        }
        this.hydrateTextFieldsFromLegacy();
    }

    closeEditorModal(): void {
        this.editorModalOpen = false;
    }

    onWidgetRemove(widgetId: DashboardWidgetId): void {
        const widgets = { ...this.layout.widgets };
        delete widgets[widgetId];
        const pages = removeWidgetFromPages(this.layout.pages, widgetId);
        this.layout = { ...this.layout, pages, widgets };
        if (this.selectedWidgetId === widgetId) {
            this.selectedWidgetId = null;
            this.editorModalOpen = false;
        }
    }

    addWidget(event: { type: DashboardWidgetType; preset?: 'outcome-distribution' }): void {
        const containerId = this.activeContainerId;
        const container = findContainer(this.layout.pages, containerId)?.container;
        if (!container) {
            return;
        }

        const widget =
            event.preset === 'outcome-distribution'
                ? this.layoutService.createOutcomeDistributionWidget(container.id, container.layoutMode)
                : this.layoutService.createWidget(event.type, container.id, container.layoutMode);

        const widgets = { ...this.layout.widgets, [widget.id]: widget };
        const pages = this.layout.pages.map((page) => ({
            ...page,
            containers: page.containers.map((entry) =>
                entry.id === container.id ? { ...entry, widgetIds: [...entry.widgetIds, widget.id] } : entry
            ),
        }));

        this.layout = { ...this.layout, pages, widgets };
        this.onWidgetSelect(widget.id);
        this.savedMessage = '';
    }

    addPage(): void {
        const page = this.layoutService.createPage();
        this.layout = {
            ...this.layout,
            pages: [...this.layout.pages, page],
            activePageId: page.id,
        };
        this.selectedPageId = page.id;
        this.activeContainerId = page.containers[0]?.id ?? '';
        this.selectedContainerId = null;
        this.savedMessage = '';
    }

    addContainer(): void {
        const pageId = this.activePageId;
        const container = this.layoutService.createContainer('grid-12');
        const pages = this.layout.pages.map((page) =>
            page.id === pageId ? { ...page, containers: [...page.containers, container] } : page
        );
        this.layout = { ...this.layout, pages };
        this.activeContainerId = container.id;
        this.selectedContainerId = container.id;
        this.selectedPageId = null;
        this.structureModalMode = 'container';
        this.structureModalOpen = true;
        this.savedMessage = '';
    }

    removePage(pageId: string): void {
        if (this.layout.pages.length <= 1) {
            return;
        }
        const page = this.layout.pages.find((entry) => entry.id === pageId);
        if (!page) {
            return;
        }

        const removedWidgetIds = collectWidgetIdsFromPage(page);
        const pages = removePageFromPages(this.layout.pages, pageId);
        const widgets = removeWidgetsFromRecord(this.layout.widgets, removedWidgetIds);
        const activePageId = resolveActivePageId(
            pages,
            this.layout.activePageId === pageId ? pages[0]?.id : this.layout.activePageId
        );

        this.layout = { ...this.layout, pages, widgets, activePageId };
        this.clearSelectionAfterStructureRemoval(pageId, removedWidgetIds, page.containers.map((entry) => entry.id));
        this.syncActiveContainer();
        this.savedMessage = '';
    }

    removeContainer(containerId: string): void {
        const located = findContainer(this.layout.pages, containerId);
        if (!located || located.page.containers.length <= 1) {
            return;
        }

        const removedWidgetIds = [...located.container.widgetIds];
        const pages = removeContainerFromPages(this.layout.pages, containerId);
        const widgets = removeWidgetsFromRecord(this.layout.widgets, removedWidgetIds);

        this.layout = { ...this.layout, pages, widgets };
        this.clearSelectionAfterStructureRemoval(located.page.id, removedWidgetIds, [containerId]);
        this.syncActiveContainer();
        this.savedMessage = '';
    }

    private clearSelectionAfterStructureRemoval(
        pageId: string,
        removedWidgetIds: DashboardWidgetId[],
        removedContainerIds: string[]
    ): void {
        if (this.selectedPageId === pageId && !this.layout.pages.some((page) => page.id === pageId)) {
            this.selectedPageId = null;
            this.structureModalOpen = false;
        }
        if (this.selectedContainerId && removedContainerIds.includes(this.selectedContainerId)) {
            this.selectedContainerId = null;
            this.structureModalOpen = false;
        }
        if (this.selectedWidgetId && removedWidgetIds.includes(this.selectedWidgetId)) {
            this.selectedWidgetId = null;
            this.editorModalOpen = false;
        }
    }

    updateSelectedPage(patch: Partial<DashboardPageConfig>): void {
        if (!this.selectedPageId) {
            return;
        }
        const pages = this.layout.pages.map((page) =>
            page.id === this.selectedPageId ? { ...page, ...patch } : page
        );
        this.layout = { ...this.layout, pages };
        this.savedMessage = '';
    }

    updateSelectedContainer(patch: Partial<DashboardContainerConfig>): void {
        if (!this.selectedContainerId) {
            return;
        }
        const pages = this.layout.pages.map((page) => ({
            ...page,
            containers: page.containers.map((container) =>
                container.id === this.selectedContainerId ? { ...container, ...patch } : container
            ),
        }));
        this.layout = { ...this.layout, pages };
        this.savedMessage = '';
    }

    saveLayout(): void {
        if (this.layoutSaving) {
            return;
        }

        this.layoutSaving = true;
        this.savedMessage = '';
        this.savedMessageParams = {};
        void this.layoutService
            .saveLayoutToRepository(this.layout, {
                fileName: this.layoutService.getLayoutSaveFileName(),
                saveAsNew: this.layoutService.getLayoutSaveAsNew(),
            })
            .then((saved) => {
                this.layout = saved;
                this.layoutLoadSource = 'repo';
                this.activeLayoutDocument = this.layoutService.getActiveLayoutDocumentInfo();
                this.savedMessageParams = {
                    fileName: this.activeLayoutDocument?.title ?? this.layoutService.getLayoutSaveFileName(),
                };
                this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SAVE_DONE_REPO';
                void this.layoutSourcePanel?.loadDocuments();
            })
            .catch(() => {
                this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SAVE_ERROR_REPO';
            })
            .finally(() => {
                this.layoutSaving = false;
            });
    }

    resetLayoutDemo(): void {
        this.layout = this.layoutService.resetLayout();
        this.selectedWidgetId = null;
        this.selectedContainerId = null;
        this.selectedPageId = resolveActivePageId(this.layout.pages, this.layout.activePageId);
        this.editorModalOpen = false;
        this.structureModalOpen = false;
        this.syncActiveContainer();
        this.savedMessage = 'MEDICAL_RECORDS.DASHBOARD_BUILDER.RESET_DONE';
    }

    updateSelectedWidget(patch: Partial<DashboardWidgetConfig>): void {
        if (!this.selectedWidgetId) {
            return;
        }

        const current = this.layout.widgets[this.selectedWidgetId];
        const merged = syncLegacyChartFromBindings({
            ...current,
            ...patch,
            processQuery: patch.processQuery ? { ...current.processQuery, ...patch.processQuery } : current.processQuery,
            tableOptions: patch.tableOptions ? { ...current.tableOptions, ...patch.tableOptions } : current.tableOptions,
            bindings: patch.bindings ? mergeBindingsPatch(current.bindings, patch.bindings) : current.bindings,
        });

        if (patch.dataSource === 'process') {
            merged.contentQuery = undefined;
            if (!merged.processQuery) {
                merged.processQuery = {
                    processDefinitionKey: 'medical-records',
                    includeSubprocesses: true,
                    metricScope: merged.type === 'table' ? 'tree' : 'root',
                    status: ['RUNNING', 'COMPLETED', 'SUSPENDED'],
                };
            }
        }

        if (patch.dataSource === 'content') {
            merged.processQuery = undefined;
        }

        if (patch.dataSource === 'demo') {
            merged.processQuery = undefined;
            merged.contentQuery = undefined;
        }

        const layoutMode = resolveContainerLayoutMode(current, this.layout.pages);
        const widgets = {
            ...this.layout.widgets,
            [this.selectedWidgetId]: this.layoutService.normalizeWidgetForLayout(merged, layoutMode),
        };

        this.layout = { ...this.layout, widgets, theme: this.layout.theme };
        this.savedMessage = '';
    }

    private hydrateTextFieldsFromLegacy(): void {
        const widget = this.selectedWidget;
        if (!widget) {
            return;
        }

        const raw = widget as DashboardWidgetConfig & { titles?: unknown; helpers?: unknown };
        const patch: Partial<DashboardWidgetConfig> = {};

        if (!widget.title) {
            const fromLegacyObject = coerceLegacyLocalizedText(raw.titles);
            if (fromLegacyObject) {
                patch.title = fromLegacyObject;
            } else if (widget.titleKey) {
                patch.title = this.translate.instant(widget.titleKey);
            }
        }

        if (!widget.helper) {
            const fromLegacyObject = coerceLegacyLocalizedText(raw.helpers);
            if (fromLegacyObject) {
                patch.helper = fromLegacyObject;
            } else if (widget.helperKey) {
                patch.helper = this.translate.instant(widget.helperKey);
            }
        }

        if (Object.keys(patch).length) {
            this.updateSelectedWidget(patch);
        }
    }

    private syncActiveContainer(): void {
        this.activeContainerId = resolveActiveContainerId(
            this.layout.pages,
            this.activePageId,
            this.activeContainerId || this.selectedContainerId || undefined
        );
    }

    containerLayoutModeLabel(mode: DashboardContainerLayoutMode): string {
        const key = mode.toUpperCase().replace(/-/g, '_');
        return `MEDICAL_RECORDS.DASHBOARD_BUILDER.CONTAINER_MODE_${key}`;
    }
}

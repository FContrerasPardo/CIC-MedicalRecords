import { inject, Injectable } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { BehaviorSubject, debounceTime, distinctUntilChanged, from, Observable } from 'rxjs';

import {

    DEFAULT_PROCESS_LIST_OPTIONS,

    DashboardContainerLayoutMode,

    DashboardLayoutState,

    DashboardWidgetConfig,

    DashboardWidgetId,

    DashboardWidgetCanvasRect,

    DashboardWidgetType,

} from '../definitions/dashboard-widget.model';

import { coerceLegacyLocalizedText } from '../mappers/dashboard-widget-text';
import { chartConfigToBindings, syncLegacyChartFromBindings } from '../mappers/dashboard-widget-bindings.mapper';
import { findProcessCatalogEntry } from '../definitions/dashboard-process-catalog';
import { defaultGridColumnSpan, normalizeWidgetColumnSpan } from '../utils/dashboard-widget-span.util';
import { DEFAULT_DEMO_CANVAS_LAYOUT } from '../utils/dashboard-widget-canvas.util';
import {
    assignContainerIdsToWidgets,
    buildDefaultDemoPages,
    consolidateOverviewDocumentContainer,
    createId,
    legacySectionForLayoutMode,
    LAYOUT_SCHEMA_VERSION,
    migrateLayoutV8ToV9,
    migrateLegacyLayoutToPages,
    resolveActivePageId,
} from '../utils/dashboard-layout-structure.util';
import { DEFAULT_DASHBOARD_THEME, resolveTheme } from '../utils/dashboard-theme.util';
import {
    HXP_DOCUMENTS_CLASSIFIED_QUERY,
    normalizeContentBindingField,
    normalizeContentColumnFields,
    shouldUpgradeToClassifiedContentQuery,
} from '../utils/dashboard-content-fields.util';
import { DashboardLayoutRepositoryService } from './dashboard-layout-repository.service';
import type { DashboardLayoutDocumentRef, DashboardLayoutFolderListing } from './dashboard-layout-repository.service';
import {
    DEFAULT_LAYOUT_FILE_NAME,
    normalizeLayoutFileName,
} from '../mappers/dashboard-layout-document.mapper';
import { DashboardPeriodService } from './dashboard-period.service';
import { resolveLayoutDocumentId } from '../config/dashboard-layout-storage.config';
import {
    dashboardDateRangeKey,
    defaultDashboardDateRangePreference,
} from '../utils/dashboard-date-range.util';

export type DashboardLayoutLoadSource = 'repo' | 'default';

export interface DashboardLayoutDocumentInfo {
    id: string | null;
    title: string | null;
    savedAt?: string | null;
    folderId?: string | null;
    loadSource: DashboardLayoutLoadSource;
    preferredDocumentId?: string | null;
}

export interface DashboardLayoutSaveOptions {
    fileName?: string;
    saveAsNew?: boolean;
}

interface StoredWidgetGeometry {
    canvasRect?: DashboardWidgetCanvasRect;
    gridRowSpan?: number;
    gridColumnSpan?: number;
    cardHeightPx?: number;
    span?: DashboardWidgetConfig['span'];
}

const CLASSIFIED_CONTENT_WIDGET_IDS = new Set([
    'metric-content-total',
    'metric-content-recent',
    'chart-content-doc-types',
    'chart-content-uploads',
    'documents-report',
]);



const STORAGE_KEY = 'medical-records.dashboard.layout.v9';

const LEGACY_STORAGE_KEY = 'medical-records.dashboard.layout.v8';

const PREFERRED_LAYOUT_DOCUMENT_KEY = 'medical-records.dashboard.layout.documentId';



const DEFAULT_WIDGETS: Record<DashboardWidgetId, DashboardWidgetConfig> = {

    'recovery-rate': {

        id: 'recovery-rate',

        type: 'gauge',

        section: 'insights',

        dataSource: 'demo',

        title: 'Total Recovery Rate',

        helper: 'Demo — projected payer recovery rate.',

        helperTooltip: 'Demo value only. Not connected to live repository or process data.',

        trendDirection: 'up',

        trendValue: '2.1%',

        trendLabel: 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_MONTH',

        comparisonPeriod: 'none',

        positive: true,

        icon: 'trending_up',

        demoValue: '87.4',

        gaugeMin: 0,

        gaugeMax: 100,

        gaugeTarget: 90,

        gaugeUnit: '%',

        span: 'normal',

    },

    'productivity-chart': {

        id: 'productivity-chart',

        type: 'chart',

        section: 'insights',

        dataSource: 'process',

        title: 'Productivity by Hour',

        helper: 'Daily processing volume',

        span: 'full',

        processQuery: {
            processDefinitionKey: 'medical-records',
            includeSubprocesses: true,
            metricScope: 'tree',
            status: ['RUNNING', 'COMPLETED', 'SUSPENDED'],
        },

        bindings: {
            argumentField: 'startDate',
            valueAggregation: 'count',
            dateBucket: 'day',
            maxBuckets: 12,
        },

        chart: { xField: 'startDate', yAggregation: 'count', dateBucket: 'day', maxBuckets: 12 },

        chartDisplayMode: 'line',

        chartHeadline: { show: true, label: 'Peak day', aggregation: 'max' },

        chartAxes: { xLabelFormat: 'auto' },

    },

    'completion-rate': {

        id: 'completion-rate',

        type: 'gauge',

        section: 'insights',

        dataSource: 'process',

        title: 'Process Completion',

        helper: 'Completed share of active process instances.',

        icon: 'speed',

        gaugeMin: 0,

        gaugeMax: 100,

        gaugeTarget: 90,

        gaugeUnit: '%',

        gaugeMode: 'ratio',

        processQuery: {
            processDefinitionKey: 'medical-records',
            includeSubprocesses: true,
            metricScope: 'tree',
            status: ['RUNNING', 'COMPLETED', 'SUSPENDED'],
        },

        span: 'normal',

    },

    'document-volume': {

        id: 'document-volume',

        type: 'metric',

        section: 'insights',

        dataSource: 'content',

        title: 'Repository Documents',

        helper: 'Live count from native Content query',

        helperTooltip: 'Total documents returned by the configured Content query.',

        trendDirection: 'up',

        trendValue: '1.8%',

        trendLabel: 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_WEEK',

        comparisonPeriod: 'previous_week',

        positive: true,

        icon: 'folder_copy',

        contentQuery: 'SELECT * FROM hxp:document',

        span: 'normal',

    },

    'outcome-distribution': {
        id: 'outcome-distribution',
        type: 'chart',
        section: 'insights',
        dataSource: 'process',
        title: 'Outcome Distribution',
        helper: 'Process instances grouped by status',

        span: 'wide',

        processQuery: {
            processDefinitionKey: 'medical-records',
            includeSubprocesses: true,
            metricScope: 'tree',
            status: ['RUNNING', 'COMPLETED', 'SUSPENDED'],
        },
        bindings: {
            argumentField: 'processDefinitionName',
            valueAggregation: 'count',
            seriesField: 'status',
            maxBuckets: 8,
        },
        chart: { xField: 'processDefinitionName', yAggregation: 'count', maxBuckets: 8 },
        chartDisplayMode: 'horizontal-stacked',
        chartAxes: { xLabelFormat: 'auto' },
    },

    'documents-report': {
        id: 'documents-report',
        type: 'table',
        section: 'insights',
        dataSource: 'content',
        title: 'Document Repository',
        helper: 'Recent repository documents — filter rows or export to CSV.',
        contentQuery: HXP_DOCUMENTS_CLASSIFIED_QUERY,
        bindings: {
            columnFields: ['sys_id', 'sys_title', 'sys_primaryType', 'sys_created'],
        },
        tableColumnKeys: 'sys_id, sys_title, sys_primaryType, sys_created',
        tablePageSize: 15,
        tableOptions: { showRowFilter: true },
        span: 'full',
        gridColumnSpan: 12,
    },

    'metric-content-total': {
        id: 'metric-content-total',
        type: 'metric',
        section: 'metrics',
        dataSource: 'content',
        title: 'Total Documents',
        helper: 'All documents in the repository.',
        helperTooltip: 'Live count from the Content query.',
        comparisonPeriod: 'previous_week',
        positive: true,
        icon: 'inventory_2',
        contentQuery: HXP_DOCUMENTS_CLASSIFIED_QUERY,
        span: 'metric',
    },

    'metric-content-recent': {
        id: 'metric-content-recent',
        type: 'metric',
        section: 'metrics',
        dataSource: 'content',
        title: 'Added This Period',
        helper: 'Documents created in the selected period.',
        comparisonPeriod: 'previous_week',
        positive: true,
        icon: 'upload_file',
        contentQuery: HXP_DOCUMENTS_CLASSIFIED_QUERY,
        span: 'metric',
    },

    'chart-content-doc-types': {
        id: 'chart-content-doc-types',
        type: 'chart',
        section: 'insights',
        dataSource: 'content',
        title: 'Documents by Type',
        helper: 'Grouped by sys_primaryType',
        contentQuery: HXP_DOCUMENTS_CLASSIFIED_QUERY,
        bindings: {
            argumentField: 'sys_primaryType',
            valueAggregation: 'count',
            maxBuckets: 8,
        },
        chart: { xField: 'sys_primaryType', yAggregation: 'count', maxBuckets: 8 },
        chartDisplayMode: 'donut',
        gridColumnSpan: 2,
        gridRowSpan: 6,
        span: 'wide',
    },

    'chart-content-uploads': {
        id: 'chart-content-uploads',
        type: 'chart',
        section: 'insights',
        dataSource: 'content',
        title: 'Upload Trend',
        helper: 'Documents added per day',
        contentQuery: HXP_DOCUMENTS_CLASSIFIED_QUERY,
        bindings: {
            argumentField: 'sys_created',
            valueAggregation: 'count',
            dateBucket: 'day',
            maxBuckets: 12,
        },
        chart: { xField: 'sys_created', yAggregation: 'count', dateBucket: 'day', maxBuckets: 12 },
        chartDisplayMode: 'line',
        chartHeadline: { show: false, label: 'Peak day', aggregation: 'max' },
        span: 'wide',
        gridColumnSpan: 4,
        gridRowSpan: 5,
        canvasRect: { col: 1, row: 7, colSpan: 4, rowSpan: 5 },
    },

    'metric-total-processes': {

        id: 'metric-total-processes',

        type: 'metric',

        section: 'metrics',

        dataSource: 'process',

        title: 'Total Processes',

        helper: 'All medical-records instances in the selected period.',

        helperTooltip: 'Live count from the configured process query.',

        trendDirection: 'up',

        trendLabel: 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_WEEK',

        comparisonPeriod: 'previous_week',

        positive: true,

        icon: 'account_tree',

        processQuery: {
            processDefinitionKey: 'medical-records',
            includeSubprocesses: true,
            metricScope: 'tree',
            status: ['RUNNING', 'COMPLETED', 'SUSPENDED'],
        },

        span: 'metric',

    },

    'metric-completed': {

        id: 'metric-completed',

        type: 'metric',

        section: 'metrics',

        dataSource: 'process',

        title: 'Completed',

        helper: 'Completed medical-records process instances.',

        helperTooltip: 'Live count from Automate for COMPLETED status.',

        trendLabel: 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_WEEK',

        comparisonPeriod: 'previous_week',

        positive: true,

        icon: 'task_alt',

        processQuery: {
            processDefinitionKey: 'medical-records',
            includeSubprocesses: true,
            metricScope: 'tree',
            status: ['COMPLETED'],
        },

        span: 'metric',

    },

    'metric-pending': {

        id: 'metric-pending',

        type: 'metric',

        section: 'metrics',

        dataSource: 'process',

        title: 'Pending',

        helper: 'Running or suspended process instances.',

        helperTooltip: 'Live count from Automate for RUNNING and SUSPENDED status.',

        trendLabel: 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_WEEK',

        comparisonPeriod: 'previous_week',

        positive: false,

        icon: 'pending_actions',

        processQuery: {
            processDefinitionKey: 'medical-records',
            includeSubprocesses: true,
            metricScope: 'tree',
            status: ['RUNNING', 'SUSPENDED'],
        },

        span: 'metric',

    },

    'metric-error-rate': {

        id: 'metric-error-rate',

        type: 'metric',

        section: 'metrics',

        dataSource: 'process',

        title: 'Cancelled Processes',

        helper: 'Cancelled medical-records process instances.',

        helperTooltip: 'Live count from Automate for CANCELLED status.',

        trendLabel: 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_WEEK',

        comparisonPeriod: 'previous_week',

        positive: false,

        icon: 'cancel',

        processQuery: {
            processDefinitionKey: 'medical-records',
            includeSubprocesses: true,
            metricScope: 'tree',
            status: ['CANCELLED'],
        },

        span: 'metric',

    },

    'metric-user-activity': {

        id: 'metric-user-activity',

        type: 'metric',

        section: 'metrics',

        dataSource: 'demo',

        title: 'User Activity',

        helper: 'Demo — pending real query',

        helperTooltip: 'Demo value only. Not connected to live data.',

        comparisonPeriod: 'none',

        demoValue: '8,950',

        positive: true,

        span: 'metric',

    },

    'metric-sla-compliance': {

        id: 'metric-sla-compliance',

        type: 'metric',

        section: 'metrics',

        dataSource: 'demo',

        title: 'SLA Compliance',

        helper: 'Demo — pending real query',

        helperTooltip: 'Demo value only. Not connected to live data.',

        comparisonPeriod: 'none',

        demoValue: '92%',

        positive: true,

        span: 'metric',

    },

    'metric-avg-days-payment': {

        id: 'metric-avg-days-payment',

        type: 'metric',

        section: 'metrics',

        dataSource: 'demo',

        title: 'Avg Days to Pmt',

        helper: 'Demo — pending real query',

        helperTooltip: 'Demo value only. Not connected to live data.',

        comparisonPeriod: 'none',

        demoValue: '42',

        positive: true,

        span: 'metric',

    },

    'metric-execution-queue': {

        id: 'metric-execution-queue',

        type: 'metric',

        section: 'metrics',

        dataSource: 'demo',

        title: 'Execution Queue',

        helper: 'Demo — pending real query',

        helperTooltip: 'Demo value only. Not connected to live data.',

        comparisonPeriod: 'none',

        demoValue: '120',

        positive: true,

        span: 'metric',

    },

    'process-list': {

        id: 'process-list',

        type: 'process-list',

        section: 'tasks',

        title: 'Open Tasks',

        helper: 'Tasks assigned to you or ready to claim across medical-records workflows.',

        processListOptions: { ...DEFAULT_PROCESS_LIST_OPTIONS },

        span: 'full',

    },

};



@Injectable({ providedIn: 'root' })

export class DashboardLayoutService {

    private readonly repository = inject(DashboardLayoutRepositoryService);

    private readonly periodService = inject(DashboardPeriodService);

    private readonly appConfigService = inject(AppConfigService);

    private cachedLayout: DashboardLayoutState | null = null;

    private suppressDateRangeAutoPersist = false;

    private layoutLoadSource: DashboardLayoutLoadSource = 'default';

    private initPromise: Promise<DashboardLayoutState> | null = null;

    private activeLayoutDocument: DashboardLayoutDocumentInfo = {
        id: null,
        title: null,
        savedAt: null,
        folderId: null,
        loadSource: 'default',
        preferredDocumentId: null,
    };

    readonly layoutLoadSource$ = new BehaviorSubject<DashboardLayoutLoadSource>('default');

    readonly activeLayoutDocument$ = new BehaviorSubject<DashboardLayoutDocumentInfo>(this.activeLayoutDocument);

    private layoutSaveFileName = DEFAULT_LAYOUT_FILE_NAME;

    private layoutSaveAsNew = false;

    private saveTargetDocumentId: string | null = null;

    constructor() {
        this.periodService.dateRange$
            .pipe(
                debounceTime(1500),
                distinctUntilChanged(
                    (previous, next) => dashboardDateRangeKey(previous) === dashboardDateRangeKey(next)
                )
            )
            .subscribe(() => {
                if (this.suppressDateRangeAutoPersist || !this.cachedLayout?.layoutSourceDocumentId) {
                    return;
                }
                void this.persistDateRangeToRepository();
            });
    }

    getLayoutLoadSource(): DashboardLayoutLoadSource {
        return this.layoutLoadSource;
    }

    getActiveLayoutDocumentInfo(): DashboardLayoutDocumentInfo {
        return this.activeLayoutDocument;
    }

    getLayoutSaveFileName(): string {
        return this.layoutSaveFileName;
    }

    setLayoutSaveFileName(fileName: string): void {
        this.layoutSaveFileName = fileName;
    }

    getLayoutSaveAsNew(): boolean {
        return this.layoutSaveAsNew;
    }

    setLayoutSaveAsNew(saveAsNew: boolean): void {
        this.layoutSaveAsNew = saveAsNew;
    }

    syncLayoutSaveFileNameFromTitle(title?: string | null): void {
        if (title?.trim()) {
            this.layoutSaveFileName = title.trim();
        }
    }

    getSaveTargetDocumentId(): string | null {
        return this.saveTargetDocumentId;
    }

    setSaveTargetDocumentId(documentId: string | null): void {
        this.saveTargetDocumentId = documentId?.trim() || null;
    }

    getPreferredLayoutDocumentId(): string | null {
        if (typeof localStorage === 'undefined') {
            return resolveLayoutDocumentId(this.appConfigService) ?? null;
        }
        return (
            localStorage.getItem(PREFERRED_LAYOUT_DOCUMENT_KEY) ??
            resolveLayoutDocumentId(this.appConfigService) ??
            null
        );
    }

    setPreferredLayoutDocumentId(documentId: string | null): void {
        if (typeof localStorage === 'undefined') {
            return;
        }
        if (documentId) {
            localStorage.setItem(PREFERRED_LAYOUT_DOCUMENT_KEY, documentId);
        } else {
            localStorage.removeItem(PREFERRED_LAYOUT_DOCUMENT_KEY);
        }
        this.activeLayoutDocument = {
            ...this.activeLayoutDocument,
            preferredDocumentId: documentId,
        };
        this.activeLayoutDocument$.next(this.activeLayoutDocument);
    }

    listLayoutDocuments(): Promise<DashboardLayoutDocumentRef[]> {
        return this.repository.listLayoutDocuments();
    }

    getLayoutFolderListing(): Promise<DashboardLayoutFolderListing> {
        return this.repository.getLayoutFolderListing();
    }

    reloadLayout(documentId?: string | null): Observable<DashboardLayoutState> {
        const targetId = documentId ?? this.saveTargetDocumentId ?? this.getPreferredLayoutDocumentId();
        if (documentId) {
            this.setPreferredLayoutDocumentId(documentId);
            this.setSaveTargetDocumentId(documentId);
        }
        this.cachedLayout = null;
        this.initPromise = null;
        return from(this.loadLayoutFromDocumentId(targetId));
    }

    getLayout(): DashboardLayoutState {
        return this.cachedLayout ?? this.getDefaultLayout();
    }

    initializeLayout(): Observable<DashboardLayoutState> {
        return from(this.ensureInitialized());
    }

    private ensureInitialized(): Promise<DashboardLayoutState> {
        if (this.cachedLayout) {
            return Promise.resolve(this.cachedLayout);
        }
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this.loadLayoutFromRepository().finally(() => {
            this.initPromise = null;
        });
        return this.initPromise;
    }

    private async loadLayoutFromDocumentId(documentId: string | null): Promise<DashboardLayoutState> {
        const folderId = await this.repository.getDashboardsFolderId();
        const preferredDocumentId = this.getPreferredLayoutDocumentId();

        if (documentId) {
            try {
                const loaded = await this.repository.loadLayoutDocument(documentId);
                if (loaded?.layout) {
                    const documents = await this.repository.listLayoutDocuments();
                    const docRef = documents.find((doc) => doc.id === documentId);
                    const merged = this.mergeWithDefaults({
                        ...loaded.layout,
                        layoutSourceDocumentId: documentId,
                    });
                    this.applyLayoutPreferences(merged);
                    this.cachedLayout = merged;
                    this.layoutLoadSource = 'repo';
                    this.layoutLoadSource$.next('repo');
                    this.setActiveLayoutDocument({
                        id: documentId,
                        title: docRef?.title ?? loaded.layoutKey ?? null,
                        savedAt: loaded.savedAt ?? null,
                        folderId,
                        loadSource: 'repo',
                        preferredDocumentId,
                    });
                    this.saveLayoutCache(merged);
                    return merged;
                }
            } catch {
                // fall through to resolve preferred/latest
            }
        }

        return this.loadLayoutFromRepository();
    }

    private async loadLayoutFromRepository(): Promise<DashboardLayoutState> {
        const folderId = await this.repository.getDashboardsFolderId();
        const preferredDocumentId = this.getPreferredLayoutDocumentId();

        try {
            const docRef = await this.resolveLayoutDocumentRef();
            if (docRef?.id) {
                const loaded = await this.repository.loadLayoutDocument(docRef.id);
                if (loaded?.layout) {
                    const merged = this.mergeWithDefaults({
                        ...loaded.layout,
                        layoutSourceDocumentId: docRef.id,
                    });
                    this.applyLayoutPreferences(merged);
                    this.cachedLayout = merged;
                    this.layoutLoadSource = 'repo';
                    this.layoutLoadSource$.next('repo');
                    this.setActiveLayoutDocument({
                        id: docRef.id,
                        title: docRef.title,
                        savedAt: loaded.savedAt ?? null,
                        folderId,
                        loadSource: 'repo',
                        preferredDocumentId,
                    });
                    this.saveLayoutCache(merged);
                    return merged;
                }
            }
        } catch {
            // fall back to code defaults
        }

        const defaults = this.getDefaultLayout();
        this.applyLayoutPreferences(defaults);
        this.cachedLayout = defaults;
        this.layoutLoadSource = 'default';
        this.layoutLoadSource$.next('default');
        this.setActiveLayoutDocument({
            id: null,
            title: null,
            savedAt: null,
            folderId,
            loadSource: 'default',
            preferredDocumentId,
        });
        return defaults;
    }

    private async resolveLayoutDocumentRef(): Promise<DashboardLayoutDocumentRef | null> {
        const documents = await this.repository.listLayoutDocuments();
        const preferredId = this.getPreferredLayoutDocumentId();
        if (preferredId) {
            const preferred = documents.find((doc) => doc.id === preferredId);
            if (preferred) {
                return preferred;
            }
        }

        // No browser/app selection: load the most recently modified layout in Appdata.
        return this.repository.findLatestLayoutDocument();
    }

    private setActiveLayoutDocument(info: DashboardLayoutDocumentInfo): void {
        this.activeLayoutDocument = info;
        this.activeLayoutDocument$.next(info);
        if (info.id) {
            this.setSaveTargetDocumentId(info.id);
        }
        if (info.loadSource === 'repo' && info.title?.trim()) {
            this.syncLayoutSaveFileNameFromTitle(info.title);
            this.layoutSaveAsNew = false;
        }
    }

    async saveLayoutToRepository(
        layout: DashboardLayoutState,
        options?: DashboardLayoutSaveOptions
    ): Promise<DashboardLayoutState> {
        const fileName = normalizeLayoutFileName(options?.fileName ?? this.layoutSaveFileName);
        const saveAsNew = options?.saveAsNew ?? this.layoutSaveAsNew;
        let documentId = !saveAsNew
            ? this.saveTargetDocumentId ??
              layout.layoutSourceDocumentId ??
              this.getPreferredLayoutDocumentId() ??
              null
            : null;
        let payload: DashboardLayoutState = this.withCurrentDateRange(layout);

        if (documentId) {
            try {
                await this.repository.saveLayout(documentId, payload, { fileName });
            } catch {
                documentId = null;
            }
        }

        if (!documentId) {
            const created = await this.repository.createLayoutDocument(payload, fileName);
            documentId = created.id;
        }

        payload = this.withCurrentDateRange(
            this.mergeWithDefaults({
                ...payload,
                layoutSourceDocumentId: documentId,
            })
        );
        payload = {
            ...payload,
            widgets: this.restoreWidgetsGeometry(
                payload.widgets,
                this.captureWidgetsGeometry(layout.widgets),
                payload.pages
            ),
        };
        this.cachedLayout = payload;
        this.layoutLoadSource = 'repo';
        this.layoutLoadSource$.next('repo');
        if (documentId) {
            this.setPreferredLayoutDocumentId(documentId);
            const documents = await this.repository.listLayoutDocuments();
            const savedDoc = documents.find((doc) => doc.id === documentId);
            const savedTitle = savedDoc?.title ?? fileName;
            this.setActiveLayoutDocument({
                id: documentId,
                title: savedTitle,
                savedAt: new Date().toISOString(),
                folderId: await this.repository.getDashboardsFolderId(),
                loadSource: 'repo',
                preferredDocumentId: documentId,
            });
            this.layoutSaveFileName = savedTitle;
            this.layoutSaveAsNew = false;
        }
        this.saveLayoutCache(payload);
        return payload;
    }

    async copyLayoutDocument(sourceDocumentId: string, newFileName: string): Promise<DashboardLayoutState> {
        if (!sourceDocumentId?.trim()) {
            throw new Error('dashboard-layout-copy-source-not-found');
        }

        const fileName = normalizeLayoutFileName(newFileName);
        const documents = await this.repository.listLayoutDocuments();
        const sourceDoc = documents.find((doc) => doc.id === sourceDocumentId);
        const sourceName = normalizeLayoutFileName(sourceDoc?.title ?? '');

        if (sourceName && fileName === sourceName) {
            throw new Error('dashboard-layout-copy-same-name');
        }

        if (documents.some((doc) => normalizeLayoutFileName(doc.title) === fileName)) {
            throw new Error('dashboard-layout-copy-duplicate-name');
        }

        const created = await this.repository.copyLayoutDocument(sourceDocumentId, fileName);
        this.setPreferredLayoutDocumentId(created.id);
        this.setSaveTargetDocumentId(created.id);
        this.cachedLayout = null;
        this.initPromise = null;
        const layout = await this.loadLayoutFromDocumentId(created.id);
        this.layoutSaveFileName = created.title;
        this.layoutSaveAsNew = false;
        return layout;
    }



    getDefaultLayout(): DashboardLayoutState {

        const pages = buildDefaultDemoPages();

        let widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {};

        for (const [id, template] of Object.entries(DEFAULT_WIDGETS)) {

            widgets[id] = this.buildDefaultWidget(id, template);

        }

        widgets = assignContainerIdsToWidgets(pages, widgets);

        widgets = this.normalizeWidgetsForPages(pages, widgets);

        return {

            version: LAYOUT_SCHEMA_VERSION,

            pages,

            activePageId: pages[0]?.id,

            widgets,

            theme: resolveTheme(DEFAULT_DASHBOARD_THEME),

            dateRange: defaultDashboardDateRangePreference(),

            layoutSourceDocumentId: null,

        };

    }



    private buildDefaultWidget(id: string, template: DashboardWidgetConfig): DashboardWidgetConfig {

        let widget = this.normalizeWidget({ ...template });

        const canvasRect = DEFAULT_DEMO_CANVAS_LAYOUT[id as DashboardWidgetId];

        if (canvasRect) {

            widget = {

                ...widget,

                canvasRect: { ...canvasRect },

                gridColumnSpan: canvasRect.colSpan,

                gridRowSpan: canvasRect.rowSpan,

            };

        }

        return widget;

    }



    private normalizeWidgetsForPages(

        pages: DashboardLayoutState['pages'],

        widgets: Record<DashboardWidgetId, DashboardWidgetConfig>

    ): Record<DashboardWidgetId, DashboardWidgetConfig> {

        const normalized = { ...widgets };

        for (const page of pages) {

            for (const container of page.containers) {

                for (const widgetId of container.widgetIds) {

                    if (normalized[widgetId]) {

                        normalized[widgetId] = this.normalizeWidget(normalized[widgetId], container.layoutMode);

                    }

                }

            }

        }

        return normalized;

    }



    saveLayout(layout: DashboardLayoutState): void {
        this.cachedLayout = layout;
        this.saveLayoutCache(layout);
    }

    private saveLayoutCache(layout: DashboardLayoutState): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }



    resetLayout(): DashboardLayoutState {

        const layout = this.getDefaultLayout();

        this.applyLayoutPreferences(layout);

        this.cachedLayout = layout;
        this.layoutLoadSource = 'default';
        this.layoutLoadSource$.next('default');
        this.saveLayoutCache(layout);

        return layout;

    }



    createOutcomeDistributionWidget(
        containerId: string,
        layoutMode: DashboardContainerLayoutMode = 'grid-12'
    ): DashboardWidgetConfig {
        const template = DEFAULT_WIDGETS['outcome-distribution'];
        return this.normalizeWidget(
            {
                ...template,
                id: createId('widget'),
                containerId,
                section: legacySectionForLayoutMode(layoutMode),
            },
            layoutMode
        );
    }

    createWidget(
        type: DashboardWidgetType,
        containerId: string,
        layoutMode: DashboardContainerLayoutMode
    ): DashboardWidgetConfig {

        const id = createId('widget');

        const section = legacySectionForLayoutMode(layoutMode);

        const base: DashboardWidgetConfig = {

            id,

            type,

            containerId,

            section,

            gridColumnSpan: defaultGridColumnSpan(section, type),

            span: layoutMode === 'grid-4' ? 'metric' : layoutMode === 'list' ? 'full' : 'normal',

        };



        if (type === 'metric') {

            return this.normalizeWidget({

                ...base,

                dataSource: 'demo',

                title: 'Custom metric',

                helper: 'Configure a Content or process query in the builder.',

                icon: 'insights',

                demoValue: '0',

                positive: true,

            }, layoutMode);

        }



        if (type === 'chart') {

            return this.normalizeWidget({

                ...base,

                dataSource: 'demo',

                title: 'Productivity by Hour',

                helper: 'Daily processing volume',

                gridColumnSpan: layoutMode === 'grid-4' ? 4 : 12,

                chartDisplayMode: 'bar',

                chartHeadline: { show: true, aggregation: 'sum' },

                bindings: { valueAggregation: 'count', dateBucket: 'day', maxBuckets: 12 },

                chart: { yAggregation: 'count', dateBucket: 'day', maxBuckets: 12 },

            }, layoutMode);

        }



        if (type === 'gauge') {

            return this.normalizeWidget({

                ...base,

                dataSource: 'process',

                title: 'Completion rate',

                helper: 'Progress toward your target.',

                icon: 'speed',

                demoValue: '75',

                gaugeMin: 0,

                gaugeMax: 100,

                gaugeTarget: 90,

                gaugeUnit: '%',

                processQuery: {
                    processDefinitionKey: 'medical-records',
                    includeSubprocesses: true,
                    metricScope: 'tree',
                    status: ['COMPLETED'],
                },

            }, layoutMode);

        }



        if (type === 'table') {

            return this.normalizeWidget({

                ...base,

                dataSource: 'content',

                title: 'Flat report',

                helper: 'Explore query columns before building KPIs.',

                contentQuery: 'SELECT * FROM hxp:document',

                tablePageSize: 25,

                tableOptions: { showRowFilter: true },

                gridColumnSpan: layoutMode === 'grid-4' ? 4 : 12,

            }, layoutMode);

        }

        if (type === 'link-card') {

            return this.normalizeWidget({

                ...base,

                title: 'Quick action',

                helper: 'Navigate to a workflow or external resource.',

                icon: 'open_in_new',

                linkCardOptions: {

                    linkTargetType: 'route',

                    linkRoute: '/medical-records',

                    buttonLabel: 'Open',

                },

            }, layoutMode);

        }

        if (type === 'task-status-summary') {

            return this.normalizeWidget({

                ...base,

                title: 'Task status',

                helper: 'Open tasks grouped by status.',

                gridColumnSpan: layoutMode === 'grid-4' ? 4 : 6,

                taskWidgetOptions: {

                    maxItems: 10,

                    ctaRoute: '/medical-records#tasks',

                    ctaLabel: 'View all tasks',

                },

            }, layoutMode);

        }

        if (type === 'task-recent-list') {

            return this.normalizeWidget({

                ...base,

                title: 'Recent tasks',

                helper: 'Latest tasks assigned to you.',

                gridColumnSpan: layoutMode === 'grid-4' ? 4 : 6,

                taskWidgetOptions: {

                    maxItems: 5,

                    ctaRoute: '/medical-records#tasks',

                    ctaLabel: 'View full history',

                },

            }, layoutMode);

        }



        return this.normalizeWidget({

            ...base,

            title: 'Open Tasks',

            helper: 'Tasks assigned to you or ready to claim across medical-records workflows.',

            processListOptions: { ...DEFAULT_PROCESS_LIST_OPTIONS },

        }, layoutMode);

    }



    private mergeWithDefaults(stored: DashboardLayoutState): DashboardLayoutState {

        const defaults = this.getDefaultLayout();
        const storedGeometry = this.captureWidgetsGeometry(stored.widgets ?? {});

        let pages = migrateLegacyLayoutToPages(stored);

        if ((stored.version ?? 0) < LAYOUT_SCHEMA_VERSION) {
            pages = migrateLayoutV8ToV9(pages);
        } else {
            pages = consolidateOverviewDocumentContainer(pages);
        }

        const widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {};

        for (const [id, defaultWidget] of Object.entries(defaults.widgets)) {
            const widgetId = id as DashboardWidgetId;
            widgets[widgetId] = this.normalizeWidget(
                { ...defaultWidget, ...stored.widgets?.[widgetId] },
                this.resolveWidgetLayoutMode(pages, widgetId)
            );
        }

        for (const [id, storedWidget] of Object.entries(stored.widgets ?? {})) {
            const widgetId = id as DashboardWidgetId;
            if (!widgets[widgetId]) {
                widgets[widgetId] = this.normalizeWidget(
                    storedWidget,
                    this.resolveWidgetLayoutMode(pages, widgetId)
                );
            }
        }

        pages = this.mergePagesWithDefaults(pages, defaults.pages, widgets);

        const widgetsWithContainers = assignContainerIdsToWidgets(pages, widgets);

        const normalizedWidgets = this.restoreWidgetsGeometry(
            this.normalizeWidgetsForPages(pages, widgetsWithContainers),
            storedGeometry,
            pages
        );

        const layout: DashboardLayoutState = {
            version: LAYOUT_SCHEMA_VERSION,
            pages,
            activePageId: resolveActivePageId(pages, stored.activePageId ?? defaults.activePageId),
            widgets: normalizedWidgets,
            theme: resolveTheme(stored.theme ?? defaults.theme),
            dateRange: stored.dateRange ?? defaults.dateRange,
            layoutSourceDocumentId: stored.layoutSourceDocumentId ?? null,
        };

        this.persistLayoutMigrationIfNeeded(stored, layout);

        return layout;
    }

    private captureWidgetsGeometry(
        widgets: Record<string, DashboardWidgetConfig | undefined>
    ): Partial<Record<DashboardWidgetId, StoredWidgetGeometry>> {
        const geometry: Partial<Record<DashboardWidgetId, StoredWidgetGeometry>> = {};

        for (const [id, widget] of Object.entries(widgets)) {
            if (!widget) {
                continue;
            }

            if (
                !widget.canvasRect &&
                widget.gridRowSpan == null &&
                widget.gridColumnSpan == null &&
                widget.cardHeightPx == null
            ) {
                continue;
            }

            geometry[id as DashboardWidgetId] = {
                canvasRect: widget.canvasRect ? { ...widget.canvasRect } : undefined,
                gridRowSpan: widget.gridRowSpan,
                gridColumnSpan: widget.gridColumnSpan,
                cardHeightPx: widget.cardHeightPx,
                span: widget.span,
            };
        }

        return geometry;
    }

    private applyWidgetGeometry(
        widget: DashboardWidgetConfig,
        geometry: StoredWidgetGeometry
    ): DashboardWidgetConfig {
        return {
            ...widget,
            ...(geometry.canvasRect ? { canvasRect: { ...geometry.canvasRect } } : {}),
            ...(geometry.gridRowSpan != null ? { gridRowSpan: geometry.gridRowSpan } : {}),
            ...(geometry.gridColumnSpan != null ? { gridColumnSpan: geometry.gridColumnSpan } : {}),
            ...(geometry.cardHeightPx != null ? { cardHeightPx: geometry.cardHeightPx } : {}),
            ...(geometry.span ? { span: geometry.span } : {}),
        };
    }

    private restoreWidgetsGeometry(
        widgets: Record<DashboardWidgetId, DashboardWidgetConfig>,
        storedGeometry: Partial<Record<DashboardWidgetId, StoredWidgetGeometry>>,
        pages: DashboardLayoutState['pages']
    ): Record<DashboardWidgetId, DashboardWidgetConfig> {
        const restored = { ...widgets };

        for (const [id, geometry] of Object.entries(storedGeometry)) {
            const widgetId = id as DashboardWidgetId;
            if (!geometry || !restored[widgetId]) {
                continue;
            }

            restored[widgetId] = normalizeWidgetColumnSpan(
                this.applyWidgetGeometry(restored[widgetId], geometry),
                this.resolveWidgetLayoutMode(pages, widgetId)
            );
        }

        return restored;
    }

    private resolveWidgetLayoutMode(
        pages: DashboardLayoutState['pages'],
        widgetId: DashboardWidgetId
    ): DashboardContainerLayoutMode | undefined {
        for (const page of pages) {
            for (const container of page.containers) {
                if (container.widgetIds.includes(widgetId)) {
                    return container.layoutMode;
                }
            }
        }
        return undefined;
    }

    private mergePagesWithDefaults(
        storedPages: DashboardLayoutState['pages'],
        defaultPages: DashboardLayoutState['pages'],
        widgets: Record<DashboardWidgetId, DashboardWidgetConfig>
    ): DashboardLayoutState['pages'] {
        const pages = storedPages.map((page) => ({
            ...page,
            containers: page.containers.map((container) => ({
                ...container,
                widgetIds: container.widgetIds.filter((id) => widgets[id]),
            })),
        }));

        for (const defaultPage of defaultPages) {
            let page = pages.find((entry) => entry.id === defaultPage.id);
            if (!page) {
                pages.push(structuredClone(defaultPage));
                continue;
            }
            for (const defaultContainer of defaultPage.containers) {
                let container = page.containers.find((entry) => entry.id === defaultContainer.id);
                if (!container) {
                    page.containers.push(structuredClone(defaultContainer));
                    continue;
                }
                for (const widgetId of defaultContainer.widgetIds) {
                    if (widgets[widgetId] && !container.widgetIds.includes(widgetId)) {
                        container.widgetIds.push(widgetId);
                    }
                }
            }
        }

        return pages;
    }

    private withCurrentDateRange(layout: DashboardLayoutState): DashboardLayoutState {
        return {
            ...layout,
            dateRange: this.periodService.toPersistedPreference(),
        };
    }

    private applyLayoutPreferences(layout: DashboardLayoutState): void {
        this.suppressDateRangeAutoPersist = true;

        try {
            this.periodService.applyPersistedPreference(
                layout.dateRange ?? defaultDashboardDateRangePreference()
            );
        } finally {
            this.suppressDateRangeAutoPersist = false;
        }
    }

    private persistDateRangeToRepository(): void {
        const layout = this.cachedLayout;
        const documentId = layout?.layoutSourceDocumentId;

        if (!layout || !documentId || this.suppressDateRangeAutoPersist) {
            return;
        }

        const updated = this.withCurrentDateRange(layout);

        if (
            updated.dateRange?.start === layout.dateRange?.start &&
            updated.dateRange?.end === layout.dateRange?.end
        ) {
            return;
        }

        void this.repository.saveLayout(documentId, updated).then(() => {
            this.cachedLayout = updated;
            this.saveLayoutCache(updated);
        }).catch(() => {
            // ignore persistence failures
        });
    }

    /** Writes v9 layout when upgrading stored config. */
    private persistLayoutMigrationIfNeeded(previous: DashboardLayoutState, merged: DashboardLayoutState): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        const needsMigration = (previous.version ?? 0) < LAYOUT_SCHEMA_VERSION;
        const usedLegacyKey = !!localStorage.getItem(LEGACY_STORAGE_KEY) && !localStorage.getItem(STORAGE_KEY);

        if (needsMigration || usedLegacyKey) {
            this.saveLayoutCache(merged);
        }
    }

    private normalizeWidget(widget: DashboardWidgetConfig, layoutMode?: DashboardContainerLayoutMode): DashboardWidgetConfig {

        const raw = widget as DashboardWidgetConfig & { titles?: unknown; helpers?: unknown };

        const normalized: DashboardWidgetConfig = { ...widget };



        if (!normalized.title) {

            normalized.title = coerceLegacyLocalizedText(raw.titles);

        }



        if (!normalized.helper) {

            normalized.helper = coerceLegacyLocalizedText(raw.helpers);

        }



        delete (normalized as { titles?: unknown }).titles;

        delete (normalized as { helpers?: unknown }).helpers;



        if (normalized.type === 'process-list') {
            delete normalized.dataSource;
            normalized.processListOptions = {
                ...DEFAULT_PROCESS_LIST_OPTIONS,
                ...normalized.processListOptions,
            };
        }

        if (!normalized.bindings && normalized.chart) {
            normalized.bindings = chartConfigToBindings(normalized.chart);
        }

        if (normalized.processQuery) {
            if (!normalized.processQuery.processDefinitionKey && normalized.processQuery.processDefinitionName) {
                normalized.processQuery = {
                    ...normalized.processQuery,
                    processDefinitionKey: normalized.processQuery.processDefinitionName,
                };
            }
            const catalogEntry = findProcessCatalogEntry(
                normalized.processQuery.processDefinitionKey ?? normalized.processQuery.processDefinitionName
            );
            if (catalogEntry) {
                normalized.processQuery = {
                    includeSubprocesses: catalogEntry.defaultIncludeSubprocesses,
                    metricScope: catalogEntry.defaultMetricScope,
                    status: catalogEntry.defaultStatus,
                    ...normalized.processQuery,
                    processDefinitionKey:
                        normalized.processQuery.processDefinitionKey ??
                        normalized.processQuery.processDefinitionName ??
                        catalogEntry.key,
                };
            }
        }

        if (normalized.bindings?.columnFields !== undefined) {
            normalized.tableColumnKeys = normalized.bindings.columnFields.join(', ');
        } else if (normalized.tableColumnKeys?.trim()) {
            const columns = normalized.tableColumnKeys
                .split(',')
                .map((key) => key.trim())
                .filter(Boolean);
            if (columns.length) {
                normalized.bindings = { ...normalized.bindings, columnFields: columns };
            }
        }

        if (normalized.id === 'recovery-rate' || normalized.id === 'completion-rate') {
            normalized.type = 'gauge';
            normalized.gaugeMin ??= 0;
            normalized.gaugeMax ??= 100;
            normalized.gaugeUnit ??=
                normalized.id === 'recovery-rate' || normalized.id === 'completion-rate' ? '%' : '';
            if (normalized.id === 'recovery-rate') {
                normalized.gaugeTarget ??= 90;
            }
            if (normalized.id === 'completion-rate') {
                normalized.gaugeTarget = normalized.gaugeMode === 'ratio' ? 90 : (normalized.gaugeTarget ?? 90);
                normalized.gaugeMode ??= 'ratio';
                normalized.gaugeUnit ??= '%';
                normalized.icon ??= 'speed';
                normalized.processQuery = {
                    includeSubprocesses: true,
                    metricScope: 'tree',
                    status: ['RUNNING', 'COMPLETED', 'SUSPENDED'],
                    ...normalized.processQuery,
                    processDefinitionKey:
                        normalized.processQuery?.processDefinitionKey ??
                        normalized.processQuery?.processDefinitionName ??
                        'medical-records',
                };
            }
        }

        if (normalized.type === 'chart') {
            normalized.chartDisplayMode ??= 'bar';
            normalized.chartAxes = {
                xLabelFormat: 'auto',
                ...normalized.chartAxes,
            };
        }

        if (normalized.id === 'productivity-chart') {
            normalized.gridColumnSpan ??= 12;
            normalized.span = 'full';
            normalized.processQuery = {
                ...normalized.processQuery,
                includeSubprocesses: normalized.processQuery?.includeSubprocesses ?? true,
                metricScope: 'tree',
            };
        }

        if (normalized.id === 'chart-content-doc-types' && layoutMode === 'grid-4') {
            const minRowSpan = 6;
            const currentRowSpan = normalized.canvasRect?.rowSpan ?? normalized.gridRowSpan ?? 0;
            if (!normalized.canvasRect) {
                normalized.canvasRect = { col: 3, row: 1, colSpan: 2, rowSpan: minRowSpan };
                normalized.gridRowSpan = minRowSpan;
            } else if (currentRowSpan < minRowSpan) {
                normalized.canvasRect = { ...normalized.canvasRect, rowSpan: minRowSpan };
                normalized.gridRowSpan = minRowSpan;
            }
            normalized.gridColumnSpan ??= normalized.canvasRect?.colSpan ?? 2;
        }

        if (normalized.id === 'chart-content-uploads' && layoutMode === 'grid-4') {
            const minRowSpan = 5;
            const currentRowSpan = normalized.canvasRect?.rowSpan ?? normalized.gridRowSpan ?? 0;
            if (!normalized.canvasRect) {
                normalized.canvasRect = { col: 1, row: 7, colSpan: 4, rowSpan: minRowSpan };
                normalized.gridRowSpan = minRowSpan;
                normalized.gridColumnSpan = 4;
            } else if (currentRowSpan < minRowSpan) {
                normalized.canvasRect = { ...normalized.canvasRect, rowSpan: minRowSpan };
                normalized.gridRowSpan = minRowSpan;
            }
            normalized.gridColumnSpan ??= normalized.canvasRect?.colSpan ?? 4;
            normalized.gridRowSpan ??= normalized.canvasRect?.rowSpan ?? minRowSpan;
            normalized.span ??= 'wide';
            normalized.chartHeadline = { ...normalized.chartHeadline, show: false };
        }

        this.migrateContentWidgetBindings(normalized);
        this.migrateContentQueries(normalized);
        this.migrateOutcomeDistributionBindings(normalized);
        this.migratePerformanceMetrics(normalized);

        return syncLegacyChartFromBindings(normalizeWidgetColumnSpan(normalized, layoutMode));
    }

    private migrateContentWidgetBindings(widget: DashboardWidgetConfig): void {
        if (widget.bindings) {
            widget.bindings = {
                ...widget.bindings,
                argumentField: normalizeContentBindingField(widget.bindings.argumentField),
                valueField: normalizeContentBindingField(widget.bindings.valueField),
                seriesField: normalizeContentBindingField(widget.bindings.seriesField),
                columnFields: normalizeContentColumnFields(widget.bindings.columnFields),
            };
        }

        if (widget.chart) {
            widget.chart = {
                ...widget.chart,
                xField: normalizeContentBindingField(widget.chart.xField),
                yField: normalizeContentBindingField(widget.chart.yField),
            };
        }

        if (widget.tableColumnKeys?.trim()) {
            const columns = widget.tableColumnKeys
                .split(',')
                .map((key) => normalizeContentBindingField(key.trim()) ?? '')
                .filter(Boolean);
            widget.tableColumnKeys = columns.join(', ');
            if (columns.length) {
                widget.bindings = { ...widget.bindings, columnFields: columns };
            }
        }
    }

    private migrateContentQueries(widget: DashboardWidgetConfig): void {
        if (!widget.id || !CLASSIFIED_CONTENT_WIDGET_IDS.has(widget.id)) {
            return;
        }
        if (shouldUpgradeToClassifiedContentQuery(widget.contentQuery)) {
            widget.contentQuery = HXP_DOCUMENTS_CLASSIFIED_QUERY;
        }
    }

    private migrateOutcomeDistributionBindings(widget: DashboardWidgetConfig): void {
        if (widget.id !== 'outcome-distribution') {
            return;
        }
        const legacyAxis = widget.bindings?.argumentField ?? widget.chart?.xField;
        if (legacyAxis === 'name' || legacyAxis === 'processDefinitionKey') {
            widget.bindings = {
                ...widget.bindings,
                argumentField: 'processDefinitionName',
                valueAggregation: widget.bindings?.valueAggregation ?? 'count',
                seriesField: widget.bindings?.seriesField ?? 'status',
            };
            widget.chart = {
                ...widget.chart,
                xField: 'processDefinitionName',
                yAggregation: widget.chart?.yAggregation ?? 'count',
            };
        }
    }

    private migratePerformanceMetrics(widget: DashboardWidgetConfig): void {
        if (widget.id === 'metric-completed' && widget.dataSource === 'demo') {
            widget.dataSource = 'process';
            widget.demoValue = undefined;
            widget.trendDirection = undefined;
            widget.trendValue = undefined;
            widget.helper = 'Completed medical-records process instances.';
            widget.helperTooltip = 'Live count from Automate for COMPLETED status.';
            widget.comparisonPeriod = 'previous_week';
            widget.processQuery = {
                processDefinitionKey: 'medical-records',
                includeSubprocesses: true,
                metricScope: 'tree',
                status: ['COMPLETED'],
                ...widget.processQuery,
            };
        }

        if (widget.id === 'metric-pending' && widget.dataSource === 'demo') {
            widget.dataSource = 'process';
            widget.demoValue = undefined;
            widget.trendDirection = undefined;
            widget.trendValue = undefined;
            widget.helper = 'Running or suspended process instances.';
            widget.helperTooltip = 'Live count from Automate for RUNNING and SUSPENDED status.';
            widget.comparisonPeriod = 'previous_week';
            widget.positive = false;
            widget.processQuery = {
                processDefinitionKey: 'medical-records',
                includeSubprocesses: true,
                metricScope: 'tree',
                status: ['RUNNING', 'SUSPENDED'],
                ...widget.processQuery,
            };
        }

        if (widget.id === 'metric-error-rate' && widget.dataSource === 'demo') {
            widget.dataSource = 'process';
            widget.demoValue = undefined;
            widget.trendDirection = undefined;
            widget.trendValue = undefined;
            widget.title = 'Cancelled Processes';
            widget.helper = 'Cancelled medical-records process instances.';
            widget.helperTooltip = 'Live count from Automate for CANCELLED status.';
            widget.comparisonPeriod = 'previous_week';
            widget.positive = false;
            widget.processQuery = {
                processDefinitionKey: 'medical-records',
                includeSubprocesses: true,
                metricScope: 'tree',
                status: ['CANCELLED'],
                ...widget.processQuery,
            };
        }

        const demoPerformanceIds = new Set([
            'metric-user-activity',
            'metric-sla-compliance',
            'metric-avg-days-payment',
            'metric-execution-queue',
        ]);
        if (demoPerformanceIds.has(widget.id ?? '') && widget.dataSource === 'demo') {
            widget.comparisonPeriod = 'none';
            widget.trendDirection = undefined;
            widget.trendValue = undefined;
            if (!widget.helper?.includes('Demo')) {
                widget.helper = 'Demo — pending real query';
            }
            widget.helperTooltip = widget.helperTooltip ?? 'Demo value only. Not connected to live data.';
        }

        if (widget.id === 'recovery-rate' && widget.dataSource === 'demo') {
            widget.comparisonPeriod = 'none';
            widget.helperTooltip =
                widget.helperTooltip ?? 'Demo value only. Not connected to live repository or process data.';
        }
    }

    normalizeWidgetForLayout(widget: DashboardWidgetConfig, layoutMode?: DashboardContainerLayoutMode): DashboardWidgetConfig {
        return this.normalizeWidget(widget, layoutMode);
    }

    createPage(label = 'New tab'): DashboardLayoutState['pages'][number] {
        return {
            id: createId('page'),
            label,
            containers: [
                {
                    id: createId('container'),
                    title: 'New section',
                    subtitle: 'Drag widgets here or add from the palette.',
                    layoutMode: 'grid-12',
                    widgetIds: [],
                },
            ],
        };
    }

    createContainer(layoutMode: DashboardContainerLayoutMode = 'grid-12'): DashboardLayoutState['pages'][number]['containers'][number] {
        const titles: Record<DashboardContainerLayoutMode, string> = {
            'kpi-strip': 'KPI strip',
            'grid-4': 'Metrics grid',
            'grid-12': 'Report canvas',
            list: 'List section',
        };
        return {
            id: createId('container'),
            title: titles[layoutMode],
            layoutMode,
            widgetIds: [],
        };
    }
}

import { Injectable } from '@angular/core';
import {
    DashboardPageConfig,
    DashboardWidgetConfig,
    DashboardWidgetId,
} from '../definitions/dashboard-widget.model';
import { ContentQueryDataProvider } from '../providers/content-query-data.provider';
import {
    CONTENT_SAMPLE_MAX_ROWS,
    ContentQueryPriority,
    ContentQueryRequestOptions,
    normalizeContentQuery,
} from '../providers/content-query.types';
import { resolveWidgetDataSource } from '../utils/dashboard-data-source.util';

@Injectable({ providedIn: 'root' })
export class DashboardContentLoadContextService {
    private pages: DashboardPageConfig[] = [];
    private widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {};
    private activePageId = '';
    private widgetPageIndex = new Map<DashboardWidgetId, string>();
    private prefetchSignature = '';
    private querySignature = '';

    constructor(private readonly contentQueryDataProvider: ContentQueryDataProvider) {}

    registerLayout(
        pages: DashboardPageConfig[],
        widgets: Record<DashboardWidgetId, DashboardWidgetConfig>,
        activePageId: string,
        editMode = false
    ): void {
        this.pages = pages;
        this.widgets = widgets;
        this.activePageId = activePageId;
        this.rebuildWidgetPageIndex();
        this.invalidateCacheIfQueriesChanged();

        if (editMode) {
            return;
        }

        const signature = this.buildPrefetchSignature(activePageId);
        if (signature === this.prefetchSignature) {
            return;
        }
        this.prefetchSignature = signature;
        this.scheduleBackgroundPrefetch(activePageId);
    }

    setActivePageId(pageId: string, editMode = false): void {
        if (!pageId || pageId === this.activePageId) {
            return;
        }
        this.activePageId = pageId;
        if (editMode) {
            return;
        }
        const signature = this.buildPrefetchSignature(pageId);
        if (signature !== this.prefetchSignature) {
            this.prefetchSignature = signature;
            this.scheduleBackgroundPrefetch(pageId);
        }
    }

    resolveRequestOptions(widgetId?: string): ContentQueryRequestOptions {
        return {
            widgetId,
            priority: this.resolvePriority(widgetId),
        };
    }

    resolvePriority(widgetId?: string): ContentQueryPriority {
        if (!widgetId) {
            return 'background';
        }
        const pageId = this.widgetPageIndex.get(widgetId);
        if (!pageId || !this.activePageId) {
            return 'background';
        }
        return pageId === this.activePageId ? 'visible' : 'background';
    }

    invalidatePrefetch(): void {
        this.prefetchSignature = '';
        this.contentQueryDataProvider.clearFetchAllCache();
    }

    private rebuildWidgetPageIndex(): void {
        this.widgetPageIndex.clear();
        for (const page of this.pages) {
            for (const container of page.containers) {
                for (const widgetId of container.widgetIds) {
                    this.widgetPageIndex.set(widgetId, page.id);
                }
            }
        }
    }

    private buildPrefetchSignature(activePageId: string): string {
        const queries = this.collectPrefetchQueries(activePageId);
        return `${activePageId}|${queries.map((entry) => `${entry.query}@${entry.maxRows}:${entry.priority}`).join(';')}`;
    }

    private scheduleBackgroundPrefetch(activePageId: string): void {
        window.setTimeout(() => {
            for (const entry of this.collectPrefetchQueries(activePageId)) {
                if (entry.priority === 'background') {
                    this.contentQueryDataProvider.prefetchFetchAll(entry.query, entry.maxRows, 'background');
                }
            }
        }, 400);
    }

    private invalidateCacheIfQueriesChanged(): void {
        const nextSignature = this.buildQuerySignature();
        if (nextSignature !== this.querySignature) {
            this.querySignature = nextSignature;
            this.prefetchSignature = '';
            this.contentQueryDataProvider.clearFetchAllCache();
        }
    }

    private buildQuerySignature(): string {
        const queries = new Set<string>();
        for (const widget of Object.values(this.widgets)) {
            if (widget.contentQuery?.trim()) {
                queries.add(normalizeContentQuery(widget.contentQuery));
            }
        }
        return Array.from(queries).sort().join('|');
    }

    private collectPrefetchQueries(
        activePageId: string
    ): Array<{ query: string; maxRows: number; priority: ContentQueryPriority }> {
        const grouped = new Map<string, { maxRows: number; priority: ContentQueryPriority }>();

        for (const page of this.pages) {
            const pagePriority: ContentQueryPriority = page.id === activePageId ? 'visible' : 'background';
            for (const container of page.containers) {
                for (const widgetId of container.widgetIds) {
                    const widget = this.widgets[widgetId];
                    if (!this.widgetNeedsFetchAll(widget)) {
                        continue;
                    }
                    const query = normalizeContentQuery(widget.contentQuery!.trim());
                    const maxRows = CONTENT_SAMPLE_MAX_ROWS;
                    const existing = grouped.get(query);
                    const priority =
                        existing?.priority === 'visible' || pagePriority === 'visible' ? 'visible' : 'background';
                    grouped.set(query, {
                        maxRows: Math.max(existing?.maxRows ?? 0, maxRows),
                        priority,
                    });
                }
            }
        }

        return Array.from(grouped.entries()).map(([query, meta]) => ({
            query,
            maxRows: meta.maxRows,
            priority: meta.priority,
        }));
    }

    private widgetNeedsFetchAll(widget?: DashboardWidgetConfig): boolean {
        if (!widget?.contentQuery?.trim()) {
            return false;
        }
        if (resolveWidgetDataSource(widget) !== 'content') {
            return false;
        }
        if (widget.type === 'chart') {
            return true;
        }
        if (widget.type === 'metric') {
            return widget.id === 'metric-content-recent' || widget.comparisonPeriod !== 'none';
        }
        return false;
    }
}

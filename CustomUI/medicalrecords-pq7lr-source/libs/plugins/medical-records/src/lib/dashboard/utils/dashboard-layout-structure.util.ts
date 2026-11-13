import {
    DashboardContainerConfig,
    DashboardContainerLayoutMode,
    DashboardLayoutState,
    DashboardPageConfig,
    DashboardWidgetConfig,
    DashboardWidgetId,
    DashboardWidgetSection,
    DEFAULT_HEADER_KPI_WIDGET_IDS,
} from '../definitions/dashboard-widget.model';

export const LAYOUT_SCHEMA_VERSION = 9 as const;
export const PALETTE_DROP_ID = 'palette-drop';

export function containerDropId(containerId: string): string {
    return `container-drop-${containerId}`;
}

export function pageContainersDropId(pageId: string): string {
    return `page-containers-drop-${pageId}`;
}

export function containerLayoutGridColumns(layoutMode: DashboardContainerLayoutMode): number {
    switch (layoutMode) {
        case 'grid-4':
            return 4;
        case 'list':
            return 1;
        case 'kpi-strip':
            return 4;
        case 'grid-12':
        default:
            return 12;
    }
}

export function layoutModeSupportsCanvas(layoutMode: DashboardContainerLayoutMode): boolean {
    return layoutMode === 'grid-12' || layoutMode === 'grid-4';
}

export function legacySectionForLayoutMode(mode: DashboardContainerLayoutMode): DashboardWidgetSection {
    switch (mode) {
        case 'grid-4':
            return 'metrics';
        case 'list':
            return 'tasks';
        default:
            return 'insights';
    }
}

export function flattenWidgetOrder(pages: DashboardPageConfig[]): DashboardWidgetId[] {
    const order: DashboardWidgetId[] = [];
    for (const page of pages) {
        for (const container of page.containers) {
            for (const id of container.widgetIds) {
                if (!order.includes(id)) {
                    order.push(id);
                }
            }
        }
    }
    return order;
}

export function findContainer(
    pages: DashboardPageConfig[],
    containerId: string
): { page: DashboardPageConfig; container: DashboardContainerConfig } | null {
    for (const page of pages) {
        const container = page.containers.find((entry) => entry.id === containerId);
        if (container) {
            return { page, container };
        }
    }
    return null;
}

export function resolveContainerLayoutMode(
    widget: DashboardWidgetConfig,
    pages: DashboardPageConfig[]
): DashboardContainerLayoutMode | undefined {
    if (widget.containerId) {
        return findContainer(pages, widget.containerId)?.container.layoutMode;
    }
    if (widget.section === 'metrics') {
        return 'grid-4';
    }
    if (widget.section === 'tasks') {
        return 'list';
    }
    return 'grid-12';
}

export function collectContainerDropIds(pages: DashboardPageConfig[], includePalette = true): string[] {
    const ids = pages.flatMap((page) => page.containers.map((container) => containerDropId(container.id)));
    if (includePalette) {
        ids.push(PALETTE_DROP_ID);
    }
    return ids;
}

export function removeWidgetFromPages(pages: DashboardPageConfig[], widgetId: DashboardWidgetId): DashboardPageConfig[] {
    return pages.map((page) => ({
        ...page,
        containers: page.containers.map((container) => ({
            ...container,
            widgetIds: container.widgetIds.filter((id) => id !== widgetId),
        })),
    }));
}

export function removeContainerFromPages(pages: DashboardPageConfig[], containerId: string): DashboardPageConfig[] {
    return pages.map((page) => ({
        ...page,
        containers: page.containers.filter((container) => container.id !== containerId),
    }));
}

export function removePageFromPages(pages: DashboardPageConfig[], pageId: string): DashboardPageConfig[] {
    return pages.filter((page) => page.id !== pageId);
}

export function collectWidgetIdsFromPage(page: DashboardPageConfig): DashboardWidgetId[] {
    return page.containers.flatMap((container) => container.widgetIds);
}

export function removeWidgetsFromRecord(
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig>,
    widgetIds: DashboardWidgetId[]
): Record<DashboardWidgetId, DashboardWidgetConfig> {
    if (!widgetIds.length) {
        return widgets;
    }
    const updated = { ...widgets };
    for (const id of widgetIds) {
        delete updated[id];
    }
    return updated;
}

export function assignContainerIdsToWidgets(
    pages: DashboardPageConfig[],
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig>
): Record<DashboardWidgetId, DashboardWidgetConfig> {
    const updated = { ...widgets };
    for (const page of pages) {
        for (const container of page.containers) {
            for (const id of container.widgetIds) {
                if (updated[id]) {
                    updated[id] = {
                        ...updated[id],
                        containerId: container.id,
                        section: legacySectionForLayoutMode(container.layoutMode),
                    };
                }
            }
        }
    }
    return updated;
}

export function createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function migrateLegacyLayoutToPages(stored: DashboardLayoutState): DashboardPageConfig[] {
    if (stored.pages?.length) {
        return stored.pages.map((page) => ({
            ...page,
            containers: page.containers.map((container) => ({ ...container, widgetIds: [...container.widgetIds] })),
        }));
    }

    const widgetOrder = stored.widgetOrder ?? [];
    const headerKpis = (stored.headerKpiWidgetIds ?? [...DEFAULT_HEADER_KPI_WIDGET_IDS]).filter((id) => stored.widgets[id]);
    const headerSet = new Set(headerKpis);

    const insights = widgetOrder.filter((id) => stored.widgets[id]?.section === 'insights' && !headerSet.has(id));
    const metrics = widgetOrder.filter((id) => stored.widgets[id]?.section === 'metrics');
    const tasks = widgetOrder.filter((id) => stored.widgets[id]?.section === 'tasks');

    return [
        {
            id: 'page-overview',
            label: 'Overview',
            containers: [
                {
                    id: 'container-executive-kpis',
                    title: 'Executive KPIs',
                    subtitle: 'Key signals for the selected period.',
                    layoutMode: 'kpi-strip',
                    widgetIds: headerKpis,
                },
                {
                    id: 'container-trends',
                    title: 'Insights',
                    layoutMode: 'grid-12',
                    widgetIds: insights,
                },
            ],
        },
        {
            id: 'page-performance',
            label: 'Performance',
            containers: [
                {
                    id: 'container-metrics',
                    title: 'Performance Metrics',
                    layoutMode: 'grid-4',
                    widgetIds: metrics,
                },
            ],
        },
        {
            id: 'page-work',
            label: 'Work',
            containers: [
                {
                    id: 'container-tasks',
                    title: 'Open Tasks',
                    layoutMode: 'list',
                    widgetIds: tasks,
                },
            ],
        },
    ];
}

export function buildDefaultDemoPages(): DashboardPageConfig[] {
    return [
        {
            id: 'page-overview',
            label: 'Overview',
            containers: [
                {
                    id: 'container-executive-kpis',
                    title: 'Executive KPIs',
                    subtitle: 'Key signals for the selected period.',
                    layoutMode: 'kpi-strip',
                    widgetIds: [...DEFAULT_HEADER_KPI_WIDGET_IDS],
                },
                {
                    id: 'container-trends',
                    title: 'Trends & distribution',
                    subtitle: 'Process volume and outcome breakdown.',
                    layoutMode: 'grid-12',
                    widgetIds: ['productivity-chart', 'outcome-distribution'],
                },
                {
                    id: 'container-tasks',
                    title: 'Open Tasks',
                    subtitle: 'Tasks assigned to you or ready to claim.',
                    layoutMode: 'list',
                    widgetIds: ['process-list'],
                },
            ],
        },
        {
            id: 'page-documents',
            label: 'Documents',
            containers: [
                {
                    id: 'container-content-kpis',
                    title: 'Content KPIs',
                    subtitle: 'Repository volume and document mix.',
                    layoutMode: 'grid-4',
                    widgetIds: [
                        'metric-content-total',
                        'metric-content-recent',
                        'chart-content-doc-types',
                        'chart-content-uploads',
                    ],
                },
                {
                    id: 'container-documents-table',
                    title: 'Document repository',
                    subtitle: 'Browse, filter, and export repository documents.',
                    layoutMode: 'grid-12',
                    widgetIds: ['documents-report'],
                },
            ],
        },
        {
            id: 'page-performance',
            label: 'Performance',
            containers: [
                {
                    id: 'container-metrics',
                    title: 'Operational metrics',
                    subtitle: 'KPI cards for throughput, quality, and SLA.',
                    layoutMode: 'grid-4',
                    widgetIds: [
                        'metric-completed',
                        'metric-pending',
                        'metric-error-rate',
                        'metric-user-activity',
                        'metric-sla-compliance',
                        'metric-avg-days-payment',
                        'metric-execution-queue',
                    ],
                },
            ],
        },
    ];
}

/** Restructure v8 demo layout into v9 (Documents tab, tasks on Overview, no Work tab). */
export function migrateLayoutV8ToV9(pages: DashboardPageConfig[]): DashboardPageConfig[] {
    let next = pages.map((page) => ({
        ...page,
        containers: page.containers.map((container) => ({
            ...container,
            widgetIds: [...container.widgetIds],
        })),
    }));

    const overview = next.find((page) => page.id === 'page-overview');
    const work = next.find((page) => page.id === 'page-work');
    const documents = next.find((page) => page.id === 'page-documents');

    if (overview) {
        const trends = overview.containers.find((entry) => entry.id === 'container-trends');
        if (trends) {
            trends.widgetIds = trends.widgetIds.filter((id) => id !== 'documents-report');
            if (trends.subtitle?.includes('document repository')) {
                trends.subtitle = 'Process volume and outcome breakdown.';
            }
        }

        const hasTasks = overview.containers.some((entry) => entry.widgetIds.includes('process-list'));
        if (!hasTasks && work) {
            const taskContainer = work.containers.find((entry) => entry.widgetIds.includes('process-list'));
            if (taskContainer) {
                overview.containers.push({
                    id: taskContainer.id === 'container-tasks' ? taskContainer.id : 'container-tasks',
                    title: taskContainer.title || 'Open Tasks',
                    subtitle: taskContainer.subtitle || 'Tasks assigned to you or ready to claim.',
                    layoutMode: 'list',
                    widgetIds: [...taskContainer.widgetIds],
                });
            }
        }
    }

    if (!documents) {
        const defaults = buildDefaultDemoPages().find((page) => page.id === 'page-documents');
        if (defaults) {
            next.push(defaults);
        }
    } else {
        const kpis = documents.containers.find((entry) => entry.id === 'container-content-kpis');
        const trends = documents.containers.find((entry) => entry.id === 'container-content-trends');
        if (kpis && trends?.widgetIds.includes('chart-content-uploads')) {
            if (!kpis.widgetIds.includes('chart-content-uploads')) {
                kpis.widgetIds.push('chart-content-uploads');
            }
            trends.widgetIds = trends.widgetIds.filter((id) => id !== 'chart-content-uploads');
        }
        documents.containers = documents.containers.filter(
            (entry) => entry.id !== 'container-content-trends' || entry.widgetIds.length > 0
        );

        const tableContainer = documents.containers.find((entry) => entry.id === 'container-documents-table');
        if (!tableContainer?.widgetIds.includes('documents-report')) {
            const orphanTable = overview?.containers
                .flatMap((entry) => entry.widgetIds)
                .includes('documents-report');
            if (!orphanTable) {
                documents.containers.push({
                    id: 'container-documents-table',
                    title: 'Document repository',
                    subtitle: 'Browse, filter, and export repository documents.',
                    layoutMode: 'grid-12',
                    widgetIds: ['documents-report'],
                });
            }
        }
    }

    next = next.filter((page) => page.id !== 'page-work');

    return next;
}

export function resolveActivePageId(pages: DashboardPageConfig[], activePageId?: string): string {
    if (activePageId && pages.some((page) => page.id === activePageId)) {
        return activePageId;
    }
    return pages[0]?.id ?? '';
}

export function resolveActiveContainerId(
    pages: DashboardPageConfig[],
    activePageId: string,
    activeContainerId?: string
): string {
    const page = pages.find((entry) => entry.id === activePageId) ?? pages[0];
    if (!page) {
        return '';
    }
    if (activeContainerId && page.containers.some((container) => container.id === activeContainerId)) {
        return activeContainerId;
    }
    return page.containers[0]?.id ?? '';
}

/** @deprecated v9 uses migrateLayoutV8ToV9 instead */
export function consolidateOverviewDocumentContainer(pages: DashboardPageConfig[]): DashboardPageConfig[] {
    return migrateLayoutV8ToV9(pages);
}

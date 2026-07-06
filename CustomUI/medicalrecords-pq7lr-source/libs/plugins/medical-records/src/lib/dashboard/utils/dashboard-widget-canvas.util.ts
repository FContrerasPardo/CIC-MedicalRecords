import {
    DashboardContainerLayoutMode,
    DashboardWidgetCanvasRect,
    DashboardWidgetConfig,
    DashboardWidgetId,
} from '../definitions/dashboard-widget.model';
import { containerLayoutGridColumns } from './dashboard-layout-structure.util';
import { gridColumnsForWidget, resolveWidgetColumnSpan } from './dashboard-widget-span.util';

export const CANVAS_ROW_HEIGHT_PX = 52;

export function defaultGridRowSpan(config: DashboardWidgetConfig): number {
    switch (config.type) {
        case 'chart':
            return 5;
        case 'table':
            return 8;
        case 'gauge':
        case 'metric':
            return 4;
        case 'link-card':
            return 3;
        default:
            return 3;
    }
}

export function resolveWidgetRowSpan(config: DashboardWidgetConfig): number {
    const span = config.gridRowSpan ?? defaultGridRowSpan(config);
    return Math.max(1, Math.min(24, Math.round(span)));
}

export function resolveCanvasRect(config: DashboardWidgetConfig, layoutMode?: DashboardContainerLayoutMode): DashboardWidgetCanvasRect {
    const gridCols = gridColumnsForWidget(config, layoutMode);
    if (config.canvasRect) {
        return clampCanvasRect(config.canvasRect, gridCols);
    }
    const colSpan = resolveWidgetColumnSpan(config, layoutMode);
    const rowSpan = resolveWidgetRowSpan(config);
    return { col: 1, row: 1, colSpan, rowSpan };
}

export function clampCanvasRect(rect: DashboardWidgetCanvasRect, gridCols: number): DashboardWidgetCanvasRect {
    const colSpan = Math.max(1, Math.min(gridCols, Math.round(rect.colSpan)));
    const rowSpan = Math.max(1, Math.min(24, Math.round(rect.rowSpan)));
    const col = Math.max(1, Math.min(gridCols - colSpan + 1, Math.round(rect.col)));
    const row = Math.max(1, Math.round(rect.row));
    return { col, row, colSpan, rowSpan };
}

/** Pack widgets left-to-right, wrapping at container column count. */
export function packContainerCanvas(
    widgetIds: DashboardWidgetId[],
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig>,
    layoutMode: DashboardContainerLayoutMode
): Record<DashboardWidgetId, DashboardWidgetCanvasRect> {
    const gridCols = containerLayoutGridColumns(layoutMode);
    const packed: Record<DashboardWidgetId, DashboardWidgetCanvasRect> = {};
    let col = 1;
    let row = 1;
    let rowHeight = 0;

    for (const id of widgetIds) {
        const config = widgets[id];
        if (!config) {
            continue;
        }

        const colSpan = resolveWidgetColumnSpan(config, layoutMode);
        const rowSpan = resolveWidgetRowSpan(config);

        if (col + colSpan - 1 > gridCols) {
            row += rowHeight || 1;
            col = 1;
            rowHeight = 0;
        }

        packed[id] = clampCanvasRect({ col, row, colSpan, rowSpan }, gridCols);
        col += colSpan;
        rowHeight = Math.max(rowHeight, rowSpan);
    }

    return packed;
}

/** @deprecated Use packContainerCanvas */
export function packSectionCanvas(
    widgetIds: DashboardWidgetId[],
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig>,
    layoutMode: DashboardContainerLayoutMode
): Record<DashboardWidgetId, DashboardWidgetCanvasRect> {
    return packContainerCanvas(widgetIds, widgets, layoutMode);
}

export function containerCanvasMinRows(
    widgetIds: DashboardWidgetId[],
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig>,
    layoutMode?: DashboardContainerLayoutMode
): number {
    let maxRow = 0;
    for (const id of widgetIds) {
        const config = widgets[id];
        if (!config) {
            continue;
        }
        const rect = resolveCanvasRect(config, layoutMode);
        maxRow = Math.max(maxRow, rect.row + rect.rowSpan - 1);
    }
    return Math.max(maxRow, 1);
}

/** @deprecated Use containerCanvasMinRows */
export function sectionCanvasMinRows(
    widgetIds: DashboardWidgetId[],
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig>
): number {
    return containerCanvasMinRows(widgetIds, widgets);
}

export function canvasRectStyle(rect: DashboardWidgetCanvasRect): Record<string, string> {
    return {
        gridColumn: `${rect.col} / span ${rect.colSpan}`,
        gridRow: `${rect.row} / span ${rect.rowSpan}`,
    };
}

/** Curated canvas positions for the default demo layout (builder reset). */
export const DEFAULT_DEMO_CANVAS_LAYOUT: Record<DashboardWidgetId, DashboardWidgetCanvasRect> = {
    'productivity-chart': { col: 1, row: 1, colSpan: 8, rowSpan: 6 },
    'outcome-distribution': { col: 9, row: 1, colSpan: 4, rowSpan: 6 },
    'documents-report': { col: 1, row: 1, colSpan: 12, rowSpan: 8 },
    'metric-content-total': { col: 1, row: 1, colSpan: 1, rowSpan: 3 },
    'metric-content-recent': { col: 2, row: 1, colSpan: 1, rowSpan: 3 },
    'chart-content-doc-types': { col: 3, row: 1, colSpan: 2, rowSpan: 6 },
    'chart-content-uploads': { col: 1, row: 7, colSpan: 4, rowSpan: 5 },
    'metric-completed': { col: 1, row: 1, colSpan: 1, rowSpan: 3 },
    'metric-pending': { col: 2, row: 1, colSpan: 1, rowSpan: 3 },
    'metric-error-rate': { col: 3, row: 1, colSpan: 1, rowSpan: 3 },
    'metric-user-activity': { col: 4, row: 1, colSpan: 1, rowSpan: 3 },
    'metric-sla-compliance': { col: 1, row: 4, colSpan: 1, rowSpan: 3 },
    'metric-avg-days-payment': { col: 2, row: 4, colSpan: 1, rowSpan: 3 },
    'metric-execution-queue': { col: 3, row: 4, colSpan: 1, rowSpan: 3 },
};

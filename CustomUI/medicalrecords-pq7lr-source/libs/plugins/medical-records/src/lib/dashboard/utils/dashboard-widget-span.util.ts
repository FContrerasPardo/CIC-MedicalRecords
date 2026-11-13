import {
    DashboardContainerLayoutMode,
    DashboardWidgetConfig,
    DashboardWidgetSection,
} from '../definitions/dashboard-widget.model';
import { containerLayoutGridColumns } from './dashboard-layout-structure.util';

function resolveRowSpan(config: DashboardWidgetConfig): number {
    if (config.gridRowSpan != null && Number.isFinite(config.gridRowSpan)) {
        return Math.max(1, Math.min(24, Math.round(config.gridRowSpan)));
    }
    switch (config.type) {
        case 'chart':
            return 5;
        case 'table':
            return 8;
        case 'gauge':
        case 'metric':
            return 4;
        default:
            return 3;
    }
}

export interface DashboardWidgetSpanOption {
    value: number;
    labelKey: string;
}

const INSIGHTS_SPAN_OPTIONS: DashboardWidgetSpanOption[] = [
    { value: 3, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_QUARTER' },
    { value: 4, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_THIRD' },
    { value: 6, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_HALF' },
    { value: 8, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_TWO_THIRDS' },
    { value: 12, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_FULL' },
];

const METRICS_SPAN_OPTIONS: DashboardWidgetSpanOption[] = [
    { value: 1, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_METRIC_QUARTER' },
    { value: 2, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_METRIC_HALF' },
    { value: 3, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_METRIC_THREE_QUARTERS' },
    { value: 4, labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.SPAN_METRIC_FULL' },
];

export function widgetSectionGridColumns(section: DashboardWidgetSection | undefined): number {
    switch (section) {
        case 'metrics':
            return 4;
        case 'tasks':
            return 1;
        default:
            return 12;
    }
}

export function gridColumnsForWidget(config: DashboardWidgetConfig, layoutMode?: DashboardContainerLayoutMode): number {
    if (layoutMode) {
        return containerLayoutGridColumns(layoutMode);
    }
    return widgetSectionGridColumns(config.section);
}

export function spanOptionsForLayoutMode(layoutMode: DashboardContainerLayoutMode | undefined): DashboardWidgetSpanOption[] {
    return layoutMode === 'grid-4' ? METRICS_SPAN_OPTIONS : INSIGHTS_SPAN_OPTIONS;
}

export function spanOptionsForSection(section: DashboardWidgetSection | undefined): DashboardWidgetSpanOption[] {
    return section === 'metrics' ? METRICS_SPAN_OPTIONS : INSIGHTS_SPAN_OPTIONS;
}

export function defaultGridColumnSpan(section: DashboardWidgetSection | undefined, type: DashboardWidgetConfig['type']): number {
    if (section === 'metrics') {
        return 1;
    }
    if (section === 'tasks') {
        return 1;
    }
    if (type === 'chart' || type === 'table') {
        return 12;
    }
    if (type === 'link-card') {
        return 4;
    }
    if (type === 'task-status-summary' || type === 'task-recent-list') {
        return 6;
    }
    return 4;
}

export function resolveWidgetColumnSpan(config: DashboardWidgetConfig, layoutMode?: DashboardContainerLayoutMode): number {
    const max = gridColumnsForWidget(config, layoutMode);
    const fallback = legacySpanToColumns(config.span, config.section);

    if (config.gridColumnSpan != null && Number.isFinite(config.gridColumnSpan)) {
        return clampColumnSpan(config.gridColumnSpan, max);
    }

    return clampColumnSpan(fallback, max);
}

export function clampColumnSpan(span: number, maxColumns: number): number {
    const max = Math.max(1, maxColumns);
    return Math.min(max, Math.max(1, Math.round(span)));
}

export function legacySpanToColumns(span: DashboardWidgetConfig['span'], section: DashboardWidgetSection | undefined): number {
    if (section === 'metrics') {
        return 1;
    }
    if (section === 'tasks') {
        return 1;
    }

    switch (span) {
        case 'full':
            return 12;
        case 'wide':
            return 8;
        case 'metric':
            return 4;
        default:
            return 4;
    }
}

export function columnsToLegacySpan(columns: number, section: DashboardWidgetSection | undefined): DashboardWidgetConfig['span'] {
    if (section === 'metrics') {
        return 'metric';
    }
    if (section === 'tasks' || columns >= 12) {
        return 'full';
    }
    if (columns >= 8) {
        return 'wide';
    }
    return 'normal';
}

export function normalizeWidgetColumnSpan(
    config: DashboardWidgetConfig,
    layoutMode?: DashboardContainerLayoutMode
): DashboardWidgetConfig {
    const gridColumnSpan = resolveWidgetColumnSpan(config, layoutMode);
    const gridRowSpan = resolveRowSpan(config);
    const section = config.section;
    const max = gridColumnsForWidget(config, layoutMode);
    let canvasRect = config.canvasRect;
    if (canvasRect) {
        canvasRect = {
            col: Math.max(1, Math.min(max - gridColumnSpan + 1, Math.round(canvasRect.col))),
            row: Math.max(1, Math.round(canvasRect.row)),
            colSpan: Math.max(1, Math.min(max, gridColumnSpan)),
            rowSpan: Math.max(1, Math.min(24, gridRowSpan)),
        };
    }
    return {
        ...config,
        gridColumnSpan,
        gridRowSpan,
        span: columnsToLegacySpan(gridColumnSpan, section),
        canvasRect,
    };
}

export function showCardSizeControl(
    config: DashboardWidgetConfig,
    layoutMode?: DashboardContainerLayoutMode
): boolean {
    return (
        layoutMode !== 'list' &&
        layoutMode !== 'kpi-strip' &&
        config.section !== 'tasks' &&
        config.type !== 'process-list' &&
        config.type !== 'task-status-summary' &&
        config.type !== 'task-recent-list'
    );
}

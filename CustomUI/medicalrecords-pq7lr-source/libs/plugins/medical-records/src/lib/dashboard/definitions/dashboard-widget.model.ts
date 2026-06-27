export type DashboardWidgetType = 'metric' | 'chart' | 'process-list';

export type DashboardWidgetId =
    | 'recovery-rate'
    | 'productivity-chart'
    | 'completion-rate'
    | 'document-volume'
    | 'performance-metrics'
    | 'process-list';

export interface DashboardWidgetConfig {
    id: DashboardWidgetId;
    type: DashboardWidgetType;
    titleKey?: string;
    helperKey?: string;
    icon?: string;
    contentQuery?: string;
    demoValue?: string;
    demoHelperKey?: string;
    positive?: boolean;
    span?: 'normal' | 'wide' | 'full';
}

export interface DashboardLayoutState {
    widgetOrder: DashboardWidgetId[];
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig>;
}

export interface DashboardMetricWidgetData {
    value: string;
    helper?: string;
    positive?: boolean;
    loading: boolean;
    error?: string;
    source: 'content' | 'demo';
}

export interface DashboardChartWidgetData {
    bars: number[];
    loading: boolean;
    error?: string;
    source: 'content' | 'demo';
}

export interface DashboardContentQueryResult {
    totalCount: number;
    documents: Array<{ id?: string; name?: string; [key: string]: unknown }>;
}

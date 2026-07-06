export type DashboardWidgetType =
    | 'metric'
    | 'chart'
    | 'table'
    | 'process-list'
    | 'gauge'
    | 'link-card'
    | 'task-status-summary'
    | 'task-recent-list';

export type DashboardLinkTargetType = 'route' | 'external';

export interface DashboardLinkCardOptions {
    linkTargetType?: DashboardLinkTargetType;
    linkRoute?: string;
    linkUrl?: string;
    buttonLabel?: string;
    openInNewTab?: boolean;
}

export interface DashboardTaskWidgetOptions {
    maxItems?: number;
    ctaRoute?: string;
    ctaLabel?: string;
    ctaOpenInNewTab?: boolean;
}

export interface DashboardColorStop {
    color: string;
    position?: number;
}

export interface DashboardSeriesStyle {
    mode: 'solid' | 'gradient';
    color?: string;
    gradientStops?: DashboardColorStop[];
    presetId?: string;
}

export interface DashboardBrandColors {
    teal: string;
    purple: string;
    blue: string;
    yellow: string;
    darkBlue: string;
    gray: string;
}

export interface DashboardThemeConfig {
    brand: DashboardBrandColors;
    primaryAccent: string;
    defaultSeriesStyle: DashboardSeriesStyle;
    seriesPalette: string[];
    statusColors?: Record<string, string>;
}

export type DashboardSeriesPresetId =
    | 'hyland-purple-wave'
    | 'hyland-teal'
    | 'hyland-purple-solid'
    | 'hyland-blue-solid'
    | 'custom';

export type DashboardWidgetId = string;

export type DashboardWidgetSection = 'insights' | 'metrics' | 'tasks';

/** How widgets are arranged inside a container. */
export type DashboardContainerLayoutMode = 'kpi-strip' | 'grid-4' | 'grid-12' | 'list';

export interface DashboardContainerConfig {
    id: string;
    title: string;
    subtitle?: string;
    layoutMode: DashboardContainerLayoutMode;
    widgetIds: DashboardWidgetId[];
    collapsed?: boolean;
}

export interface DashboardPageConfig {
    id: string;
    label: string;
    containers: DashboardContainerConfig[];
}

export type DashboardDataSource = 'content' | 'process' | 'demo';

export interface DashboardProcessListOptions {
    showSearch?: boolean;
    showRefresh?: boolean;
    showBulkActions?: boolean;
    showSubtitle?: boolean;
    showCountBadge?: boolean;
    /** Where clicking a task row navigates. Default: open the task form directly. */
    openTarget?: ProcessListOpenTarget;
}

export type ProcessListOpenTarget = 'task' | 'subprocess' | 'macroProcess';

export interface DashboardTableWidgetOptions {
    /** Client-side text filter over visible rows in the report table. */
    showRowFilter?: boolean;
    /** Ordered fields used to nest report rows into collapsible groups. */
    groupByFields?: string[];
}

export type ChartAggregation = 'count' | 'sum';
export type NumericFieldAggregation = 'sum' | 'min' | 'max' | 'avg';
export type ValueAggregation = 'count' | NumericFieldAggregation;
export type ValueFieldFormat = 'number' | 'percent';
export type ChartDateBucket = 'hour' | 'day' | 'week' | 'month';
export type ChartDisplayMode = 'bar' | 'line' | 'stacked-bar' | 'horizontal-stacked' | 'donut';
export type ChartHeadlineAggregation = 'last' | 'sum' | 'avg' | 'max';
export type DashboardFieldKind = 'date' | 'number' | 'category' | 'json';
export type TrendDirection = 'up' | 'down' | 'flat';
export type ComparisonPeriod = 'none' | 'previous_week' | 'previous_month';
/** @deprecated Use DashboardDateRange via DashboardPeriodService */
export type DashboardPeriod = 'week' | 'month';

export interface DashboardDateRange {
    start: Date;
    end: Date;
}

/** ISO date strings (YYYY-MM-DD) persisted in layout JSON. */
export interface DashboardDateRangePreference {
    start: string;
    end: string;
}
export type GaugeMode = 'count' | 'ratio';

export interface DashboardChartHeadlineConfig {
    show?: boolean;
    label?: string;
    aggregation?: ChartHeadlineAggregation;
}

export interface DashboardWidgetDataBindings {
    argumentField?: string;
    argumentFieldPath?: string;
    valueAggregation?: ValueAggregation;
    valueField?: string;
    valueFieldPath?: string;
    /** How to interpret aggregated numeric values (e.g. decimal 0–1 as percent). */
    valueFieldFormat?: ValueFieldFormat;
    seriesField?: string;
    seriesFieldPath?: string;
    dateBucket?: ChartDateBucket;
    columnFields?: string[];
    maxBuckets?: number;
}

export interface DashboardChartConfig {
    xField?: string;
    xFieldPath?: string;
    yAggregation?: ChartAggregation;
    yField?: string;
    yFieldPath?: string;
    seriesFieldPath?: string;
    dateBucket?: ChartDateBucket;
    maxBuckets?: number;
}

export type ChartXLabelFormat = 'auto' | 'full';

export interface DashboardChartAxisOptions {
    /** Title shown below the X axis */
    xLabel?: string;
    /** Title shown beside the Y axis */
    yLabel?: string;
    /** Optional fixed Y-axis maximum (auto-scales when empty) */
    yMax?: number;
    /** Shorten date labels and trim long categories */
    xLabelFormat?: ChartXLabelFormat;
}

export interface DashboardJsonFieldPathOption {
    path: string;
    label: string;
    sample?: string;
    kind: DashboardFieldKind;
}

export interface DashboardFieldDescriptor {
    key: string;
    kind: DashboardFieldKind;
    jsonPaths?: DashboardJsonFieldPathOption[];
}

export interface DashboardProcessQueryConfig {
    status?: string[];
    /** Selected process from catalog (processDefinitionKey) */
    processDefinitionKey?: string;
    /** @deprecated Use processDefinitionKey */
    processDefinitionName?: string;
    /** Query known subprocess definition keys for this root process */
    includeSubprocesses?: boolean;
    /** Explicit subprocess keys to include when metricScope is tree. Empty = root only. */
    includedSubprocessDefinitionKeys?: string[];
    /** root = chart/metric counts root intakes only; tree = all instances in the family */
    metricScope?: 'root' | 'tree';
    /** Fetch BPMN variables per instance (table/report columns prefixed with var_). */
    includeProcessVariables?: boolean;
}

export interface DashboardWidgetCanvasRect {
    /** 1-based column start within the section grid. */
    col: number;
    /** 1-based row start within the section canvas. */
    row: number;
    colSpan: number;
    rowSpan: number;
}

export interface DashboardWidgetConfig {
    id: DashboardWidgetId;
    type: DashboardWidgetType;
    /** @deprecated Use title instead */
    titleKey?: string;
    /** @deprecated Use helper instead */
    helperKey?: string;
    title?: string;
    helper?: string;
    icon?: string;
    contentQuery?: string;
    processQuery?: DashboardProcessQueryConfig;
    dataSource?: DashboardDataSource;
    demoValue?: string;
    demoHelperKey?: string;
    positive?: boolean;
    span?: 'normal' | 'wide' | 'full' | 'metric';
    /** Grid columns occupied in the widget section (1–12 insights, 1–4 metrics). */
    gridColumnSpan?: number;
    /** Grid row span on the section canvas (each row ≈ 52px). */
    gridRowSpan?: number;
    /** Optional explicit card height in pixels. */
    cardHeightPx?: number;
    /** Free-form position on the section canvas (builder + runtime). */
    canvasRect?: DashboardWidgetCanvasRect;
    /** Parent container id (pages → containers → widgets). */
    containerId?: string;
    /** @deprecated Derived from container layoutMode; kept for migration. */
    section?: DashboardWidgetSection;
    tablePageSize?: number;
    tableColumnKeys?: string;
    tableOptions?: DashboardTableWidgetOptions;
    processListOptions?: DashboardProcessListOptions;
    /** @deprecated Prefer bindings */
    chart?: DashboardChartConfig;
    bindings?: DashboardWidgetDataBindings;
    /** Bar columns or connected line series. */
    chartDisplayMode?: ChartDisplayMode;
    /** Axis titles and scale options for chart widgets. */
    chartAxes?: DashboardChartAxisOptions;
    /** Gauge scale minimum (default 0) */
    gaugeMin?: number;
    /** Gauge scale maximum (default 100) */
    gaugeMax?: number;
    /** Optional target marker on the gauge arc */
    gaugeTarget?: number;
    /** Suffix shown with the value, e.g. % */
    gaugeUnit?: string;
    /** Override global series color / gradient for chart widgets. */
    chartSeriesStyle?: DashboardSeriesStyle;
    /** Structured delta shown below the metric value. */
    trendDirection?: TrendDirection;
    trendValue?: string;
    trendLabel?: string;
    /** Info icon tooltip for the metric helper row. */
    helperTooltip?: string;
    /** When set, trend is computed from current vs previous period data. */
    comparisonPeriod?: ComparisonPeriod;
    /** Headline value shown in the chart widget header. */
    chartHeadline?: DashboardChartHeadlineConfig;
    /** count = raw total; ratio = numerator/denominator percentage (gauge widgets). */
    gaugeMode?: GaugeMode;
    /** Compact KPI strip variant (header row under page hero). */
    headerKpi?: boolean;
    linkCardOptions?: DashboardLinkCardOptions;
    taskWidgetOptions?: DashboardTaskWidgetOptions;
}

export interface DashboardLayoutState {
    /** Schema version — 8 introduces pages/containers/tabs. */
    version?: number;
    pages: DashboardPageConfig[];
    /** Active tab in builder/runtime. */
    activePageId?: string;
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig>;
    theme?: DashboardThemeConfig;
    /**
     * Phase 2: repository document id for shared layout JSON.
     * @see DashboardLayoutPersistenceProvider
     */
    layoutSourceDocumentId?: string | null;
    /** Global dashboard date filter persisted with layout JSON in Appdata/Dashboards. */
    dateRange?: DashboardDateRangePreference;
    /** @deprecated v7 flat order — migrated into pages[].containers[].widgetIds */
    widgetOrder?: DashboardWidgetId[];
    /** @deprecated v7 KPI strip — migrated into a kpi-strip container */
    headerKpiWidgetIds?: DashboardWidgetId[];
}

export interface DashboardMetricWidgetData {
    value: string;
    helper?: string;
    positive?: boolean;
    trendDirection?: TrendDirection;
    trendValue?: string;
    trendLabel?: string;
    helperTooltip?: string;
    loading: boolean;
    error?: string;
    source: DashboardDataSource;
}

export type DashboardGaugeTone = 'low' | 'medium' | 'high';

export interface DashboardGaugeWidgetData {
    value: number;
    displayValue: string;
    percentage: number;
    min: number;
    max: number;
    target?: number;
    unit?: string;
    loading: boolean;
    error?: string;
    source: DashboardDataSource;
    tone: DashboardGaugeTone;
}

export interface DashboardChartSeries {
    key: string;
    values: number[];
}

export interface DashboardChartWidgetData {
    labels: string[];
    bars: number[];
    values: number[];
    /** Stacked/multi-series values aligned with labels. */
    series?: DashboardChartSeries[];
    loading: boolean;
    error?: string;
    source: DashboardDataSource;
}

export interface DashboardContentQueryResult {
    totalCount: number;
    documents: Array<{ id?: string; name?: string; [key: string]: unknown }>;
}

export interface DashboardProcessQueryResult {
    totalCount: number;
    rows: Array<Record<string, unknown>>;
    error?: string;
}

export interface DashboardTableWidgetData {
    rows: Record<string, string>[];
    columns: string[];
    totalCount: number;
    loading: boolean;
    error?: string;
    source: DashboardDataSource;
}

export const DEFAULT_PROCESS_LIST_OPTIONS: Required<DashboardProcessListOptions> = {
    showSearch: true,
    showRefresh: true,
    showBulkActions: true,
    showSubtitle: true,
    showCountBadge: true,
    openTarget: 'task',
};

export const DEFAULT_HEADER_KPI_WIDGET_IDS = [
    'document-volume',
    'completion-rate',
    'recovery-rate',
    'metric-total-processes',
] as const;

export const INSIGHT_WIDGET_IDS = [
    'productivity-chart',
    'outcome-distribution',
] as const;

export const CONTENT_WIDGET_IDS = [
    'metric-content-total',
    'metric-content-recent',
    'chart-content-doc-types',
    'chart-content-uploads',
    'documents-report',
] as const;

export const METRIC_WIDGET_IDS = [
    'metric-completed',
    'metric-pending',
    'metric-error-rate',
    'metric-user-activity',
    'metric-sla-compliance',
    'metric-avg-days-payment',
    'metric-execution-queue',
] as const;

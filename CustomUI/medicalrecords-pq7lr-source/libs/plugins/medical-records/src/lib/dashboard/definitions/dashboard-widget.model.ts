export type DashboardWidgetType =
    | 'metric'
    | 'chart'
    | 'table'
    | 'process-list'
    | 'gauge'
    | 'link-card'
    | 'task-status-summary'
    | 'task-recent-list'
    | 'provider-cards';

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
    /** Widget frame: `card` (bordered card, default) or `accent-line` (no box, accent line on the left). */
    widgetChrome?: DashboardWidgetChrome;
    /** Type and spacing scale: `comfortable` (default) or `compact` (fits the whole operation on one screen). */
    density?: DashboardDensity;
}

export type DashboardDensity = 'comfortable' | 'compact';

export type DashboardWidgetChrome = 'card' | 'accent-line';

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
    /** KPI strip only: number of columns (1-12). Widgets span `gridColumnSpan` columns (default 1). */
    columns?: number;
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
    /** Root-process variables the list reads (requested through the data plan). Default: see PROCESS_LIST_DEFAULT_VARIABLES. */
    variables?: string[];
    /** `table`: compact rows under a column header (default); `cards`: stacked case cards. */
    display?: 'table' | 'cards';
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
    /** Data planner only: explicit process definition names (union of the layout's widgets). */
    definitionNames?: string[];
    /** Data planner only: variables returned inline by the process list (`processDefinitionKey/name`). */
    variableKeys?: string[];
}

export interface DashboardWidgetCanvasRect {
    /** 1-based column start within the section grid. */
    col: number;
    /** 1-based row start within the section canvas. */
    row: number;
    colSpan: number;
    rowSpan: number;
}

/** Options for metric widgets rendered as configurable KPI cards (operations view + builder preview). */
export interface DashboardKpiCardOptions {
    /** Show the real-origin chip (live / demo / error). Default: true. */
    showOrigin?: boolean;
    /** Optional thresholds that drive the accent color of the card. */
    thresholds?: {
        warnAt?: number;
        dangerAt?: number;
        direction?: 'higher-is-worse' | 'lower-is-worse';
    };
}

/** Options of the provider-cards widget (one KPI card per provider found in the process batchState). */
export interface DashboardProviderCardsOptions {
    /** Ordered KPI keys shown on each card; empty = defaults (running, completed, cancelled, total). */
    kpis?: Array<'running' | 'completed' | 'cancelled' | 'total' | 'reviewRequired'>;
    /** What the cards group by. Default: the provider fields of the IDP batchState. */
    groupBy?: DashboardProviderGroupBy;
    /** Sub-KPIs counted per card. Empty = legacy `kpis` keys. */
    metrics?: DashboardProviderCardMetric[];
    /** Process statuses loaded (and enriched with variables). Default: active only (RUNNING, SUSPENDED). */
    statuses?: string[];
    /** Process variable with the IDP output (documents with fields). Default: batchState. */
    idpVariable?: string;
    /** Optional light summary variable written by Automate (e.g. accountSummary). */
    summaryVariable?: string;
    /** Search box in the header, shared with the widgets that follow the filter (default true). */
    showSearch?: boolean;
}

/** One sub-KPI of a filter card, computed over the process instances of that card. */
export interface DashboardProviderCardMetric {
    id: string;
    label: string;
    /**
     * count: instances in the card; status: instances with `status`; field-equals: instances whose
     * `field` equals `equals`; review-required: batchState still needs human review; sum: numeric sum of `field`.
     */
    kind: 'count' | 'status' | 'field-equals' | 'review-required' | 'sum';
    status?: string;
    field?: DashboardProviderGroupBy;
    equals?: string;
}

/** How a widget reacts to the filter-card selection (e.g. the selected provider). */
export interface DashboardCrossFilterOptions {
    /** Filter this widget's rows by the selected card (process-list widgets). */
    follow?: boolean;
    /** Show the widget always, only while a card is selected, or only while none is. */
    visibility?: 'always' | 'when-selected' | 'when-not-selected';
}

export interface DashboardProviderGroupBy {
    /** `batch-field`: a field extracted by IDP inside `batchState`; `process-variable`: a process variable. */
    source: 'batch-field' | 'process-variable';
    /** Field or variable name; empty with `batch-field` = provider aliases (Nombre del Prestador, IPS, ...). */
    name?: string;
    /** batch-field only: variable holding the IDP output. Default: the widget's IDP variable. */
    variable?: string;
}

/** Emitted when the user picks a provider card. */
export interface DashboardProviderSelection {
    key: string;
    /** Display name; null for the unidentified group. */
    name: string | null;
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
    /** KPI card presentation for metric widgets; absent = legacy metric look. */
    kpiCard?: DashboardKpiCardOptions;
    /** Provider cards configuration (type provider-cards). */
    providerCardsOptions?: DashboardProviderCardsOptions;
    /** Reaction to the filter-card selection (any widget type). */
    crossFilter?: DashboardCrossFilterOptions;
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
    /** Empty = the data plan uses PROCESS_LIST_DEFAULT_VARIABLES. */
    variables: [],
    display: 'table',
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

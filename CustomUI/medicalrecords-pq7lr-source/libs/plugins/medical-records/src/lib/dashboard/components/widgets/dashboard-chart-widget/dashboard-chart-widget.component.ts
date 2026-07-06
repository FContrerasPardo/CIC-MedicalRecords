import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostBinding,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import {
    ChartDisplayMode,
    ChartHeadlineAggregation,
    DashboardChartSeries,
    DashboardChartWidgetData,
    DashboardWidgetConfig,
} from '../../../definitions/dashboard-widget.model';
import { resolveChartConfig } from '../../../mappers/dashboard-widget-bindings.mapper';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';
import { DashboardPeriodService } from '../../../services/dashboard-period.service';
import { DashboardThemeService } from '../../../services/dashboard-theme.service';
import { DashboardWidgetRegistryService } from '../../../services/dashboard-widget-registry.service';
import {
    buildYAxisTicks,
    formatChartTick,
    formatChartXLabel,
    resolveChartScaleMax,
    valueToPlotPercent,
} from '../../../utils/dashboard-chart-axis.util';
import { buildSmoothAreaPath, buildSmoothLinePath } from '../../../utils/dashboard-chart-curve.util';
import { buildFieldsDiscoveryFingerprint } from '../../../utils/dashboard-data-source.util';
import { paletteColorAt, seriesStyleToCssBackground } from '../../../utils/dashboard-theme.util';

interface ChartPoint {
    x: number;
    y: number;
}

interface DonutSegment {
    index: number;
    path: string;
    color: string;
    label: string;
    value: number;
}

const LINE_PAD_TOP = 12;
const LINE_PAD_BOTTOM = 8;

@Component({
    selector: 'medical-records-dashboard-chart-widget',
    standalone: true,
    imports: [CommonModule, TranslateModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-chart-widget.component.html',
    styleUrls: ['./dashboard-chart-widget.component.scss'],
})
export class DashboardChartWidgetComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    @Input({ required: true }) config!: DashboardWidgetConfig;
    @Input() pageActive = true;
    @Input() fillCanvasSlot = false;

    @ViewChild('chartPlot') chartPlotRef?: ElementRef<HTMLElement>;

    @HostBinding('class.dashboard-widget--canvas-slot')
    get canvasSlotClass(): boolean {
        return this.fillCanvasSlot;
    }

    data: DashboardChartWidgetData = {
        labels: [],
        bars: [],
        values: [],
        loading: true,
        source: 'demo',
    };

    private readonly destroy$ = new Subject<void>();
    private loadSubscription?: Subscription;
    private lastLoadFingerprint = '';
    private plotResizeObserver?: ResizeObserver;
    hoveredDonutIndex: number | null = null;
    linePlotWidth = 320;
    linePlotHeight = 180;

    constructor(
        private readonly widgetRegistry: DashboardWidgetRegistryService,
        private readonly themeService: DashboardThemeService,
        private readonly periodService: DashboardPeriodService,
        private readonly changeDetectorRef: ChangeDetectorRef
    ) {}

    get sourceLabelKey(): string {
        switch (this.data.source) {
            case 'content':
                return 'MEDICAL_RECORDS.DASHBOARD.SOURCE_CONTENT';
            case 'process':
                return 'MEDICAL_RECORDS.DASHBOARD.SOURCE_PROCESS';
            default:
                return 'MEDICAL_RECORDS.DASHBOARD.SOURCE_DEMO';
        }
    }

    get showDemoSegment(): boolean {
        return this.data.source === 'demo';
    }

    get displayMode(): ChartDisplayMode {
        return this.config.chartDisplayMode ?? 'bar';
    }

    get isLineMode(): boolean {
        return this.displayMode === 'line';
    }

    get isStackedBarMode(): boolean {
        return this.displayMode === 'stacked-bar';
    }

    get isHorizontalStackedMode(): boolean {
        return this.displayMode === 'horizontal-stacked';
    }

    get hasStackedSeries(): boolean {
        return this.chartSeries.length > 0;
    }

    get renderStackedBarMode(): boolean {
        return this.isStackedBarMode && this.hasStackedSeries;
    }

    get renderHorizontalStackedMode(): boolean {
        return this.isHorizontalStackedMode && this.hasStackedSeries;
    }

    get renderSimpleBarFallback(): boolean {
        return (this.isStackedBarMode || this.isHorizontalStackedMode) && !this.hasStackedSeries;
    }

    get isDonutMode(): boolean {
        return this.displayMode === 'donut';
    }

    get isCompactChart(): boolean {
        return this.isLineMode && (this.config.gridRowSpan ?? 0) <= 3;
    }

    get isVerticalBarMode(): boolean {
        return (this.displayMode === 'bar' && !this.isStackedBarMode) || this.renderSimpleBarFallback;
    }

    get hasChartAxis(): boolean {
        return !!resolveChartConfig(this.config).xField;
    }

    get showChart(): boolean {
        return !this.data.loading && this.data.labels.length > 0 && (this.hasChartAxis || this.data.source === 'demo');
    }

    get showEmptyState(): boolean {
        return !this.data.loading && this.data.source !== 'demo' && (!this.data.labels.length || !!this.data.error);
    }

    get scaleMax(): number {
        if (this.renderStackedBarMode || this.renderHorizontalStackedMode) {
            const stackedMax = this.data.labels.reduce((max, _, index) => {
                const total = (this.data.series ?? []).reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0);
                return Math.max(max, total);
            }, 0);
            return resolveChartScaleMax([stackedMax], this.config.chartAxes?.yMax);
        }
        return resolveChartScaleMax(this.data.values, this.config.chartAxes?.yMax);
    }

    get yAxisTicks(): number[] {
        return buildYAxisTicks(this.scaleMax, 5);
    }

    get yAxisTicksDesc(): number[] {
        return [...this.yAxisTicks].reverse();
    }

    get plotPercents(): number[] {
        return this.data.values.map((value) => valueToPlotPercent(value, this.scaleMax));
    }

    get gridLinePercents(): number[] {
        return this.yAxisTicks.filter((tick) => tick > 0).map((tick) => valueToPlotPercent(tick, this.scaleMax));
    }

    get formattedXLabels(): string[] {
        const mode = this.config.chartAxes?.xLabelFormat ?? 'auto';
        const dateBucket = resolveChartConfig(this.config).dateBucket;
        const labelCount = this.data.labels.length;
        return this.data.labels.map((label) => formatChartXLabel(label, mode, dateBucket, labelCount));
    }

    get rotateXLabels(): boolean {
        return this.data.labels.length > 5 && !this.isHorizontalStackedMode && !this.isDonutMode;
    }

    plotXPercent(index: number): number {
        const count = this.data.labels.length;
        if (count <= 1) {
            return 50;
        }
        return (index / (count - 1)) * 100;
    }

    lineMarkerLeftPercent(x: number): number {
        if (!this.linePlotWidth) {
            return 0;
        }
        return (x / this.linePlotWidth) * 100;
    }

    lineMarkerTopPercent(y: number): number {
        if (!this.linePlotHeight) {
            return 0;
        }
        return (y / this.linePlotHeight) * 100;
    }

    xAxisLabelTitle(labelIndex: number): string | null {
        const raw = this.data.labels[labelIndex]?.trim() ?? '';
        const formatted = this.formattedXLabels[labelIndex] ?? '';
        if (!raw || raw === formatted) {
            return null;
        }
        return raw;
    }

    get customXAxisLabel(): string {
        return this.config.chartAxes?.xLabel?.trim() ?? '';
    }

    get customYAxisLabel(): string {
        return this.config.chartAxes?.yLabel?.trim() ?? '';
    }

    get defaultXAxisLabelKey(): string {
        const chart = resolveChartConfig(this.config);
        if (!chart.xField) {
            return 'MEDICAL_RECORDS.CHART.AXIS_X_DEFAULT';
        }
        if (chart.dateBucket === 'week') {
            return 'MEDICAL_RECORDS.CHART.AXIS_X_WEEK';
        }
        if (chart.dateBucket === 'month') {
            return 'MEDICAL_RECORDS.CHART.AXIS_X_MONTH';
        }
        if (chart.dateBucket === 'hour') {
            return 'MEDICAL_RECORDS.CHART.AXIS_X_HOUR';
        }
        if (chart.dateBucket === 'day' || /date|time/i.test(chart.xField)) {
            return 'MEDICAL_RECORDS.CHART.AXIS_X_DATE';
        }
        return 'MEDICAL_RECORDS.CHART.AXIS_X_CATEGORY';
    }

    get defaultYAxisLabelKey(): string {
        const chart = resolveChartConfig(this.config);
        return chart.yAggregation === 'sum' ? 'MEDICAL_RECORDS.CHART.AXIS_Y_SUM' : 'MEDICAL_RECORDS.CHART.AXIS_Y_COUNT';
    }

    get lineGradientId(): string {
        return `chart-line-fill-${this.config.id}`;
    }

    get lineChartViewBox(): string {
        return `0 0 ${this.linePlotWidth} ${this.linePlotHeight}`;
    }

    get linePoints(): ChartPoint[] {
        return this.buildLinePoints();
    }

    get lineStrokePath(): string {
        return buildSmoothLinePath(this.linePoints);
    }

    get lineAreaPath(): string {
        const points = this.linePoints;
        if (!points.length) {
            return '';
        }

        return buildSmoothAreaPath(points, this.lineBaselineY());
    }

    get showHeadline(): boolean {
        return this.config.chartHeadline?.show === true && !!this.headlineValue;
    }

    get headlineLabel(): string {
        return this.config.chartHeadline?.label?.trim() ?? '';
    }

    get headlineValue(): string {
        const aggregation: ChartHeadlineAggregation = this.config.chartHeadline?.aggregation ?? 'last';
        const values = this.data.values;
        if (!values.length) {
            return '';
        }
        if (aggregation === 'sum') {
            return formatChartTick(values.reduce((sum, value) => sum + value, 0));
        }
        if (aggregation === 'avg') {
            const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
            return formatChartTick(avg);
        }
        if (aggregation === 'max') {
            return formatChartTick(Math.max(...values));
        }
        return formatChartTick(values[values.length - 1]);
    }

    get chartSeries(): DashboardChartSeries[] {
        return this.data.series ?? [];
    }

    get donutSegments(): DonutSegment[] {
        return this.buildDonutSegments();
    }

    get donutTotal(): number {
        return this.data.values.reduce((sum, value) => sum + value, 0);
    }

    truncateDonutLabel(label: string, maxLength = 28): string {
        const trimmed = label.trim();
        if (trimmed.length <= maxLength) {
            return trimmed;
        }
        return `${trimmed.slice(0, maxLength - 1)}…`;
    }

    onDonutHover(index: number | null): void {
        this.hoveredDonutIndex = index;
    }

    isDonutSegmentActive(index: number): boolean {
        return this.hoveredDonutIndex === index;
    }

    isDonutSegmentDimmed(index: number): boolean {
        return this.hoveredDonutIndex != null && this.hoveredDonutIndex !== index;
    }

    get donutCenterValue(): string {
        if (this.hoveredDonutIndex != null) {
            const segment = this.donutSegments[this.hoveredDonutIndex];
            return segment ? String(segment.value) : String(this.donutTotal);
        }
        return String(this.donutTotal);
    }

    get hoveredDonutLabel(): string {
        if (this.hoveredDonutIndex == null) {
            return '';
        }
        const segment = this.donutSegments[this.hoveredDonutIndex];
        return segment ? this.truncateDonutLabel(segment.label, 18) : '';
    }

    formatChartValue(value: number): string {
        return formatChartTick(value);
    }

    ngOnInit(): void {
        this.periodService.dateRange$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            if (this.pageActive) {
                this.loadData();
            }
        });
    }

    ngAfterViewInit(): void {
        this.observePlotSize();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.config || !changes['config']) {
            if (changes['pageActive']?.currentValue === true) {
                this.loadData(true);
            }
            return;
        }
        this.loadData(true);
    }

    ngOnDestroy(): void {
        this.plotResizeObserver?.disconnect();
        this.loadSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
    }

    trackByIndex(index: number): number {
        return index;
    }

    trackSeries(_: number, series: DashboardChartSeries): string {
        return series.key;
    }

    get lineAccentColor(): string {
        const style = this.themeService.resolveSeriesStyle(this.config.chartSeriesStyle);
        if (style.mode === 'solid' && style.color) {
            return style.color;
        }
        return this.themeService.theme.primaryAccent;
    }

    barBackground(index: number): string {
        const style = this.themeService.resolveSeriesStyle(this.config.chartSeriesStyle);
        if (style.mode === 'gradient' && !this.isStackedBarMode && !this.isHorizontalStackedMode) {
            return seriesStyleToCssBackground(style);
        }
        const palette = this.themeService.theme.seriesPalette;
        const color = style.color ?? paletteColorAt(palette, index);
        return seriesStyleToCssBackground({ mode: 'solid', color });
    }

    seriesSegmentBackground(seriesIndex: number, seriesKey: string): string {
        if (this.config.bindings?.seriesField === 'status' && seriesKey) {
            return this.themeService.statusColor(seriesKey);
        }

        const style = this.themeService.resolveSeriesStyle(this.config.chartSeriesStyle);
        const palette = this.themeService.theme.seriesPalette;
        const color = style.color ?? paletteColorAt(palette, seriesIndex);
        return seriesStyleToCssBackground({ mode: 'solid', color });
    }

    horizontalBarLabel(labelIndex: number): string {
        return this.formattedXLabels[labelIndex] ?? this.data.labels[labelIndex] ?? '';
    }

    horizontalBarLabelTitle(labelIndex: number): string {
        return this.data.labels[labelIndex] ?? this.horizontalBarLabel(labelIndex);
    }

    seriesLegendTotal(seriesIndex: number): number {
        return this.chartSeries[seriesIndex]?.values.reduce((sum, value) => sum + value, 0) ?? 0;
    }

    formatTick(value: number): string {
        return formatChartTick(value);
    }

    stackedSegmentHeight(seriesIndex: number, labelIndex: number): number {
        const value = this.chartSeries[seriesIndex]?.values[labelIndex] ?? 0;
        const total = this.horizontalBarTotal(labelIndex);
        return total > 0 ? (value / total) * 100 : 0;
    }

    horizontalBarWidth(seriesIndex: number, labelIndex: number): number {
        const value = this.chartSeries[seriesIndex]?.values[labelIndex] ?? 0;
        const total = this.horizontalBarTotal(labelIndex);
        return total > 0 ? (value / total) * 100 : 0;
    }

    horizontalBarTotal(labelIndex: number): number {
        return this.chartSeries.reduce((sum, entry) => sum + (entry.values[labelIndex] ?? 0), 0);
    }

    private loadData(force = false): void {
        if (!this.config || !this.pageActive) {
            return;
        }

        const fingerprint = buildFieldsDiscoveryFingerprint(this.config, this.periodService.rangeKey);
        if (!force && fingerprint === this.lastLoadFingerprint) {
            return;
        }
        this.lastLoadFingerprint = fingerprint;

        this.data = { ...this.data, loading: true, error: undefined };
        this.loadSubscription?.unsubscribe();
        this.loadSubscription = this.widgetRegistry.resolveChart(this.config).subscribe((data) => {
            this.data = data;
            this.hoveredDonutIndex = null;
            queueMicrotask(() => {
                this.observePlotSize();
                this.syncPlotSize();
            });
        });
    }

    private observePlotSize(): void {
        const plot = this.chartPlotRef?.nativeElement;
        if (!plot || typeof ResizeObserver === 'undefined') {
            this.syncPlotSize();
            return;
        }

        this.plotResizeObserver?.disconnect();
        this.plotResizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => this.syncPlotSize());
        });
        this.plotResizeObserver.observe(plot);
        this.syncPlotSize();
    }

    private syncPlotSize(): void {
        const plot = this.chartPlotRef?.nativeElement;
        if (!plot) {
            return;
        }

        const rect = plot.getBoundingClientRect();
        const width = Math.max(Math.round(rect.width), 1);
        const height = Math.max(Math.round(rect.height), 1);
        if (width === this.linePlotWidth && height === this.linePlotHeight) {
            return;
        }

        this.linePlotWidth = width;
        this.linePlotHeight = height;
        this.changeDetectorRef.markForCheck();
    }

    private buildLinePoints(): ChartPoint[] {
        const count = this.plotPercents.length;
        if (!count) {
            return [];
        }

        return this.plotPercents.map((percent, index) => ({
            x: this.lineX(index),
            y: this.lineY(percent),
        }));
    }

    private buildDonutSegments(): DonutSegment[] {
        const total = this.data.values.reduce((sum, value) => sum + value, 0);
        if (!total) {
            return [];
        }

        let cursor = 0;
        const cx = 50;
        const cy = 50;
        const radius = 42;
        const inner = 23;

        return this.data.labels.map((label, index) => {
            const value = this.data.values[index] ?? 0;
            const startAngle = (cursor / total) * 360;
            cursor += value;
            const endAngle = (cursor / total) * 360;
            const palette = this.themeService.theme.seriesPalette;
            const color = paletteColorAt(palette, index);
            return {
                index,
                label,
                value,
                color,
                path: this.describeDonutArc(cx, cy, radius, inner, startAngle, endAngle),
            };
        });
    }

    private describeDonutArc(
        cx: number,
        cy: number,
        outerR: number,
        innerR: number,
        startAngle: number,
        endAngle: number
    ): string {
        const startOuter = this.polarPoint(cx, cy, outerR, startAngle);
        const endOuter = this.polarPoint(cx, cy, outerR, endAngle);
        const startInner = this.polarPoint(cx, cy, innerR, endAngle);
        const endInner = this.polarPoint(cx, cy, innerR, startAngle);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return [
            `M ${startOuter.x} ${startOuter.y}`,
            `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
            `L ${startInner.x} ${startInner.y}`,
            `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
            'Z',
        ].join(' ');
    }

    private polarPoint(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
        const angleRad = ((angleDeg - 90) * Math.PI) / 180;
        return {
            x: cx + radius * Math.cos(angleRad),
            y: cy + radius * Math.sin(angleRad),
        };
    }

    private lineX(index: number): number {
        return (this.plotXPercent(index) / 100) * this.linePlotWidth;
    }

    private lineY(plotPercent: number): number {
        const innerHeight = Math.max(this.linePlotHeight - LINE_PAD_TOP - LINE_PAD_BOTTOM, 1);
        const clamped = Math.min(100, Math.max(0, plotPercent));
        return LINE_PAD_TOP + (1 - clamped / 100) * innerHeight;
    }

    private lineBaselineY(): number {
        return this.linePlotHeight - LINE_PAD_BOTTOM;
    }
}

import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DashboardMetricWidgetData, DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';
import { KpiAccent, KpiOriginState, parseKpiNumber, resolveKpiAccent, resolveKpiOrigin } from '../../../utils/dashboard-kpi-card.util';
import { buildFieldsDiscoveryFingerprint } from '../../../utils/dashboard-data-source.util';
import { DashboardPeriodService } from '../../../services/dashboard-period.service';
import { DashboardWidgetRegistryService } from '../../../services/dashboard-widget-registry.service';
import { buildSmoothAreaPath, buildSmoothLinePath } from '../../../utils/dashboard-chart-curve.util';

const SPARK_WIDTH = 200;
const SPARK_HEIGHT = 48;
@Component({
    selector: 'medical-records-dashboard-metric-widget',
    standalone: true,
    imports: [CommonModule, TranslateModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-metric-widget.component.html',
    styleUrls: ['./dashboard-metric-widget.component.scss'],
})
export class DashboardMetricWidgetComponent implements OnChanges, OnInit, OnDestroy {
    @Input({ required: true }) config!: DashboardWidgetConfig;
    @Input() compact = false;
    @Input() headerKpi = false;
    @Input() pageActive = true;
    @Input() fillCanvasSlot = false;

    @HostBinding('class.dashboard-widget--canvas-slot')
    get canvasSlotClass(): boolean {
        return this.fillCanvasSlot;
    }

    data: DashboardMetricWidgetData = { value: '—', loading: true, source: 'demo' };

    private readonly destroy$ = new Subject<void>();
    private loadSubscription?: Subscription;
    private lastLoadFingerprint = '';
    constructor(
        private readonly widgetRegistry: DashboardWidgetRegistryService,
        private readonly periodService: DashboardPeriodService
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

    get isKpiCard(): boolean {
        return this.headerKpi && !!this.config.kpiCard;
    }

    get showOrigin(): boolean {
        return this.isKpiCard && this.config.kpiCard?.showOrigin !== false && !this.data.loading;
    }

    get origin(): KpiOriginState {
        return resolveKpiOrigin(this.data.source, this.data.error);
    }

    get originLabelKey(): string {
        return `MEDICAL_RECORDS.DASHBOARD.KPI_ORIGIN_${this.origin.toUpperCase()}`;
    }

    get accent(): KpiAccent {
        return resolveKpiAccent(parseKpiNumber(this.data.value), this.config.kpiCard?.thresholds);
    }

    /** Text before numeric values (`metricOptions.prefix`, e.g. a currency); hidden for placeholders. */
    get prefix(): string {
        const prefix = this.config.metricOptions?.prefix?.trim() ?? '';
        return prefix && this.data.value !== '—' ? `${prefix} ` : '';
    }

    /** Unit suffix of numeric values (`metricOptions.unit`); hidden while the value is a placeholder. */
    get unit(): string {
        const unit = this.config.metricOptions?.unit?.trim() ?? '';
        return unit && this.data.value !== '—' ? unit : '';
    }

    readonly sparkViewBox = `0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`;

    /** Sparkline paths from `data.sparkline` (slices without data are skipped). */
    get sparkline(): { line: string; area: string; last: { x: number; y: number } } | null {
        const series = this.data.sparkline ?? [];
        const values = series.filter((value): value is number => value !== null);
        if (values.length < 2) {
            return null;
        }
        const max = Math.max(...values);
        const min = Math.min(...values);
        const span = max - min || 1;
        const step = series.length > 1 ? SPARK_WIDTH / (series.length - 1) : SPARK_WIDTH;
        const points = series
            .map((value, index) => (value === null ? null : { x: index * step, y: 4 + (1 - (value - min) / span) * (SPARK_HEIGHT - 8) }))
            .filter((point): point is { x: number; y: number } => !!point);
        return { line: buildSmoothLinePath(points), area: buildSmoothAreaPath(points, SPARK_HEIGHT), last: points[points.length - 1] };
    }

    get showTrend(): boolean {
        return !!(this.data.trendDirection && this.data.trendValue);
    }

    get trendIcon(): string {
        switch (this.data.trendDirection) {
            case 'up':
                return 'arrow_outward';
            case 'down':
                return 'south_east';
            default:
                return 'remove';
        }
    }

    get trendClass(): string {
        if (this.data.trendDirection === 'flat') {
            return 'trend-flat';
        }
        return this.data.positive === false ? 'trend-negative' : 'trend-positive';
    }

    ngOnInit(): void {
        this.periodService.dateRange$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            if (this.pageActive) {
                this.loadData();
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['config'] || changes['headerKpi'] || changes['compact']) {
            this.loadData(true);
        }
        if (changes['pageActive']?.currentValue === true) {
            this.loadData(true);
        }
    }

    ngOnDestroy(): void {
        this.loadSubscription?.unsubscribe();
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadData(force = false): void {
        if (!this.config || !this.pageActive) {
            return;
        }

        const fingerprint = `${buildFieldsDiscoveryFingerprint(this.config, this.periodService.rangeKey)}|header=${this.headerKpi}|compact=${this.compact}`;
        if (!force && fingerprint === this.lastLoadFingerprint) {
            return;
        }
        this.lastLoadFingerprint = fingerprint;

        this.data = { ...this.data, loading: true };
        this.loadSubscription?.unsubscribe();
        this.loadSubscription = this.widgetRegistry.resolveMetric(this.config).subscribe((data) => {
            this.data = data;
        });
    }
}
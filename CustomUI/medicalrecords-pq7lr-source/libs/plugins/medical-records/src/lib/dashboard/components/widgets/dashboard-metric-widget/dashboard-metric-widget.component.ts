import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DashboardMetricWidgetData, DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';
import { buildFieldsDiscoveryFingerprint } from '../../../utils/dashboard-data-source.util';
import { DashboardPeriodService } from '../../../services/dashboard-period.service';
import { DashboardWidgetRegistryService } from '../../../services/dashboard-widget-registry.service';
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
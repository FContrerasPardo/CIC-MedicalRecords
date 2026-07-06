import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DashboardGaugeWidgetData, DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';
import { buildFieldsDiscoveryFingerprint } from '../../../utils/dashboard-data-source.util';
import { DashboardPeriodService } from '../../../services/dashboard-period.service';
import { DashboardWidgetRegistryService } from '../../../services/dashboard-widget-registry.service';
/** Semicircle gauge geometry (shared by track, value, and target tick). */
const GAUGE = {
    cx: 100,
    cy: 100,
    radius: 80,
    stroke: 14,
};

@Component({
    selector: 'medical-records-dashboard-gauge-widget',
    standalone: true,
    imports: [CommonModule, TranslateModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-gauge-widget.component.html',
    styleUrls: ['./dashboard-gauge-widget.component.scss'],
})
export class DashboardGaugeWidgetComponent implements OnChanges, OnInit, OnDestroy {
    @Input({ required: true }) config!: DashboardWidgetConfig;
    @Input() headerKpi = false;
    @Input() pageActive = true;
    @Input() fillCanvasSlot = false;

    @HostBinding('class.dashboard-widget--canvas-slot')
    get canvasSlotClass(): boolean {
        return this.fillCanvasSlot;
    }

    data: DashboardGaugeWidgetData = {
        value: 0,
        displayValue: '—',
        percentage: 0,
        min: 0,
        max: 100,
        loading: true,
        source: 'demo',
        tone: 'medium',
    };

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

    get trackArcPath(): string {
        return this.describeArc(100);
    }

    get valueArcPath(): string | null {
        if (this.data.percentage <= 0) {
            return null;
        }
        return this.describeArc(this.data.percentage);
    }

    get targetArcPath(): string | null {
        if (this.data.target == null || this.data.max <= this.data.min) {
            return null;
        }
        const targetPct = ((this.data.target - this.data.min) / (this.data.max - this.data.min)) * 100;
        return this.describeTargetTick(Math.min(100, Math.max(0, targetPct)));
    }

    ngOnInit(): void {
        this.periodService.dateRange$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            if (this.pageActive) {
                this.loadData();
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['config'] || changes['headerKpi']) {
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

        const fingerprint = `${buildFieldsDiscoveryFingerprint(this.config, this.periodService.rangeKey)}|header=${this.headerKpi}`;
        if (!force && fingerprint === this.lastLoadFingerprint) {
            return;
        }
        this.lastLoadFingerprint = fingerprint;

        this.data = { ...this.data, loading: true };
        this.loadSubscription?.unsubscribe();
        this.loadSubscription = this.widgetRegistry.resolveGauge(this.config).subscribe((data) => {
            this.data = data;
        });
    }
    /** Arc from 180° (left) toward 0° (right) along the upper semicircle. */
    private describeArc(percentage: number): string {
        const clamped = Math.min(100, Math.max(0, percentage));
        const startAngle = 180;
        const endAngle = 180 - (clamped / 100) * 180;
        return this.arcPath(startAngle, endAngle);
    }

    private describeTargetTick(percentage: number): string {
        const angle = 180 - (percentage / 100) * 180;
        const halfBand = GAUGE.stroke / 2 + 1;
        const inner = this.polar(angle, GAUGE.radius - halfBand);
        const outer = this.polar(angle, GAUGE.radius + halfBand);
        return `M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`;
    }

    private arcPath(startAngle: number, endAngle: number): string {
        const start = this.polar(startAngle, GAUGE.radius);
        const end = this.polar(endAngle, GAUGE.radius);
        const sweep = startAngle - endAngle;
        const largeArc = sweep > 180 ? 1 : 0;
        return `M ${start.x} ${start.y} A ${GAUGE.radius} ${GAUGE.radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    }

    private polar(angleDeg: number, radius: number): { x: number; y: number } {
        const angleRad = (angleDeg * Math.PI) / 180;
        return {
            x: GAUGE.cx + radius * Math.cos(angleRad),
            y: GAUGE.cy - radius * Math.sin(angleRad),
        };
    }
}

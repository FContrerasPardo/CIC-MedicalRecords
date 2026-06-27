import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardMetricWidgetData, DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { DashboardWidgetRegistryService } from '../../../services/dashboard-widget-registry.service';

@Component({
    selector: 'medical-records-dashboard-metric-widget',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './dashboard-metric-widget.component.html',
    styleUrls: ['./dashboard-metric-widget.component.scss'],
})
export class DashboardMetricWidgetComponent implements OnChanges {
    @Input({ required: true }) config!: DashboardWidgetConfig;

    data: DashboardMetricWidgetData = { value: '—', loading: true, source: 'demo' };

    constructor(private readonly widgetRegistry: DashboardWidgetRegistryService) {}

    ngOnChanges(): void {
        if (!this.config) {
            return;
        }

        this.data = { ...this.data, loading: true };
        this.widgetRegistry.resolveMetric(this.config).subscribe((data) => {
            this.data = data;
        });
    }
}

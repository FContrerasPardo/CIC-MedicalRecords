import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardChartWidgetData, DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { DashboardWidgetRegistryService } from '../../../services/dashboard-widget-registry.service';

@Component({
    selector: 'medical-records-dashboard-chart-widget',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './dashboard-chart-widget.component.html',
    styleUrls: ['./dashboard-chart-widget.component.scss'],
})
export class DashboardChartWidgetComponent implements OnChanges {
    @Input({ required: true }) config!: DashboardWidgetConfig;

    data: DashboardChartWidgetData = { bars: [], loading: true, source: 'demo' };

    constructor(private readonly widgetRegistry: DashboardWidgetRegistryService) {}

    ngOnChanges(): void {
        if (!this.config) {
            return;
        }

        this.widgetRegistry.resolveChart(this.config).subscribe((data) => {
            this.data = data;
        });
    }

    trackByIndex(index: number): number {
        return index;
    }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardWidgetConfig, DashboardWidgetId } from '../../definitions/dashboard-widget.model';
import { ProcessAttentionItem } from '../../definitions/process-attention.model';
import { DashboardChartWidgetComponent } from '../widgets/dashboard-chart-widget/dashboard-chart-widget.component';
import { DashboardMetricWidgetComponent } from '../widgets/dashboard-metric-widget/dashboard-metric-widget.component';
import { DashboardProcessListWidgetComponent } from '../widgets/dashboard-process-list-widget/dashboard-process-list-widget.component';

@Component({
    selector: 'medical-records-dashboard-widget-grid',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        DashboardMetricWidgetComponent,
        DashboardChartWidgetComponent,
        DashboardProcessListWidgetComponent,
    ],
    templateUrl: './dashboard-widget-grid.component.html',
    styleUrls: ['./dashboard-widget-grid.component.scss'],
})
export class DashboardWidgetGridComponent {
    @Input({ required: true }) widgetOrder: DashboardWidgetId[] = [];
    @Input({ required: true }) widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {} as Record<
        DashboardWidgetId,
        DashboardWidgetConfig
    >;
    @Input() performanceMetrics: Array<{
        labelKey: string;
        value: string;
        helperKey: string;
        positive: boolean;
    }> = [];

    @Output() processSelected = new EventEmitter<ProcessAttentionItem>();

    trackByWidgetId(_: number, widgetId: DashboardWidgetId): DashboardWidgetId {
        return widgetId;
    }

    isInsightWidget(widgetId: DashboardWidgetId): boolean {
        return widgetId === 'recovery-rate' || widgetId === 'productivity-chart' || widgetId === 'completion-rate' || widgetId === 'document-volume';
    }

    onProcessSelected(item: ProcessAttentionItem): void {
        this.processSelected.emit(item);
    }
}

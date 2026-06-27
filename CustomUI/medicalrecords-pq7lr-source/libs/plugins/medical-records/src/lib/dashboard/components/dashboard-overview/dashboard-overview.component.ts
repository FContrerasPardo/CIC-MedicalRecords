import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DashboardLayoutService } from '../../services/dashboard-layout.service';
import { DashboardWidgetConfig, DashboardWidgetId } from '../../definitions/dashboard-widget.model';
import { ProcessAttentionItem } from '../../definitions/process-attention.model';
import { DashboardWidgetGridComponent } from '../dashboard-widget-grid/dashboard-widget-grid.component';

@Component({
    selector: 'medical-records-dashboard-overview',
    standalone: true,
    imports: [DashboardWidgetGridComponent],
    templateUrl: './dashboard-overview.component.html',
    styleUrls: ['./dashboard-overview.component.scss'],
})
export class DashboardOverviewComponent implements OnInit {
    @Output() processSelected = new EventEmitter<ProcessAttentionItem>();

    widgetOrder: DashboardWidgetId[] = [];
    widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {} as Record<DashboardWidgetId, DashboardWidgetConfig>;

    readonly performanceMetrics = [
        { labelKey: 'MEDICAL_RECORDS.METRICS.TOTAL_PROCESSES', value: '1,245', helperKey: 'MEDICAL_RECORDS.METRICS.INCREASE_3_4', positive: true },
        { labelKey: 'MEDICAL_RECORDS.METRICS.COMPLETED', value: '980', helperKey: 'MEDICAL_RECORDS.METRICS.INCREASE_2_1', positive: true },
        { labelKey: 'MEDICAL_RECORDS.METRICS.PENDING', value: '215', helperKey: 'MEDICAL_RECORDS.METRICS.DECREASE_1_1', positive: false },
        { labelKey: 'MEDICAL_RECORDS.METRICS.ERROR_RATE', value: '4.2%', helperKey: 'MEDICAL_RECORDS.METRICS.INCREASE_0_8', positive: false },
        { labelKey: 'MEDICAL_RECORDS.METRICS.USER_ACTIVITY', value: '8,950', helperKey: 'MEDICAL_RECORDS.METRICS.INCREASE_5_2', positive: true },
        { labelKey: 'MEDICAL_RECORDS.METRICS.SLA_COMPLIANCE', value: '92%', helperKey: 'MEDICAL_RECORDS.METRICS.INCREASE_1_2', positive: true },
        { labelKey: 'MEDICAL_RECORDS.METRICS.AVG_DAYS_TO_PAYMENT', value: '42', helperKey: 'MEDICAL_RECORDS.METRICS.IMPROVEMENT_3', positive: true },
        { labelKey: 'MEDICAL_RECORDS.METRICS.EXECUTION_QUEUE', value: '120', helperKey: 'MEDICAL_RECORDS.METRICS.DECREASE_2', positive: true },
    ];

    constructor(private readonly layoutService: DashboardLayoutService) {}

    ngOnInit(): void {
        const layout = this.layoutService.getLayout();
        this.widgetOrder = layout.widgetOrder;
        this.widgets = layout.widgets;
    }

    onProcessSelected(item: ProcessAttentionItem): void {
        this.processSelected.emit(item);
    }
}

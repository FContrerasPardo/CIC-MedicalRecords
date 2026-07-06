import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardContainerLayoutMode, DashboardProcessListOptions, DashboardWidgetConfig, ProcessListOpenTarget } from '../../definitions/dashboard-widget.model';
import { DashboardBuilderAppearancePanelComponent } from '../dashboard-builder-appearance-panel/dashboard-builder-appearance-panel.component';
import { DashboardBuilderDataBindingComponent } from '../dashboard-builder-data-binding/dashboard-builder-data-binding.component';
import { DashboardGaugeWidgetComponent } from '../widgets/dashboard-gauge-widget/dashboard-gauge-widget.component';
import { DashboardChartWidgetComponent } from '../widgets/dashboard-chart-widget/dashboard-chart-widget.component';
import { DashboardLinkCardWidgetComponent } from '../widgets/dashboard-link-card-widget/dashboard-link-card-widget.component';
import { DashboardMetricWidgetComponent } from '../widgets/dashboard-metric-widget/dashboard-metric-widget.component';
import { DashboardTableWidgetComponent } from '../widgets/dashboard-table-widget/dashboard-table-widget.component';
import { DashboardTaskRecentListWidgetComponent } from '../widgets/dashboard-task-recent-list-widget/dashboard-task-recent-list-widget.component';
import { DashboardTaskStatusSummaryWidgetComponent } from '../widgets/dashboard-task-status-summary-widget/dashboard-task-status-summary-widget.component';

@Component({
    selector: 'medical-records-dashboard-builder-widget-editor-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        DashboardBuilderAppearancePanelComponent,
        DashboardBuilderDataBindingComponent,
        DashboardChartWidgetComponent,
        DashboardMetricWidgetComponent,
        DashboardGaugeWidgetComponent,
        DashboardTableWidgetComponent,
        DashboardLinkCardWidgetComponent,
        DashboardTaskStatusSummaryWidgetComponent,
        DashboardTaskRecentListWidgetComponent,
    ],
    templateUrl: './dashboard-builder-widget-editor-modal.component.html',
    styleUrls: ['./dashboard-builder-widget-editor-modal.component.scss'],
})
export class DashboardBuilderWidgetEditorModalComponent {
    @Input({ required: true }) widget!: DashboardWidgetConfig;
    @Input() containerLayoutMode?: DashboardContainerLayoutMode;
    @Output() widgetPatch = new EventEmitter<Partial<DashboardWidgetConfig>>();
    @Output() closeModal = new EventEmitter<void>();

    readonly bindingScope = 'modal';

    get isDataWidget(): boolean {
        return ['metric', 'chart', 'table', 'gauge'].includes(this.widget.type);
    }

    get isGaugeWidget(): boolean {
        return this.widget.type === 'gauge';
    }

    get isProcessListWidget(): boolean {
        return this.widget.type === 'process-list';
    }

    patchWidget(patch: Partial<DashboardWidgetConfig>): void {
        this.widgetPatch.emit(patch);
    }

    updateProcessListOption(key: keyof DashboardProcessListOptions, checked: boolean): void {
        this.patchWidget({
            processListOptions: {
                ...this.widget.processListOptions,
                [key]: checked,
            },
        });
    }

    updateProcessListOpenTarget(value: ProcessListOpenTarget): void {
        this.patchWidget({
            processListOptions: {
                ...this.widget.processListOptions,
                openTarget: value,
            },
        });
    }

    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeModal.emit();
        }
    }
}

import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardWidgetType } from '../../definitions/dashboard-widget.model';

export interface DashboardPaletteItem {
    type: DashboardWidgetType;
    labelKey: string;
    icon: string;
    preset?: 'outcome-distribution';
}

@Component({
    selector: 'medical-records-dashboard-builder-palette',
    standalone: true,
    imports: [CommonModule, TranslateModule, DragDropModule, RouterModule],
    templateUrl: './dashboard-builder-palette.component.html',
    styleUrls: ['./dashboard-builder-palette.component.scss'],
})
export class DashboardBuilderPaletteComponent {
    @Input() connectedDropIds: string[] = [];
    @Input() activeTabLabel = '';
    @Input() activeSectionTitle = '';
    @Input() layoutLoading = false;
    @Input() layoutSaving = false;
    @Output() addWidget = new EventEmitter<{
        type: DashboardWidgetType;
        preset?: 'outcome-distribution';
    }>();
    @Output() saveLayout = new EventEmitter<void>();
    @Output() resetLayout = new EventEmitter<void>();

    readonly paletteItems: DashboardPaletteItem[] = [
        {
            type: 'gauge',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_GAUGE',
            icon: 'speed',
        },
        {
            type: 'metric',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_METRIC',
            icon: 'insights',
        },
        {
            type: 'chart',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_CHART',
            icon: 'bar_chart',
        },
        {
            type: 'chart',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_OUTCOME_CHART',
            icon: 'stacked_bar_chart',
            preset: 'outcome-distribution',
        },
        {
            type: 'table',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_TABLE',
            icon: 'table_chart',
        },
        {
            type: 'link-card',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_LINK_CARD',
            icon: 'link',
        },
        {
            type: 'task-status-summary',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_TASK_STATUS',
            icon: 'stacked_bar_chart',
        },
        {
            type: 'task-recent-list',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_TASK_RECENT',
            icon: 'history',
        },
        {
            type: 'process-list',
            labelKey: 'MEDICAL_RECORDS.DASHBOARD_BUILDER.WIDGET_PROCESS_LIST',
            icon: 'checklist',
        },
    ];

    add(type: DashboardWidgetType, preset?: DashboardPaletteItem['preset']): void {
        this.addWidget.emit({ type, preset });
    }
}

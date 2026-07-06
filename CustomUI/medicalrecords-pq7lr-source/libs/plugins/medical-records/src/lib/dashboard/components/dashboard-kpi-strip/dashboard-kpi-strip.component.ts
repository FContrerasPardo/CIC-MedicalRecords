import { CommonModule } from '@angular/common';

import { Component, EventEmitter, Input, Output } from '@angular/core';

import { DashboardWidgetConfig, DashboardWidgetId } from '../../definitions/dashboard-widget.model';

import { DashboardGaugeWidgetComponent } from '../widgets/dashboard-gauge-widget/dashboard-gauge-widget.component';

import { DashboardMetricWidgetComponent } from '../widgets/dashboard-metric-widget/dashboard-metric-widget.component';



@Component({

    selector: 'medical-records-dashboard-kpi-strip',

    standalone: true,

    imports: [CommonModule, DashboardMetricWidgetComponent, DashboardGaugeWidgetComponent],

    templateUrl: './dashboard-kpi-strip.component.html',

    styleUrls: ['./dashboard-kpi-strip.component.scss'],

})

export class DashboardKpiStripComponent {

    @Input({ required: true }) widgetIds: DashboardWidgetId[] = [];

    @Input({ required: true }) widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {};

    @Input() editMode = false;

    @Input() selectedWidgetId: DashboardWidgetId | null = null;
    @Input() pageActive = true;



    @Output() widgetSelect = new EventEmitter<DashboardWidgetId>();



    trackByWidgetId(_: number, id: DashboardWidgetId): DashboardWidgetId {

        return id;

    }



    onSelect(widgetId: DashboardWidgetId, event: Event): void {

        if (!this.editMode) {

            return;

        }

        event.stopPropagation();

        this.widgetSelect.emit(widgetId);

    }



    isSelected(widgetId: DashboardWidgetId): boolean {

        return this.editMode && this.selectedWidgetId === widgetId;

    }

}



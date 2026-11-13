import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { Component, EventEmitter, Input, Output } from '@angular/core';

import { DashboardProviderSelection, DashboardWidgetConfig, DashboardWidgetId } from '../../definitions/dashboard-widget.model';

import { DashboardGaugeWidgetComponent } from '../widgets/dashboard-gauge-widget/dashboard-gauge-widget.component';

import { DashboardProviderCardsWidgetComponent } from '../widgets/dashboard-provider-cards-widget/dashboard-provider-cards-widget.component';

import { DashboardMetricWidgetComponent } from '../widgets/dashboard-metric-widget/dashboard-metric-widget.component';



@Component({

    selector: 'medical-records-dashboard-kpi-strip',

    standalone: true,

    imports: [CommonModule, TranslateModule, DashboardMetricWidgetComponent, DashboardGaugeWidgetComponent, DashboardProviderCardsWidgetComponent],

    templateUrl: './dashboard-kpi-strip.component.html',

    styleUrls: ['./dashboard-kpi-strip.component.scss'],

})

export class DashboardKpiStripComponent {

    @Input({ required: true }) widgetIds: DashboardWidgetId[] = [];

    @Input({ required: true }) widgets: Record<DashboardWidgetId, DashboardWidgetConfig> = {};

    @Input() editMode = false;

    @Input() fluid = false;

    @Input() selectedWidgetId: DashboardWidgetId | null = null;
    @Input() pageActive = true;



    @Output() widgetSelect = new EventEmitter<DashboardWidgetId>();

    @Output() providerSelected = new EventEmitter<DashboardProviderSelection>();



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



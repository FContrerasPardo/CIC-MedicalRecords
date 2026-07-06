import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';

@Component({
    selector: 'medical-records-dashboard-link-card-widget',
    standalone: true,
    imports: [CommonModule, RouterModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-link-card-widget.component.html',
    styleUrls: ['./dashboard-link-card-widget.component.scss'],
})
export class DashboardLinkCardWidgetComponent {
    @Input({ required: true }) config!: DashboardWidgetConfig;

    get options() {
        return this.config.linkCardOptions ?? {};
    }

    get isExternal(): boolean {
        return this.options.linkTargetType === 'external';
    }

    get buttonLabel(): string {
        return this.options.buttonLabel?.trim() || 'Open';
    }

    get iconName(): string {
        return this.config.icon?.trim() || 'open_in_new';
    }
}

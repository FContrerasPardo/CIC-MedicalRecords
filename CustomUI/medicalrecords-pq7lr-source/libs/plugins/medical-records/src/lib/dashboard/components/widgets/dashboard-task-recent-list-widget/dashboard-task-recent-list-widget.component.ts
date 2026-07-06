import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProcessAttentionItem } from '../../../definitions/process-attention.model';
import { DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';
import { MedicalRecordsTaskQueryService } from '../../../services/medical-records-task-query.service';
import { DashboardThemeService } from '../../../services/dashboard-theme.service';

@Component({
    selector: 'medical-records-dashboard-task-recent-list-widget',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-task-recent-list-widget.component.html',
    styleUrls: ['./dashboard-task-recent-list-widget.component.scss'],
})
export class DashboardTaskRecentListWidgetComponent implements OnInit {
    @Input({ required: true }) config!: DashboardWidgetConfig;

    loading = true;
    items: ProcessAttentionItem[] = [];
    error?: string;

    constructor(
        private readonly taskQueryService: MedicalRecordsTaskQueryService,
        readonly themeService: DashboardThemeService
    ) {}

    get options() {
        return this.config.taskWidgetOptions ?? {};
    }

    get maxItems(): number {
        return this.options.maxItems ?? 5;
    }

    get ctaRoute(): string {
        return this.options.ctaRoute?.trim() || '/medical-records#tasks';
    }

    get ctaLabel(): string {
        return this.options.ctaLabel?.trim() || 'View full history';
    }

    get ctaPath(): string {
        return this.ctaRoute.split('#')[0] || '/medical-records';
    }

    get ctaFragment(): string | null {
        const parts = this.ctaRoute.split('#');
        return parts.length > 1 ? parts[1] : null;
    }

    ngOnInit(): void {
        this.taskQueryService.loadAttentionItems();
        this.taskQueryService.state$.subscribe((state) => {
            this.loading = state.loading;
            this.error = state.error;
            this.items = state.items.slice(0, this.maxItems);
        });
    }

    statusLabelKey(item: ProcessAttentionItem): string {
        return item.taskStatus === 'ASSIGNED'
            ? 'MEDICAL_RECORDS.TASK_WIDGET.STATUS_ASSIGNED'
            : 'MEDICAL_RECORDS.TASK_WIDGET.STATUS_CREATED';
    }

    statusColor(item: ProcessAttentionItem): string {
        return this.themeService.statusColor(item.taskStatus);
    }
}

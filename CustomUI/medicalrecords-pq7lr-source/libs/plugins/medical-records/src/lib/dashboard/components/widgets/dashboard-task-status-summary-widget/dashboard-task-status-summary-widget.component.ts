import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MedicalRecordsTaskStatus } from '../../../definitions/process-attention.model';
import { DashboardWidgetConfig } from '../../../definitions/dashboard-widget.model';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';
import { MedicalRecordsTaskQueryService } from '../../../services/medical-records-task-query.service';
import { DashboardThemeService } from '../../../services/dashboard-theme.service';

interface StatusRow {
    key: MedicalRecordsTaskStatus;
    labelKey: string;
    count: number;
    percent: number;
}

@Component({
    selector: 'medical-records-dashboard-task-status-summary-widget',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslateModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-task-status-summary-widget.component.html',
    styleUrls: ['./dashboard-task-status-summary-widget.component.scss'],
})
export class DashboardTaskStatusSummaryWidgetComponent implements OnInit {
    @Input({ required: true }) config!: DashboardWidgetConfig;

    loading = true;
    rows: StatusRow[] = [];
    total = 0;
    error?: string;

    constructor(
        private readonly taskQueryService: MedicalRecordsTaskQueryService,
        readonly themeService: DashboardThemeService
    ) {}

    get options() {
        return this.config.taskWidgetOptions ?? {};
    }

    get ctaRoute(): string {
        return this.options.ctaRoute?.trim() || '/medical-records#tasks';
    }

    get ctaLabel(): string {
        return this.options.ctaLabel?.trim() || 'View all tasks';
    }

    ngOnInit(): void {
        this.taskQueryService.loadAttentionItems();
        this.taskQueryService.state$.subscribe((state) => {
            this.loading = state.loading;
            this.error = state.error;
            this.buildRows(state.items.map((item) => item.taskStatus));
        });
    }

    get ctaPath(): string {
        return this.ctaRoute.split('#')[0] || '/medical-records';
    }

    get ctaFragment(): string | null {
        const parts = this.ctaRoute.split('#');
        return parts.length > 1 ? parts[1] : null;
    }

    statusColor(key: string): string {
        return this.themeService.statusColor(key);
    }

    barBackground(key: string): string {
        const color = this.statusColor(key);
        return `linear-gradient(90deg, ${color} 0%, ${color}88 100%)`;
    }

    private buildRows(statuses: MedicalRecordsTaskStatus[]): void {
        const counts: Record<MedicalRecordsTaskStatus, number> = { CREATED: 0, ASSIGNED: 0 };
        for (const status of statuses) {
            counts[status] = (counts[status] ?? 0) + 1;
        }

        this.total = statuses.length;
        const max = Math.max(this.total, 1);

        this.rows = [
            {
                key: 'CREATED',
                labelKey: 'MEDICAL_RECORDS.TASK_WIDGET.STATUS_CREATED',
                count: counts.CREATED,
                percent: (counts.CREATED / max) * 100,
            },
            {
                key: 'ASSIGNED',
                labelKey: 'MEDICAL_RECORDS.TASK_WIDGET.STATUS_ASSIGNED',
                count: counts.ASSIGNED,
                percent: (counts.ASSIGNED / max) * 100,
            },
        ];
    }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DashboardPeriodService } from '../../services/dashboard-period.service';
import { parseIsoDateInput, toIsoDate } from '../../utils/dashboard-date-range.util';

@Component({
    selector: 'medical-records-dashboard-date-range-filter',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './dashboard-period-pills.component.html',
    styleUrls: ['./dashboard-period-pills.component.scss'],
})
export class DashboardDateRangeFilterComponent implements OnInit, OnDestroy {
    readonly presets = [
        { days: 7, labelKey: 'MEDICAL_RECORDS.DASHBOARD.DATE_RANGE_PRESET_7D' },
        { days: 30, labelKey: 'MEDICAL_RECORDS.DASHBOARD.DATE_RANGE_PRESET_30D' },
    ];

    startInput = '';
    endInput = '';
    activePresetDays: number | null = 7;

    private startEditing = false;
    private endEditing = false;
    private readonly destroy$ = new Subject<void>();

    constructor(private readonly periodService: DashboardPeriodService) {}

    ngOnInit(): void {
        this.syncFromService(this.periodService.dateRange);
        this.periodService.dateRange$.pipe(takeUntil(this.destroy$)).subscribe((range) => this.syncFromService(range));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    applyPreset(days: number): void {
        this.startEditing = false;
        this.endEditing = false;
        this.periodService.applyPresetDays(days);
    }

    onStartFocus(): void {
        this.startEditing = true;
    }

    onStartBlur(): void {
        this.startEditing = false;
        this.applyCustomRange();
    }

    onEndFocus(): void {
        this.endEditing = true;
    }

    onEndBlur(): void {
        this.endEditing = false;
        this.applyCustomRange();
    }

    onStartInputChange(value: string): void {
        this.startInput = value;
        this.activePresetDays = null;
        if (parseIsoDateInput(value) && parseIsoDateInput(this.endInput)) {
            this.applyCustomRange();
        }
    }

    onEndInputChange(value: string): void {
        this.endInput = value;
        this.activePresetDays = null;
        if (parseIsoDateInput(this.startInput) && parseIsoDateInput(value)) {
            this.applyCustomRange();
        }
    }

    isPresetActive(days: number): boolean {
        return this.activePresetDays === days;
    }

    private applyCustomRange(): void {
        const start = parseIsoDateInput(this.startInput);
        const end = parseIsoDateInput(this.endInput);
        if (!start || !end) {
            return;
        }
        this.periodService.setDateRange(start, end);
    }

    private syncFromService(range: { start: Date; end: Date }): void {
        if (!this.startEditing) {
            this.startInput = toIsoDate(range.start);
        }
        if (!this.endEditing) {
            this.endInput = toIsoDate(range.end);
        }
        if (!this.startEditing && !this.endEditing) {
            this.activePresetDays = this.detectPresetDays(range);
        }
    }

    private detectPresetDays(range: { start: Date; end: Date }): number | null {
        const start = new Date(range.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(range.end);
        end.setHours(0, 0, 0, 0);
        const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
        return this.presets.some((preset) => preset.days === diffDays) ? diffDays : null;
    }
}

/** @deprecated Use DashboardDateRangeFilterComponent */
export { DashboardDateRangeFilterComponent as DashboardPeriodPillsComponent };

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DashboardDateRange } from '../definitions/dashboard-widget.model';
import {
    dashboardDateRangeKey,
    defaultDashboardDateRange,
    dashboardDateRangeForDays,
    normalizeDashboardDateRange,
    parseDashboardDateRangePreference,
    serializeDashboardDateRangePreference,
} from '../utils/dashboard-date-range.util';

@Injectable({ providedIn: 'root' })
export class DashboardPeriodService {
    private readonly rangeSubject = new BehaviorSubject<DashboardDateRange>(defaultDashboardDateRange());

    readonly dateRange$ = this.rangeSubject.asObservable();

    get dateRange(): DashboardDateRange {
        return this.rangeSubject.value;
    }

    get rangeKey(): string {
        return dashboardDateRangeKey(this.dateRange);
    }

    setDateRange(start: Date, end: Date): void {
        const normalized = normalizeDashboardDateRange(start, end);
        if (dashboardDateRangeKey(normalized) === this.rangeKey) {
            return;
        }
        this.rangeSubject.next(normalized);
    }

    applyPresetDays(days: number): void {
        this.rangeSubject.next(dashboardDateRangeForDays(days));
    }

    applyPersistedPreference(preference?: { start: string; end: string } | null): void {
        const parsed = parseDashboardDateRangePreference(preference);
        if (parsed) {
            this.rangeSubject.next(parsed);
        }
    }

    toPersistedPreference(): { start: string; end: string } {
        return serializeDashboardDateRangePreference(this.dateRange);
    }
}

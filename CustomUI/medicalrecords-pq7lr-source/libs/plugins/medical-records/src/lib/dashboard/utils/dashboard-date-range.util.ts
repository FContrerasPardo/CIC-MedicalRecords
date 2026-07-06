import { DashboardDateRange, DashboardDateRangePreference } from '../definitions/dashboard-widget.model';

const DEFAULT_RANGE_START = { year: 2025, month: 0, day: 1 };

export function defaultDashboardDateRange(): DashboardDateRange {
    const end = endOfDay(new Date());
    const start = startOfDay(new Date(DEFAULT_RANGE_START.year, DEFAULT_RANGE_START.month, DEFAULT_RANGE_START.day));
    return { start, end };
}

export function defaultDashboardDateRangePreference(): DashboardDateRangePreference {
    const range = defaultDashboardDateRange();
    return serializeDashboardDateRangePreference(range);
}

export function dashboardDateRangeForDays(days: number): DashboardDateRange {
    const end = endOfDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - (Math.max(1, days) - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end };
}

export function normalizeDashboardDateRange(start: Date, end: Date): DashboardDateRange {
    const normalizedStart = startOfDay(start);
    let normalizedEnd = endOfDay(end);
    if (normalizedStart.getTime() > normalizedEnd.getTime()) {
        normalizedEnd = endOfDay(normalizedStart);
    }
    return { start: normalizedStart, end: normalizedEnd };
}

export function dashboardDateRangeKey(range: DashboardDateRange): string {
    return `${toIsoDate(range.start)}_${toIsoDate(range.end)}`;
}

export function previousComparisonRange(range: DashboardDateRange): DashboardDateRange {
    const startMs = startOfDay(range.start).getTime();
    const endMs = endOfDay(range.end).getTime();
    const durationMs = Math.max(endMs - startMs, 0);
    const previousEnd = endOfDay(new Date(startMs - 1));
    const previousStart = startOfDay(new Date(previousEnd.getTime() - durationMs));
    return { start: previousStart, end: previousEnd };
}

export function filterRowsToDateRange(
    rows: Record<string, string>[],
    dateField: string,
    range: DashboardDateRange
): Record<string, string>[] {
    return rows.filter((row) => rowMatchesDateRange(row, dateField, range));
}

export function countRowsInDateRange(
    rows: Record<string, string>[],
    dateField: string,
    range: DashboardDateRange
): number {
    return rows.filter((row) => rowMatchesDateRange(row, dateField, range)).length;
}

export function toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function parseIsoDateInput(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
        return null;
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isFinite(date.getTime()) ? date : null;
}

export function serializeDashboardDateRangePreference(range: DashboardDateRange): DashboardDateRangePreference {
    return {
        start: toIsoDate(range.start),
        end: toIsoDate(range.end),
    };
}

export function parseDashboardDateRangePreference(
    preference?: DashboardDateRangePreference | null
): DashboardDateRange | null {
    if (!preference?.start || !preference?.end) {
        return null;
    }
    const start = parseIsoDateInput(preference.start);
    const end = parseIsoDateInput(preference.end);
    if (!start || !end) {
        return null;
    }
    return normalizeDashboardDateRange(start, end);
}

function rowMatchesDateRange(row: Record<string, string>, dateField: string, range: DashboardDateRange): boolean {
    const parsed = Date.parse(row[dateField] ?? '');
    if (!Number.isFinite(parsed)) {
        return false;
    }
    const date = new Date(parsed);
    return date >= range.start && date <= range.end;
}

function startOfDay(value: Date): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function endOfDay(value: Date): Date {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
}

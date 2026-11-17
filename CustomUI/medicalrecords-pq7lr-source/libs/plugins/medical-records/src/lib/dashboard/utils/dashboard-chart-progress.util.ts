import { DashboardChartWidgetData, ValueFieldFormat } from '../definitions/dashboard-widget.model';
import { KpiAccent, KpiThresholds, resolveKpiAccent } from './dashboard-kpi-card.util';

/** One row of the `progress-bars` chart display (thin horizontal bar). */
export interface ChartProgressRow {
    label: string;
    /** `x/y · 45%` for a percent average, `12 · 32%` for counts and sums. */
    display: string;
    /** Bar width, 0-100. */
    width: number;
    /** Value carried by `aria-valuenow`, 0-100. */
    percent: number;
    accent: KpiAccent;
}

function round(value: number): number {
    return Math.round(value);
}

function formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Rows of the progress-bars display, pure. An average shown as percent (e.g. the 0/1 field
 * `calc_auditFinding` per provider) reads `sum/count · %` and its bar is that percent; counts and sums read
 * `value · share %` and their bar is the share of the total. Thresholds colour each bar.
 */
export function buildChartProgressRows(
    data: Pick<DashboardChartWidgetData, 'labels' | 'values' | 'counts' | 'sums' | 'aggregation'>,
    format?: ValueFieldFormat,
    thresholds?: KpiThresholds | null
): ChartProgressRow[] {
    const ratio = data.aggregation === 'avg' && format === 'percent';
    const total = data.values.reduce((sum, value) => sum + value, 0);
    return data.labels.map((label, index) => {
        const value = data.values[index] ?? 0;
        if (ratio) {
            const percent = Math.max(0, Math.min(100, value * 100));
            const count = data.counts?.[index];
            const sum = data.sums?.[index];
            const prefix = count != null && sum != null ? `${formatNumber(sum)}/${count} · ` : '';
            return { label, display: `${prefix}${round(percent)}%`, width: percent, percent: round(percent), accent: resolveKpiAccent(percent, thresholds) };
        }
        const share = total > 0 ? (value / total) * 100 : 0;
        return {
            label,
            display: `${formatNumber(value)} · ${round(share)}%`,
            width: share,
            percent: round(share),
            accent: resolveKpiAccent(value, thresholds),
        };
    });
}

/** Change of the last bucket vs the previous one, for the chart headline. */
export interface ChartHeadlineVariation {
    /** Percent change, rounded (negative = decrease). */
    percent: number;
    direction: 'up' | 'down' | 'flat';
    /** True when the change is good news (a decrease when lower is better). */
    positive: boolean;
}

/** Null with fewer than two buckets or a zero previous bucket. */
export function chartHeadlineVariation(values: readonly number[], lowerIsBetter = false): ChartHeadlineVariation | null {
    if (values.length < 2) {
        return null;
    }
    const last = values[values.length - 1];
    const previous = values[values.length - 2];
    if (!previous) {
        return null;
    }
    const percent = Math.round(((last - previous) / previous) * 100);
    const direction = percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat';
    return { percent, direction, positive: direction === 'flat' || (lowerIsBetter ? direction === 'down' : direction === 'up') };
}

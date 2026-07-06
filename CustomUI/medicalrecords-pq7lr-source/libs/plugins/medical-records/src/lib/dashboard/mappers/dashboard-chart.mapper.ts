import {
    ChartDateBucket,
    DashboardChartConfig,
    DashboardChartSeries,
    DashboardFieldKind,
} from '../definitions/dashboard-widget.model';
import { resolveBoundFieldLabelValue, resolveBoundFieldValue } from '../utils/dashboard-json-field.util';
import { sortProcessStatusSeriesKeys } from '../utils/dashboard-theme.util';

export interface ChartSeriesResult {
    labels: string[];
    values: number[];
    bars: number[];
    series?: DashboardChartSeries[];
}

export interface BuildChartSeriesOptions {
    dropAllZeroBuckets?: boolean;
}

export function buildChartSeries(
    rows: Record<string, string>[],
    xField: string,
    xKind: DashboardFieldKind,
    chart: DashboardChartConfig,
    seriesField?: string,
    options?: BuildChartSeriesOptions
): ChartSeriesResult {
    const maxBuckets = chart.maxBuckets ?? 12;
    const yAggregation = chart.yAggregation ?? 'count';
    const dateBucket = chart.dateBucket ?? 'day';
    const yField = chart.yField;

    if (seriesField) {
        return buildStackedChartSeries(rows, xField, xKind, chart, seriesField, options);
    }

    const buckets = new Map<string, number[]>();

    for (const row of rows) {
        const rawX = readChartLabelField(row, xField, chart.xFieldPath);
        const bucketKey = xKind === 'date' ? bucketDate(rawX, dateBucket) : rawX.trim() || '(empty)';
        const values = buckets.get(bucketKey) ?? [];
        values.push(yAggregation === 'sum' && yField ? parseNumeric(readChartValueField(row, yField, chart.yFieldPath)) : 1);
        buckets.set(bucketKey, values);
    }

    let entries = Array.from(buckets.entries()).map(([label, bucketValues]) => ({
        label,
        value: yAggregation === 'sum' ? bucketValues.reduce((sum, current) => sum + current, 0) : bucketValues.length,
    }));

    if (xKind === 'date') {
        entries = entries.sort((left, right) => left.label.localeCompare(right.label));
        if (entries.length > maxBuckets) {
            entries = entries.slice(-maxBuckets);
        }
        entries =
            options?.dropAllZeroBuckets === false
                ? trimLeadingTrailingZeroEntries(entries)
                : dropZeroEntries(entries);
    } else {
        entries = entries.sort((left, right) => right.value - left.value);
        entries = entries.slice(0, maxBuckets);
    }

    const labels = entries.map((entry) => entry.label);
    const values = entries.map((entry) => entry.value);
    const maxValue = Math.max(...values, 1);
    const bars = values.map((value) => Math.round((value / maxValue) * 100));

    return { labels, values, bars };
}

function buildStackedChartSeries(
    rows: Record<string, string>[],
    xField: string,
    xKind: DashboardFieldKind,
    chart: DashboardChartConfig,
    seriesField: string,
    options?: BuildChartSeriesOptions
): ChartSeriesResult {
    const maxBuckets = chart.maxBuckets ?? 12;
    const dateBucket = chart.dateBucket ?? 'day';
    const yAggregation = chart.yAggregation ?? 'count';
    const yField = chart.yField;

    const bucketSeries = new Map<string, Map<string, number>>();

    for (const row of rows) {
        const rawX = readChartLabelField(row, xField, chart.xFieldPath);
        const bucketKey = xKind === 'date' ? bucketDate(rawX, dateBucket) : rawX.trim() || '(empty)';
        const seriesKey = readChartLabelField(row, seriesField, chart.seriesFieldPath).trim() || '(empty)';
        const increment = yAggregation === 'sum' && yField ? parseNumeric(readChartValueField(row, yField, chart.yFieldPath)) : 1;

        const seriesMap = bucketSeries.get(bucketKey) ?? new Map<string, number>();
        seriesMap.set(seriesKey, (seriesMap.get(seriesKey) ?? 0) + increment);
        bucketSeries.set(bucketKey, seriesMap);
    }

    let labels = Array.from(bucketSeries.keys());
    if (xKind === 'date') {
        labels = labels.sort((left, right) => left.localeCompare(right));
        if (labels.length > maxBuckets) {
            labels = labels.slice(-maxBuckets);
        }
    } else {
        labels = labels.sort((left, right) => {
            const leftTotal = [...(bucketSeries.get(left)?.values() ?? [])].reduce((sum, v) => sum + v, 0);
            const rightTotal = [...(bucketSeries.get(right)?.values() ?? [])].reduce((sum, v) => sum + v, 0);
            return rightTotal - leftTotal;
        });
        labels = labels.slice(0, maxBuckets);
    }

    const seriesKeys =
        seriesField === 'status'
            ? sortProcessStatusSeriesKeys([...new Set(labels.flatMap((label) => [...(bucketSeries.get(label)?.keys() ?? [])]))])
            : [...new Set(labels.flatMap((label) => [...(bucketSeries.get(label)?.keys() ?? [])]))].sort();

    let series: DashboardChartSeries[] = seriesKeys.map((key) => ({
        key,
        values: labels.map((label) => bucketSeries.get(label)?.get(key) ?? 0),
    }));

    let values = labels.map((label, index) =>
        series.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0)
    );

    if (xKind === 'date') {
        const trimmed =
            options?.dropAllZeroBuckets === false
                ? trimLeadingTrailingZeroBuckets(labels, values, series)
                : filterZeroBuckets(labels, values, series);
        labels = trimmed.labels;
        values = trimmed.values;
        series = trimmed.series ?? series;
    }
    const maxValue = Math.max(...values, 1);
    const bars = values.map((value) => Math.round((value / maxValue) * 100));

    return { labels, values, bars, series };
}

function bucketDate(raw: string, bucket: ChartDateBucket): string {
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) {
        return raw.trim() || '(empty)';
    }

    const date = new Date(parsed);

    switch (bucket) {
        case 'hour':
            return `${date.toISOString().slice(0, 13)}:00`;
        case 'week': {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            return weekStart.toISOString().slice(0, 10);
        }
        case 'month':
            return date.toISOString().slice(0, 7);
        case 'day':
        default:
            return date.toISOString().slice(0, 10);
    }
}

function parseNumeric(raw: string): number {
    const normalized = raw.replace(/,/g, '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function readChartLabelField(row: Record<string, string>, fieldKey?: string, fieldPath?: string): string {
    if (!fieldKey) {
        return '';
    }
    return resolveBoundFieldLabelValue(row, fieldKey, fieldPath);
}

function readChartValueField(row: Record<string, string>, fieldKey?: string, fieldPath?: string): string {
    if (!fieldKey) {
        return '';
    }
    return resolveBoundFieldValue(row, fieldKey, fieldPath);
}

function dropZeroEntries<T extends { value: number }>(entries: T[]): T[] {
    return entries.filter((entry) => entry.value > 0);
}

function filterZeroBuckets(
    labels: string[],
    values: number[],
    series?: DashboardChartSeries[]
): { labels: string[]; values: number[]; series?: DashboardChartSeries[] } {
    const keepIndices = values.reduce<number[]>((indices, value, index) => {
        if (value > 0) {
            indices.push(index);
        }
        return indices;
    }, []);

    return {
        labels: keepIndices.map((index) => labels[index]),
        values: keepIndices.map((index) => values[index]),
        series: series?.map((entry) => ({
            ...entry,
            values: keepIndices.map((index) => entry.values[index] ?? 0),
        })),
    };
}

function trimLeadingTrailingZeroEntries<T extends { value: number }>(entries: T[]): T[] {
    if (entries.length <= 1) {
        return entries;
    }

    let start = 0;
    let end = entries.length - 1;
    while (start < end && entries[start].value <= 0) {
        start += 1;
    }
    while (end > start && entries[end].value <= 0) {
        end -= 1;
    }
    return entries.slice(start, end + 1);
}

function trimLeadingTrailingZeroBuckets(
    labels: string[],
    values: number[],
    series?: DashboardChartSeries[]
): { labels: string[]; values: number[]; series?: DashboardChartSeries[] } {
    if (labels.length <= 1) {
        return { labels, values, series };
    }

    let start = 0;
    let end = labels.length - 1;
    while (start < end && values[start] <= 0) {
        start += 1;
    }
    while (end > start && values[end] <= 0) {
        end -= 1;
    }

    const slice = <T>(items: T[]): T[] => items.slice(start, end + 1);
    return {
        labels: slice(labels),
        values: slice(values),
        series: series?.map((entry) => ({ ...entry, values: slice(entry.values) })),
    };
}

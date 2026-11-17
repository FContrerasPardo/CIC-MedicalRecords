import { resolveBoundFieldValues } from './dashboard-json-field.util';

import { ValueFieldFormat } from '../definitions/dashboard-widget.model';

export type NumericFieldAggregation = 'sum' | 'min' | 'max' | 'avg';
export type ValueAggregation = 'count' | NumericFieldAggregation;

export function isNumericFieldAggregation(aggregation?: string): aggregation is NumericFieldAggregation {
    return aggregation === 'sum' || aggregation === 'min' || aggregation === 'max' || aggregation === 'avg';
}

export function aggregateNumericFieldValues(
    rows: Record<string, string>[],
    fieldKey: string,
    fieldPath: string | undefined,
    aggregation: NumericFieldAggregation
): number {
    const values = rows
        .flatMap((row) =>
            resolveBoundFieldValues(row, fieldKey, fieldPath)
                .map((raw) => Number(raw.replace(/,/g, '')))
                .filter((value) => Number.isFinite(value))
        );

    if (!values.length) {
        return 0;
    }

    if (aggregation === 'sum') {
        return values.reduce((total, value) => total + value, 0);
    }
    if (aggregation === 'min') {
        return Math.min(...values);
    }
    if (aggregation === 'max') {
        return Math.max(...values);
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
}

export function applyValueFieldFormat(value: number, format?: ValueFieldFormat): number {
    if (format === 'percent') {
        return value * 100;
    }
    return value;
}

/**
 * Sparkline series: the bound numeric field aggregated per equal slice of `range` (oldest first),
 * slicing rows by `dateField`. A slice without numeric values is null (the line skips it).
 */
export function aggregateBySlices(
    rows: Record<string, string>[],
    fieldKey: string,
    fieldPath: string | undefined,
    aggregation: NumericFieldAggregation,
    dateField: string,
    range: { start: Date; end: Date },
    buckets: number
): Array<number | null> {
    const slices = Math.max(1, Math.floor(buckets));
    const start = range.start.getTime();
    const span = Math.max(range.end.getTime() - start, 1) / slices;
    const grouped: Record<string, string>[][] = Array.from({ length: slices }, () => []);
    for (const row of rows) {
        const time = Date.parse(row[dateField] ?? '');
        if (!Number.isFinite(time) || time < start || time > range.end.getTime()) {
            continue;
        }
        grouped[Math.min(slices - 1, Math.floor((time - start) / span))].push(row);
    }
    return grouped.map((slice) => {
        const hasValues = slice.some((row) =>
            resolveBoundFieldValues(row, fieldKey, fieldPath).some((raw) => raw.trim() !== '' && Number.isFinite(Number(raw.replace(/,/g, ''))))
        );
        return hasValues ? aggregateNumericFieldValues(slice, fieldKey, fieldPath, aggregation) : null;
    });
}

/** `1234567.5` → `1 234 567.5` with non-breaking spaces (still parsed by the KPI accent, which strips spaces). */
export function groupThousands(value: number): string {
    const [integer, fraction] = String(Math.abs(value)).split('.');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${value < 0 ? '-' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

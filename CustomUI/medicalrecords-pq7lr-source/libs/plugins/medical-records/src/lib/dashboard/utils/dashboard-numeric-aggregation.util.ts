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

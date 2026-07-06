import { DashboardFieldDescriptor, DashboardFieldKind } from '../definitions/dashboard-widget.model';
import { inferJsonFieldPaths, isJsonFieldValue } from '../utils/dashboard-json-field.util';

const DATE_NAME_PATTERN = /date|fecha|created|modified|time|timestamp|started|ended/i;

export function inferFieldDescriptors(rows: Record<string, string>[], maxBuckets = 12): DashboardFieldDescriptor[] {
    if (!rows.length) {
        return [];
    }

    const keys = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            keys.add(key);
        }
    }

    return Array.from(keys).map((key) => {
        const values = rows.map((row) => row[key] ?? '');
        const kind = classifyField(key, values, maxBuckets);
        return {
            key,
            kind,
            jsonPaths: kind === 'json' ? inferJsonFieldPaths(rows, key) : undefined,
        };
    });
}

function classifyField(key: string, values: string[], maxBuckets: number): DashboardFieldKind {
    const nonEmpty = values.map((value) => value.trim()).filter(Boolean);
    if (!nonEmpty.length) {
        return 'category';
    }

    const jsonMatches = nonEmpty.filter(isJsonFieldValue).length;
    if (jsonMatches / nonEmpty.length >= 0.6) {
        return 'json';
    }

    const dateMatches = nonEmpty.filter(isDateValue).length;
    if (DATE_NAME_PATTERN.test(key) || dateMatches / nonEmpty.length >= 0.6) {
        return 'date';
    }

    const numericMatches = nonEmpty.filter(isNumericValue).length;
    if (numericMatches / nonEmpty.length >= 0.6) {
        return 'number';
    }

    const distinct = new Set(nonEmpty);
    if (distinct.size <= maxBuckets) {
        return 'category';
    }

    return 'category';
}

function isDateValue(value: string): boolean {
    if (!value) {
        return false;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return !Number.isNaN(Date.parse(value));
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && value.length >= 8;
}

function isNumericValue(value: string): boolean {
    if (!value) {
        return false;
    }

    const normalized = value.replace(/,/g, '');
    return normalized !== '' && Number.isFinite(Number(normalized));
}

export function filterFieldsByKind(
    fields: DashboardFieldDescriptor[],
    kinds: DashboardFieldKind[]
): DashboardFieldDescriptor[] {
    return fields.filter((field) => kinds.includes(field.kind));
}

export const PROCESS_KNOWN_FIELDS: DashboardFieldDescriptor[] = [
    { key: 'id', kind: 'category' },
    { key: 'name', kind: 'category' },
    { key: 'status', kind: 'category' },
    { key: 'processDefinitionKey', kind: 'category' },
    { key: 'processDefinitionName', kind: 'category' },
    { key: 'startDate', kind: 'date' },
    { key: 'businessKey', kind: 'category' },
];

export const CONTENT_KNOWN_FIELDS: DashboardFieldDescriptor[] = [
    { key: 'id', kind: 'category' },
    { key: 'name', kind: 'category' },
    { key: 'sys_id', kind: 'category' },
    { key: 'sys_title', kind: 'category' },
    { key: 'sys_primaryType', kind: 'category' },
    { key: 'sys_created', kind: 'date' },
    { key: 'sys_parentId', kind: 'category' },
];

export const DEMO_KNOWN_FIELDS: DashboardFieldDescriptor[] = [
    { key: 'id', kind: 'category' },
    { key: 'name', kind: 'category' },
    { key: 'status', kind: 'category' },
    { key: 'sourceField', kind: 'category' },
];

export function mergeFieldDescriptors(
    primary: DashboardFieldDescriptor[],
    fallback: DashboardFieldDescriptor[]
): DashboardFieldDescriptor[] {
    const merged = new Map<string, DashboardFieldDescriptor>();
    for (const field of fallback) {
        merged.set(field.key, field);
    }
    for (const field of primary) {
        merged.set(field.key, field);
    }
    return Array.from(merged.values());
}

export function fallbackFieldsForSource(dataSource: 'demo' | 'content' | 'process'): DashboardFieldDescriptor[] {
    if (dataSource === 'process') {
        return PROCESS_KNOWN_FIELDS;
    }
    if (dataSource === 'content') {
        return CONTENT_KNOWN_FIELDS;
    }
    return DEMO_KNOWN_FIELDS;
}

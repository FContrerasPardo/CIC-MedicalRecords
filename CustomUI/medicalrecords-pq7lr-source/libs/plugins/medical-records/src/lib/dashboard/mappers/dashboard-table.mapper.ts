import { normalizeContentRow } from '../utils/dashboard-content-fields.util';

export function flattenTableRow(row: Record<string, unknown>): Record<string, string> {
    const normalizedRow = normalizeContentRow(row);
    const flat: Record<string, string> = {};

    for (const [key, value] of Object.entries(normalizedRow)) {
        if (value === null || value === undefined) {
            flat[key] = '';
            continue;
        }

        if (typeof value === 'object') {
            flat[key] = JSON.stringify(value);
            continue;
        }

        flat[key] = String(value);
    }

    return flat;
}

export function discoverTableColumns(rows: Record<string, string>[], preferredKeys?: string[]): string[] {
    if (preferredKeys !== undefined) {
        return preferredKeys.slice(0, 24);
    }

    const discovered = new Set<string>();

    for (const row of rows) {
        for (const key of Object.keys(row)) {
            discovered.add(key);
        }
    }

    return Array.from(discovered).slice(0, 24);
}

export function parseColumnKeys(raw?: string): string[] {
    if (!raw?.trim()) {
        return [];
    }

    return raw
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);
}

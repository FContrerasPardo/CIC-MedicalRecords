import { DashboardFieldKind, DashboardJsonFieldPathOption } from '../definitions/dashboard-widget.model';

const DATE_NAME_PATTERN = /date|fecha|created|modified|time|timestamp|started|ended/i;
const LABEL_PATH_PRIORITY = ['displayName', 'name', 'fullName', 'title', 'username', 'email', 'firstName', 'lastName', 'id'];

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function tryParseJsonString(value: string): unknown | null {
    const trimmed = value.trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
        return null;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return null;
    }
}

export function isJsonFieldValue(value: string): boolean {
    const parsed = tryParseJsonString(value);
    return parsed !== null && typeof parsed === 'object';
}

function collectScalarValuesAtPath(value: unknown, parts: string[], partIndex = 0): string[] {
    if (value === null || value === undefined) {
        return [];
    }

    if (partIndex >= parts.length) {
        if (typeof value === 'object') {
            return [];
        }
        return [String(value)];
    }

    if (Array.isArray(value)) {
        return value.flatMap((item) => collectScalarValuesAtPath(item, parts, partIndex));
    }

    if (typeof value !== 'object') {
        return [];
    }

    const part = parts[partIndex];
    const next = (value as Record<string, unknown>)[part];
    if (next === undefined || next === null) {
        return [];
    }

    return collectScalarValuesAtPath(next, parts, partIndex + 1);
}

function getValueAtPath(obj: unknown, path: string): unknown {
    const parts = path.split('.').filter(Boolean);
    const values = collectScalarValuesAtPath(obj, parts);
    if (!values.length) {
        return undefined;
    }
    const normalized = values[0].trim().replace(/,/g, '');
    if (normalized !== '' && Number.isFinite(Number(normalized))) {
        return Number(normalized);
    }
    return values[0];
}

export function resolveBoundFieldValues(
    row: Record<string, string>,
    fieldKey: string,
    subPath?: string
): string[] {
    const raw = row[fieldKey] ?? '';
    if (!raw.trim()) {
        return [];
    }

    const parsed = tryParseJsonString(raw);
    if (parsed === null || typeof parsed !== 'object') {
        return subPath?.trim() ? [] : [raw];
    }

    if (!subPath?.trim()) {
        return [];
    }

    return collectScalarValuesAtPath(parsed, subPath.split('.').filter(Boolean));
}

export function resolveBoundFieldValue(
    row: Record<string, string>,
    fieldKey: string,
    subPath?: string
): string {
    const values = resolveBoundFieldValues(row, fieldKey, subPath);
    if (!values.length) {
        return '';
    }

    const resolved = values[0];
    return String(resolved);
}

function stringifyJsonLeaf(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

/**
 * Resolves a JSON/scalar field for chart labels and grouping.
 * Uses the selected path only; if empty, falls back to id when it is a semantic token (e.g. "system"), not a UUID.
 */
export function resolveBoundFieldLabelValue(
    row: Record<string, string>,
    fieldKey: string,
    subPath?: string
): string {
    const primary = resolveBoundFieldValue(row, fieldKey, subPath).trim();
    if (primary) {
        return primary;
    }

    const raw = row[fieldKey] ?? '';
    const parsed = tryParseJsonString(raw);
    if (parsed === null || typeof parsed !== 'object') {
        return '';
    }

    const selectedPath = subPath?.trim();
    if (selectedPath && selectedPath !== 'id') {
        const idText = stringifyJsonLeaf(getValueAtPath(parsed, 'id')).trim();
        if (idText && isSemanticIdentifier(idText)) {
            return idText;
        }
    }

    return '';
}

function isSemanticIdentifier(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed || UUID_PATTERN.test(trimmed)) {
        return false;
    }
    return trimmed.length <= 48;
}

function classifyScalarValue(value: string, fieldKey = ''): DashboardFieldKind {
    const trimmed = value.trim();
    if (!trimmed) {
        return 'category';
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !Number.isNaN(Date.parse(trimmed))) {
        return 'date';
    }

    if (DATE_NAME_PATTERN.test(fieldKey) && !Number.isNaN(Date.parse(trimmed)) && trimmed.length >= 8) {
        return 'date';
    }

    const normalized = trimmed.replace(/,/g, '');
    if (normalized !== '' && Number.isFinite(Number(normalized))) {
        return 'number';
    }

    return 'category';
}

function collectObjectPaths(
    value: unknown,
    prefix: string,
    maxDepth: number,
    collected: Map<string, { sample: string; kind: DashboardFieldKind }>
): void {
    if (maxDepth <= 0 || value === null || value === undefined) {
        return;
    }

    if (Array.isArray(value)) {
        if (value.length > 0) {
            collectObjectPaths(value[0], prefix, maxDepth - 1, collected);
        }
        return;
    }

    if (typeof value !== 'object') {
        if (prefix) {
            const scalar = String(value);
            collected.set(prefix, {
                sample: scalar,
                kind: classifyScalarValue(scalar, prefix),
            });
        }
        return;
    }

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (child === null || child === undefined) {
            continue;
        }

        if (typeof child === 'object') {
            collectObjectPaths(child, path, maxDepth - 1, collected);
            continue;
        }

        const scalar = String(child);
        collected.set(path, {
            sample: scalar,
            kind: classifyScalarValue(scalar, key),
        });
    }
}

export function inferJsonFieldPaths(
    rows: Record<string, string>[],
    fieldKey: string,
    maxDepth = 4
): DashboardJsonFieldPathOption[] {
    const collected = new Map<string, { sample: string; kind: DashboardFieldKind }>();

    for (const row of rows) {
        const parsed = tryParseJsonString(row[fieldKey] ?? '');
        if (parsed === null || typeof parsed !== 'object') {
            continue;
        }
        collectObjectPaths(parsed, '', maxDepth, collected);
        if (collected.size >= 24) {
            break;
        }
    }

    return rankJsonPaths(
        Array.from(collected.entries()).map(([path, meta]) => ({
            path,
            label: path,
            sample: meta.sample,
            kind: meta.kind,
        }))
    );
}

export function rankJsonPaths(paths: DashboardJsonFieldPathOption[]): DashboardJsonFieldPathOption[] {
    return [...paths].sort((left, right) => {
        const leftLeaf = left.path.split('.').pop() ?? left.path;
        const rightLeaf = right.path.split('.').pop() ?? right.path;
        const leftScore = LABEL_PATH_PRIORITY.indexOf(leftLeaf);
        const rightScore = LABEL_PATH_PRIORITY.indexOf(rightLeaf);
        const normalizedLeft = leftScore >= 0 ? leftScore : 100;
        const normalizedRight = rightScore >= 0 ? rightScore : 100;

        if (normalizedLeft !== normalizedRight) {
            return normalizedLeft - normalizedRight;
        }

        return left.path.localeCompare(right.path);
    });
}

export function pickDefaultJsonPath(
    paths: DashboardJsonFieldPathOption[],
    slot: 'argument' | 'value' | 'series'
): string | undefined {
    const ranked = rankJsonPaths(paths);
    if (!ranked.length) {
        return undefined;
    }

    if (slot === 'value') {
        return ranked.find((path) => path.kind === 'number')?.path;
    }

    if (slot === 'series') {
        return ranked.find((path) => path.kind === 'category')?.path ?? ranked[0]?.path;
    }

    return ranked.find((path) => path.kind === 'category' || path.kind === 'date')?.path ?? ranked[0]?.path;
}

export function classifyResolvedValues(
    values: string[],
    fieldKey: string,
    maxBuckets = 12
): DashboardFieldKind {
    const nonEmpty = values.map((value) => value.trim()).filter(Boolean);
    if (!nonEmpty.length) {
        return 'category';
    }

    const dateMatches = nonEmpty.filter((value) => classifyScalarValue(value, fieldKey) === 'date').length;
    if (DATE_NAME_PATTERN.test(fieldKey) || dateMatches / nonEmpty.length >= 0.6) {
        return 'date';
    }

    const numericMatches = nonEmpty.filter((value) => classifyScalarValue(value, fieldKey) === 'number').length;
    if (numericMatches / nonEmpty.length >= 0.6) {
        return 'number';
    }

    const distinct = new Set(nonEmpty);
    if (distinct.size <= maxBuckets) {
        return 'category';
    }

    return 'category';
}

export function formatBindingFieldLabel(fieldKey: string, fieldPath?: string): string {
    if (!fieldPath?.trim()) {
        return fieldKey;
    }
    return `${fieldKey} › ${fieldPath}`;
}

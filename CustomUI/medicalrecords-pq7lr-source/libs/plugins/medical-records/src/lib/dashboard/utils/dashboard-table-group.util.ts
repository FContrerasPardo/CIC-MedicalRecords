export interface TableDisplayEntry {
    type: 'group' | 'row';
    id: string;
    depth: number;
    field?: string;
    value?: string;
    count?: number;
    collapsed?: boolean;
    row?: Record<string, string>;
}

interface GroupNode {
    field: string;
    value: string;
    count: number;
    subgroups?: GroupNode[];
    rows?: Array<Record<string, string>>;
}

export function buildTableDisplayEntries(
    rows: Array<Record<string, string>>,
    groupByFields: string[],
    collapsedGroupIds: Set<string>
): TableDisplayEntry[] {
    if (!groupByFields.length) {
        return rows.map((row, index) => ({
            type: 'row',
            id: `row-${index}`,
            depth: 0,
            row,
        }));
    }

    const roots = buildGroupNodes(rows, groupByFields, 0);
    const entries: TableDisplayEntry[] = [];
    for (const node of roots) {
        appendGroupNode(node, [], 0, collapsedGroupIds, entries);
    }
    return entries;
}

function buildGroupNodes(
    rows: Array<Record<string, string>>,
    groupByFields: string[],
    level: number
): GroupNode[] {
    if (level >= groupByFields.length) {
        return [];
    }

    const field = groupByFields[level];
    const buckets = new Map<string, Array<Record<string, string>>>();

    for (const row of rows) {
        const value = formatGroupValue(row[field]);
        const bucket = buckets.get(value) ?? [];
        bucket.push(row);
        buckets.set(value, bucket);
    }

    return Array.from(buckets.entries())
        .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
        .map(([value, bucketRows]) => {
            if (level + 1 < groupByFields.length) {
                return {
                    field,
                    value,
                    count: bucketRows.length,
                    subgroups: buildGroupNodes(bucketRows, groupByFields, level + 1),
                };
            }

            return {
                field,
                value,
                count: bucketRows.length,
                rows: bucketRows,
            };
        });
}

function appendGroupNode(
    node: GroupNode,
    path: string[],
    depth: number,
    collapsedGroupIds: Set<string>,
    entries: TableDisplayEntry[]
): void {
    const id = [...path, `${node.field}:${node.value}`].join('|');
    const collapsed = collapsedGroupIds.has(id);

    entries.push({
        type: 'group',
        id,
        depth,
        field: node.field,
        value: node.value,
        count: node.count,
        collapsed,
    });

    if (collapsed) {
        return;
    }

    if (node.subgroups?.length) {
        for (const child of node.subgroups) {
            appendGroupNode(child, [...path, `${node.field}:${node.value}`], depth + 1, collapsedGroupIds, entries);
        }
        return;
    }

    for (const [index, row] of (node.rows ?? []).entries()) {
        entries.push({
            type: 'row',
            id: `${id}-row-${index}`,
            depth: depth + 1,
            row,
        });
    }
}

function formatGroupValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '(empty)';
    }
    return String(value);
}

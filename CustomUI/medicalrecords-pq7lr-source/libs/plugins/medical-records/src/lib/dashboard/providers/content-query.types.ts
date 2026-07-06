export type ContentQueryPriority = 'visible' | 'background';

export interface ContentQueryRequestOptions {
    priority?: ContentQueryPriority;
    widgetId?: string;
}

/** Shared sample size for charts, trends and period metrics. */
export const CONTENT_SAMPLE_MAX_ROWS = 1000;

export function normalizeContentQuery(query: string): string {
    return query.trim().replace(/\s+/g, ' ');
}

export function contentQueryAllKey(query: string, maxRows: number): string {
    return `${normalizeContentQuery(query)}::all::${maxRows}`;
}

export function parseContentQueryAllKey(key: string): { query: string; maxRows: number } | null {
    const match = /^([\s\S]+?)::all::(\d+)$/.exec(key);
    if (!match) {
        return null;
    }
    return { query: match[1], maxRows: Number.parseInt(match[2], 10) };
}

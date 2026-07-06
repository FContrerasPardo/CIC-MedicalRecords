import { DashboardLayoutState } from '../definitions/dashboard-widget.model';
import { LAYOUT_SCHEMA_VERSION } from '../utils/dashboard-layout-structure.util';

export const DASHBOARD_LAYOUT_KIND = 'medical-records.dashboard.layout';
export const DEFAULT_LAYOUT_KEY = 'medical-records-default';
export const DEFAULT_LAYOUT_FILE_NAME = 'medical-records-dashboard.layout.json';

export interface DashboardLayoutDocumentEnvelope {
    kind: typeof DASHBOARD_LAYOUT_KIND;
    layoutKey: string;
    schemaVersion: number;
    savedAt: string;
    layout: DashboardLayoutState;
}

export function serializeLayoutDocument(
    layout: DashboardLayoutState,
    layoutKey = DEFAULT_LAYOUT_KEY
): string {
    const envelope: DashboardLayoutDocumentEnvelope = {
        kind: DASHBOARD_LAYOUT_KIND,
        layoutKey,
        schemaVersion: layout.version ?? LAYOUT_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        layout: {
            ...layout,
            version: layout.version ?? LAYOUT_SCHEMA_VERSION,
        },
    };
    return JSON.stringify(envelope, null, 2);
}

export function serializeLayoutDocumentBlob(
    layout: DashboardLayoutState,
    layoutKey = DEFAULT_LAYOUT_KEY
): Blob {
    return new Blob([serializeLayoutDocument(layout, layoutKey)], { type: 'application/json' });
}

export function parseLayoutDocumentEnvelope(raw: string): DashboardLayoutDocumentEnvelope | null {
    try {
        const parsed = JSON.parse(raw) as Partial<DashboardLayoutDocumentEnvelope> & DashboardLayoutState;
        if (parsed.kind === DASHBOARD_LAYOUT_KIND && parsed.layout && typeof parsed.layout === 'object') {
            return {
                kind: DASHBOARD_LAYOUT_KIND,
                layoutKey: parsed.layoutKey ?? DEFAULT_LAYOUT_KEY,
                schemaVersion: parsed.schemaVersion ?? parsed.layout.version ?? LAYOUT_SCHEMA_VERSION,
                savedAt: parsed.savedAt ?? '',
                layout: {
                    ...(parsed.layout as DashboardLayoutState),
                    version: (parsed.layout as DashboardLayoutState).version ?? LAYOUT_SCHEMA_VERSION,
                },
            };
        }
        if (parsed.pages && parsed.widgets) {
            return {
                kind: DASHBOARD_LAYOUT_KIND,
                layoutKey: DEFAULT_LAYOUT_KEY,
                schemaVersion: parsed.version ?? LAYOUT_SCHEMA_VERSION,
                savedAt: '',
                layout: parsed as DashboardLayoutState,
            };
        }
        return null;
    } catch {
        return null;
    }
}

export function parseLayoutDocument(raw: string): DashboardLayoutState | null {
    return parseLayoutDocumentEnvelope(raw)?.layout ?? null;
}

export function isLayoutDocumentFileName(name?: string | null): boolean {
    return !!name && name.endsWith('.layout.json');
}

/** Sanitizes user input and ensures a `.layout.json` suffix for repository documents. */
export function normalizeLayoutFileName(raw: string): string {
    let name = raw
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!name) {
        return DEFAULT_LAYOUT_FILE_NAME;
    }

    if (!name.toLowerCase().endsWith('.json')) {
        name = `${name}.layout.json`;
    }

    return name;
}

export function isLayoutDocumentCandidate(doc: {
    sys_name?: string | null;
    sys_title?: string | null;
    sys_primaryType?: string | null;
    sysfile_blob?: { mimeType?: string | null } | null;
}): boolean {
    if (isLayoutDocumentFileName(doc.sys_name) || isLayoutDocumentFileName(doc.sys_title)) {
        return true;
    }

    const name = doc.sys_name ?? '';
    const title = doc.sys_title ?? '';
    if (name.endsWith('.json') || title.endsWith('.json')) {
        return true;
    }

    return doc.sys_primaryType === 'SysFile' && doc.sysfile_blob?.mimeType === 'application/json';
}

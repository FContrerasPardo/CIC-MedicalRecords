import { DashboardLayoutState } from '../definitions/dashboard-widget.model';

/**
 * Phase 2 — shared report layouts via repository document.
 *
 * Intended flow:
 * 1. Admin picks a layout document (JSON) from the content repository in the builder.
 * 2. `loadLayout(documentId)` hydrates `DashboardLayoutState` (pages, containers, widgets, theme).
 * 3. `saveLayout(documentId, layout)` writes the JSON back for reuse across demos / tenants.
 *
 * Until then, {@link DashboardLayoutService} persists to `localStorage` only.
 */
export interface DashboardLayoutPersistenceProvider {
    /** Repository node id (e.g. hxp:document sys_id) holding layout JSON. */
    loadLayout(documentId: string): Promise<DashboardLayoutState | null>;
    saveLayout(documentId: string, layout: DashboardLayoutState): Promise<void>;
    listLayoutDocuments?(): Promise<Array<{ id: string; title: string }>>;
}

export const DASHBOARD_LAYOUT_PERSISTENCE = 'DASHBOARD_LAYOUT_PERSISTENCE';

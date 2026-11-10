/**
 * Appearance preferences for the Medical Records experience.
 *
 * Phase 1 covers a single axis: the application menu (Hyland's ADF side menu).
 * Palette, light/dark mode and density will join `AppearancePreferences` once the
 * plugin styles share one token set.
 *
 * Everything here is plain TypeScript (no Angular, no globals) so it stays easy to test.
 */

/**
 * `auto` leaves Hyland's responsive behaviour untouched.
 * `collapsed` hides the ADF application menu (not the CIC platform rail).
 */
export type WorkspaceNavMode = 'auto' | 'collapsed';

export interface AppearancePreferences {
    workspaceNav: WorkspaceNavMode;
}

export interface WorkspaceNavOption {
    value: WorkspaceNavMode;
    labelKey: string;
}

/** Attribute written on <html>; the stylesheet of the appearance panel reacts to it. */
export const WORKSPACE_NAV_ATTRIBUTE = 'data-mr-workspace-nav';

/** localStorage key. Prefixed per solution so two apps served from localhost never share it. */
export const WORKSPACE_NAV_STORAGE_KEY = 'medicalrecords.workspaceNav';

export const DEFAULT_APPEARANCE: Readonly<AppearancePreferences> = { workspaceNav: 'auto' };

export const WORKSPACE_NAV_OPTIONS: readonly WorkspaceNavOption[] = [
    { value: 'auto', labelKey: 'MEDICAL_RECORDS.APPEARANCE.NAV_AUTO' },
    { value: 'collapsed', labelKey: 'MEDICAL_RECORDS.APPEARANCE.NAV_COLLAPSED' },
];

/** Accepts only known modes; anything else (old values, tampering) falls back to `auto`. */
export function parseWorkspaceNav(value: unknown): WorkspaceNavMode {
    return value === 'collapsed' ? 'collapsed' : DEFAULT_APPEARANCE.workspaceNav;
}

export function readStoredPreferences(storage: Pick<Storage, 'getItem'> | null | undefined): AppearancePreferences {
    try {
        return { workspaceNav: parseWorkspaceNav(storage?.getItem(WORKSPACE_NAV_STORAGE_KEY)) };
    } catch {
        return { ...DEFAULT_APPEARANCE };
    }
}

export function storePreferences(
    storage: Pick<Storage, 'setItem'> | null | undefined,
    preferences: AppearancePreferences
): void {
    try {
        storage?.setItem(WORKSPACE_NAV_STORAGE_KEY, preferences.workspaceNav);
    } catch {
        // Storage can be blocked (private mode, browser policy): the choice then lasts for the session only.
    }
}

export function applyPreferences(root: Pick<Element, 'setAttribute'>, preferences: AppearancePreferences): void {
    root.setAttribute(WORKSPACE_NAV_ATTRIBUTE, preferences.workspaceNav);
}

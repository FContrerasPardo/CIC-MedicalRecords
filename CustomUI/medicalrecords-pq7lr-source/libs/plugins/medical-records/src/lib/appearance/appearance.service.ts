import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import {
    AppearancePreferences,
    DEFAULT_APPEARANCE,
    WorkspaceNavMode,
    applyPreferences,
    readStoredPreferences,
    storePreferences,
} from './appearance.model';

/** Time given to the DOM to settle before the layout is told its width changed. */
const LAYOUT_REFRESH_DELAY_MS = 120;

/**
 * Holds the appearance preferences, persists them and reflects them on <html>.
 * The visual effect lives in the stylesheet of `AppearanceManagerComponent`.
 */
@Injectable({ providedIn: 'root' })
export class AppearanceService {
    private readonly document = inject(DOCUMENT);
    private readonly state = signal<AppearancePreferences>(readStoredPreferences(this.storage));
    private layoutRefreshTimer: ReturnType<typeof setTimeout> | undefined;

    readonly preferences = this.state.asReadonly();

    /** Writes the current preferences onto <html>. Safe to call more than once. */
    apply(): void {
        applyPreferences(this.document.documentElement, this.state());
    }

    setWorkspaceNav(workspaceNav: WorkspaceNavMode): void {
        this.update({ ...this.state(), workspaceNav });
    }

    reset(): void {
        this.update({ ...DEFAULT_APPEARANCE });
    }

    private update(next: AppearancePreferences): void {
        this.state.set(next);
        storePreferences(this.storage, next);
        this.apply();
        this.requestLayoutRefresh();
    }

    /**
     * Hiding or showing the menu changes the width available to the content. Material's sidenav
     * container (and width-aware widgets such as charts) recompute on window resize, so one is
     * emitted after the attribute is applied.
     */
    private requestLayoutRefresh(): void {
        const view = this.document.defaultView;
        if (!view) {
            return;
        }
        if (this.layoutRefreshTimer !== undefined) {
            clearTimeout(this.layoutRefreshTimer);
        }
        this.layoutRefreshTimer = setTimeout(() => {
            this.layoutRefreshTimer = undefined;
            view.dispatchEvent(new Event('resize'));
        }, LAYOUT_REFRESH_DELAY_MS);
    }

    private get storage(): Storage | null {
        try {
            return this.document.defaultView?.localStorage ?? null;
        } catch {
            return null;
        }
    }
}

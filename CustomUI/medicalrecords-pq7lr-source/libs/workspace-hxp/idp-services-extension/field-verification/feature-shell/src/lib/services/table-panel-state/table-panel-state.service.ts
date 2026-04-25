/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, signal } from '@angular/core';

export const TablePanelMode = {
    Hidden: 'hidden',
    Minimized: 'minimized',
    Default: 'default',
    Maximized: 'maximized',
} as const;

export type TablePanelMode = typeof TablePanelMode[keyof typeof TablePanelMode];

const MINIMIZED_HEIGHT_EM = 3;
const DEFAULT_HEIGHT_PERCENT = 40;
const MAXIMIZED_HEIGHT_PERCENT = 100;

@Injectable()
export class TablePanelStateService {
    readonly mode = signal<TablePanelMode>(TablePanelMode.Hidden);
    readonly height = signal<number>(DEFAULT_HEIGHT_PERCENT);
    readonly transitioning = signal<boolean>(false);

    maximize(): void {
        this.transitioning.set(true);
        this.mode.set(TablePanelMode.Maximized);
        this.height.set(MAXIMIZED_HEIGHT_PERCENT);
    }

    minimize(): void {
        this.transitioning.set(true);
        this.mode.set(TablePanelMode.Minimized);
        this.height.set(MINIMIZED_HEIGHT_EM);
    }

    setDefault(): void {
        this.transitioning.set(true);
        this.mode.set(TablePanelMode.Default);
        this.height.set(DEFAULT_HEIGHT_PERCENT);
    }

    hide(): void {
        this.mode.set(TablePanelMode.Hidden);
    }

    setHeight(heightPercentage: number): void {
        const clampedHeight = Math.min(100, Math.max(20, heightPercentage));
        this.height.set(clampedHeight);
    }

    endTransition(): void {
        this.transitioning.set(false);
    }

    startTransition(): void {
        this.transitioning.set(true);
    }
}

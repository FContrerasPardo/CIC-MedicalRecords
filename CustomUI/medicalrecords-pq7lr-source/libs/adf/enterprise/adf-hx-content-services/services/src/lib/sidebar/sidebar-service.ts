/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, signal } from '@angular/core';

export type PanelType = 'property' | 'permission' | 'version' | null;

@Injectable({
    providedIn: 'root',
})
export class SidebarService {
    readonly panel = signal<PanelType>(null);

    togglePanel(panelType: PanelType): void {
        if (this.isPanelOpened(panelType)) {
            this.closePanel();
        } else {
            this.panel.set(panelType);
        }
    }

    closePanel(): void {
        this.panel.set(null);
    }

    private isPanelOpened(panel: PanelType): boolean {
        return this.panel() === panel;
    }
}

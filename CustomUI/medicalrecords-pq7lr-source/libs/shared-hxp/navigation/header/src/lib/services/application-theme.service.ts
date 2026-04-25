/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { StorageService } from '@alfresco/adf-core';
import { inject, Injectable, signal } from '@angular/core';

export type ApplicationTheme = 'light' | 'dark';

@Injectable({
    providedIn: 'root',
})
export class ApplicationThemeService {
    private readonly storageService = inject(StorageService);
    private readonly storageKey = 'application-theme';

    readonly applicationTheme = signal<ApplicationTheme>(this.getStoredTheme() || 'light');

    toggleTheme(): void {
        const newTheme: ApplicationTheme = this.applicationTheme() === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme: ApplicationTheme): void {
        this.applicationTheme.set(theme);
        this.storageService.setItem(this.storageKey, theme);
        globalThis.dispatchEvent(new CustomEvent(this.storageKey, { detail: { theme } }));
    }

    private getStoredTheme(): ApplicationTheme | null {
        const storedTheme = this.storageService.getItem(this.storageKey);

        if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
            return storedTheme as ApplicationTheme;
        }
        return null;
    }
}

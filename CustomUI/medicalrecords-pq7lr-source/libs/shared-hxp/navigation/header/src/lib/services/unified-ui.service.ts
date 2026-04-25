/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { JwtHelperService } from '@alfresco/adf-core';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { toSignal } from '@angular/core/rxjs-interop';
import { SHARED_HXP } from '@features';

const UNIFIED_UI_ENABLED_KEY = 'studio-unified-modern-ui-enabled';
const UNIFIED_UI_BANNER_DISMISSED_KEY = 'studio-unified-modern-ui-banner-dismissed';
const UNIFIED_UI_NAVIGATE_BACK_BANNER_DISMISSED_KEY = 'studio-unified-modern-ui-navigate-back-banner-dismissed';

@Injectable({ providedIn: 'root' })
export class UnifiedUiService {
    private readonly jwtHelperService = inject(JwtHelperService);
    private readonly featuresService: IFeaturesService = inject(FeaturesServiceToken);

    private readonly _enabledOverride = signal<boolean | undefined>(undefined);
    private readonly _bannerDismissedOverride = signal<boolean | undefined>(undefined);
    private readonly _navigateBackBannerDismissedOverride = signal<boolean | undefined>(undefined);
    private readonly featureFlagEnabled = toSignal(
        this.featuresService.isOn$(SHARED_HXP.STUDIO_UNIFIED_MODERN_UI),
        { initialValue: false }
    );

    readonly enabled = computed(() => this._enabledOverride() ?? this.readEnabled());
    readonly bannerDismissed = computed(() => this._bannerDismissedOverride() ?? this.isBannerDismissedForCurrentUser());
    readonly navigateBackBannerDismissed = computed(
        () => this._navigateBackBannerDismissedOverride() ?? this.isNavigateBackBannerDismissedForCurrentUser()
    );
    readonly projectRoute = computed(() => this.featureFlagEnabled() && this.enabled() ? 'projects-hub' : 'projects');

    toggle(value: boolean): void {
        const username = this.getCurrentUsername();
        if (username) {
            localStorage.setItem(UNIFIED_UI_ENABLED_KEY, JSON.stringify({ username, value }));
        }

        this._enabledOverride.set(value);
    }

    dismissBanner(): void {
        const username = this.getCurrentUsername();
        if (username) {
            localStorage.setItem(UNIFIED_UI_BANNER_DISMISSED_KEY, username);
        }

        this._bannerDismissedOverride.set(true);
    }

    enableAndDismissBanner(): void {
        this.toggle(true);
        this.dismissBanner();
    }

    dismissNavigateBackBanner(): void {
        const username = this.getCurrentUsername();
        if (username) {
            localStorage.setItem(UNIFIED_UI_NAVIGATE_BACK_BANNER_DISMISSED_KEY, username);
        }

        this._navigateBackBannerDismissedOverride.set(true);
    }

    private readEnabled(): boolean {
        const raw = localStorage.getItem(UNIFIED_UI_ENABLED_KEY);
        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw);
            if (parsed.username !== this.getCurrentUsername()) {
                return false;
            }

            return parsed.value === true;
        } catch {
            return false;
        }
    }

    private isBannerDismissedForCurrentUser(): boolean {
        const dismissedByUser = localStorage.getItem(UNIFIED_UI_BANNER_DISMISSED_KEY);
        if (!dismissedByUser) {
            return false;
        }

        const currentUser = this.getCurrentUsername();
        return dismissedByUser === currentUser;
    }

    private isNavigateBackBannerDismissedForCurrentUser(): boolean {
        const dismissedByUser = localStorage.getItem(UNIFIED_UI_NAVIGATE_BACK_BANNER_DISMISSED_KEY);
        if (!dismissedByUser) {
            return false;
        }

        return dismissedByUser === this.getCurrentUsername();
    }

    private getCurrentUsername(): string {
        return this.jwtHelperService.getValueFromLocalToken<string>(JwtHelperService.USER_PREFERRED_USERNAME) ?? '';
    }
}

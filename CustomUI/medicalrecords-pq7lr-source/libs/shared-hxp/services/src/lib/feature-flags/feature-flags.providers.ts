/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { provideFeaturesFlags } from '@features';
import { provideTranslations } from '@alfresco/adf-core';
import { ExtensionService } from '@alfresco/adf-extensions';
import { FeatureFlagsMenuItemComponent } from './feature-flag-menu-item.component';
import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { provideDummyFeatureFlags, provideDebugFeatureFlags, FlagsOverrideToken } from '@alfresco/adf-core/feature-flags';

export function provideFeatureFlagsWithInitializer(storageKey: string, devMode = false): EnvironmentProviders {
    return makeEnvironmentProviders([getFeatureFlags(storageKey, devMode), provideAppInitializer(() => featureFlagsInitializer())]);
}

export function provideFeatureFlags(storageKey: string, devMode = false): EnvironmentProviders {
    return makeEnvironmentProviders(getFeatureFlags(storageKey, devMode));
}

function featureFlagsInitializer() {
    const extensions = inject(ExtensionService);
    const flagsOverride = inject(FlagsOverrideToken, { optional: true });

    extensions.setComponents({
        'feature-flags.menu-button': FeatureFlagsMenuItemComponent,
    });

    extensions.setEvaluators({
        'feature-flags.isEnabled': () => !!flagsOverride,
    });
}

function getFeatureFlags(storageKey: string, devMode = false) {
    return [
        provideTranslations('feature-flags', 'assets/feature-flags'),
        ...provideDummyFeatureFlags(),
        ...provideFeaturesFlags({ isApplicationAware: true, serviceRelativePath: '/rb' }),
        ...(devMode ? provideDebugFeatureFlags({ storageKey }) : []),
    ];
}

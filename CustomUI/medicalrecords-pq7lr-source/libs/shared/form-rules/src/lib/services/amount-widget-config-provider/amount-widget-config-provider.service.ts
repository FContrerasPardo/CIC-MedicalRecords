/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AmountWidgetSettings } from '@alfresco/adf-core';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
    providedIn: 'root',
})
export class AmountWidgetConfigProviderService {
    private readonly featuresService = inject<IFeaturesService>(FeaturesServiceToken);
    private destroyRef = inject(DestroyRef);

    provideConfig(featureFlagName: string): Observable<AmountWidgetSettings> {
        return this.featuresService.isOn$(featureFlagName).pipe(
            takeUntilDestroyed(this.destroyRef),
            map((isEnabled: boolean) => {
                return { showReadonlyPlaceholder: true, enableDisplayBasedOnLocale: isEnabled };
            })
        );
    }
}

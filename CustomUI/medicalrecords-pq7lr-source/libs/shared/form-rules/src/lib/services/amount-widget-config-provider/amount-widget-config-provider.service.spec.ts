/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FeaturesServiceToken, IFeaturesService, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { TestBed } from '@angular/core/testing';
import { STUDIO_SHARED } from '@features';
import { of } from 'rxjs';
import { AmountWidgetConfigProviderService } from './amount-widget-config-provider.service';

describe('AmountWidgetConfigProviderService with feature flag on', () => {
    let service: AmountWidgetConfigProviderService;
    let featuresService: IFeaturesService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockFeatureFlags({ [STUDIO_SHARED.STUDIO_LOCALE_SPECIFIC_AMOUNT]: true })],
        });
        service = TestBed.inject(AmountWidgetConfigProviderService);
        featuresService = TestBed.inject(FeaturesServiceToken);
    });

    describe('when flag is on', () => {
        beforeEach(() => {
            spyOn(featuresService, 'isOn$').and.returnValue(of(true));
        });
        it('should provide proper config when flag is on', (done) => {
            const featureName = STUDIO_SHARED.STUDIO_LOCALE_SPECIFIC_AMOUNT;

            service.provideConfig(featureName).subscribe((config) => {
                expect(config.enableDisplayBasedOnLocale).toBe(true);
                expect(config.showReadonlyPlaceholder).toBe(true);
                done();
            });
        });
    });

    describe('when flag is off', () => {
        beforeEach(() => {
            spyOn(featuresService, 'isOn$').and.returnValue(of(false));
        });
        it('should provide proper config when flag is off', (done) => {
            const featureName = STUDIO_SHARED.STUDIO_LOCALE_SPECIFIC_AMOUNT;

            service.provideConfig(featureName).subscribe((config) => {
                expect(config.enableDisplayBasedOnLocale).toBe(false);
                expect(config.showReadonlyPlaceholder).toBe(true);
                done();
            });
        });
    });
});

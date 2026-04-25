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
import { FormDisplayTextConfigProviderService } from './form-display-text-config-provider.service';

describe('FormDisplayTextConfigProviderService', () => {
    let service: FormDisplayTextConfigProviderService;
    let featuresService: IFeaturesService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockFeatureFlags({ [STUDIO_SHARED.STUDIO_VARIABLES_IN_FORM_DISPLAY_TEXT]: true })],
        });
        service = TestBed.inject(FormDisplayTextConfigProviderService);
        featuresService = TestBed.inject(FeaturesServiceToken);
    });

    describe('when flag is on', () => {
        beforeEach(() => {
            spyOn(featuresService, 'isOn$').and.returnValue(of(true));
        });

        it('should provide proper config when flag is on', (done) => {
            const featureName = STUDIO_SHARED.STUDIO_VARIABLES_IN_FORM_DISPLAY_TEXT;

            service.provideConfig(featureName).subscribe((config) => {
                expect(config.enableExpressionEvaluation).toBe(true);
                done();
            });
        });
    });

    describe('when flag is off', () => {
        beforeEach(() => {
            spyOn(featuresService, 'isOn$').and.returnValue(of(false));
        });

        it('should provide proper config when flag is off', (done) => {
            const featureName = STUDIO_SHARED.STUDIO_VARIABLES_IN_FORM_DISPLAY_TEXT;

            service.provideConfig(featureName).subscribe((config) => {
                expect(config.enableExpressionEvaluation).toBe(false);
                done();
            });
        });
    });
});

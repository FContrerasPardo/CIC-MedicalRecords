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
import { CustomValidationMessageConfigProviderService } from './custom-validation-message-config-provider.service';

describe('CustomValidationMessageConfigProviderService', () => {
    let service: CustomValidationMessageConfigProviderService;
    let featuresService: IFeaturesService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideMockFeatureFlags({ [STUDIO_SHARED.STUDIO_CONFIGURABLE_FORM_VALIDATION_MESSAGE]: true })],
        });
        service = TestBed.inject(CustomValidationMessageConfigProviderService);
        featuresService = TestBed.inject(FeaturesServiceToken);
    });

    it('should provide true when flag is on', (done) => {
        spyOn(featuresService, 'isOn$').and.returnValue(of(true));

        service.provideConfig(STUDIO_SHARED.STUDIO_CONFIGURABLE_FORM_VALIDATION_MESSAGE).subscribe((enabled) => {
            expect(enabled).toBe(true);
            done();
        });
    });

    it('should provide false when flag is off', (done) => {
        spyOn(featuresService, 'isOn$').and.returnValue(of(false));

        service.provideConfig(STUDIO_SHARED.STUDIO_CONFIGURABLE_FORM_VALIDATION_MESSAGE).subscribe((enabled) => {
            expect(enabled).toBe(false);
            done();
        });
    });
});

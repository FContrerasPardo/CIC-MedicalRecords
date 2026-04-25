/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { UnifiedUiService } from './unified-ui.service';
import { JwtHelperService } from '@alfresco/adf-core';
import { FeaturesServiceToken, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { SHARED_HXP } from '@features';
import { of } from 'rxjs';

describe('UnifiedUiService', () => {
    const MOCK_USERNAME = 'john.doe';

    const mockJwtHelperService = {
        getValueFromLocalToken: jest.fn().mockReturnValue(MOCK_USERNAME),
    };

    function injectService(): UnifiedUiService {
        return TestBed.inject(UnifiedUiService);
    }

    beforeEach(() => {
        localStorage.clear();
        mockJwtHelperService.getValueFromLocalToken.mockReturnValue(MOCK_USERNAME);

        TestBed.configureTestingModule({
            providers: [
                { provide: JwtHelperService, useValue: mockJwtHelperService },
                provideMockFeatureFlags({
                    [SHARED_HXP.STUDIO_UNIFIED_MODERN_UI]: false,
                }),
            ],
        });
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should not activate new UI for a fresh user with no prior preference', () => {
        expect(injectService().enabled()).toBe(false);
    });

    it('should not suppress the banner for a fresh user who has never dismissed it', () => {
        expect(injectService().bannerDismissed()).toBe(false);
    });

    it('should activate new UI and persist the preference when user toggles on', () => {
        const service = injectService();
        service.toggle(true);

        expect(service.enabled()).toBe(true);
        const stored = JSON.parse(localStorage.getItem('studio-unified-modern-ui-enabled'));
        expect(stored).toEqual({ username: MOCK_USERNAME, value: true });
    });

    it('should deactivate new UI and persist the preference when user toggles off', () => {
        const service = injectService();
        service.toggle(true);
        service.toggle(false);

        expect(service.enabled()).toBe(false);
        const stored = JSON.parse(localStorage.getItem('studio-unified-modern-ui-enabled'));
        expect(stored).toEqual({ username: MOCK_USERNAME, value: false });
    });

    it('should hide the banner and remember the dismissal for the current user', () => {
        const service = injectService();
        service.dismissBanner();

        expect(service.bannerDismissed()).toBe(true);
        expect(localStorage.getItem('studio-unified-modern-ui-banner-dismissed')).toBe(MOCK_USERNAME);
    });

    it('should activate new UI and dismiss the banner when user clicks try new UI', () => {
        const service = injectService();
        service.enableAndDismissBanner();

        expect(service.enabled()).toBe(true);
        expect(service.bannerDismissed()).toBe(true);
    });

    it('should restore previous preferences on page refresh for the same user', () => {
        localStorage.setItem('studio-unified-modern-ui-enabled', JSON.stringify({ username: MOCK_USERNAME, value: true }));
        localStorage.setItem('studio-unified-modern-ui-banner-dismissed', MOCK_USERNAME);

        const service = injectService();

        expect(service.enabled()).toBe(true);
        expect(service.bannerDismissed()).toBe(true);
    });

    describe('different user', () => {
        beforeEach(() => {
            mockJwtHelperService.getValueFromLocalToken.mockReturnValue('other.user');
        });

        it('should re-show the banner when a different user logs in', () => {
            localStorage.setItem('studio-unified-modern-ui-banner-dismissed', MOCK_USERNAME);

            expect(injectService().bannerDismissed()).toBe(false);
        });

        it('should not inherit new UI preference from a different user', () => {
            localStorage.setItem('studio-unified-modern-ui-enabled', JSON.stringify({ username: MOCK_USERNAME, value: true }));

            expect(injectService().enabled()).toBe(false);
        });
    });

    describe('projectRoute', () => {
        it('should navigate to classic projects when feature flag is disabled regardless of toggle state', () => {
            const service = injectService();
            service.toggle(true);

            expect(service.projectRoute()).toBe('projects');
        });

        describe('with feature flag enabled', () => {
            beforeEach(() => {
                TestBed.overrideProvider(FeaturesServiceToken, {
                    useValue: { isOn$: () => of(true) },
                });
            });

            it('should navigate to classic projects when user has not opted into new UI', () => {
                expect(injectService().projectRoute()).toBe('projects');
            });

            it('should navigate to projects hub when user has opted into new UI', () => {
                const service = injectService();
                service.toggle(true);

                expect(service.projectRoute()).toBe('projects-hub');
            });
        });
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { AppConfigService, JwtHelperService, NoopTranslateModule } from '@alfresco/adf-core';
import { By } from '@angular/platform-browser';
import { FeatureFlagsActionComponent } from '../feature-flags-action/feature-flags-action.component';
import { LanguageActionComponent } from '../language-action/language-action.component';
import { HelpActionComponent } from '../help-action/help-action.component';
import { MockComponent, MockModule, MockProvider } from 'ng-mocks';
import { HEADER_CONFIG_TOKEN } from '../../tokens/header-config.token';
import { mockHeaderConfig, mockLogoPath } from '../../mocks/header.component.mock';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { SatHeaderModule } from '@hylandsoftware/satori-ui';
import { TranslatePipe } from '@ngx-translate/core';
import { FeaturesServiceToken, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { SHARED_HXP } from '@features';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { UnifiedUiService } from '../../services/unified-ui.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';

describe('HeaderComponent', () => {
    let fixture: ComponentFixture<HeaderComponent>;

    const mockRouterEvents$ = new Subject<NavigationEnd>();
    const mockEnabledSignal = signal(false);
    const mockBannerDismissedSignal = signal(false);
    const mockSnackBar = { open: jest.fn() };
    const mockUnifiedUiService = {
        enabled: mockEnabledSignal.asReadonly(),
        bannerDismissed: mockBannerDismissedSignal.asReadonly(),
        toggle: jest.fn(),
        enableAndDismissBanner: jest.fn(),
        dismissBanner: jest.fn(),
    };

    function createFixture(): ComponentFixture<HeaderComponent> {
        fixture = TestBed.createComponent(HeaderComponent);
        fixture.detectChanges();
        return fixture;
    }

    beforeEach(() => {
        mockEnabledSignal.set(false);
        mockBannerDismissedSignal.set(false);
        jest.clearAllMocks();

        TestBed.configureTestingModule({
            imports: [
                TranslatePipe,
                HeaderComponent,
                NoopTranslateModule,
                MatIconTestingModule,
                MockModule(SatHeaderModule),
                MockComponent(FeatureFlagsActionComponent),
                MockComponent(LanguageActionComponent),
                MockComponent(HelpActionComponent),
            ],
            providers: [
                {
                    provide: HEADER_CONFIG_TOKEN,
                    useValue: mockHeaderConfig,
                },
                {
                    provide: ActivatedRoute,
                    useValue: {},
                },
                {
                    provide: Router,
                    useValue: { url: '/dashboard/projects', events: mockRouterEvents$.asObservable() },
                },
                provideMockFeatureFlags([SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH, SHARED_HXP.STUDIO_UNIFIED_MODERN_UI]),
                {
                    provide: JwtHelperService,
                    useValue: {
                        getValueFromLocalToken: () => 'mock-user',
                    },
                },
                { provide: UnifiedUiService, useValue: mockUnifiedUiService },
                { provide: MatSnackBar, useValue: mockSnackBar },
            ],
        });
    });

    afterEach(() => {
        fixture?.destroy();
    });

    it('should display header title', () => {
        createFixture();
        const title = fixture.debugElement.query(By.css('.hxp-header__title'));

        expect(title).toBeTruthy();
        expect(title.nativeElement.textContent.trim()).toBe(mockHeaderConfig.title);
    });

    describe('without logoPath input', () => {
        beforeEach(() => createFixture());

        it('should display word mark logo', () => {
            const logo = fixture.debugElement.query(By.css('sat-word-mark-logo'));

            expect(logo).toBeTruthy();
        });

        it('should not display custom logo', () => {
            const logo = fixture.debugElement.query(By.css('img.hxp-header__custom-logo'));

            expect(logo).toBeFalsy();
        });
    });

    describe('with logoPath input', () => {
        beforeEach(() => {
            createFixture();
            fixture.componentRef.setInput('logoPath', mockLogoPath);

            fixture.detectChanges();
        });

        it('should display custom logo with src provided by logoPath input', () => {
            const logo = fixture.debugElement.query(By.css('img.hxp-header__custom-logo'));

            expect(logo).toBeTruthy();
            expect(logo.attributes['src']).toBe(mockLogoPath);
        });

        it('should not display word mark logo', () => {
            const logo = fixture.debugElement.query(By.css('sat-word-mark-logo'));

            expect(logo).toBeFalsy();
        });
    });

    describe('unified UI toggle', () => {
        describe('with feature flag enabled', () => {
            beforeEach(() => createFixture());

            it('should show the toggle on a supported route', () => {
                expect(fixture.debugElement.query(By.css('[data-automation-id="hxp-header-unified-ui-toggle"]'))).toBeTruthy();
            });

            it('should hide the toggle when navigating to an unsupported route', () => {
                mockRouterEvents$.next(new NavigationEnd(1, '/projects/123', '/projects/123'));
                fixture.detectChanges();

                expect(fixture.debugElement.query(By.css('[data-automation-id="hxp-header-unified-ui-toggle"]'))).toBeFalsy();
            });

            it('should activate new UI and show confirmation snackbar when switched on', () => {
                fixture.componentInstance.onUnifiedUiToggle(true);

                expect(mockUnifiedUiService.toggle).toHaveBeenCalledWith(true);
                expect(mockSnackBar.open).toHaveBeenCalledWith(
                    'HEADER.UNIFIED_UI.SNACKBAR.ACTIVATED',
                    'HEADER.UNIFIED_UI.SNACKBAR.ACTION'
                );
                expect(mockUnifiedUiService.toggle).toHaveBeenCalledTimes(1);
                expect(mockSnackBar.open).toHaveBeenCalledTimes(1);
            });

            it('should deactivate new UI and show deactivation snackbar when switched off', () => {
                fixture.componentInstance.onUnifiedUiToggle(false);

                expect(mockUnifiedUiService.toggle).toHaveBeenCalledWith(false);
                expect(mockSnackBar.open).toHaveBeenCalledWith(
                    'HEADER.UNIFIED_UI.SNACKBAR.DEACTIVATED',
                    'HEADER.UNIFIED_UI.SNACKBAR.ACTION'
                );
                expect(mockUnifiedUiService.toggle).toHaveBeenCalledTimes(1);
                expect(mockSnackBar.open).toHaveBeenCalledTimes(1);
            });
        });

        describe('with feature flag disabled', () => {
            beforeEach(() => {
                TestBed.overrideProvider(FeaturesServiceToken, {
                    useValue: { isOn$: () => new Subject(), getFlags$: () => new Subject() },
                });
                createFixture();
            });

            it('should hide the toggle and banner', () => {
                expect(fixture.debugElement.query(By.css('[data-automation-id="hxp-header-unified-ui-toggle"]'))).toBeFalsy();
                expect(fixture.debugElement.query(By.css('[data-automation-id="hxp-header-new-ui-banner"]'))).toBeFalsy();
            });
        });
    });

    describe('new UI banner', () => {
        beforeEach(() => createFixture());

        it('should show the banner when toggle is visible and banner has not been dismissed', () => {
            expect(fixture.debugElement.query(By.css('[data-automation-id="hxp-header-new-ui-banner"]'))).toBeTruthy();
        });

        it('should hide the banner when user has already dismissed it', () => {
            mockBannerDismissedSignal.set(true);
            fixture.detectChanges();

            expect(fixture.debugElement.query(By.css('[data-automation-id="hxp-header-new-ui-banner"]'))).toBeFalsy();
        });

        it('should enable new UI, dismiss banner, and show snackbar when user clicks try new UI', () => {
            fixture.componentInstance.onBannerTryNewUi();

            expect(mockUnifiedUiService.enableAndDismissBanner).toHaveBeenCalled();
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'HEADER.UNIFIED_UI.SNACKBAR.ACTIVATED',
                'HEADER.UNIFIED_UI.SNACKBAR.ACTION'
            );
            expect(mockUnifiedUiService.enableAndDismissBanner).toHaveBeenCalledTimes(1);
            expect(mockSnackBar.open).toHaveBeenCalledTimes(1);
        });

        it('should dismiss the banner without enabling new UI when user closes it', () => {
            fixture.componentInstance.onBannerClose();

            expect(mockUnifiedUiService.dismissBanner).toHaveBeenCalledTimes(1);
            expect(mockSnackBar.open).not.toHaveBeenCalled();
        });
    });
});

describe('HeaderComponent with app config service', () => {
    let fixture: ComponentFixture<HeaderComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                TranslatePipe,
                HeaderComponent,
                NoopTranslateModule,
                SatHeaderModule,
                MockComponent(FeatureFlagsActionComponent),
                MockComponent(LanguageActionComponent),
                MockComponent(HelpActionComponent),
            ],
            providers: [
                MockProvider(AppConfigService, {
                    get: jest.fn().mockReturnValue('Custom Title'),
                }),
                {
                    provide: HEADER_CONFIG_TOKEN,
                    useFactory: (appConfigService: AppConfigService) => ({
                        title: appConfigService.get('custom-modeled-extension.appConfig.application.name'),
                        documentationUrl: 'https://support.hyland.com/p/hylandexperience',
                    }),
                    deps: [AppConfigService],
                },
                {
                    provide: ActivatedRoute,
                    useValue: {},
                },
                provideMockFeatureFlags([SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH, SHARED_HXP.STUDIO_UNIFIED_MODERN_UI]),
                {
                    provide: JwtHelperService,
                    useValue: {
                        getValueFromLocalToken: () => 'mock-user',
                    },
                },
            ],
        });

        fixture = TestBed.createComponent(HeaderComponent);

        fixture.detectChanges();
    });

    it('should display custom title from app config', () => {
        const title = fixture.debugElement.query(By.css('.hxp-header__title'));

        expect(title.nativeElement.textContent.trim()).toBe('Custom Title');
    });
});

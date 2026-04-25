/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GovernanceSidenavMenuItemComponent } from './sidenav-menu-item.component';
import { FeaturesDirective, FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { GovernancePermissionService } from '../../../config/governance-permission.service';
import { By } from '@angular/platform-browser';
import { RouterTestingHarness } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('GovernanceSidenavMenuItemComponent', () => {
    let fixture: ComponentFixture<GovernanceSidenavMenuItemComponent>;
    let router: Router;

    const configureTestingModule = async (permissions: string[], isFeatureFlagAvailable: boolean) => {
        TestBed.configureTestingModule({
            imports: [
                FeaturesDirective,
                NoopTranslateModule,
                NoopAnimationsModule,
                MatIconTestingModule,
                GovernanceSidenavMenuItemComponent,
            ],
            providers: [
                { provide: FeaturesServiceToken, useValue: { isOn$: () => of(isFeatureFlagAvailable) } },
                {
                    provide: GovernancePermissionService,
                    useValue: {
                        hasGovernanceAccess: jest.fn().mockReturnValue(of(permissions.includes('governance-api.fileplan.read'))),
                    },
                },
                provideRouter([
                    { path: 'governance/dashboard', component: GovernanceSidenavMenuItemComponent },
                    { path: 'governance/records', component: GovernanceSidenavMenuItemComponent },
                ]),
            ],
        });

        fixture = TestBed.createComponent(GovernanceSidenavMenuItemComponent);
        router = TestBed.inject(Router);
        await RouterTestingHarness.create();
        fixture.detectChanges();
    };

    describe('With feature flag on', () => {
        describe('With required permissions', () => {
            beforeEach(async () => {
                await configureTestingModule(['governance-api.fileplan.read', 'governance-api.records.read'], true);
            });
            it('should display the governance menu item component', () => {
                const governanceNavigation = fixture.debugElement.query(By.css('[data-automation-id="hxp-governance-navigation"]'));
                expect(governanceNavigation).toBeTruthy();
            });
        });

        describe('Without required permissions', () => {
            beforeEach(async () => {
                await configureTestingModule([], true);
            });
            it('should not display the governance menu item component', async () => {
                const governanceNavigation = fixture.debugElement.query(By.css('[data-automation-id="hxp-governance-navigation"]'));
                expect(governanceNavigation).toBeFalsy();
            });
        });

        describe('Other UI behaviour', () => {
            beforeEach(async () => {
                await configureTestingModule(['governance-api.fileplan.read', 'governance-api.records.read'], true);
            });

            it('should navigate to governance search page when button is clicked', async () => {
                const governanceMenuItem = fixture.debugElement.query(By.css('[data-automation-id="hxp-governance-menu-item"]'));

                governanceMenuItem.nativeElement.click();
                fixture.detectChanges();
                await fixture.whenStable();

                expect(router.url).toBe('/governance/dashboard');
            });

            it('should have active class when search route is active', async () => {
                const governanceMenuItem = fixture.debugElement.query(By.css('[data-automation-id="hxp-governance-menu-item"]'));
                expect(governanceMenuItem.nativeElement.classList).not.toContain('hxp-governance-menu-item-active');

                await router.navigate(['/governance/dashboard']);
                fixture.detectChanges();

                expect(governanceMenuItem.nativeElement.classList).toContain('hxp-governance-menu-item-active');
            });

            it('should have correct aria-label for accessibility', () => {
                const governanceNavigation = fixture.debugElement.query(By.css('[data-automation-id="hxp-governance-navigation"]'));
                expect(governanceNavigation.nativeElement.getAttribute('aria-label')).toBe('GOVERNANCE.SIDENAV.ARIA_LABEL');
            });
        });
    });

    describe('With feature flag off', () => {
        describe('Without required permissions', () => {
            beforeEach(async () => {
                configureTestingModule([], false);
            });
            it('should not display the sidenav menu item component when feature flag is off', async () => {
                const governanceNavigation = fixture.debugElement.query(By.css('[data-automation-id="hxp-governance-navigation"]'));
                expect(governanceNavigation).toBeFalsy();
            });
        });

        describe('With required permissions but feature flag off', () => {
            beforeEach(async () => {
                await configureTestingModule(['governance-api.fileplan.read', 'governance-api.records.read'], false);
            });
            it('should navigate to records base route when feature flag is off', async () => {
                const governanceMenuItem = fixture.debugElement.query(By.css('[data-automation-id="hxp-governance-menu-item"]'));

                governanceMenuItem.nativeElement.click();
                fixture.detectChanges();
                await fixture.whenStable();

                expect(router.url).toBe('/governance/records');
            });
        });
    });

    describe('Accessibility', () => {
        beforeEach(async () => {
            await configureTestingModule(['governance-api.fileplan.read', 'governance-api.records.read'], true);
        });

        it('should pass accessibility audit', async () => {
            document.body.append(fixture.nativeElement);
            const report = await a11yReport(fixture.nativeElement);
            expect(report?.violations).toEqual([]);
            fixture.nativeElement.remove();
        });
    });
});

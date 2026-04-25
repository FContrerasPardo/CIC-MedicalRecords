/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GovernanceManagementTabsComponent } from './governance-management-tabs.component';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { MatTabsModule } from '@angular/material/tabs';
import { MockComponents } from 'ng-mocks';
import { GovernanceLegalHoldManagementComponent } from '../domains/legal-hold-management/legal-hold-management.component';
import { GovernanceRecordsManagementComponent } from '../domains/records-management/records-management.component';
import { RecordPropertiesSidebarComponent } from '../domains/records-management/feature/record-properties-sidebar/record-properties-sidebar.component';
import { DashboardManagementComponent } from '../domains/dashboard/dashboard-management.component';

jest.mock('ng2-charts', () => {
    const angularCore = jest.requireActual('@angular/core');
    @angularCore.Directive({
        selector: 'canvas[hxpBaseChart]',
    })
    class MockBaseChartDirective {
        update = jest.fn();
    }

    return {
        BaseChartDirective: MockBaseChartDirective,
    };
});

describe('GovernanceManagementTabsComponent', () => {
    let component: GovernanceManagementTabsComponent;
    let fixture: ComponentFixture<GovernanceManagementTabsComponent>;
    let router: Router;
    let location: Location;
    const flushPromises = () => Promise.resolve();

    function setupDashboardVisible() {
        return TestBed.configureTestingModule({
            imports: [
                MockComponents(
                    GovernanceLegalHoldManagementComponent,
                    GovernanceRecordsManagementComponent,
                    RecordPropertiesSidebarComponent,
                    DashboardManagementComponent
                ),
                GovernanceManagementTabsComponent,
                MatTabsModule,
                NoopAnimationsModule,
                NoopTranslateModule,
                RouterTestingModule,
            ],
            providers: [{ provide: FeaturesServiceToken, useValue: { isOn$: () => of(true), getFlags$: () => of({}) } }],
        }).compileComponents();
    }

    function setupDashboardHidden() {
        return TestBed.configureTestingModule({
            imports: [
                MockComponents(
                    GovernanceLegalHoldManagementComponent,
                    GovernanceRecordsManagementComponent,
                    RecordPropertiesSidebarComponent,
                    DashboardManagementComponent
                ),
                GovernanceManagementTabsComponent,
                MatTabsModule,
                NoopAnimationsModule,
                NoopTranslateModule,
                RouterTestingModule,
            ],
            providers: [{ provide: FeaturesServiceToken, useValue: { isOn$: () => of(false), getFlags$: () => of({}) } }],
        }).compileComponents();
    }

    describe('with dashboard visible (feature flag on)', () => {
        beforeEach(async () => {
            await setupDashboardVisible();
            fixture = TestBed.createComponent(GovernanceManagementTabsComponent);
            component = fixture.componentInstance;
            router = TestBed.inject(Router);
            location = TestBed.inject(Location);
            jest.spyOn(router, 'navigate').mockImplementation((commands: any[]) => {
                const path = Array.isArray(commands) ? commands[0] : commands;
                Object.defineProperty(router, 'url', { get: () => path, configurable: true });
                return Promise.resolve(true);
            });
            fixture.detectChanges(); // triggers ngAfterViewInit
        });

        it('visibleTabs always contains records and legal-holds; may contain dashboard first', () => {
            expect(component.visibleTabs).toEqual(expect.arrayContaining(['records', 'legal-holds']));
            if (component.visibleTabs.length === 3) {
                expect(component.visibleTabs[0]).toBe('dashboard');
            }
        });

        it('getVisibleTabs returns same reference content', () => {
            expect((component as any).getVisibleTabs()).toEqual(component.visibleTabs);
        });

        it('navigates to each tab path and updates selectedIndex', async () => {
            for (let i = 0; i < component.visibleTabs.length; i++) {
                (router.navigate as jest.Mock).mockClear();
                component.selectedIndex = i === 0 ? -1 : i - 1;
                component.onTabIndexChange(i);
                await flushPromises();
                expect(router.navigate).toHaveBeenCalledWith([`/governance/${component.visibleTabs[i]}`]);
                expect(component.selectedIndex).toBe(i);
            }
        });

        it('syncTabFromUrl picks correct index for each tab id', () => {
            for (const [idx, tabId] of component.visibleTabs.entries()) {
                Object.defineProperty(router, 'url', { get: () => `/governance/${tabId}`, configurable: true });
                (component as any).syncTabFromUrl();
                expect(component.selectedIndex).toBe(idx);
            }
        });

        it('falls back to location.go when router.navigate resolves false', async () => {
            (router.navigate as jest.Mock).mockImplementation((commands: any[]) => {
                const path = Array.isArray(commands) ? commands[0] : commands;
                Object.defineProperty(router, 'url', { get: () => path, configurable: true });
                return Promise.resolve(false);
            });
            const locSpy = jest.spyOn(location, 'go');
            const targetIndex = component.visibleTabs.indexOf('records');
            component.selectedIndex = targetIndex === 0 ? 1 : 0;
            component.onTabIndexChange(targetIndex);
            await flushPromises();
            expect(locSpy).toHaveBeenCalledWith(`/governance/${component.visibleTabs[targetIndex]}`);
            expect(component.selectedIndex).toBe(targetIndex);
        });
    });

    describe('with dashboard hidden (feature flag off)', () => {
        beforeEach(async () => {
            await setupDashboardHidden();
            fixture = TestBed.createComponent(GovernanceManagementTabsComponent);
            component = fixture.componentInstance;
            router = TestBed.inject(Router);
            jest.spyOn(router, 'navigate').mockImplementation((commands: any[]) => {
                const path = Array.isArray(commands) ? commands[0] : commands;
                Object.defineProperty(router, 'url', { get: () => path, configurable: true });
                return Promise.resolve(true);
            });
            fixture.detectChanges();
        });

        it('visibleTabs contains only records and legal-holds', () => {
            expect(component.visibleTabs).toEqual(['records', 'legal-holds']);
        });

        it('navigates correctly across visible tabs', async () => {
            for (let i = 0; i < component.visibleTabs.length; i++) {
                (router.navigate as jest.Mock).mockClear();
                component.selectedIndex = i === 0 ? -1 : i - 1;
                component.onTabIndexChange(i);
                await flushPromises();
                expect(router.navigate).toHaveBeenCalledWith([`/governance/${component.visibleTabs[i]}`]);
                expect(component.selectedIndex).toBe(i);
            }
        });

        it('syncTabFromUrl maps url to correct index', () => {
            for (const [idx, tabId] of component.visibleTabs.entries()) {
                Object.defineProperty(router, 'url', { get: () => `/governance/${tabId}`, configurable: true });
                (component as any).syncTabFromUrl();
                expect(component.selectedIndex).toBe(idx);
            }
        });

        it('syncTabFromUrl ignores query params when resolving the active tab', () => {
            const legalHoldsIndex = component.visibleTabs.indexOf('legal-holds');
            Object.defineProperty(router, 'url', {
                get: () => '/governance/legal-holds?legalCaseId=LC-123',
                configurable: true,
            });

            (component as any).syncTabFromUrl();

            expect(component.selectedIndex).toBe(legalHoldsIndex);
        });
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { GovernanceLegalHoldManagementComponent } from '../domains/legal-hold-management/legal-hold-management.component';
import { GovernanceRecordsManagementComponent } from '../domains/records-management/records-management.component';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionContext } from '../shared/definitions/governance-shared.interface';
import { RecordPropertiesSidebarComponent } from '../domains/records-management/feature/record-properties-sidebar/record-properties-sidebar.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';
import { DashboardManagementComponent } from '../domains/dashboard/dashboard-management.component';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { Location } from '@angular/common';

interface GovernanceTabConfig {
    id: string;
    isVisible: () => boolean;
}

@Component({
    selector: 'hxp-governance-management-tabs',
    templateUrl: './governance-management-tabs.component.html',
    styleUrl: './governance-management-tabs.component.scss',
    imports: [
        GovernanceLegalHoldManagementComponent,
        GovernanceRecordsManagementComponent,
        MatTabsModule,
        TranslatePipe,
        RecordPropertiesSidebarComponent,
        DashboardManagementComponent,
    ],
})
export class GovernanceManagementTabsComponent implements OnInit, OnDestroy {
    private readonly location = inject(Location);
    private readonly router = inject(Router);
    private readonly featuresService: IFeaturesService = inject(FeaturesServiceToken);
    private readonly destroy$ = new Subject<void>();

    private readonly RECORDS_PATH = 'records';
    private readonly BASE_ROUTE = '/governance';
    private readonly tabConfigs: GovernanceTabConfig[] = [
        { id: 'dashboard', isVisible: () => this.isDashboardEnabled },
        { id: this.RECORDS_PATH, isVisible: () => true },
        { id: 'legal-holds', isVisible: () => true },
    ];

    showSidebar = false;
    actionContext: ActionContext = {
        records: [],
        showPanel: false,
    };
    selectedIndex = 0;
    isDashboardEnabled = false;
    private hasNavigatedFromTab = false;

    readonly governanceDashboardFeatureFlag = ADF_HX_CONTENT_SERVICES_INTERNAL.CIC_GOVERNANCE_DASHBOARD_FEATURE;

    get visibleTabs(): string[] {
        return this.getVisibleTabs();
    }

    ngOnInit() {
        this.featuresService
            .isOn$(this.governanceDashboardFeatureFlag)
            .pipe(takeUntil(this.destroy$))
            .subscribe((isEnabled) => {
                this.isDashboardEnabled = isEnabled;
                this.syncTabFromUrl();
            });

        this.syncTabFromUrl();

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                distinctUntilChanged((prev, curr) => prev.urlAfterRedirects === curr.urlAfterRedirects),
                takeUntil(this.destroy$)
            )
            .subscribe(() => this.syncTabFromUrl());
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onSidebarToggle(show: boolean) {
        this.showSidebar = show;
    }

    onActionContextChange(ctx: ActionContext) {
        this.actionContext = ctx;
    }

    onTabIndexChange(newIndex: number): void {
        if (newIndex < 0 || newIndex >= this.visibleTabs.length) {
            return;
        }

        if (newIndex === this.selectedIndex && !this.hasNavigatedFromTab) {
            return;
        }

        this.hasNavigatedFromTab = true;
        const newPath = this.visibleTabs[newIndex];
        const targetUrl = `${this.BASE_ROUTE}/${newPath}`;

        void this.router.navigate([targetUrl]).then((navigated) => {
            const hasQueryParams = this.router.url.includes('?');
            if (!navigated && !hasQueryParams) {
                this.location.go(targetUrl);
            }

            this.syncTabFromUrl();
        });
    }

    private getVisibleTabs(): string[] {
        return this.tabConfigs.filter((tab) => tab.isVisible()).map((tab) => tab.id);
    }

    private syncTabFromUrl(): void {
        const segment = this.getTabSegmentFromUrl(this.router.url);
        const index = this.visibleTabs.indexOf(segment);
        const newIndex = index >= 0 ? index : this.visibleTabs.indexOf(this.RECORDS_PATH);

        if (this.selectedIndex !== newIndex) {
            this.selectedIndex = newIndex;
        }
    }

    private getTabSegmentFromUrl(url: string): string {
        const sanitizedUrl = url.split('?')[0].split('#')[0];
        const urlSegments = sanitizedUrl.split('/');

        return urlSegments[2] || this.RECORDS_PATH;
    }
}

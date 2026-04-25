/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs/operators';
import { GovernancePermissionService } from '../../../config/governance-permission.service';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';
import { MatListModule } from '@angular/material/list';

@Component({
    selector: 'hxp-governance-sidenav-menu-item',
    templateUrl: './sidenav-menu-item.component.html',
    imports: [MatIconModule, TranslatePipe, MatListModule, RouterLink],
})
export class GovernanceSidenavMenuItemComponent {
    private readonly router = inject(Router);
    private readonly featuresService: IFeaturesService = inject(FeaturesServiceToken);
    private readonly permissionService: GovernancePermissionService = inject(GovernancePermissionService);
    private readonly governanceDashboardFeatureFlag = ADF_HX_CONTENT_SERVICES_INTERNAL.CIC_GOVERNANCE_DASHBOARD_FEATURE;
    private isDashboardOn = toSignal(this.featuresService
        .isOn$(this.governanceDashboardFeatureFlag), { initialValue: false });
    private currentUrl = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(() => this.router.url)
        ),
        { initialValue: this.router.url }
    );
    isGovernanceRoute = computed(() =>
        this.currentUrl().startsWith(this.GOVERNANCE_ROUTE())
    );

    readonly hasPermission = toSignal(this.permissionService.hasGovernanceAccess(), { initialValue: false });
    readonly GOVERNANCE_ROUTE = computed(() => this.isDashboardOn() ? '/governance/dashboard' : '/governance/records');
}

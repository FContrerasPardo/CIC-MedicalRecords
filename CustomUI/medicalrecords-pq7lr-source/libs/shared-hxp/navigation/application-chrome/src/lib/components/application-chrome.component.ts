/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, signal, ViewEncapsulation, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { SatNavigationItem, SatNavigationItemWithIcon, SatPlatformNavModule } from '@hylandsoftware/satori-ui/platform-nav';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { LogoutDirective } from '@alfresco/adf-core';
import { UserInfoService } from '../services/user-info.service';
import { TranslatePipe } from '@ngx-translate/core';
import { NavigationService } from '../services/navigation.service';
import { AppListService } from '../services/app-list.service';
import { ContextAppsPipe } from '../pipes/context-apps.pipe';
import { NavEnvsPipe } from '../pipes/nav-envs.pipe';
import { CONTROL_CENTER } from '../configs/control-center.app-env.config';
import { EnvAppsPipe } from '../pipes/env-apps.pipe';
import { provideNavIcons } from '../utils/provide-nav-icons.util';
import { ContextEnvsPipe } from '../pipes/context-envs.pipe';
import { NeutralThemePipe } from '../pipes/neutral-theme.pipe';
import { provideControlCenter } from '../providers/control-center.provider';
import { provideHome } from '../providers/home.provider';
import { HOME_CONTEXT_NAME } from '../configs/home.context-name.config';
import { AppEnvService } from '../services/app-env.service';
import { InitialEnvPipe } from '../pipes/initial-env.pipe';
import { DisplayModeService, FormCloudDisplayMode } from '@alfresco/adf-process-services-cloud';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContextApp } from '../interfaces/context-app.interface';
import { AppKeyService } from '../services/app-key.service';
import { NavIcon } from '../interfaces/nav-icon.interface';
import { NAV_ICONS_TOKEN } from '../tokens/nav-icons.token';

@Component({
    selector: 'hxp-application-chrome',
    imports: [
        CommonModule,
        SatPlatformNavModule,
        SatIconModule,
        MatIconModule,
        MatMenuModule,
        LogoutDirective,
        TranslatePipe,
        ContextAppsPipe,
        ContextEnvsPipe,
        NavEnvsPipe,
        EnvAppsPipe,
        NeutralThemePipe,
        InitialEnvPipe,
    ],
    providers: [...provideNavIcons(), provideControlCenter(CONTROL_CENTER), provideHome(HOME_CONTEXT_NAME), DisplayModeService],
    templateUrl: './application-chrome.component.html',
    encapsulation: ViewEncapsulation.None,
})
export class ApplicationChromeComponent implements OnInit {
    public readonly appListService = inject(AppListService);
    public readonly appEnvService = inject(AppEnvService);
    public readonly userInfoService = inject(UserInfoService);
    public readonly navigationService = inject(NavigationService);
    public readonly hideChromeBar = signal(false);
    private readonly appKeyService = inject(AppKeyService);
    private readonly navIcons = inject(NAV_ICONS_TOKEN);

    private readonly destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        DisplayModeService.displayMode$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((change) => {
            const isHidden = change.displayMode === FormCloudDisplayMode.fullScreen || change.displayMode === FormCloudDisplayMode.standalone;
            this.hideChromeBar.set(isHidden);
        });
    }

    getNavigationItemFromContextApp(app: ContextApp): SatNavigationItem & Partial<SatNavigationItemWithIcon> {
        return {
            label: app.name,
            path: app.launchUrl,
            active: this.isApplicationActive(app),
            icon: this.getIconForApplication(app),
        };
    }

    private isApplicationActive(app: ContextApp): boolean {
        return this.appKeyService.currentKey === app.appKey;
    }

    private getIconForApplication(app: ContextApp): string | undefined {
        return this.navIcons.find((icon: NavIcon) => icon.id === app.id)?.icon;
    }
}

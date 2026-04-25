/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, computed, inject, input } from '@angular/core';
import { SatHeaderModule } from '@hylandsoftware/satori-ui';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { SatWordMarkLogoComponent } from '@hylandsoftware/satori-ui/logo';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FeatureFlagsActionComponent } from '../feature-flags-action/feature-flags-action.component';
import { LanguageActionComponent } from '../language-action/language-action.component';
import { HelpActionComponent } from '../help-action/help-action.component';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { HEADER_CONFIG_TOKEN } from '../../tokens/header-config.token';
import { SHARED_HXP } from '@features';
import { ApplicationThemeActionComponent } from '../application-theme-action/application-theme-action.component';
import { FeaturesDirective, FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { ApplicationThemeDirective } from '../../directives/application-theme.directive';
import { NewUiBannerComponent } from '../new-ui-banner/new-ui-banner.component';
import { UnifiedUiService } from '../../services/unified-ui.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

const UNIFIED_UI_ROUTES = ['/dashboard/favorite-projects', '/dashboard/projects', '/example-projects'];

@Component({
    selector: 'hxp-header',
    imports: [
        ApplicationThemeDirective,
        SatHeaderModule,
        SatWordMarkLogoComponent,
        SatIconModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatSlideToggleModule,
        MatTooltipModule,
        TranslatePipe,
        FeatureFlagsActionComponent,
        LanguageActionComponent,
        HelpActionComponent,
        RouterModule,
        ApplicationThemeActionComponent,
        FeaturesDirective,
        NewUiBannerComponent,
    ],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    host: { style: 'position: relative; display: block' },
})
export class HeaderComponent {
    private readonly featuresService: IFeaturesService = inject(FeaturesServiceToken);
    private readonly unifiedUiService = inject(UnifiedUiService);
    private readonly router = inject(Router);
    private readonly snackBar = inject(MatSnackBar);
    private readonly translateService = inject(TranslateService);
    public readonly headerConfig = inject(HEADER_CONFIG_TOKEN);

    readonly logoPath = input<string>();
    readonly backgroundColor = input<string>();
    readonly backgroundImage = input<string>();
    readonly headerTextColor = input<string>();

    readonly studioDarkLightThemeSwitch = SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH;
    readonly unifiedUiEnabled = this.unifiedUiService.enabled;

    readonly backgroundImageStyle = computed(() => {
        const bgImage = this.backgroundImage();
        return bgImage ? 'url(' + bgImage + ')' : 'none';
    });

    readonly unifiedModernUiFeatureEnabled = toSignal(
        this.featuresService.isOn$(SHARED_HXP.STUDIO_UNIFIED_MODERN_UI),
        { initialValue: false }
    );

    readonly isOnSupportedRoute = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map((event) => this.matchesSupportedRoute(event.urlAfterRedirects)),
            startWith(this.matchesSupportedRoute(this.router.url))
        ),
        { initialValue: this.matchesSupportedRoute(this.router.url) }
    );

    readonly showUnifiedUiToggle = computed(() => this.unifiedModernUiFeatureEnabled() && this.isOnSupportedRoute());
    readonly showNewUiBanner = computed(() => this.showUnifiedUiToggle() && !this.unifiedUiService.bannerDismissed());

    onUnifiedUiToggle(enabled: boolean): void {
        this.unifiedUiService.toggle(enabled);
        const messageKey = enabled ? 'HEADER.UNIFIED_UI.SNACKBAR.ACTIVATED' : 'HEADER.UNIFIED_UI.SNACKBAR.DEACTIVATED';
        this.showToggleSnackbar(messageKey);
    }

    onBannerTryNewUi(): void {
        this.unifiedUiService.enableAndDismissBanner();
        this.showToggleSnackbar('HEADER.UNIFIED_UI.SNACKBAR.ACTIVATED');
    }

    onBannerClose(): void {
        this.unifiedUiService.dismissBanner();
    }

    private matchesSupportedRoute(url: string): boolean {
        return UNIFIED_UI_ROUTES.some((route) => url.startsWith(route));
    }

    private showToggleSnackbar(messageKey: string): void {
        const message = this.translateService.instant(messageKey);
        const action = this.translateService.instant('HEADER.UNIFIED_UI.SNACKBAR.ACTION');
        this.snackBar.open(message, action);
    }
}

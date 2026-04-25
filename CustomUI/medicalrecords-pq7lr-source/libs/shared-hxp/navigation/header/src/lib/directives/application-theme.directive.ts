/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive, effect, inject } from '@angular/core';
import { type ApplicationTheme, ApplicationThemeService } from '../services/application-theme.service';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { SHARED_HXP } from '@features';
import { toSignal } from '@angular/core/rxjs-interop';

@Directive({
    selector: '[hxpApplicationTheme]',
})
export class ApplicationThemeDirective {
    private readonly themeSwitchService = inject(ApplicationThemeService);
    private readonly featuresService = inject(FeaturesServiceToken);

    private readonly applicationTheme = this.themeSwitchService.applicationTheme;
    private readonly isStudioDarkLightThemeSwitchEnabled = toSignal(this.featuresService.isOn$(SHARED_HXP.STUDIO_DARK_LIGHT_THEME_SWITCH));

    constructor() {
        effect(() => {
            const currentTheme = this.applicationTheme();
            this.updateColorScheme(currentTheme);
        });
    }

    private updateColorScheme(theme: ApplicationTheme): void {
        document.body.style.colorScheme = this.isStudioDarkLightThemeSwitchEnabled() ? theme : 'light';
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { ApplicationThemeService } from '../../services/application-theme.service';
import { IconModule } from '@alfresco/adf-core';

@Component({
    selector: 'hxp-application-theme-action',
    imports: [MatMenuModule, IconModule, TranslatePipe],
    templateUrl: './application-theme-action.component.html',
})
export class ApplicationThemeActionComponent {
    private readonly applicationThemeService = inject(ApplicationThemeService);

    theme = this.applicationThemeService.applicationTheme;

    toggleTheme(event: Event) {
        event.stopImmediatePropagation();
        this.applicationThemeService.toggleTheme();
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, HostListener, ViewChild } from '@angular/core';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { LanguageMenuComponent } from '@alfresco/adf-core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-language-action',
    imports: [MatMenuModule, MatIconModule, SatIconModule, LanguageMenuComponent, TranslatePipe],
    templateUrl: './language-action.component.html',
})
export class LanguageActionComponent {
    @ViewChild(MatMenuTrigger) private readonly trigger: MatMenuTrigger | undefined;

    @HostListener('mouseenter') onMouseEnter() {
        this.trigger?.openMenu();
    }
}

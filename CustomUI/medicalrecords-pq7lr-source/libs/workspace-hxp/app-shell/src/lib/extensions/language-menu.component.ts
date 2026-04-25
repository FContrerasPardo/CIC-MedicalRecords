/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { LanguageMenuComponent } from '@alfresco/adf-core';
import { Component, HostListener, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-language-menu',
    template: `
        <button mat-menu-item [matMenuTriggerFor]="langMenu" data-automation-id="hxp-user-language-menu">
            <mat-icon svgIcon="globe" />
            <span>{{ 'APP.HEADER.LANGUAGE' | translate }}</span>
        </button>

        <mat-menu #langMenu="matMenu">
            <adf-language-menu />
        </mat-menu>
    `,
    imports: [TranslatePipe, MatIconModule, MatMenuModule, LanguageMenuComponent],
})
export class HxpLanguageMenuComponent {
    @ViewChild(MatMenuTrigger)
    private readonly trigger: MatMenuTrigger | undefined;

    @HostListener('mouseenter') onMouseEnter() {
        this.trigger?.openMenu();
    }
}

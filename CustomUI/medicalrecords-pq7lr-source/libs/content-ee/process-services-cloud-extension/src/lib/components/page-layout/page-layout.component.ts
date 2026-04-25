/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewEncapsulation, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavBarMode, PROCESS_SERVICES_CLOUD_LAYOUT_PROVIDER } from '../../services/process-services-cloud-extension-layout.provider';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    imports: [CommonModule, TranslatePipe, MatButtonModule, MatIconModule],
    selector: 'app-page-layout',
    templateUrl: './page-layout.component.html',
    styleUrls: ['./page-layout.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: { class: 'app-page-layout' },
})
export class PageLayoutComponent {
    showNavBarToggleButton = false;
    appNavBarMode$: Observable<NavBarMode>;

    private readonly layoutService = inject(PROCESS_SERVICES_CLOUD_LAYOUT_PROVIDER, { optional: true });

    constructor() {
        if (this.layoutService) {
            this.appNavBarMode$ = this.layoutService.appNavNarMode$.pipe(takeUntilDestroyed());
            this.showNavBarToggleButton = true;
        }
    }

    toggleNavBar(): void {
        this.layoutService.toggleAppNavBar$.next();
    }
}

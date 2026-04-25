/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs/operators';
import { MatListModule } from '@angular/material/list';

@Component({
    selector: 'hxp-search-menu-item',
    templateUrl: './search-menu-item.component.html',
    imports: [MatIconModule, TranslatePipe, MatListModule, RouterLink],
})
export class SearchMenuItemComponent {
    private readonly router = inject(Router);
    private readonly matIconRegistry = inject(MatIconRegistry);
    private readonly domSanitizer = inject(DomSanitizer);
    private currentUrl = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => this.router.url)
        ),
        { initialValue: this.router.url }
    );

    readonly SEARCH_ROUTE = '/search';
    isSearchRoute = computed(() => this.currentUrl().startsWith(this.SEARCH_ROUTE));

    constructor() {
        const icons: Record<string, string> = {
            repository_search: 'assets/search-icons/Repository_search.svg',
        };

        for (const [iconName, iconPath] of Object.entries(icons)) {
            this.matIconRegistry.addSvgIcon(iconName, this.domSanitizer.bypassSecurityTrustResourceUrl(iconPath));
        }
    }
}

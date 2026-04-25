/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';

@Injectable({
    providedIn: 'root',
})
export class RouterExtService {
    private previousUrl!: string;
    private currentUrl: string;

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    constructor() {
        this.currentUrl = this.router.url;
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.previousUrl = this.currentUrl;
                this.currentUrl = event.url;
            }
        });
    }

    getPreviousUrl() {
        return this.previousUrl;
    }

    redirectToReferer(refererURL: string, defaultPath: string): void {
        if (/search/i.test(refererURL)) {
            void this.router.navigateByUrl(refererURL);
        } else {
            void this.router.navigate([defaultPath], { relativeTo: this.route });
        }
    }
}

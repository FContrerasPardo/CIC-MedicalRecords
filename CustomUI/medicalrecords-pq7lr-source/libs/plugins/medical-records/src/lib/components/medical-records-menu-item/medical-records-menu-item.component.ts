/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgIf } from '@angular/common';
import { Component, DestroyRef, Input, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'medical-records-menu-item',
    standalone: true,
    imports: [NgIf, MatButtonModule, MatIconModule],
    templateUrl: './medical-records-menu-item.component.html',
    styleUrls: ['./medical-records-menu-item.component.scss'],
})
export class MedicalRecordsMenuItemComponent {
    @Input() data: { state?: 'expanded' | 'collapsed' } = { state: 'expanded' };

    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    currentUrl = this.router.url;

    constructor() {
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((event) => {
                this.currentUrl = event.urlAfterRedirects;
            });
    }

    isExpanded(): boolean {
        return this.data?.state === 'expanded';
    }

    isActive(): boolean {
        return this.currentUrl.includes('/medical-records');
    }

    navigateToPage(): void {
        void this.router.navigate(['/medical-records']);
    }
}

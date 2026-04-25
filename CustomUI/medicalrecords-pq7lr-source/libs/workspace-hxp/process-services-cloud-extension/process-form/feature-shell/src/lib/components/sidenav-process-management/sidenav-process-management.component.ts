/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FilterParamsModel } from '@alfresco/adf-process-services-cloud';
import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, startWith } from 'rxjs/operators';
import { PROCESS_ROUTE, TASKS_ROUTE } from '../../constants/extensions.const';
import { selectApplicationName, selectProcessManagementFilter } from '../../store/process-service-cloud.selectors';
import { TranslatePipe } from '@ngx-translate/core';
import { SidenavTaskListComponent } from '../sidenav-task-list/sidenav-task-list.component';
import { SidenavProcessListComponent } from '../sidenav-process-list/sidenav-process-list.component';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { NgIf } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';

@Component({
    imports: [
        TranslatePipe,
        SidenavTaskListComponent,
        SidenavProcessListComponent,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        NgIf,
        MatExpansionModule,
    ],
    templateUrl: './sidenav-process-management.component.html',
})
export class SidenavProcessManagementComponent implements OnInit {
    @Input() data: any;

    currentFilter: FilterParamsModel = {};
    appName?: string;
    isProcessRouteActive = false;
    isTasksRouteActive = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly store = inject(Store);
    private readonly router = inject(Router);

    ngOnInit(): void {
        this.router.events
            .pipe(
                map((event) => (event instanceof NavigationEnd ? event.url : null)),
                startWith(this.router.url),
                filter((url) => !!url),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((url) => {
                this.isProcessRouteActive = !!url?.includes(PROCESS_ROUTE);
                this.isTasksRouteActive = !!url?.includes(TASKS_ROUTE);
            });

        this.store
            .select(selectProcessManagementFilter)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((currentFilter) => {
                this.currentFilter = { ...currentFilter };
            });

        this.store
            .select(selectApplicationName)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((appName) => {
                this.appName = appName;
            });
    }
}

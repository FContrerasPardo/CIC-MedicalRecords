/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap, filter, withLatestFrom } from 'rxjs/operators';
import { setProcessManagementFilter, navigateToFilter, navigateToTasks, navigateToProcesses } from '../actions/process-management-filter.actions';
import { Router, NavigationExtras } from '@angular/router';
import { RouterNavigatedAction, ROUTER_NAVIGATED } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import { FilterType } from '../states/extension.state';
import { selectProcessManagementFilterType } from '../selectors/extension.selectors';

@Injectable()
export class ProcessManagementFilterEffects {
    private readonly actions$ = inject(Actions);
    private readonly router = inject(Router);
    private readonly store = inject<Store<any>>(Store);

    navigateToProcessManagementFilter$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(navigateToFilter),
                filter((action) => !!action.filterId),
                withLatestFrom(this.store.select(selectProcessManagementFilterType)),
                tap(([action, type]) => {
                    const queryParams = action.queryParams || { filterId: action.filterId };

                    if (type === FilterType.TASK) {
                        void this.router.navigate(['/task-list-cloud'], { queryParams });
                    } else {
                        void this.router.navigate(['/process-list-cloud'], { queryParams });
                    }
                })
            ),
        { dispatch: false }
    );

    navigateToTasks$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(navigateToTasks),
                filter((action) => !!action.filterId),
                tap((action) => {
                    const queryParams: NavigationExtras = {
                        queryParams: {
                            filterId: action.filterId,
                        },
                    };
                    void this.router.navigate(['/task-list-cloud'], queryParams);
                })
            ),
        { dispatch: false }
    );

    navigateToProcesses$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(navigateToProcesses),
                filter((action) => !!action.filterId),
                tap((action) => {
                    const queryParams: NavigationExtras = {
                        queryParams: {
                            filterId: action.filterId,
                        },
                    };
                    void this.router.navigate(['/process-list-cloud'], queryParams);
                })
            ),
        { dispatch: false }
    );

    resetProcessManagementFilter$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<RouterNavigatedAction>(ROUTER_NAVIGATED),
                filter(() => this.isNotProcessServicesCloudUrl(this.router.url)),
                tap(() => {
                    this.store.dispatch(
                        setProcessManagementFilter({
                            payload: {
                                type: null,
                                filter: undefined,
                            },
                        })
                    );
                })
            ),
        { dispatch: false }
    );

    private isNotProcessServicesCloudUrl(url: string): boolean {
        return !url.includes('task') && !url.includes('process');
    }
}

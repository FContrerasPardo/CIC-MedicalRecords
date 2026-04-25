/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import { Router, NavigationExtras } from '@angular/router';
import { navigateToProcessDetails } from '../actions/process-list-cloud.actions';

@Injectable()
export class ProcessListCloudEffects {
    private readonly actions$ = inject(Actions);
    private readonly router = inject(Router);

    navigateToProcessDetails$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(navigateToProcessDetails),
                tap((action) => {
                    const queryParams: NavigationExtras = {
                        queryParams: {
                            processInstanceId: action.processInstanceId,
                        },
                    };
                    void this.router.navigate(['/process-details-cloud'], queryParams);
                })
            ),
        { dispatch: false }
    );
}

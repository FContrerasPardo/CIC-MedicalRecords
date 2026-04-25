/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap, filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { navigateToTaskDetails } from '../actions/task-list-cloud.actions';

@Injectable()
export class TaskListCloudEffects {
    private readonly actions$ = inject(Actions);
    private readonly router = inject(Router);

    navigateToTaskDetails$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(navigateToTaskDetails),
                filter((action) => !!action.taskId),
                tap((action) => {
                    const processName = action.processName ? `/${action.processName}` : '';
                    void this.router.navigateByUrl(`/task-details-cloud/${action.taskId}${processName}`);
                })
            ),
        { dispatch: false }
    );
}

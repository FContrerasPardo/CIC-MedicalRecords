/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map } from 'rxjs/operators';
import { initialiseExtension } from '../actions/extension.actions';
import { NotificationService } from '@alfresco/adf-core';

@Injectable()
export class ProcessCloudHealthEffects {
    private readonly actions$ = inject(Actions);
    private readonly notificationService = inject(NotificationService);

    updateHealth$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(initialiseExtension),
                filter((action) => !action.health),
                map(() => {
                    this.notificationService.showError('PROCESS_CLOUD_EXTENSION.SNACKBAR.BACKEND_SERVICE_ERROR');
                })
            ),
        { dispatch: false }
    );
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Location } from '@angular/common';
import { ProcessCloudService } from '@alfresco/adf-process-services-cloud';
import { openProcessCancelConfirmationDialog, cancelRunningProcess } from '../actions/process-details.actions';
import { DialogService } from '../../services/dialog.service';
import { NotificationService } from '@alfresco/adf-core';

@Injectable()
export class ProcessDetailsEffects {
    private readonly actions$ = inject(Actions);
    private readonly store = inject<Store<any>>(Store);
    private readonly processCloudService = inject(ProcessCloudService);
    private readonly location = inject(Location);
    private readonly dialogService = inject(DialogService);
    private readonly notificationService = inject(NotificationService);

    openConfirmationDialog$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(openProcessCancelConfirmationDialog),
                tap((settings) => this.openConfirmationDialog(settings))
            ),
        { dispatch: false }
    );

    cancelRunningProcess$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(cancelRunningProcess),
                // eslint-disable-next-line rxjs/no-unsafe-switchmap
                switchMap((payload) =>
                    this.processCloudService.cancelProcess(payload.appName, payload.processInstanceId).pipe(
                        map(() => {
                            this.location.back();
                            this.notificationService.showInfo('PROCESS_CLOUD_EXTENSION.PROCESS_LIST.ACTIONS.CANCEL_MESSAGE');
                        }),
                        catchError(() => of(this.notificationService.showError('PROCESS_CLOUD_EXTENSION.PROCESS_LIST.ACTIONS.CANCEL_ERROR_MESSAGE')))
                    )
                )
            ),
        { dispatch: false }
    );

    private openConfirmationDialog(payload: { appName: string; processInstanceId: string }) {
        this.dialogService
            .openConfirmDialogBeforeProcessCancelling()
            .afterClosed()
            .subscribe((result: boolean) => {
                if (result) {
                    this.store.dispatch(cancelRunningProcess({ appName: payload.appName, processInstanceId: payload.processInstanceId }));
                }
            });
    }
}

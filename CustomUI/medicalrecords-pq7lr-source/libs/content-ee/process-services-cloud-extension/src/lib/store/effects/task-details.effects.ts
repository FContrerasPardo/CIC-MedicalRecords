/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap, map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { IdentityUserModel, TaskCloudService } from '@alfresco/adf-process-services-cloud';
import { Location } from '@angular/common';
import {
    openTaskAssignmentDialog,
    assignTask,
    taskAssignmentSuccess,
    taskAssignmentFailure,
    startFormCompletedRedirection,
    taskCompletedRedirection,
} from '../actions/task-details.actions';
import { DialogService } from '../../services/dialog.service';
import { TaskAssigneeModel } from '../../features/task-details/models/task-assignee.model';
import { NotificationService } from '@alfresco/adf-core';
import { TaskRedirectionService } from '../../services/task-redirection.service';

@Injectable()
export class TaskDetailsEffects {
    private readonly actions$ = inject(Actions);
    private readonly store = inject<Store<any>>(Store);
    private readonly dialogService = inject(DialogService);
    private readonly taskCloudService = inject(TaskCloudService);
    private readonly location = inject(Location);
    private readonly notificationService = inject(NotificationService);
    private readonly taskRedirectionService = inject(TaskRedirectionService);

    openTaskAssignmentDialog$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(openTaskAssignmentDialog),
                tap((settings) => this.openDialog(settings))
            ),
        { dispatch: false }
    );

    assignTask$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(assignTask),
                tap((res) => {
                    this.assign(res);
                })
            ),
        { dispatch: false }
    );

    taskAssignmentSuccess$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(taskAssignmentSuccess),
                map(() => this.notificationService.showInfo('PROCESS_CLOUD_EXTENSION.TASK_DETAILS.ASSIGNEE.SUCCESS'))
            ),
        { dispatch: false }
    );

    taskAssignmentFailure$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(taskAssignmentFailure),
                map(() => this.notificationService.showError('PROCESS_CLOUD_EXTENSION.TASK_DETAILS.ASSIGNEE.FAILED'))
            ),
        { dispatch: false }
    );

    startFormRedirection$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(startFormCompletedRedirection),
                tap((process) => {
                    this.taskRedirectionService.redirectForStartProcess(
                        process.appName,
                        process.processDefinitionName,
                        process.redirectParameter,
                        process.selectedOutcomeId
                    );
                })
            ),
        { dispatch: false }
    );

    taskCompletedRedirection$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(taskCompletedRedirection),
                tap((task) => {
                    this.taskRedirectionService.redirectForTask(task.taskId, task.selectedOutcomeId);
                })
            ),
        { dispatch: false }
    );

    private openDialog(settings: TaskAssigneeModel) {
        this.dialogService
            .openTaskAssignmentDialog(settings)
            .afterClosed()
            .subscribe((newAssignee: IdentityUserModel) => {
                if (newAssignee && newAssignee.username) {
                    const payload = <TaskAssigneeModel>{ taskId: settings.taskId, appName: settings.appName, assignee: newAssignee.username };
                    this.store.dispatch(assignTask(payload));
                }
            });
    }

    private assign(payload: TaskAssigneeModel) {
        this.taskCloudService.assign(payload.appName, payload.taskId, payload.assignee).subscribe({
            next: () => {
                this.location.back();
                this.store.dispatch(taskAssignmentSuccess());
            },
            error: (error) => {
                this.store.dispatch(taskAssignmentFailure(error));
            },
        });
    }
}

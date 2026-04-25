/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { systemActions, userActions } from '../actions/class-verification.actions';
import { catchError, concatMap, exhaustMap, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ApiDocument, ClassVerificationInput } from '../../models/contracts/class-verification-models';
import { NotificationService } from '@alfresco/adf-core';
import { filterContentFileReference, ProcessTaskBackendService } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpTaskData } from '../../models/screen-models';
import { selectTaskAssignmentContext, selectTaskInfo } from '../selectors/screen.selectors';
import { Store } from '@ngrx/store';
import { concatLatestFrom } from '@ngrx/operators';
import { IdpDocumentHxpImportService } from '../../services/document-import/idp-document-hxp-import.service';
import { Clipboard } from '@angular/cdk/clipboard';

@Injectable()
export class ScreenEffects {
    private readonly actions$ = inject(Actions);
    private readonly processBackendService = inject(ProcessTaskBackendService);
    private readonly notificationService = inject(NotificationService);
    private readonly store = inject(Store);
    private readonly clipboard = inject(Clipboard);

    initializeTaskEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskInitialize),
            exhaustMap(({ taskContext, taskClaimPermissions }) =>
                taskClaimPermissions.canClaimTask
                    ? of(systemActions.taskClaim())
                    : this.processBackendService.getTaskAssignmentContext$(taskContext.appName, taskContext.taskId).pipe(
                          map((taskAssignmentContext) =>
                              taskAssignmentContext.assignee
                                  ? systemActions.taskInitializeSuccess({
                                        taskAssignmentContext: { ...taskAssignmentContext, ...taskClaimPermissions },
                                    })
                                  : systemActions.taskInitializeError({
                                        error: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.SCREEN_INIT_ERROR_NOT_CLAIMABLE',
                                    })
                          ),
                          catchError(() =>
                              of(
                                  systemActions.taskInitializeError({
                                      error: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.SCREEN_INIT_ERROR_ASSIGNEE',
                                  })
                              )
                          )
                      )
            )
        )
    );

    initializeTaskSuccessScreenLoadEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskInitializeSuccess),
            map(() => systemActions.screenLoad())
        )
    );

    initializeTaskErrorNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskInitializeError),
            map(({ error }) => {
                const message = typeof error === 'string' ? error : 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.SCREEN_INIT_ERROR';
                return systemActions.notificationShow({ severity: 'error', message });
            })
        )
    );

    initializeTaskErrorCancelTaskEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskInitializeError),
            map(() => systemActions.taskActionSuccess({ action: 'Cancel' }))
        )
    );

    loadScreenEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.screenLoad),
            concatLatestFrom(() => this.store.select(selectTaskInfo)),
            concatLatestFrom(() => this.store.select(selectTaskAssignmentContext)),
            concatMap(([[, taskContext], taskAssignmentContext]) => {
                return forkJoin([
                    this.processBackendService.getTaskInputData$<ClassVerificationInput>(taskContext.appName, taskContext.taskId),
                    this.processBackendService.getIdpConfiguration$(taskContext.appName),
                ]).pipe(
                    map(([taskInput, idpConfiguration]) => {
                        let contents = taskInput.batchState.contentFileReferences || [];
                        if (contents.length === 0) {
                            contents = taskInput.contents || [];
                            if (contents.length === 0) {
                                throw new Error('IDP_CLASS_VERIFICATION.NOTIFICATIONS.SCREEN_LOAD_ERROR_CONTENT_FILE_REFS');
                            }
                        }

                        const isDocumentValid = (document: ApiDocument) => !document.markAsDeleted && !!document.pages && document.pages.length > 0;
                        if (!taskInput.batchState?.documents.some((document) => isDocumentValid(document))) {
                            throw new Error('IDP_CLASS_VERIFICATION.NOTIFICATIONS.SCREEN_LOAD_ERROR_DOCUMENT_STRUCTURE');
                        }

                        const contentFileReferences = contents.map((file) => filterContentFileReference(file));

                        const taskData: IdpTaskData = {
                            ...taskInput,
                            configuration: idpConfiguration.classification,
                            sys_task_assignee: taskAssignmentContext.assignee,
                            batchState: {
                                ...taskInput.batchState,
                                contentFileReferences,
                            },
                            targetFolder: taskInput.targetFolder ? this.parseTargetFolder(taskInput.targetFolder) : undefined,
                        };
                        return systemActions.screenLoadSuccess({ taskData });
                    }),
                    catchError((error) => of(systemActions.screenLoadError({ error })))
                );
            })
        )
    );

    screenLoadErrorNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.screenLoadError),
            map(({ error }) => {
                console.error('Screen Load error', error.message);
                return systemActions.notificationShow({ severity: 'error', message: error.message });
            })
        )
    );

    screenLoadErrorTaskCancelEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.screenLoadError),
            map(() => {
                return systemActions.taskActionSuccess({ action: 'Cancel' });
            })
        )
    );

    saveTaskPrepareDataEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskSave),
            map(() => {
                return systemActions.taskPrepareUpdate({ taskAction: 'Save' });
            })
        )
    );

    completeTaskPrepareDataEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskComplete),
            map(({ openNextTask }) => {
                return systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask });
            })
        )
    );

    taskPrepareDataErrorEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskPrepareUpdateError),
            map(({ error }) => {
                return systemActions.taskActionError({ error });
            })
        )
    );

    taskActionEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskPrepareUpdateSuccess),
            concatLatestFrom(() => this.store.select(selectTaskInfo)),
            concatMap(([{ taskAction, taskData, openNextTask }, taskContext]) => {
                if (!taskData) {
                    return of(systemActions.taskActionError({ error: new Error('No task data available') }));
                }

                switch (taskAction) {
                    case 'Save': {
                        return this.processBackendService
                            .saveTaskData$(taskContext.appName, taskContext.taskId, {
                                batchState: taskData.batchState,
                                sys_task_assignee: taskData.sys_task_assignee,
                            })
                            .pipe(
                                map((success) =>
                                    success
                                        ? systemActions.taskActionSuccess({ action: 'Save' })
                                        : systemActions.taskActionError({ action: 'Save', error: 'Failed to save task' })
                                ),
                                catchError((error) => of(systemActions.taskActionError({ action: 'Save', error })))
                            );
                    }
                    case 'Complete': {
                        return this.processBackendService
                            .completeTask$(taskContext.appName, taskContext.taskId, {
                                batchState: taskData.batchState,
                                sys_task_assignee: taskData.sys_task_assignee,
                            })
                            .pipe(
                                map((success) =>
                                    success
                                        ? systemActions.taskActionSuccess({ action: 'Complete', openNextTask })
                                        : systemActions.taskActionError({ action: 'Complete', error: 'Failed to complete task' })
                                ),
                                catchError((error) => of(systemActions.taskActionError({ action: 'Complete', error })))
                            );
                    }
                    default: {
                        return of(systemActions.taskActionError({ error: new Error('Unknown task action') }));
                    }
                }
            })
        )
    );

    cancelTaskEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskCancel),
            map(() => {
                return systemActions.taskActionSuccess({ action: 'Cancel' });
            })
        )
    );

    taskActionErrorNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskActionError),
            map(({ error, action }) => {
                console.error('Task action error', typeof error === 'string' ? error : error.message);
                let message = '';
                switch (action) {
                    case 'Claim': {
                        message = 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_CLAIM_ERROR';
                        break;
                    }
                    case 'Unclaim': {
                        message = 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_UNCLAIM_ERROR';
                        break;
                    }
                    case 'Save': {
                        message = 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_SAVE_ERROR';
                        break;
                    }
                    case 'Complete': {
                        message = 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_COMPLETE_ERROR';
                        break;
                    }
                    default: {
                        message = 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_ACTION_ERROR';
                        break;
                    }
                }
                return systemActions.notificationShow({ severity: 'error', message });
            })
        )
    );

    notificationEffect$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(systemActions.notificationShow),
                tap(({ severity, message, messageArgs }) => {
                    switch (severity) {
                        case 'error': {
                            this.notificationService.showError(message, undefined, messageArgs);
                            break;
                        }
                        case 'warn': {
                            this.notificationService.showWarning(message, undefined, messageArgs);
                            break;
                        }
                        default: {
                            this.notificationService.showInfo(message, undefined, messageArgs);
                            break;
                        }
                    }
                })
            ),
        { dispatch: false }
    );

    claimTaskEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskClaim),
            concatLatestFrom(() => this.store.select(selectTaskInfo)),
            concatLatestFrom(() => this.store.select(selectTaskAssignmentContext)),
            exhaustMap(([[, taskContext], taskAssignmentContext]) =>
                taskAssignmentContext.canClaimTask
                    ? this.processBackendService.claimTask$(taskContext.appName, taskContext.taskId).pipe(
                          switchMap(() =>
                              this.processBackendService.getTaskAssignmentContext$(taskContext.appName, taskContext.taskId, true).pipe(
                                  map((newTaskAssignmentContext) =>
                                      systemActions.taskClaimSuccess({ taskAssignmentContext: newTaskAssignmentContext })
                                  ),
                                  catchError((error) => of(systemActions.taskClaimError({ error })))
                              )
                          ),
                          catchError((error) => of(systemActions.taskClaimError({ error })))
                      )
                    : of(systemActions.taskClaimError({ error: 'Unable to claim task' }))
            )
        )
    );

    broadcastTaskClaimSuccessActionEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskClaimSuccess),
            map(() => systemActions.taskActionSuccess({ action: 'Claim' }))
        )
    );

    taskClaimSuccessLoadScreenEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskClaimSuccess),
            map(() => systemActions.screenLoad())
        )
    );

    broadcastTaskClaimErrorEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskClaimError),
            map(({ error }) => systemActions.taskActionError({ error, action: 'Claim' }))
        )
    );

    taskClaimErrorCancelTaskEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.taskClaimError),
            map(() => systemActions.taskActionSuccess({ action: 'Cancel' }))
        )
    );

    unclaimTaskEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskUnclaim),
            concatLatestFrom(() => this.store.select(selectTaskInfo)),
            concatLatestFrom(() => this.store.select(selectTaskAssignmentContext)),
            exhaustMap(([[, taskContext], taskAssignmentContext]) =>
                taskAssignmentContext.canUnclaimTask
                    ? this.processBackendService.unclaimTask$(taskContext.appName, taskContext.taskId).pipe(
                          switchMap(() =>
                              this.processBackendService.getTaskAssignmentContext$(taskContext.appName, taskContext.taskId, true).pipe(
                                  map((newTaskAssignmentContext) =>
                                      userActions.taskUnclaimSuccess({ taskAssignmentContext: newTaskAssignmentContext })
                                  ),
                                  catchError((error) => of(userActions.taskUnclaimError({ error })))
                              )
                          ),
                          catchError((error) => of(userActions.taskUnclaimError({ error })))
                      )
                    : of(userActions.taskUnclaimError({ error: 'Unable to unclaim task' }))
            )
        )
    );

    broadcastUnclaimTaskSuccessEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskUnclaimSuccess),
            map(() => systemActions.taskActionSuccess({ action: 'Unclaim' }))
        )
    );

    unclaimTaskSuccessNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskUnclaimSuccess),
            map(() => systemActions.notificationShow({ severity: 'info', message: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_UNCLAIM_SUCCESS' }))
        )
    );

    taskUnclaimSuccessCancelTaskEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskUnclaimSuccess),
            map(() => systemActions.taskActionSuccess({ action: 'Cancel' }))
        )
    );

    broadcastUnclaimTaskErrorEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskUnclaimError),
            map(({ error }) => {
                console.error(error);
                return systemActions.taskActionError({ error, action: 'Unclaim' });
            })
        )
    );

    copyDocumentDetailsToClipboardEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.copyDocumentDetailsToClipboard),
            concatLatestFrom(() => this.store.select(selectTaskInfo)),
            tap(([{ documentId }, taskContext]) => {
                this.clipboard.copy(`${documentId}\n\r${taskContext.appName}\n\r${taskContext.rootProcessInstanceId}`);
            }),
            map(([{ documentId }]) => {
                return systemActions.copyDocumentDetailsToClipboardSuccess({ documentId });
            })
        )
    );

    copyDocumentDetailsToClipboardNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.copyDocumentDetailsToClipboardSuccess),
            concatLatestFrom(() => this.store.select(selectTaskInfo)),
            map(([{ documentId }, taskContext]) => {
                return systemActions.notificationShow({
                    severity: 'info',
                    message: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.COPY_DOCUMENT_DETAILS_TO_CLIPBOARD_SUCCESS',
                    messageArgs: { documentId, appName: taskContext.appName, rootProcessInstanceId: taskContext.rootProcessInstanceId },
                });
            })
        )
    );

    private parseTargetFolder(targetFolder: string): string {
        targetFolder = targetFolder.trim();
        targetFolder = targetFolder.replaceAll('\\', IdpDocumentHxpImportService.PATH_SEPARATOR);

        if (!targetFolder.startsWith(IdpDocumentHxpImportService.PATH_SEPARATOR)) {
            targetFolder = `${IdpDocumentHxpImportService.PATH_SEPARATOR}${targetFolder}`;
        }

        return targetFolder;
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import {
    filterContentFileReference,
    IdpFieldDefinitionsByClass,
    IdpClassificationConfiguration,
    IdpExtractionConfiguration,
    ProcessTaskBackendService,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatMap, of, map, catchError, forkJoin, tap, filter, switchMap, take, EMPTY, exhaustMap } from 'rxjs';
import { systemActions, userActions } from '../actions/field-verification.actions';
import { IdpTaskData } from '../../models/screen-models';
import { Store } from '@ngrx/store';
import { selectCanComplete, selectIsValidationProcessRunning, selectTaskAssignmentContext, selectTaskInfo } from '../selectors/screen.selectors';
import { NotificationService } from '@alfresco/adf-core';
import { FieldVerificationInput } from '../../models/contracts/field-verification-models';
import { concatLatestFrom } from '@ngrx/operators';

@Injectable()
export class ScreenEffects {
    private readonly actions$ = inject(Actions);
    private readonly processBackendService = inject(ProcessTaskBackendService);
    private readonly store = inject(Store);
    private readonly notificationService = inject(NotificationService);

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
                                        error: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.SCREEN_INIT_ERROR_NOT_CLAIMABLE',
                                    })
                          ),
                          catchError(() =>
                              of(
                                  systemActions.taskInitializeError({
                                      error: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.SCREEN_INIT_ERROR_ASSIGNEE',
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
                const message = typeof error === 'string' ? error : 'EXTRACTION.VERIFICATION.NOTIFICATIONS.SCREEN_INIT_ERROR';
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
                    this.processBackendService.getTaskInputData$<FieldVerificationInput>(taskContext.appName, taskContext.taskId),
                    this.processBackendService.getIdpConfiguration$(taskContext.appName),
                ]).pipe(
                    map(([taskInput, idpConfiguration]) => {
                        if (
                            Number.isNaN(taskInput.documentIndex) ||
                            taskInput.documentIndex < 0 ||
                            taskInput.documentIndex >= taskInput.batchState.documents.length
                        ) {
                            throw new TypeError(`Invalid document index - ${taskInput.documentIndex}`);
                        }

                        const contentFileReferences = (taskInput.batchState.contentFileReferences ?? taskInput.contents)?.map((file) =>
                            filterContentFileReference(file)
                        );
                        if (!contentFileReferences) {
                            throw new Error('contentFileReferences not found in task input data');
                        }

                        const mergedFieldDefinitionsByClass = this.mergeInheritedFieldDefinitions(
                            idpConfiguration.classification,
                            idpConfiguration.extraction
                        );

                        const taskData: IdpTaskData = {
                            ...taskInput,
                            sys_task_assignee: taskAssignmentContext.assignee,
                            classificationConfiguration: idpConfiguration.classification,
                            extractionConfiguration: { ...idpConfiguration.extraction, fieldDefinitionsByClass: mergedFieldDefinitionsByClass },
                            batchState: {
                                ...taskInput.batchState,
                                contentFileReferences,
                            },
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
                console.error('Screen load error', typeof error === 'string' ? error : error.message);
                return systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.SCREEN_LOAD_ERROR' });
            })
        )
    );

    saveTaskPrepareDataEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskSave),
            exhaustMap(() => {
                return this.store.select(selectIsValidationProcessRunning).pipe(
                    take(1),
                    concatMap((isValidationProcessRunning) => {
                        if (!isValidationProcessRunning) {
                            return of(systemActions.taskPrepareUpdate({ taskAction: 'Save' }));
                        }
                        this.store.dispatch(systemActions.taskCompletionAwaitingValidation());
                        return this.store.select(selectIsValidationProcessRunning).pipe(
                            filter((running) => !running),
                            take(1),
                            map(() => systemActions.taskPrepareUpdate({ taskAction: 'Save' }))
                        );
                    })
                );
            })
        )
    );

    taskCompleteWithValidationCheckEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskCompleteWithValidationCheck),
            exhaustMap(({ openNextTask }) => {
                return this.store.select(selectIsValidationProcessRunning).pipe(
                    take(1),
                    concatMap((isValidationProcessRunning) => {
                        if (!isValidationProcessRunning) {
                            return of(systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask }));
                        }
                        this.store.dispatch(systemActions.taskCompletionAwaitingValidation());
                        return this.store.select(selectIsValidationProcessRunning).pipe(
                            filter((running) => !running),
                            take(1),
                            concatLatestFrom(() => this.store.select(selectCanComplete)),
                            concatMap(([, canComplete]) => {
                                if (!canComplete) {
                                    return EMPTY;
                                }

                                return of(systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask }));
                            })
                        );
                    })
                );
            })
        )
    );

    completeTaskPrepareDataEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.taskComplete),
            map(() => {
                return systemActions.taskPrepareUpdate({ taskAction: 'Complete' });
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
                        const documentIndex = typeof taskData.documentIndex === 'number' ? taskData.documentIndex : 0;
                        return this.processBackendService
                            .completeTask$(taskContext.appName, taskContext.taskId, {
                                batchState: taskData.batchState,
                                sys_task_assignee: taskData.sys_task_assignee,
                                document: taskData.batchState.documents[documentIndex],
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
                        message = 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_CLAIM_ERROR';
                        break;
                    }
                    case 'Unclaim': {
                        message = 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_UNCLAIM_ERROR';
                        break;
                    }
                    case 'Save': {
                        message = 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_SAVE_ERROR';
                        break;
                    }
                    case 'Complete': {
                        message = 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_COMPLETE_ERROR';
                        break;
                    }
                    default: {
                        message = 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_ACTION_ERROR';
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

    private mergeInheritedFieldDefinitions(
        classification: IdpClassificationConfiguration,
        extraction: IdpExtractionConfiguration
    ): IdpFieldDefinitionsByClass[] {
        const documentClassDefinitions = classification.documentClassDefinitions || [];
        const classById = new Map(documentClassDefinitions.map((cls) => [cls.id, cls]));
        const fieldDefsByClass = extraction.fieldDefinitionsByClass || [];
        const fieldDefsByClassMap = new Map(fieldDefsByClass.map((entry) => [entry.documentClassId, entry]));

        const mergedFieldDefinitionsByClass: IdpFieldDefinitionsByClass[] = fieldDefsByClass.map((entry) => {
            const documentClass = classById.get(entry.documentClassId);
            const parentClassId = documentClass?.parentClassId;
            const parentEntry = parentClassId ? fieldDefsByClassMap.get(parentClassId) : undefined;
            return {
                ...entry,
                fieldDefinitions: [...(parentEntry?.fieldDefinitions ?? []), ...entry.fieldDefinitions],
            };
        });

        return mergedFieldDefinitionsByClass;
    }
}

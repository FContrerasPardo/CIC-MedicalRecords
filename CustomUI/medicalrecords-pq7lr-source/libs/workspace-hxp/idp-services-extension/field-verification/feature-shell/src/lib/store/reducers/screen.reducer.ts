/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createReducer, on } from '@ngrx/store';
import { initialScreenState, ScreenState } from '../states/screen.state';
import { IdpLoadState, TaskAssignmentContext } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { systemActions, userActions } from '../actions/field-verification.actions';

export const screenReducer = createReducer(
    initialScreenState,

    on(systemActions.taskInitialize, systemActions.screenLoad, (state) => ({
        ...state,
        status: IdpLoadState.Loading,
        taskDataSynced: false,
    })),

    on(systemActions.taskInitialize, (state, { taskContext, taskClaimPermissions }) => ({
        ...state,
        taskContext,
        taskAssignmentContext: getUpdatedTaskAssignmentContext(state, taskClaimPermissions),
    })),

    on(systemActions.taskInitializeSuccess, (state, { taskAssignmentContext }) => ({
        ...state,
        taskAssignmentContext: getUpdatedTaskAssignmentContext(state, taskAssignmentContext),
    })),

    on(systemActions.screenLoadSuccess, (state, { taskData }) => ({
        ...state,
        taskInputData: taskData,
        status: IdpLoadState.Loaded,
        error: undefined,
        taskDataSynced: true,
    })),

    on(systemActions.taskInitializeError, systemActions.screenLoadError, (state, { error }) => ({
        ...state,
        status: IdpLoadState.Error,
        error: typeof error === 'string' ? error : error.message,
        taskDataSynced: false,
    })),

    on(userActions.fieldValueUpdate, userActions.rejectReasonUpdate, (state) => {
        return {
            ...state,
            taskDataSynced: false,
        };
    }),

    on(userActions.updatePagesRotation, (state, { taskDataSynced }) => {
        if (taskDataSynced === undefined) {
            return state;
        }

        return {
            ...state,
            taskDataSynced,
        };
    }),

    on(systemActions.taskPrepareUpdateSuccess, (state, { taskData }) => {
        return {
            ...state,
            taskInputData: taskData,
            taskDataSynced: true,
        };
    }),

    on(systemActions.taskPrepareUpdate, (state) => {
        return {
            ...state,
            status: IdpLoadState.Saving,
        };
    }),

    on(systemActions.taskActionSuccess, (state, { action }) =>
        action === 'Claim'
            ? { ...state }
            : {
                  ...state,
                  status: IdpLoadState.Loaded,
              }
    ),

    on(systemActions.taskActionError, (state) => {
        return {
            ...state,
            status: IdpLoadState.Error,
        };
    }),
    on(systemActions.taskClaim, userActions.taskUnclaim, (state) => {
        return {
            ...state,
            status: IdpLoadState.Loading,
        };
    }),

    on(userActions.taskUnclaimSuccess, (state, { taskAssignmentContext }) => ({
        ...state,
        status: IdpLoadState.Loaded,
        taskAssignmentContext: getUpdatedTaskAssignmentContext(state, taskAssignmentContext),
    })),

    on(userActions.taskUnclaimError, (state) => ({
        ...state,
        status: IdpLoadState.Loaded,
    })),

    on(systemActions.taskClaimSuccess, (state, { taskAssignmentContext }) => ({
        ...state,
        taskAssignmentContext: getUpdatedTaskAssignmentContext(state, taskAssignmentContext),
    })),

    on(systemActions.taskCompletionAwaitingValidation, (state) => {
        return {
            ...state,
            status: IdpLoadState.AwaitingValidationForTaskCompletion,
        };
    }),
    on(systemActions.runValidationProcess, (state) => {
        return {
            ...state,
            status: IdpLoadState.Validating,
        };
    }),

    on(systemActions.validationProcessComplete, (state) => {
        return {
            ...state,
            status: IdpLoadState.Loaded,
        };
    })
);

const getUpdatedTaskAssignmentContext = (state: ScreenState, taskAssignmentContext: TaskAssignmentContext): TaskAssignmentContext => ({
    ...taskAssignmentContext,
    canClaimTask: taskAssignmentContext.canClaimTask ?? state.taskAssignmentContext.canClaimTask,
    canUnclaimTask: taskAssignmentContext.canUnclaimTask ?? state.taskAssignmentContext.canUnclaimTask,
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createReducer, on } from '@ngrx/store';
import { initialScreenState, ScreenState } from '../states/screen.state';
import { IdpScreenViewFilter } from '../../models/common-models';
import { systemActions, userActions } from '../actions/class-verification.actions';
import { IdpLoadState, TaskAssignmentContext } from '@hxp/workspace-hxp/idp-services-extension/shared';

export const screenReducer = createReducer(
    initialScreenState,
    on(systemActions.taskInitialize, systemActions.screenLoad, (state) => {
        return {
            ...state,
            status: IdpLoadState.Loading,
            taskDataSynced: false,
        };
    }),

    on(systemActions.taskInitialize, (state, { taskContext, taskClaimPermissions }) => ({
        ...state,
        taskContext,
        taskAssignmentContext: getUpdatedTaskAssignmentContext(state, taskClaimPermissions),
    })),

    on(systemActions.taskInitializeSuccess, (state, { taskAssignmentContext }) => ({
        ...state,
        taskAssignmentContext: getUpdatedTaskAssignmentContext(state, taskAssignmentContext),
    })),

    on(systemActions.screenLoadSuccess, (state, { taskData }) => {
        return {
            ...state,
            status: IdpLoadState.Loaded,
            taskInputData: taskData,
            taskDataSynced: true,
        };
    }),

    on(systemActions.taskInitializeError, systemActions.screenLoadError, (state) => {
        return {
            ...state,
            status: IdpLoadState.Error,
            taskDataSynced: false,
        };
    }),

    on(userActions.viewFilterChange, (state, { filter }) => {
        return {
            ...state,
            viewFilter: filter,
        };
    }),

    on(userActions.sortOptionChange, (state, { option }) => {
        return {
            ...state,
            sortOption: option,
        };
    }),

    on(userActions.viewFilterToggle, (state) => {
        return {
            ...state,
            viewFilter: state.viewFilter === IdpScreenViewFilter.All ? IdpScreenViewFilter.OnlyIssues : IdpScreenViewFilter.All,
        };
    }),
    on(userActions.changeFullScreen, (state, { fullScreen }) => {
        return {
            ...state,
            fullScreen: fullScreen,
        };
    }),

    on(systemActions.documentOperationSuccess, systemActions.applyDocumentUpdates, (state) => {
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

    on(userActions.taskSave, userActions.taskComplete, (state) => {
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

    on(systemActions.taskClaim, userActions.taskUnclaim, systemActions.screenLoadDocumentUpload, (state) => {
        return {
            ...state,
            status: IdpLoadState.Loading,
        };
    }),

    on(systemActions.taskClaimSuccess, (state, { taskAssignmentContext }) => ({
        ...state,
        taskAssignmentContext: getUpdatedTaskAssignmentContext(state, taskAssignmentContext),
    })),

    on(userActions.taskUnclaimSuccess, (state, { taskAssignmentContext }) => ({
        ...state,
        status: IdpLoadState.Loaded,
        taskAssignmentContext: getUpdatedTaskAssignmentContext(state, taskAssignmentContext),
    })),

    on(userActions.taskUnclaimError, (state) => ({
        ...state,
        status: IdpLoadState.Loaded,
    })),

    on(systemActions.screenLoadDocumentUploadSuccess, systemActions.screenLoadDocumentUploadError, (state) => ({
        ...state,
        status: IdpLoadState.Loaded,
    }))
);

const getUpdatedTaskAssignmentContext = (state: ScreenState, taskAssignmentContext: TaskAssignmentContext): TaskAssignmentContext => ({
    ...taskAssignmentContext,
    canClaimTask: taskAssignmentContext.canClaimTask ?? state.taskAssignmentContext.canClaimTask,
    canUnclaimTask: taskAssignmentContext.canUnclaimTask ?? state.taskAssignmentContext.canUnclaimTask,
});

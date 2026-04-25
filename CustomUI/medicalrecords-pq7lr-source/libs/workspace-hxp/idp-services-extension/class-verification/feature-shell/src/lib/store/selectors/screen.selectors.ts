/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createSelector } from '@ngrx/store';
import { screenFeatureSelector } from './class-verification-root.selectors';
import { IdpLoadState } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { selectAllDocumentsValid } from './document.selectors';

export const selectViewFilter = createSelector(screenFeatureSelector, (state) => state.viewFilter);

export const selectFullScreen = createSelector(screenFeatureSelector, (state) => state.fullScreen);

export const selectSortOption = createSelector(screenFeatureSelector, (state) => state.sortOption);

export const selectRejectReasons = createSelector(screenFeatureSelector, (state) => state.taskInputData?.rejectReasons || []);

export const selectScreenStatus = createSelector(screenFeatureSelector, (state) => state.status);

export const selectCorrelationId = createSelector(screenFeatureSelector, (state) => state.taskContext.rootProcessInstanceId);

export const selectTaskInfo = createSelector(screenFeatureSelector, (state) => state.taskContext);

export const selectTaskInputData = createSelector(screenFeatureSelector, (state) => state.taskInputData);

const notReadyStates: Set<IdpLoadState> = new Set([IdpLoadState.NotInitialized, IdpLoadState.Loading, IdpLoadState.Error]);
export const selectScreenReady = createSelector(screenFeatureSelector, (state) => !notReadyStates.has(state.status));

export const selectCanSave = createSelector(screenFeatureSelector, (state) => !state.taskDataSynced && state.status === IdpLoadState.Loaded);

export const selectCanComplete = createSelector(
    screenFeatureSelector,
    selectAllDocumentsValid,
    (screenState, allDocumentsValid) => allDocumentsValid && screenState.status === IdpLoadState.Loaded
);

export const selectTaskAssignmentContext = createSelector(screenFeatureSelector, (state) => state.taskAssignmentContext);

export const selectCanUnclaim = createSelector(
    selectTaskAssignmentContext,
    (taskAssignmentContext) => {
        if (!taskAssignmentContext|| !taskAssignmentContext.canUnclaimTask) {
            return false;
        }

        const hasCandidateGroups = (taskAssignmentContext.candidateGroups?.length ?? 0) > 0;
        const hasCandidateUsers = (taskAssignmentContext.candidateUsers?.length ?? 0) > 0;

        return hasCandidateGroups || hasCandidateUsers;
    }
);

export const selectUnclaimEnabled = createSelector(
    screenFeatureSelector,
    selectCanUnclaim,
    (state, canUnclaim) => canUnclaim && state.status === IdpLoadState.Loaded
);

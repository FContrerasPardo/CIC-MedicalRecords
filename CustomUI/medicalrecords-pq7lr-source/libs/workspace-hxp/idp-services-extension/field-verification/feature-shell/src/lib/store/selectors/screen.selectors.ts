/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createSelector } from '@ngrx/store';
import { screenFeatureSelector } from './field-verification-root.selectors';
import { IdpLoadState } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { selectDocumentValid } from './document.selectors';

export const selectScreenStatus = createSelector(screenFeatureSelector, (state) => state.status);
export const selectCorrelationId = createSelector(screenFeatureSelector, (state) => state.taskContext.rootProcessInstanceId);
export const selectTaskInputData = createSelector(screenFeatureSelector, (state) => state.taskInputData);
export const selectTaskInfo = createSelector(screenFeatureSelector, (state) => state.taskContext);

export const selectRejectReasons = createSelector(screenFeatureSelector, (state) => state.taskInputData?.rejectReasons || []);

const notReadyStates: Set<IdpLoadState> = new Set([IdpLoadState.NotInitialized, IdpLoadState.Loading, IdpLoadState.Error]);
export const selectScreenReady = createSelector(screenFeatureSelector, (state) => !notReadyStates.has(state.status));

export const selectCanSave = createSelector(screenFeatureSelector, (state) => {
    return !state.taskDataSynced && (state.status === IdpLoadState.Loaded || state.status === IdpLoadState.Validating);
});

export const selectCanComplete = createSelector(screenFeatureSelector, selectDocumentValid, (screenState, isDocumentValid) => {
    return isDocumentValid && (screenState.status === IdpLoadState.Loaded || screenState.status === IdpLoadState.Validating);
});

export const selectFieldDefinitions = createSelector(selectTaskInputData, (taskInputData) => {
    if (!taskInputData?.extractionConfiguration?.fieldDefinitionsByClass) {
        return [];
    }

    return taskInputData.extractionConfiguration.fieldDefinitionsByClass.flatMap((classDef) =>
        classDef.fieldDefinitions.map((field) => ({
            id: field.id,
            name: field.name,
            ignoreForAuto: field.ignoreForAuto ?? false,
            ignoreForReview: field.ignoreForReview ?? false,
            classId: classDef.documentClassId,
        }))
    );
});

export const selectIsValidationProcessRunning = createSelector(
    screenFeatureSelector,
    (state) => state.status === IdpLoadState.Validating || state.status === IdpLoadState.AwaitingValidationForTaskCompletion
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

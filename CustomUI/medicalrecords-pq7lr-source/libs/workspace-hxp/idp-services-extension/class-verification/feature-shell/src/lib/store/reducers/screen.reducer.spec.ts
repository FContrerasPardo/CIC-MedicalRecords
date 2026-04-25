/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { screenReducer } from './screen.reducer';
import { initialScreenState } from '../states/screen.state';
import { IdpLoadState, TaskAssignmentContext, TaskContext } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { systemActions, userActions } from '../actions/class-verification.actions';
import { mockIdpRejectReasons } from '../../models/mocked/mocked-reject-reasons';
import { IdpScreenViewFilter, IdpScreenViewSortOption } from '../../models/common-models';
import { IdpTaskData } from '../../models/screen-models';

describe('Screen State Reducer', () => {
    const taskContext: TaskContext = {
        appName: 'test-app',
        taskId: '123',
        taskName: 'ClassifyDocs',
        rootProcessInstanceId: '12',
    };

    const taskClaimPermissions: TaskAssignmentContext = {
        canClaimTask: false,
        canUnclaimTask: true,
    };

    const taskAssignmentContext: TaskAssignmentContext = {
        assignee: 'user1',
        candidateGroups: ['group1', 'group2'],
        candidateUsers: ['user1', 'user2'],
        ...taskClaimPermissions,
    };

    const taskData: IdpTaskData = {
        rejectReasons: mockIdpRejectReasons(),
        batchState: {
            documents: [],
            contentFileReferences: [],
        },
        configuration: {
            classificationConfidenceThreshold: 0.5,
            documentClassDefinitions: [],
        },
    };

    it('should return input state on unknown action', () => {
        const action = { type: 'Unknown' };
        const state = screenReducer(initialScreenState, action);
        expect(state).toEqual(initialScreenState);
    });

    it('should set state to loading on taskInitialize action', () => {
        const action = systemActions.taskInitialize({ taskContext, taskClaimPermissions });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loading);
        expect(state.taskDataSynced).toBeFalse();
    });

    it('should update taskContext and taskAssignmentContext on taskInitialize action', () => {
        const action = systemActions.taskInitialize({ taskContext, taskClaimPermissions });
        const state = screenReducer(initialScreenState, action);

        expect(state.taskContext).toEqual(taskContext);
        expect(state.taskAssignmentContext.canClaimTask).toBeFalse();
        expect(state.taskAssignmentContext.canUnclaimTask).toBeTrue();
    });

    it('should set state to loading on screenLoad action', () => {
        const action = systemActions.screenLoad();
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loading);
        expect(state.taskDataSynced).toBeFalse();
    });

    it('should set state to loaded on screenLoadSuccess action', () => {
        const action = systemActions.screenLoadSuccess({ taskData });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loaded);
        expect(state.taskDataSynced).toBeTrue();
    });

    it('should set state to error on screenLoadError action', () => {
        const action = systemActions.screenLoadError({ error: new Error('Screen Load Error') });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Error);
        expect(state.taskDataSynced).toBeFalse();
    });

    it('should set state to error on taskInitializeError action', () => {
        const action = systemActions.taskInitializeError({ error: new Error('Task Initialize Error') });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Error);
        expect(state.taskDataSynced).toBeFalse();
    });

    it('should update viewFilter on viewFilterChange action', () => {
        const action = userActions.viewFilterChange({ filter: IdpScreenViewFilter.OnlyIssues });
        const state = screenReducer(initialScreenState, action);
        expect(state.viewFilter).toEqual(IdpScreenViewFilter.OnlyIssues);
    });

    it('should update sortOption on sortOptionChange action', () => {
        const action = userActions.sortOptionChange({ option: IdpScreenViewSortOption.Classes });
        const state = screenReducer(initialScreenState, action);
        expect(state.sortOption).toEqual(IdpScreenViewSortOption.Classes);
    });

    it('should toggle view filter on viewFilterToggle action', () => {
        let state = screenReducer(initialScreenState, userActions.viewFilterToggle());
        expect(state.viewFilter).toEqual(IdpScreenViewFilter.OnlyIssues);
        state = screenReducer(state, userActions.viewFilterToggle());
        expect(state.viewFilter).toEqual(IdpScreenViewFilter.All);
    });

    it('should change full screen on changeFullScreen action', () => {
        let state = screenReducer(initialScreenState, userActions.changeFullScreen({ fullScreen: true }));
        expect(state.fullScreen).toEqual(true);
        state = screenReducer(state, userActions.changeFullScreen({ fullScreen: false }));
        expect(state.fullScreen).toEqual(false);
    });

    it('should taskDataSynced to false on documentOperationSuccess action', () => {
        const action = systemActions.documentOperationSuccess({} as any);
        const state = screenReducer(initialScreenState, action);
        expect(state.taskDataSynced).toBeFalse();
    });

    it('should not touch state when taskDataSynced is not defined on updatePagesRotation action', () => {
        const action = userActions.updatePagesRotation({ pages: [], taskDataSynced: undefined });
        const state = screenReducer(initialScreenState, action);
        expect(state).toBe(initialScreenState);
    });

    it('should set taskDataSynced to false on updatePagesRotation action', () => {
        const action = userActions.updatePagesRotation({ pages: [], taskDataSynced: false });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskDataSynced).toBeFalse();
    });

    it('should taskDataSynced to false on applyDocumentUpdates action', () => {
        const action = systemActions.applyDocumentUpdates({ updates: [] });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskDataSynced).toBeFalse();
    });

    it('should set taskDataSynced to true on taskPrepareUpdateSuccess action', () => {
        const action = systemActions.taskPrepareUpdateSuccess({ taskAction: 'Complete', taskData: taskData });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskDataSynced).toBeTrue();
    });

    it('should set status to Saving on taskSave action', () => {
        const action = userActions.taskSave();
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Saving);
    });

    it('should set status to Saving on taskComplete action', () => {
        const action = userActions.taskComplete({});
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Saving);
    });

    it('should set status to Loaded on taskActionSuccess action other than Claim', () => {
        const action = systemActions.taskActionSuccess({ action: 'Complete' });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loaded);
    });

    it('should return input state on taskActionSuccess action Claim', () => {
        const action = systemActions.taskActionSuccess({ action: 'Claim' });
        const state = screenReducer(initialScreenState, action);
        expect(state).toEqual(initialScreenState);
    });

    it('should set status to Error on taskActionError action', () => {
        const action = systemActions.taskActionError({ error: new Error('Task Action Error') });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Error);
    });

    it('should set status to Loading on taskClaim action', () => {
        const action = systemActions.taskClaim();
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loading);
    });

    it('should set status to Loading on taskUnclaim action', () => {
        const action = userActions.taskUnclaim();
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loading);
    });

    it('should set status to Loaded on taskUnclaimSuccess action', () => {
        const stateWithLoading = { ...initialScreenState, status: IdpLoadState.Loading };
        const action = userActions.taskUnclaimSuccess({ taskAssignmentContext });
        const state = screenReducer(stateWithLoading, action);
        expect(state.status).toEqual(IdpLoadState.Loaded);
    });

    it('should update task assignment context on taskUnclaimSuccess action', () => {
        const updatedTaskAssignmentContext: TaskAssignmentContext = {
            ...taskAssignmentContext,
            assignee: 'user2',
            canClaimTask: true,
            canUnclaimTask: false,
        };

        const action = userActions.taskUnclaimSuccess({ taskAssignmentContext: updatedTaskAssignmentContext });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskAssignmentContext).toEqual(updatedTaskAssignmentContext);
    });

    it('should set status to Loaded on taskUnclaimError action', () => {
        const stateWithError = { ...initialScreenState, status: IdpLoadState.Error };
        const action = userActions.taskUnclaimError({ error: 'Task Unclaim Error' });
        const state = screenReducer(stateWithError, action);
        expect(state.status).toEqual(IdpLoadState.Loaded);
    });

    it('should overwrite taskAssignmentContext on taskInitializeSuccess when full context is provided', () => {
        const stateWithPermissions = {
            ...initialScreenState,
            taskAssignmentContext: {
                ...initialScreenState.taskAssignmentContext,
                canClaimTask: true,
                canUnclaimTask: false,
            },
        };

        const action = systemActions.taskInitializeSuccess({ taskAssignmentContext });

        const state = screenReducer(stateWithPermissions, action);

        expect(state.taskAssignmentContext).toEqual(taskAssignmentContext);
    });

    it('should preserve existing claim permissions on taskInitializeSuccess when incoming permissions are undefined', () => {
        const stateWithPermissions = {
            ...initialScreenState,
            taskAssignmentContext: {
                ...initialScreenState.taskAssignmentContext,
                canClaimTask: true,
                canUnclaimTask: false,
            },
        };

        const action = systemActions.taskInitializeSuccess({
            taskAssignmentContext: {
                assignee: 'user2',
                candidateGroups: ['group3'],
                candidateUsers: ['user2'],
            },
        });

        const state = screenReducer(stateWithPermissions, action);

        expect(state.taskAssignmentContext).toEqual({
            assignee: 'user2',
            candidateGroups: ['group3'],
            candidateUsers: ['user2'],
            canClaimTask: true,
            canUnclaimTask: false,
        });
    });

    it('should set status to Loaded and update task assignment context on taskClaimSuccess action', () => {
        const updatedTaskAssignmentContext: TaskAssignmentContext = {
            ...taskAssignmentContext,
            assignee: 'user2',
            canClaimTask: false,
            canUnclaimTask: true,
        };

        const action = systemActions.taskClaimSuccess({ taskAssignmentContext: updatedTaskAssignmentContext });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskAssignmentContext).toEqual(updatedTaskAssignmentContext);
    });

    it('should set status to Loading on screenLoadDocumentUpload action', () => {
        const action = systemActions.screenLoadDocumentUpload({} as any);
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loading);
    });

    it('should preserve existing claim permissions on taskClaimSuccess when incoming permissions are undefined', () => {
        const stateWithPermissions = {
            ...initialScreenState,
            taskAssignmentContext: {
                ...initialScreenState.taskAssignmentContext,
                canClaimTask: false,
                canUnclaimTask: true,
            },
        };

        const action = systemActions.taskClaimSuccess({
            taskAssignmentContext: {
                assignee: 'user3',
                candidateGroups: ['group4'],
                candidateUsers: ['user3'],
            },
        });

        const state = screenReducer(stateWithPermissions, action);

        expect(state.taskAssignmentContext).toEqual({
            assignee: 'user3',
            candidateGroups: ['group4'],
            candidateUsers: ['user3'],
            canClaimTask: false,
            canUnclaimTask: true,
        });
    });

    it('should set status to Loaded on screenLoadDocumentUploadError action', () => {
        const action = systemActions.screenLoadDocumentUploadError({});
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loaded);
    });

    it('should set status to Loaded on screenLoadDocumentUploadSuccess action', () => {
        const action = systemActions.screenLoadDocumentUploadSuccess({} as any);
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toEqual(IdpLoadState.Loaded);
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { screenReducer } from './screen.reducer';
import { initialScreenState } from '../states/screen.state';
import { IdpLoadState, TaskAssignmentContext } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { systemActions, userActions } from '../actions/field-verification.actions';
import { taskAssignmentContext, taskClaimPermissions, taskContext, taskData } from '../shared-mock-states';

describe('screenReducer', () => {
    it('should set status to Loading on taskInitialize action', () => {
        const action = systemActions.taskInitialize({ taskContext, taskClaimPermissions });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toBe(IdpLoadState.Loading);
        expect(state.taskDataSynced).toBe(false);
    });

    it('should set status to Loading on screenLoad action', () => {
        const action = systemActions.screenLoad();
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toBe(IdpLoadState.Loading);
        expect(state.taskDataSynced).toBe(false);
    });

    it('should set taskInputData, and status to Loaded on screenLoadSuccess action', () => {
        const action = systemActions.screenLoadSuccess({ taskData: taskData });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskInputData).toEqual(taskData);
        expect(state.status).toBe(IdpLoadState.Loaded);
        expect(state.error).toBeUndefined();
        expect(state.taskDataSynced).toBe(true);
    });

    it('should set status to Error and set error message on screenLoadError action', () => {
        const error = 'Some error';
        const action = systemActions.screenLoadError({ error });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toBe(IdpLoadState.Error);
        expect(state.error).toBe(error);
        expect(state.taskDataSynced).toBe(false);
    });

    it('should set status to Error and set error message on taskInitializeError action', () => {
        const error = 'Task Initialization Error';
        const action = systemActions.taskInitializeError({ error });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toBe(IdpLoadState.Error);
        expect(state.error).toBe(error);
        expect(state.taskDataSynced).toBe(false);
    });

    it('should update taskContext and taskAssignmentContext on taskInitialize action', () => {
        const action = systemActions.taskInitialize({ taskContext, taskClaimPermissions });
        const state = screenReducer(initialScreenState, action);

        expect(state.taskContext).toEqual(taskContext);
        expect(state.taskAssignmentContext.canClaimTask).toBe(false);
        expect(state.taskAssignmentContext.canUnclaimTask).toBe(true);
    });

    it('should set status to Error and set error message from Error object on screenLoadError action', () => {
        const error = new Error('Some error');
        const action = systemActions.screenLoadError({ error });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toBe(IdpLoadState.Error);
        expect(state.error).toBe(error.message);
        expect(state.taskDataSynced).toBe(false);
    });

    it('should taskDataSynced to false on fieldValueUpdate action', () => {
        const action = userActions.fieldValueUpdate({} as any);
        const state = screenReducer(initialScreenState, action);
        expect(state.taskDataSynced).toBe(false);
    });

    it('should taskDataSynced to false on rejectReasonUpdate action', () => {
        const action = userActions.rejectReasonUpdate({} as any);
        const state = screenReducer(initialScreenState, action);
        expect(state.taskDataSynced).toBe(false);
    });

    it('should set taskDataSynced to true on taskPrepareUpdateSuccess action', () => {
        const action = systemActions.taskPrepareUpdateSuccess({ taskAction: 'Complete', taskData: taskData });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskDataSynced).toBe(true);
    });

    it('should not touch state when taskDataSynced is not defined on updatePagesRotation action', () => {
        const action = userActions.updatePagesRotation({ pages: [], taskDataSynced: undefined });
        const state = screenReducer(initialScreenState, action);
        expect(state).toBe(initialScreenState);
    });

    it('should set taskDataSynced to false on updatePagesRotation action', () => {
        const action = userActions.updatePagesRotation({ pages: [], taskDataSynced: false });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskDataSynced).toBe(false);
    });

    it('should set status to Saving on taskPrepareUpdate action', () => {
        const action = systemActions.taskPrepareUpdate({});
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

    it('should set status to Loaded and update task context on taskClaimSuccess action', () => {
        const updatedTaskAssignmentContext: TaskAssignmentContext = {
            ...taskAssignmentContext,
            canClaimTask: true,
            canUnclaimTask: false,
        };
        const action = systemActions.taskClaimSuccess({ taskAssignmentContext: updatedTaskAssignmentContext });
        const state = screenReducer(initialScreenState, action);
        expect(state.taskAssignmentContext).toEqual(updatedTaskAssignmentContext);
    });

    it('should set status to AwaitingValidationForTaskCompletion on taskCompletionAwaitingValidation action', () => {
        const action = systemActions.taskCompletionAwaitingValidation();
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toBe(IdpLoadState.AwaitingValidationForTaskCompletion);
    });

    it('should set status to Validating on runValidationProcess action', () => {
        const action = systemActions.runValidationProcess({
            triggeringFieldName: 'testField',
            validationProcessName: 'testProcess',
            validationProcessId: 'process-123',
            validatorName: 'testValidator',
        });
        const state = screenReducer(initialScreenState, action);
        expect(state.status).toBe(IdpLoadState.Validating);
    });

    it('should set status to Loaded on validationProcessComplete action', () => {
        const validatingState = { ...initialScreenState, status: IdpLoadState.Validating };
        const action = systemActions.validationProcessComplete();
        const state = screenReducer(validatingState, action);
        expect(state.status).toBe(IdpLoadState.Loaded);
    });

    it('should set status to Loaded on validationProcessComplete action when state is AwaitingValidationForTaskCompletion', () => {
        const awaitingState = { ...initialScreenState, status: IdpLoadState.AwaitingValidationForTaskCompletion };
        const action = systemActions.validationProcessComplete();
        const state = screenReducer(awaitingState, action);
        expect(state.status).toBe(IdpLoadState.Loaded);
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
});

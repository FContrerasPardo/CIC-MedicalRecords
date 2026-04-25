/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    selectCorrelationId,
    selectTaskInputData,
    selectTaskInfo,
    selectScreenReady,
    selectCanSave,
    selectCanComplete,
    selectCanUnclaim,
    selectIsValidationProcessRunning,
    selectTaskAssignmentContext,
    selectUnclaimEnabled,
} from './screen.selectors';
import { screenState, taskAssignmentContext, taskContext, taskData } from '../shared-mock-states';
import { ScreenState } from '../states/screen.state';
import { IdpLoadState } from '@hxp/workspace-hxp/idp-services-extension/shared';

describe('Screen Selectors', () => {
    let initialState: ScreenState;

    beforeEach(() => {
        initialState = { ...screenState };
    });

    it('should select correlation id', () => {
        const result = selectCorrelationId.projector(initialState);
        expect(result).toBe('root-pid');
    });

    it('should select task input data', () => {
        const result = selectTaskInputData.projector(initialState);
        expect(result).toEqual(taskData);
    });

    it('should select task info', () => {
        const result = selectTaskInfo.projector(initialState);
        expect(result).toEqual(taskContext);
    });

    it('should select if the screen is ready when screen status is loaded', () => {
        initialState.status = IdpLoadState.Loaded;
        const result = selectScreenReady.projector(initialState);
        expect(result).toBe(true);
    });

    it('should select if the screen is not ready when screen status is not loaded', () => {
        initialState.status = IdpLoadState.Loading;
        const result = selectScreenReady.projector(initialState);
        expect(result).toBe(false);
    });

    it('should select if the screen is not ready when screen status is not initialized', () => {
        initialState.status = IdpLoadState.NotInitialized;
        const result = selectScreenReady.projector(initialState);
        expect(result).toBe(false);
    });

    it('should select if the task can be saved to true when task sync status is false and screen state is loaded', () => {
        initialState.taskDataSynced = false;
        initialState.status = IdpLoadState.Loaded;
        const result = selectCanSave.projector(initialState);
        expect(result).toBe(true);
    });

    it('should select if the task can be saved to true when task sync status is false and screen state is validating', () => {
        initialState.taskDataSynced = false;
        initialState.status = IdpLoadState.Validating;
        const result = selectCanSave.projector(initialState);
        expect(result).toBe(true);
    });

    it('should select if the task cannot be saved to false when task sync status is false and screen state is not loaded', () => {
        initialState.taskDataSynced = false;
        initialState.status = IdpLoadState.Saving;
        const result = selectCanSave.projector(initialState);
        expect(result).toBe(false);
    });

    it('should select if the task cannot be saved to false when task sync status is true', () => {
        initialState.taskDataSynced = true;
        const result = selectCanSave.projector(initialState);
        expect(result).toBe(false);
    });

    it('should select if the task can be completed to true when all document is valid and screen state is loaded', () => {
        const documentValid = true;
        initialState.status = IdpLoadState.Loaded;
        const result = selectCanComplete.projector(initialState, documentValid);
        expect(result).toBe(true);
    });

    it('should select if the task can be completed to true when document is valid and screen state is validating', () => {
        const documentValid = true;
        initialState.status = IdpLoadState.Validating;
        const result = selectCanComplete.projector(initialState, documentValid);
        expect(result).toBe(true);
    });

    it('should select if the task can be completed to true when all document is valid and screen state is not loaded', () => {
        const documentValid = true;
        initialState.status = IdpLoadState.Saving;
        const result = selectCanComplete.projector(initialState, documentValid);
        expect(result).toBe(false);
    });

    it('should select if the task cannot be completed when document is invalid', () => {
        const documentValid = false;
        const result = selectCanComplete.projector(initialState, documentValid);
        expect(result).toBe(false);
    });

    it.each([
        { status: IdpLoadState.Validating, expected: true, description: 'Validating' },
        { status: IdpLoadState.AwaitingValidationForTaskCompletion, expected: true, description: 'AwaitingValidationForTaskCompletion' },
        { status: IdpLoadState.Loaded, expected: false, description: 'Loaded' },
        { status: IdpLoadState.NotInitialized, expected: false, description: 'NotInitialized' },
        { status: IdpLoadState.Error, expected: false, description: 'Error' },
        { status: IdpLoadState.Saving, expected: false, description: 'Saving' },
        { status: IdpLoadState.Loading, expected: false, description: 'Loading' },
    ])('should return validation process running as $expected when screen state is $description', ({ status, expected }) => {
        initialState.status = status;
        const result = selectIsValidationProcessRunning.projector(initialState);
        expect(result).toBe(expected);
    });

    describe('selectTaskAssignmentContext', () => {
        it('should return task assignment context', () => {
            const result = selectTaskAssignmentContext.projector(initialState);
            expect(result).toEqual(taskAssignmentContext);
        });
    });

    describe('selectCanUnclaim', () => {
        it('should return true when can unclaim task and any candidate group is defined', () => {
            const result = selectCanUnclaim.projector({ candidateGroups: ['group1'], canUnclaimTask: true });
            expect(result).toBe(true);
        });

        it('should return true when can unclaim task and any candidate user is defined', () => {
            const result = selectCanUnclaim.projector({ candidateUsers: ['user1'], canUnclaimTask: true });
            expect(result).toBe(true);
        });

        it('should return false when can unclaim task and no candidate groups or users are defined', () => {
            const result = selectCanUnclaim.projector({ candidateGroups: [], candidateUsers: [], canUnclaimTask: true });
            expect(result).toBe(false);
        });

        it('should return false when cannot unclaim task', () => {
            const result = selectCanUnclaim.projector({ candidateGroups: ['group1'], canUnclaimTask: false });
            expect(result).toBe(false);
        });
    });

    describe('selectUnclaimEnabled', () => {
        it('should return true when canUnclaim is true and status is Loaded', () => {
            const result = selectUnclaimEnabled.projector(initialState, true);
            expect(result).toBe(true);
        });

        it('should return false when canUnclaim is false and status is Loaded', () => {
            const result = selectUnclaimEnabled.projector(initialState, false);
            expect(result).toBe(false);
        });

        it('should return false when canUnclaim is true and status is not Loaded', () => {
            initialState.status = IdpLoadState.Saving;
            const result = selectUnclaimEnabled.projector(initialState, true);
            expect(result).toBe(false);
        });
    });
});

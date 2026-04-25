/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpLoadState } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { systemActions, userActions } from '../actions/class-verification.actions';
import { initialDocumentClassState } from '../states/document-class.state';
import { documentClassReducer } from './document-class.reducer';
import { IdpTaskData, REJECTED_CLASS_ID, UNCLASSIFIED_CLASS_ID } from '../../models/screen-models';

describe('Document Class Reducer', () => {
    const mockTaskData: IdpTaskData = {
        batchState: {
            documents: [],
            contentFileReferences: [],
        },
        rejectReasons: [],
        configuration: {
            classificationConfidenceThreshold: 0.5,
            documentClassDefinitions: [
                {
                    id: 'payslips',
                    name: 'Payslips',
                    description: 'You guessed it! Payslips!',
                },
            ],
        },
    };

    it('should return the initial state for unknown action', () => {
        const action = { type: 'Unknown' };
        const state = documentClassReducer(initialDocumentClassState, action);

        expect(state).toBe(initialDocumentClassState);
    });

    it('should load classes on screen loaded successfully', () => {
        const taskData = { ...mockTaskData };

        const action = systemActions.screenLoadSuccess({ taskData });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            loadState: IdpLoadState.Loading,
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        expect(Object.values(state.entities).length).toEqual(3);
        expect(state.ids).toEqual([REJECTED_CLASS_ID, UNCLASSIFIED_CLASS_ID, 'payslips']);
        expect(state.loadState).toEqual(IdpLoadState.Loaded);
    });

    it('should load empty classes when screen loaded successfully with empty task data', () => {
        const taskData = { ...mockTaskData, configuration: { ...mockTaskData.configuration, documentClassDefinitions: [] } };

        const action = systemActions.screenLoadSuccess({ taskData });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            loadState: IdpLoadState.Loading,
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        expect(Object.values(state.entities).length).toEqual(2);
        expect(state.ids).toEqual([REJECTED_CLASS_ID, UNCLASSIFIED_CLASS_ID]);
        expect(state.loadState).toEqual(IdpLoadState.Loaded);
    });

    it('should map ignore flags (ignoreForAuto, ignoreForReview) from task class definitions', () => {
        const taskData: IdpTaskData = {
            ...mockTaskData,
            configuration: {
                ...mockTaskData.configuration,
                documentClassDefinitions: [
                    {
                        id: 'payslips',
                        name: 'Payslips',
                        description: 'You guessed it! Payslips!',
                        ignoreForAuto: true,
                        ignoreForReview: true,
                    } as any,
                ],
            },
        };

        const action = systemActions.screenLoadSuccess({ taskData });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            loadState: IdpLoadState.Loading,
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        const payslips = state.entities['payslips'] as any;
        expect(payslips).toBeTruthy();
        expect(payslips.ignoreForAuto).toBe(true);
        expect(payslips.ignoreForReview).toBe(true);
    });

    it('should leave ignore flags undefined when not provided in task class definitions', () => {
        const taskData = { ...mockTaskData };

        const action = systemActions.screenLoadSuccess({ taskData: taskData });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            loadState: IdpLoadState.Loading,
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        const payslips = state.entities['payslips'] as any;
        expect(payslips).toBeTruthy();
        expect(payslips.ignoreForAuto).toBeUndefined();
        expect(payslips.ignoreForReview).toBeUndefined();
    });

    it('should update selected class on class select', () => {
        const action = userActions.classSelect({
            classId: 'payslips',
        });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            expandedClassId: undefined,
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        expect(state.selectedClassId).toEqual('payslips');
        expect(state.expandedClassId).toEqual(undefined);
    });

    it('should clear expanded class on class select with a non expanded class', () => {
        const action = userActions.classSelect({
            classId: 'payslips',
        });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            expandedClassId: 'contracts',
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        expect(state.expandedClassId).toEqual(undefined);
    });

    it('should retain expanded class on class select with the expanded class', () => {
        const action = userActions.classSelect({
            classId: 'payslips',
        });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            expandedClassId: 'payslips',
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        expect(state.expandedClassId).toEqual('payslips');
    });

    it('should set class expanded on class expand toggle', () => {
        const action = userActions.classExpandToggle({
            classId: 'payslips',
        });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            expandedClassId: undefined,
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        expect(state.expandedClassId).toEqual('payslips');
    });

    it('should clear class expanded on class expand toggle with the expanded class', () => {
        const action = userActions.classExpandToggle({
            classId: 'payslips',
        });

        const mockDocumentClassState = {
            ...initialDocumentClassState,
            expandedClassId: 'payslips',
        };

        const state = documentClassReducer(mockDocumentClassState, action);

        expect(state.expandedClassId).toEqual(undefined);
    });
});

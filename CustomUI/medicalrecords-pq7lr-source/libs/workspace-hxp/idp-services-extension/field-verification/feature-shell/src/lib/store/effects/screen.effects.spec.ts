/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { merge, Observable, of } from 'rxjs';
import { ScreenEffects } from './screen.effects';
import { ProcessTaskBackendService, TaskAssignmentContext } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { systemActions, userActions } from '../actions/field-verification.actions';
import { Action } from '@ngrx/store';
import { idpConfiguration, taskContext, taskData } from '../shared-mock-states';
import { NotificationService } from '@alfresco/adf-core';
import { hot, cold, getTestScheduler } from 'jasmine-marbles';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { IdpTaskData } from '../../models/screen-models';
import { selectCanComplete, selectIsValidationProcessRunning, selectTaskAssignmentContext, selectTaskInfo } from '../selectors/screen.selectors';

describe('ScreenEffects', () => {
    let actions$: Observable<Action>;
    let effects: ScreenEffects;
    let store: MockStore;
    let processTaskService: jest.Mocked<ProcessTaskBackendService>;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    const mockIdpConfiguration = { ...idpConfiguration };
    const mockTaskData = { ...taskData, rootProcessInstanceId: '' };

    const taskAssignmentContext: TaskAssignmentContext = {
        assignee: 'user1',
        candidateGroups: ['group1'],
        candidateUsers: ['user1', 'user2'],
        canClaimTask: true,
        canUnclaimTask: false,
    };

    const notificationSpy = {
        showError: jest.fn(),
        showWarning: jest.fn(),
        showInfo: jest.fn(),
    };

    beforeEach(() => {
        // Suppress console output in tests to reduce noise from intentional error handling
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        processTaskService = {
            getTaskInputData$: jest.fn().mockReturnValue(of(mockTaskData)),
            getIdpConfiguration$: jest.fn().mockReturnValue(of(mockIdpConfiguration)),
            completeTask$: jest.fn().mockReturnValue(of({})),
            saveTaskData$: jest.fn().mockReturnValue(of({})),
            claimTask$: jest.fn().mockReturnValue(of(true)),
            unclaimTask$: jest.fn().mockReturnValue(of(true)),
            getTaskAssignmentContext$: jest.fn().mockReturnValue(of(taskAssignmentContext)),
        } as jest.Mocked<ProcessTaskBackendService>;

        TestBed.configureTestingModule({
            providers: [
                ScreenEffects,
                provideMockActions(() => actions$),
                provideMockStore({
                    selectors: [
                        { selector: selectTaskInfo, value: taskContext },
                        { selector: selectTaskAssignmentContext, value: taskAssignmentContext },
                    ],
                }),
                { provide: ProcessTaskBackendService, useValue: processTaskService },
                { provide: NotificationService, useValue: notificationSpy },
            ],
        });

        effects = TestBed.inject(ScreenEffects);
        store = TestBed.inject(MockStore);
    });

    afterEach(() => {
        store.resetSelectors();
        // Restore console output after each test
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    it('should fetch task input and merge inherited fields into extraction config on screen load', () => {
        const parentId = 'parent';
        const childId = 'child';

        const parentClass = { id: parentId, name: 'Parent', description: 'p' } as any;
        const childClass = { id: childId, name: 'Child', description: 'c', parentClassId: parentId } as any;

        const configWithInheritance = {
            classification: { ...mockIdpConfiguration.classification, documentClassDefinitions: [parentClass, childClass] },
            extraction: {
                fieldDefinitionsByClass: [
                    {
                        documentClassId: parentId,
                        fieldDefinitions: [{ id: 'p', name: 'P', dataType: 'Text', format: '', description: '' }],
                        fieldConfidenceThreshold: 0.8,
                    },
                    {
                        documentClassId: childId,
                        fieldDefinitions: [{ id: 'c', name: 'C', dataType: 'Text', format: '', description: '' }],
                        fieldConfidenceThreshold: 0.8,
                    },
                ],
            },
        } as any;

        processTaskService.getIdpConfiguration$.mockReturnValue(of(configWithInheritance));

        const action = systemActions.screenLoad();
        actions$ = hot('       -a-', { a: action });

        effects.loadScreenEffect$.subscribe((result) => {
            if ('taskData' in result) {
                const merged = result.taskData.extractionConfiguration.fieldDefinitionsByClass.find((e) => e.documentClassId === childId);
                expect(merged?.fieldDefinitions.map((f: any) => f.id).sort()).toEqual(['c', 'p']);
            } else {
                fail('Expected screenLoadSuccess with taskData');
            }
        });
    });

    it('should emit screen load error action when task input data retrieval fails', () => {
        const error = new Error('Error fetching task data');
        processTaskService.getTaskInputData$.mockReturnValue(cold('#', {}, error));
        const action = systemActions.screenLoad();
        const outcome = systemActions.screenLoadError({ error });
        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.loadScreenEffect$).toBeObservable(expected);
    });

    it('should emit screen load error action when task configuration retrieval fails', () => {
        const error = new Error('Error fetching task configuration');
        processTaskService.getIdpConfiguration$.mockReturnValue(cold('#', {}, error));
        const action = systemActions.screenLoad();
        const outcome = systemActions.screenLoadError({ error });
        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.loadScreenEffect$).toBeObservable(expected);
    });

    it('should emit screen load error action when document index is lesser than 0', () => {
        const testTaskData = { ...mockTaskData, documentIndex: -1 };
        processTaskService.getTaskInputData$.mockReturnValue(of(testTaskData));
        const action = systemActions.screenLoad();
        const outcome = systemActions.screenLoadError({ error: new TypeError('Invalid document index - -1') });
        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.loadScreenEffect$).toBeObservable(expected);
    });

    it('should emit screen load error action when document index is more than total document length', () => {
        const testTaskData = { ...mockTaskData, documentIndex: 10 };
        processTaskService.getTaskInputData$.mockReturnValue(of(testTaskData));
        const action = systemActions.screenLoad();
        const outcome = systemActions.screenLoadError({ error: new TypeError('Invalid document index - 10') });
        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.loadScreenEffect$).toBeObservable(expected);
    });

    it('should send errors to notification service', () => {
        const severity: 'error' | 'info' | 'success' | 'warn' = 'error';
        const error = { severity: severity, message: 'Test Error' };
        actions$ = hot('a', { a: systemActions.notificationShow(error) });
        effects.notificationEffect$.subscribe(() => {});
        getTestScheduler().flush();
        expect(notificationSpy.showError).toHaveBeenCalled();
    });

    it('should send warnings to notification service', () => {
        const severity: 'error' | 'info' | 'success' | 'warn' = 'warn';
        const error = { severity: severity, message: 'Test Error' };
        actions$ = hot('a', { a: systemActions.notificationShow(error) });
        effects.notificationEffect$.subscribe(() => {});
        getTestScheduler().flush();
        expect(notificationSpy.showWarning).toHaveBeenCalled();
    });

    it('should send info to notification service', () => {
        const severity: 'error' | 'info' | 'success' | 'warn' = 'info';
        const error = { severity: severity, message: 'Test Error' };
        actions$ = hot('a', { a: systemActions.notificationShow(error) });
        effects.notificationEffect$.subscribe(() => {});
        getTestScheduler().flush();
        expect(notificationSpy.showInfo).toHaveBeenCalled();
    });

    it('should handle task action error', () => {
        const error = new Error('Test Error');
        actions$ = hot('a', { a: systemActions.taskActionError({ error }) });
        const expected = cold('b', {
            b: systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_ACTION_ERROR' }),
        });
        expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
    });

    it('should handle save task action error', () => {
        actions$ = hot('a', { a: systemActions.taskActionError({ error: 'err', action: 'Save' }) });
        const expected = cold('b', {
            b: systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_SAVE_ERROR' }),
        });
        expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
    });

    it('should handle complete task action error', () => {
        actions$ = hot('a', { a: systemActions.taskActionError({ error: 'err', action: 'Complete' }) });
        const expected = cold('b', {
            b: systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_COMPLETE_ERROR' }),
        });
        expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
    });

    it('should handle task cancel', () => {
        actions$ = hot('a', { a: userActions.taskCancel() });
        const expected = cold('b', { b: systemActions.taskActionSuccess({ action: 'Cancel' }) });
        expect(effects.cancelTaskEffect$).toBeObservable(expected);
    });

    it('should dispatch taskPrepareUpdate with Save action when validation is not running', (done) => {
        store.overrideSelector(selectIsValidationProcessRunning, false);

        actions$ = of(userActions.taskSave());

        effects.saveTaskPrepareDataEffect$.subscribe((action) => {
            expect(action).toEqual(systemActions.taskPrepareUpdate({ taskAction: 'Save' }));
            done();
        });
    });

    it('should wait for validation to complete before dispatching taskPrepareUpdate for Save', fakeAsync(() => {
        let validationRunning = true;
        store.overrideSelector(selectIsValidationProcessRunning, validationRunning);

        actions$ = of(userActions.taskSave());

        let emittedAction: Action | undefined;
        const subscription = effects.saveTaskPrepareDataEffect$.subscribe((action) => {
            emittedAction = action;
        });

        expect(emittedAction).toBeUndefined();

        setTimeout(() => {
            validationRunning = false;
            store.overrideSelector(selectIsValidationProcessRunning, validationRunning);
            store.refreshState();
        }, 10);

        tick(10);
        expect(emittedAction).toEqual(systemActions.taskPrepareUpdate({ taskAction: 'Save' }));
        subscription.unsubscribe();
    }));

    it('should dispatch taskCompletionAwaitingValidation when validation is running for Save', fakeAsync(() => {
        let validationRunning = true;
        store.overrideSelector(selectIsValidationProcessRunning, validationRunning);

        const dispatchSpy = jest.spyOn(store, 'dispatch');

        actions$ = of(userActions.taskSave());

        let emittedAction: Action | undefined;
        const subscription = effects.saveTaskPrepareDataEffect$.subscribe((action) => {
            emittedAction = action;
        });

        expect(dispatchSpy).toHaveBeenCalledWith(systemActions.taskCompletionAwaitingValidation());
        expect(emittedAction).toBeUndefined();

        setTimeout(() => {
            validationRunning = false;
            store.overrideSelector(selectIsValidationProcessRunning, validationRunning);
            store.refreshState();
        }, 10);

        tick(10);
        expect(emittedAction).toEqual(systemActions.taskPrepareUpdate({ taskAction: 'Save' }));
        subscription.unsubscribe();
    }));

    it('should trigger task data preparation when task complete action emits', () => {
        actions$ = hot('a', { a: userActions.taskComplete() });
        const expected = cold('b', { b: systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: undefined }) });
        expect(effects.completeTaskPrepareDataEffect$).toBeObservable(expected);
    });

    it('should make api call to save task when prepare update action emits with save action', () => {
        const testTaskData: IdpTaskData = {
            ...mockTaskData,
            classificationConfiguration: mockIdpConfiguration.classification,
            extractionConfiguration: mockIdpConfiguration.extraction,
        };
        const outcome = systemActions.taskActionSuccess({ action: 'Save' });
        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Save', taskData: testTaskData }) });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.taskActionEffect$).toBeObservable(expected);
        expect(processTaskService.saveTaskData$).toHaveBeenCalledWith(taskContext.appName, taskContext.taskId, {
            batchState: testTaskData.batchState,
            sys_task_assignee: testTaskData.sys_task_assignee,
        });
    });

    it('should make api call to complete task when prepare update action emits with complete action', () => {
        const testTaskData: IdpTaskData = {
            ...mockTaskData,
            classificationConfiguration: mockIdpConfiguration.classification,
            extractionConfiguration: mockIdpConfiguration.extraction,
        };
        const outcome = systemActions.taskActionSuccess({ action: 'Complete', openNextTask: undefined });
        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Complete', taskData: testTaskData }) });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.taskActionEffect$).toBeObservable(expected);
        expect(processTaskService.completeTask$).toHaveBeenCalledWith(taskContext.appName, taskContext.taskId, {
            batchState: testTaskData.batchState,
            sys_task_assignee: testTaskData.sys_task_assignee,
            document: testTaskData.batchState.documents[testTaskData.documentIndex],
        });
    });

    it('should emit task action error when prepare update action emits neither save or complete action', () => {
        const testTaskData: IdpTaskData = {
            ...mockTaskData,
            classificationConfiguration: mockIdpConfiguration.classification,
            extractionConfiguration: mockIdpConfiguration.extraction,
        };
        const outcome = systemActions.taskActionError({ error: new Error('Unknown task action') });
        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Cancel', taskData: testTaskData }) });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error when save task is unsuccessful', () => {
        const testTaskData: IdpTaskData = {
            ...mockTaskData,
            classificationConfiguration: mockIdpConfiguration.classification,
            extractionConfiguration: mockIdpConfiguration.extraction,
        };
        processTaskService.saveTaskData$.mockReturnValue(of(false));

        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Save', taskData: testTaskData }) });
        const outcome = systemActions.taskActionError({ action: 'Save', error: jasmine.any(String) as any });
        const expected = cold('-b-', { b: outcome });

        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error when save task throws error', () => {
        const testTaskData: IdpTaskData = {
            ...mockTaskData,
            classificationConfiguration: mockIdpConfiguration.classification,
            extractionConfiguration: mockIdpConfiguration.extraction,
        };
        const error = new Error('Test Save Error');
        processTaskService.saveTaskData$.mockReturnValue(cold('#', {}, error));

        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Save', taskData: testTaskData }) });
        const outcome = systemActions.taskActionError({ action: 'Save', error });
        const expected = cold('-b-', { b: outcome });

        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error when complete task is unsuccessful', () => {
        const testTaskData: IdpTaskData = {
            ...mockTaskData,
            classificationConfiguration: mockIdpConfiguration.classification,
            extractionConfiguration: mockIdpConfiguration.extraction,
        };
        processTaskService.completeTask$.mockReturnValue(of(false));

        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Complete', taskData: testTaskData }) });
        const outcome = systemActions.taskActionError({ action: 'Complete', error: jasmine.any(String) as any });
        const expected = cold('-b-', { b: outcome });

        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error when complete task throws error', () => {
        const testTaskData: IdpTaskData = {
            ...mockTaskData,
            classificationConfiguration: mockIdpConfiguration.classification,
            extractionConfiguration: mockIdpConfiguration.extraction,
        };
        const error = new Error('Test Complete Error');
        processTaskService.completeTask$.mockReturnValue(cold('#', {}, error));

        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Complete', taskData: testTaskData }) });
        const outcome = systemActions.taskActionError({ action: 'Complete', error });
        const expected = cold('-b-', { b: outcome });

        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error on task prepare update error', () => {
        const error = new Error('Test Task Data Prepare Update Error');
        actions$ = hot('a', { a: systemActions.taskPrepareUpdateError({ taskAction: 'Save', error }) });
        const expected = cold('b', {
            b: systemActions.taskActionError({ error }),
        });
        expect(effects.taskPrepareDataErrorEffect$).toBeObservable(expected);
    });

    it('should trigger task data preparation immediately for Complete action when validation is not running', () => {
        store.overrideSelector(selectIsValidationProcessRunning, false);

        actions$ = hot('a', { a: userActions.taskCompleteWithValidationCheck({}) });
        const expected = cold('b', { b: systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: undefined }) });

        expect(effects.taskCompleteWithValidationCheckEffect$).toBeObservable(expected);
    });

    it('should trigger task data preparation immediately with openNextTask parameter for Complete action when validation is not running ', () => {
        store.overrideSelector(selectIsValidationProcessRunning, false);

        actions$ = hot('a', { a: userActions.taskCompleteWithValidationCheck({ openNextTask: true }) });
        const expected = cold('b', { b: systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: true }) });

        expect(effects.taskCompleteWithValidationCheckEffect$).toBeObservable(expected);
    });

    it('should wait for validation to complete before triggering task data preparation for Complete action when validation is running', fakeAsync(() => {
        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.overrideSelector(selectCanComplete, true);
        store.refreshState();

        const action = userActions.taskCompleteWithValidationCheck({});
        actions$ = of(action);

        let actionEmitted = false;

        const subscription = effects.taskCompleteWithValidationCheckEffect$.subscribe({
            next: (result) => {
                actionEmitted = true;
                expect(result).toEqual(systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: undefined }));
            },
            error: (err) => {
                fail('Effect should not throw error: ' + err);
            },
        });

        setTimeout(() => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.refreshState();
        }, 50);

        tick(49);
        expect(actionEmitted).toBe(false);

        tick(1);
        expect(actionEmitted).toBe(true);
        subscription.unsubscribe();
    }));

    it('should not trigger task data preparation for Complete action when validation completes but canComplete is false', fakeAsync(() => {
        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.overrideSelector(selectCanComplete, false);
        store.refreshState();

        const action = userActions.taskCompleteWithValidationCheck({});
        actions$ = of(action);

        let actionEmitted = false;

        const subscription = effects.taskCompleteWithValidationCheckEffect$.subscribe({
            next: () => {
                actionEmitted = true;
                fail('Should not emit any action when canComplete is false');
            },
            error: (err) => {
                fail('Effect should not throw error: ' + err);
            },
        });

        setTimeout(() => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.refreshState();
        }, 50);

        tick(50);
        expect(actionEmitted).toBe(false);

        tick(100);
        expect(actionEmitted).toBe(false);
        subscription.unsubscribe();
    }));

    it('should pass openNextTask parameter through for Complete action when validation completes', fakeAsync(() => {
        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.overrideSelector(selectCanComplete, true);
        store.refreshState();

        const action = userActions.taskCompleteWithValidationCheck({ openNextTask: true });
        actions$ = of(action);

        let actionEmitted = false;
        let emittedAction: Action | undefined;

        const subscription = effects.taskCompleteWithValidationCheckEffect$.subscribe({
            next: (result) => {
                actionEmitted = true;
                emittedAction = result;
            },
            error: (err) => {
                fail('Effect should not throw error: ' + err);
            },
        });

        setTimeout(() => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.refreshState();
        }, 50);

        tick(49);
        expect(actionEmitted).toBe(false);

        tick(1);
        expect(actionEmitted).toBe(true);
        expect(emittedAction).toEqual(systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: true }));
        subscription.unsubscribe();
    }));

    it('should ignore subsequent Complete actions while first one is processing', fakeAsync(() => {
        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.overrideSelector(selectCanComplete, true);
        store.refreshState();

        const action1 = userActions.taskCompleteWithValidationCheck({});
        const action2 = userActions.taskCompleteWithValidationCheck({});
        const action3 = userActions.taskCompleteWithValidationCheck({});

        actions$ = of(action1, action2, action3);

        const emittedActions: any[] = [];

        const subscription = effects.taskCompleteWithValidationCheckEffect$.subscribe({
            next: (result) => {
                emittedActions.push(result);
            },
            error: (err) => {
                fail('Effect should not error: ' + err);
            },
        });

        setTimeout(() => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.refreshState();
        }, 50);

        tick(49);
        expect(emittedActions.length).toBe(0);

        tick(1);
        expect(emittedActions.length).toBe(1);

        tick(100);
        expect(emittedActions.length).toBe(1);
        expect(emittedActions[0]).toEqual(systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: undefined }));
        subscription.unsubscribe();
    }));

    describe('taskInitialize', () => {
        it('should emit taskClaim from initializeTaskEffect$ when task can be claimed', () => {
            const taskClaimPermissions = { canClaimTask: true, canUnclaimTask: false };

            actions$ = hot('a', { a: systemActions.taskInitialize({ taskContext, taskClaimPermissions }) });
            const expected = cold('b', { b: systemActions.taskClaim() });

            expect(effects.initializeTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskInitializeSuccess from initializeTaskEffect$ when task is assigned', () => {
            const taskClaimPermissions = { canClaimTask: false, canUnclaimTask: true };

            actions$ = hot('       a', { a: systemActions.taskInitialize({ taskContext, taskClaimPermissions }) });
            const expected = cold('b', {
                b: systemActions.taskInitializeSuccess({ taskAssignmentContext: { ...taskAssignmentContext, ...taskClaimPermissions } }),
            });

            expect(effects.initializeTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskInitializeError from initializeTaskEffect$ when unassigned task cannot be claimed', () => {
            const taskClaimPermissions = { canClaimTask: false, canUnclaimTask: true };

            processTaskService.getTaskAssignmentContext$.mockReturnValue(
                of({ ...taskAssignmentContext, ...taskClaimPermissions, assignee: undefined })
            );

            actions$ = hot('a', { a: systemActions.taskInitialize({ taskContext, taskClaimPermissions }) });
            const expected = cold('b', { b: systemActions.taskInitializeError({ error: jasmine.any(String) as any }) });

            expect(effects.initializeTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskInitializeError from initializeTaskEffect$ when getTaskAssignmentContext$ throws an error', () => {
            const taskClaimPermissions = { canClaimTask: false, canUnclaimTask: false };
            processTaskService.getTaskAssignmentContext$.mockReturnValue(cold('#', {}, new Error('Get Task Assignment Context Error')));

            actions$ = hot('a', { a: systemActions.taskInitialize({ taskContext, taskClaimPermissions }) });
            const expected = cold('b', { b: systemActions.taskInitializeError({ error: jasmine.any(String) as any }) });

            expect(effects.initializeTaskEffect$).toBeObservable(expected);
        });
    });

    describe('taskInitializeSuccess', () => {
        it('should emit screenLoad from initializeTaskSuccessScreenLoadEffect$ when taskInitializeSuccess is dispatched', () => {
            actions$ = hot('a', { a: systemActions.taskInitializeSuccess({ taskAssignmentContext }) });
            const expected = cold('b', { b: systemActions.screenLoad() });

            expect(effects.initializeTaskSuccessScreenLoadEffect$).toBeObservable(expected);
        });
    });

    describe('taskInitializeError', () => {
        it('should emit notificationShow from initializeTaskErrorNotificationEffect$ when taskInitializeError is dispatched with string error', () => {
            const error = 'Task Initialize Error';
            actions$ = hot('a', { a: systemActions.taskInitializeError({ error }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: error }),
            });

            expect(effects.initializeTaskErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from initializeTaskErrorNotificationEffect$ when taskInitializeError is dispatched with Error object', () => {
            const error = new Error('Task Initialize Error');
            actions$ = hot('a', { a: systemActions.taskInitializeError({ error }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: jasmine.stringMatching(/.+\.SCREEN_INIT_ERROR/) as any }),
            });

            expect(effects.initializeTaskErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit taskActionSuccess(Cancel) from initializeTaskErrorCancelTaskEffect$ when taskInitializeError is dispatched', () => {
            const error = new Error('Task Initialize Error');
            actions$ = hot('a', { a: systemActions.taskInitializeError({ error }) });
            const expected = cold('b', { b: systemActions.taskActionSuccess({ action: 'Cancel' }) });

            expect(effects.initializeTaskErrorCancelTaskEffect$).toBeObservable(expected);
        });
    });

    describe('taskClaim', () => {
        it('should emit taskClaimSuccess from claimTaskEffect$ when task is claimed successfully', () => {
            actions$ = hot('       a', { a: systemActions.taskClaim() });
            const expected = cold('b', { b: systemActions.taskClaimSuccess({ taskAssignmentContext }) });

            expect(effects.claimTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskClaimError from claimTaskEffect$ when claimTask$ throws an error', () => {
            const error = new Error('Claim Error');
            processTaskService.claimTask$.mockReturnValue(cold('#', {}, error));

            actions$ = hot('       a', { a: systemActions.taskClaim() });
            const expected = cold('b', { b: systemActions.taskClaimError({ error }) });

            expect(effects.claimTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskClaimError from claimTaskEffect$ when getTaskAssignmentContext$ throws an error', () => {
            const error = new Error('Claim Error');
            processTaskService.getTaskAssignmentContext$.mockReturnValue(cold('#', {}, error));

            actions$ = hot('       a', { a: systemActions.taskClaim() });
            const expected = cold('b', { b: systemActions.taskClaimError({ error }) });

            expect(effects.claimTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskClaimError from claimTaskEffect$ when canClaimTask is false', () => {
            store.overrideSelector(selectTaskAssignmentContext, { ...taskAssignmentContext, canClaimTask: false });

            actions$ = hot('       a', { a: systemActions.taskClaim() });
            const expected = cold('b', { b: systemActions.taskClaimError({ error: jasmine.any(String) as any }) });

            expect(effects.claimTaskEffect$).toBeObservable(expected);
        });
    });

    describe('taskClaimSuccess', () => {
        it('should emit screenLoad from taskClaimSuccessLoadScreenEffect$ when taskClaimSuccess is dispatched', () => {
            actions$ = hot('a', { a: systemActions.taskClaimSuccess({ taskAssignmentContext }) });
            const expected = cold('b', { b: systemActions.screenLoad() });
            expect(effects.taskClaimSuccessLoadScreenEffect$).toBeObservable(expected);
        });
    });

    describe('taskClaimError', () => {
        it('should emit taskActionError and taskActionSuccess(Cancel) from claimError effects when taskClaimError is dispatched', () => {
            const error = new Error('Test Claim Error');

            const combined$ = merge(effects.broadcastTaskClaimErrorEffect$, effects.taskClaimErrorCancelTaskEffect$);

            actions$ = hot('          a', { a: systemActions.taskClaimError({ error }) });
            const expected = cold('(bc)', {
                b: systemActions.taskActionError({ error, action: 'Claim' }),
                c: systemActions.taskActionSuccess({ action: 'Cancel' }),
            });

            expect(combined$).toBeObservable(expected);
        });
    });

    describe('taskUnclaim', () => {
        it('should emit taskUnclaimSuccess from unclaimTaskEffect$ when task is unclaimed successfully', () => {
            store.overrideSelector(selectTaskAssignmentContext, { ...taskAssignmentContext, canUnclaimTask: true });

            actions$ = hot('       a', { a: userActions.taskUnclaim() });
            const expected = cold('b', { b: userActions.taskUnclaimSuccess({ taskAssignmentContext }) });

            expect(effects.unclaimTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskUnclaimError from unclaimTaskEffect$ when unclaimTask$ throws an error', () => {
            store.overrideSelector(selectTaskAssignmentContext, { ...taskAssignmentContext, canUnclaimTask: true });

            const error = new Error('Unclaim Error');
            processTaskService.unclaimTask$.mockReturnValue(cold('#', {}, error));

            actions$ = hot('       a', { a: userActions.taskUnclaim() });
            const expected = cold('b', { b: userActions.taskUnclaimError({ error }) });

            expect(effects.unclaimTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskUnclaimError from unclaimTaskEffect$ when getTaskAssignmentContext$ throws an error', () => {
            store.overrideSelector(selectTaskAssignmentContext, { ...taskAssignmentContext, canUnclaimTask: true });

            const error = new Error('Unclaim Error');
            processTaskService.getTaskAssignmentContext$.mockReturnValue(cold('#', {}, error));

            actions$ = hot('       a', { a: userActions.taskUnclaim() });
            const expected = cold('b', { b: userActions.taskUnclaimError({ error }) });

            expect(effects.unclaimTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskUnclaimError from unclaimTaskEffect$ when canUnclaimTask is false', () => {
            store.overrideSelector(selectTaskAssignmentContext, { ...taskAssignmentContext, canUnclaimTask: false });

            actions$ = hot('       a', { a: userActions.taskUnclaim() });
            const expected = cold('b', { b: userActions.taskUnclaimError({ error: jasmine.any(String) as any }) });

            expect(effects.unclaimTaskEffect$).toBeObservable(expected);
        });
    });

    describe('taskUnclaimSuccess', () => {
        it('should emit taskActionSuccess(Unclaim) from broadcastUnclaimTaskSuccessEffect$ when taskUnclaimSuccess is dispatched', () => {
            actions$ = hot('a', { a: userActions.taskUnclaimSuccess({ taskAssignmentContext }) });
            const expected = cold('b', { b: systemActions.taskActionSuccess({ action: 'Unclaim' }) });
            expect(effects.broadcastUnclaimTaskSuccessEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from unclaimTaskSuccessNotificationEffect$ when taskUnclaimSuccess is dispatched', () => {
            actions$ = hot('a', { a: userActions.taskUnclaimSuccess({ taskAssignmentContext }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'info', message: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_UNCLAIM_SUCCESS' }),
            });
            expect(effects.unclaimTaskSuccessNotificationEffect$).toBeObservable(expected);
        });

        it('should emit taskActionSuccess(Cancel) from taskUnclaimSuccessCancelTaskEffect$ when taskUnclaimSuccess is dispatched', () => {
            actions$ = hot('a', { a: userActions.taskUnclaimSuccess({ taskAssignmentContext }) });
            const expected = cold('b', { b: systemActions.taskActionSuccess({ action: 'Cancel' }) });
            expect(effects.taskUnclaimSuccessCancelTaskEffect$).toBeObservable(expected);
        });
    });

    describe('taskUnclaimError', () => {
        it('should emit taskActionError(Unclaim) from broadcastUnclaimTaskErrorEffect$ when taskUnclaimError is dispatched', () => {
            const error = new Error('Unclaim Error');
            actions$ = hot('       a', { a: userActions.taskUnclaimError({ error }) });
            const expected = cold('b', { b: systemActions.taskActionError({ error, action: 'Unclaim' }) });
            expect(effects.broadcastUnclaimTaskErrorEffect$).toBeObservable(expected);
        });
    });

    describe('taskActionError', () => {
        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched without action', () => {
            const error = new Error('Test Error');
            actions$ = hot('a', { a: systemActions.taskActionError({ error }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_ACTION_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched with Save action', () => {
            actions$ = hot('a', { a: systemActions.taskActionError({ error: 'err', action: 'Save' }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_SAVE_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched with Complete action', () => {
            actions$ = hot('a', { a: systemActions.taskActionError({ error: 'err', action: 'Complete' }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_COMPLETE_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched with Claim action', () => {
            const error = new Error('Claim Error');
            actions$ = hot('       a', { a: systemActions.taskActionError({ error, action: 'Claim' }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_CLAIM_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched with Unclaim action', () => {
            const error = new Error('Unclaim Error');
            actions$ = hot('       a', { a: systemActions.taskActionError({ error, action: 'Unclaim' }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'EXTRACTION.VERIFICATION.NOTIFICATIONS.TASK_UNCLAIM_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
        });
    });

    describe('taskActionSuccess', () => {
        it('should emit taskActionSuccess(Cancel) from cancelTaskEffect$ when taskCancel is dispatched', () => {
            actions$ = hot('a', { a: userActions.taskCancel() });
            const expected = cold('b', { b: systemActions.taskActionSuccess({ action: 'Cancel' }) });
            expect(effects.cancelTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskActionSuccess(Claim) from broadcastTaskClaimSuccessActionEffect$ when taskClaimSuccess is dispatched', () => {
            actions$ = hot('a', { a: systemActions.taskClaimSuccess({ taskAssignmentContext }) });
            const expected = cold('b', { b: systemActions.taskActionSuccess({ action: 'Claim' }) });
            expect(effects.broadcastTaskClaimSuccessActionEffect$).toBeObservable(expected);
        });
    });
});

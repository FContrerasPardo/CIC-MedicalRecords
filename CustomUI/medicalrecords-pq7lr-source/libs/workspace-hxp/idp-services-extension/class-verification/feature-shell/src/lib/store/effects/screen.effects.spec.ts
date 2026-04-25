/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { merge, Observable, of } from 'rxjs';
import { ScreenEffects } from './screen.effects';
import { systemActions, userActions } from '../actions/class-verification.actions';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { mockIdpRejectReasons } from '../../models/mocked/mocked-reject-reasons';
import { hot, cold, getTestScheduler } from 'jasmine-marbles';
import {
    ContentFileReference,
    IdpBackendService,
    IdpConfiguration,
    IdpFileMetadata,
    ProcessTaskBackendService,
    TaskAssignmentContext,
    TaskContext,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { NotificationService } from '@alfresco/adf-core';
import { IdpTaskData } from '../../models/screen-models';
import { selectTaskInfo, selectTaskAssignmentContext } from '../selectors/screen.selectors';
import { Clipboard } from '@angular/cdk/clipboard';

describe('Screen Effect', () => {
    let actions$: Observable<any>;
    let effects: ScreenEffects;
    let store: MockStore;
    let processTaskService: jasmine.SpyObj<ProcessTaskBackendService>;

    const mockTaskData = {
        rejectReasons: mockIdpRejectReasons(),
        batchState: {
            documents: [{ id: 'd1', name: 'doc1', pages: [{ contentFileReferenceIndex: 0, sourcePageIndex: 0, height: 1000, width: 800 }] }],
            contentFileReferences: [{ sys_id: 'cf1' }],
        },
        sys_task_assignee: 'user1',
        targetFolder: undefined,
    };

    const mockIdpConfiguration: IdpConfiguration = {
        classification: {
            classificationConfidenceThreshold: 0.5,
            documentClassDefinitions: [
                {
                    id: 'payslips',
                    name: 'Payslips',
                    description: 'You guessed it! Payslips!',
                },
            ],
        },
        extraction: {
            fieldDefinitionsByClass: [],
        },
    };

    const taskContext: TaskContext = {
        appName: 'test-app',
        taskId: '123',
        taskName: 'ClassifyDocs',
        rootProcessInstanceId: 'root-1',
    };

    const taskAssignmentContext: TaskAssignmentContext = {
        assignee: 'user1',
        candidateGroups: ['group1'],
        candidateUsers: ['user1', 'user2'],
        canClaimTask: true,
        canUnclaimTask: false,
    };

    const fileMetaData: IdpFileMetadata = {
        status: 'Processing',
        pageCount: 2,
        pages: [
            {
                pageIndex: 0,
                imageWidth: 600,
                imageHeight: 800,
                rotation: 0,
                skew: 0,
            },
            {
                pageIndex: 1,
                imageWidth: 600,
                imageHeight: 800,
                rotation: 0,
                skew: 0,
            },
        ],
    };

    const idpBackendSpy = jasmine.createSpyObj(
        'IdpBackendService',
        {
            getFileMetadata$: of(fileMetaData),
        },
        {}
    );

    const notificationSpy = jasmine.createSpyObj(
        'NotificationService',
        {
            showError: {},
            showWarning: {},
            showInfo: {},
        },
        {}
    );

    const clipboardSpy = jasmine.createSpyObj('Clipboard', ['copy']);

    beforeEach(() => {
        processTaskService = jasmine.createSpyObj(
            'ProcessTaskBackendService',
            {
                getTaskInputData$: of(mockTaskData),
                getIdpConfiguration$: of(mockIdpConfiguration),
                completeTask$: of({}),
                saveTaskData$: of({}),
                claimTask$: of(true),
                unclaimTask$: of(true),
                getTaskAssignmentContext$: of(taskAssignmentContext),
            },
            {}
        );

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
                { provide: IdpBackendService, useValue: idpBackendSpy },
                { provide: NotificationService, useValue: notificationSpy },
                { provide: ProcessTaskBackendService, useValue: processTaskService },
                { provide: Clipboard, useValue: clipboardSpy },
            ],
        });

        effects = TestBed.inject(ScreenEffects);
        store = TestBed.inject(MockStore);
    });

    afterEach(() => {
        store.resetSelectors();
    });

    it('should fetch task input and task configuration on screen load', () => {
        const expectedTaskData = { ...mockTaskData, configuration: mockIdpConfiguration.classification };
        const action = systemActions.screenLoad();
        const outcome = systemActions.screenLoadSuccess({ taskData: expectedTaskData });
        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.loadScreenEffect$).toBeObservable(expected);
    });

    describe('should throw error on screen load when task input has no content files and batch state has no content files', () => {
        const cases = [
            { inputContents: [], batchContents: [] },
            { inputContents: undefined, batchContents: [] },
            { inputContents: [], batchContents: undefined },
            { inputContents: undefined, batchContents: undefined },
        ];

        for (const { inputContents, batchContents } of cases) {
            it(`should handle inputContents: ${emptyToString(inputContents)} and batchContents: ${emptyToString(batchContents)}`, () => {
                const mockTaskDataWithoutContents = {
                    ...mockTaskData,
                    batchState: {
                        ...mockTaskData.batchState,
                        contentFileReferences: batchContents,
                    },
                    contents: inputContents,
                };

                processTaskService.getTaskInputData$.and.returnValue(of(mockTaskDataWithoutContents));
                const action = systemActions.screenLoad();
                const outcome = systemActions.screenLoadError({ error: jasmine.stringMatching(/.+/) as any });
                actions$ = hot('       -a-', { a: action });
                const expected = cold('-b-', { b: outcome });
                expect(expected).toBeTruthy();
                expect(effects.loadScreenEffect$).toBeObservable(expected);
            });
        }

        function emptyToString(contents: ContentFileReference[] | undefined): string {
            return contents === undefined ? 'undefined' : '[]';
        }
    });

    describe('should throw error on screen load when task input has content files but batch state has no content files and there are no valid documents', () => {
        function buildTitle(inputContentsString: string, batchContentsString: string, documentsString: string): string {
            return `should handle input contents ${inputContentsString}, batch state contents ${batchContentsString} and documents: ${documentsString}`;
        }

        const cases = [
            {
                title: buildTitle('[1]', '[]', '[]'),
                inputContents: [{ sys_id: 'cf1' }],
                batchContents: [],
                documents: [],
            },
            {
                title: buildTitle('[1]', 'undefined', '[]'),
                inputContents: [{ sys_id: 'cf1' }],
                batchContents: undefined,
                documents: [],
            },
            {
                title: buildTitle('[2]', '[]', '[]'),
                inputContents: [{ sys_id: 'cf1' }, { sys_id: 'cf2' }],
                batchContents: [],
                documents: [],
            },
            {
                title: buildTitle('[1]', 'undefined', 'undefined'),
                inputContents: [{ sys_id: 'cf1' }],
                batchContents: undefined,
                documents: undefined,
            },
            {
                title: buildTitle('[1]', 'undefined', 'pages []'),
                inputContents: [{ sys_id: 'cf1' }],
                batchContents: undefined,
                documents: [{ id: 'd1', name: 'doc1', pages: [] }],
            },
            {
                title: buildTitle('[1]', 'undefined', 'pages undefined'),
                inputContents: [{ sys_id: 'cf1' }],
                batchContents: undefined,
                documents: [{ id: 'd1', name: 'doc1', pages: undefined }],
            },
            {
                title: buildTitle('[1]', 'undefined', 'deleted'),
                inputContents: [{ sys_id: 'cf1' }],
                batchContents: undefined,
                documents: [{ id: 'd1', name: 'doc1', markAsDeleted: true, pages: [{ contentFileReferenceIndex: 0, sourcePageIndex: 0 }] }],
            },
        ];

        for (const { title, inputContents, batchContents, documents } of cases) {
            it(title, () => {
                const taskDataWithContents = {
                    ...mockTaskData,
                    batchState: {
                        ...mockTaskData.batchState,
                        documents,
                        contentFileReferences: batchContents,
                    },
                    contents: inputContents,
                };

                processTaskService.getTaskInputData$.and.returnValue(of(taskDataWithContents));
                const action = systemActions.screenLoad();
                const outcome = systemActions.screenLoadError({ error: jasmine.stringMatching(/.+/) as any });
                actions$ = hot('       -a-', { a: action });
                const expected = cold('-b-', { b: outcome });
                expect(expected).toBeTruthy();
                expect(effects.loadScreenEffect$).toBeObservable(expected);
            });
        }
    });

    it('should emit screen load error action when task input data retrieval fails', () => {
        const error = new Error('Error fetching task data');
        processTaskService.getTaskInputData$.and.returnValue(cold('#', {}, error));
        const action = systemActions.screenLoad();
        const outcome = systemActions.screenLoadError({ error });
        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.loadScreenEffect$).toBeObservable(expected);
    });

    it('should emit screen load error action when task configuration retrieval fails', () => {
        const error = new Error('Error fetching task configuration');
        processTaskService.getIdpConfiguration$.and.returnValue(cold('#', {}, error));
        const action = systemActions.screenLoad();
        const outcome = systemActions.screenLoadError({ error });
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

    it('should trigger task data preparation when task save action emits', () => {
        actions$ = hot('a', { a: userActions.taskSave() });
        const expected = cold('b', { b: systemActions.taskPrepareUpdate({ taskAction: 'Save' }) });
        expect(effects.saveTaskPrepareDataEffect$).toBeObservable(expected);
    });

    it('should trigger task data preparation when task complete action emits', () => {
        actions$ = hot('a', { a: userActions.taskComplete({}) });
        const expected = cold('b', { b: systemActions.taskPrepareUpdate({ taskAction: 'Complete', openNextTask: undefined }) });
        expect(effects.completeTaskPrepareDataEffect$).toBeObservable(expected);
    });

    it('should make api call to save task when prepare update action emits with save action', () => {
        const testTaskData: IdpTaskData = { ...mockTaskData, configuration: mockIdpConfiguration.classification };
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
        const testTaskData: IdpTaskData = { ...mockTaskData, configuration: mockIdpConfiguration.classification };
        const outcome = systemActions.taskActionSuccess({ action: 'Complete', openNextTask: undefined });
        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Complete', taskData: testTaskData }) });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.taskActionEffect$).toBeObservable(expected);
        expect(processTaskService.completeTask$).toHaveBeenCalledWith(taskContext.appName, taskContext.taskId, {
            batchState: testTaskData.batchState,
            sys_task_assignee: testTaskData.sys_task_assignee,
        });
    });

    it('should emit task action error when prepare update action emits neither save or complete action', () => {
        const testTaskData: IdpTaskData = { ...mockTaskData, configuration: mockIdpConfiguration.classification };
        const outcome = systemActions.taskActionError({ error: new Error('Unknown task action') });
        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Cancel', taskData: testTaskData }) });
        const expected = cold('-b-', { b: outcome });
        expect(expected).toBeTruthy();
        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error when save task is unsuccessful', () => {
        const testTaskData: IdpTaskData = { ...mockTaskData, configuration: mockIdpConfiguration.classification };

        processTaskService.saveTaskData$.and.returnValue(of(false));

        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Save', taskData: testTaskData }) });
        const outcome = systemActions.taskActionError({ action: 'Save', error: jasmine.any(String) as any });
        const expected = cold('-b-', { b: outcome });

        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error when save task throws error', () => {
        const testTaskData: IdpTaskData = { ...mockTaskData, configuration: mockIdpConfiguration.classification };

        const error = new Error('Test Save Error');
        processTaskService.saveTaskData$.and.returnValue(cold('#', {}, error));

        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Save', taskData: testTaskData }) });
        const outcome = systemActions.taskActionError({ action: 'Save', error });
        const expected = cold('-b-', { b: outcome });

        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error when complete task is unsuccessful', () => {
        const testTaskData: IdpTaskData = { ...mockTaskData, configuration: mockIdpConfiguration.classification };

        processTaskService.completeTask$.and.returnValue(of(false));

        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Complete', taskData: testTaskData }) });
        const outcome = systemActions.taskActionError({ action: 'Complete', error: jasmine.any(String) as any });
        const expected = cold('-b-', { b: outcome });

        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error when complete task throws error', () => {
        const testTaskData: IdpTaskData = { ...mockTaskData, configuration: mockIdpConfiguration.classification };

        const error = new Error('Test Complete Error');
        processTaskService.completeTask$.and.returnValue(cold('#', {}, error));

        actions$ = hot('       -a-', { a: systemActions.taskPrepareUpdateSuccess({ taskAction: 'Complete', taskData: testTaskData }) });
        const outcome = systemActions.taskActionError({ action: 'Complete', error });
        const expected = cold('-b-', { b: outcome });

        expect(effects.taskActionEffect$).toBeObservable(expected);
    });

    it('should dispatch notificationShow and taskActionSuccess(Cancel) on taskClaimError', () => {
        const ogConsoleError = console.error;
        console.error = () => {};

        const error = new Error('Test Claim Error');

        const combined$ = merge(effects.screenLoadErrorNotificationEffect$, effects.screenLoadErrorTaskCancelEffect$);

        actions$ = hot('          a', { a: systemActions.screenLoadError({ error }) });
        const expected = cold('(bc)', {
            b: systemActions.notificationShow({ severity: 'error', message: error.message }),
            c: systemActions.taskActionSuccess({ action: 'Cancel' }),
        });

        expect(combined$).toBeObservable(expected);

        console.error = ogConsoleError;
    });

    it('should parse task input target folder on screen load', () => {
        const action = systemActions.screenLoad();
        const outcome = systemActions.screenLoadSuccess({
            taskData: jasmine.objectContaining({ targetFolder: '/test-folder-1/test-folder-2/test-folder-3' }) as any,
        });
        actions$ = hot('       -a-', { a: action });
        const expected = cold('-b-', { b: outcome });

        processTaskService.getTaskInputData$.and.returnValue(of({ ...mockTaskData, targetFolder: 'test-folder-1\\test-folder-2\\test-folder-3 ' }));

        expect(effects.loadScreenEffect$).toBeObservable(expected);
    });

    it('should copy document id to clipboard when copyDocumentIdToClipboard action emits', () => {
        const documentId = 'document-1';
        actions$ = hot('a', { a: userActions.copyDocumentDetailsToClipboard({ documentId }) });

        const expected = cold('b', {
            b: systemActions.copyDocumentDetailsToClipboardSuccess({ documentId }),
        });

        expect(effects.copyDocumentDetailsToClipboardEffect$).toBeObservable(expected);

        getTestScheduler().flush();

        expect(clipboardSpy.copy).toHaveBeenCalledWith(`${documentId}\n\r${taskContext.appName}\n\r${taskContext.rootProcessInstanceId}`);
    });

    it('should show notification when copyDocumentIdToClipboardSuccess action emits', () => {
        actions$ = hot('a', { a: systemActions.copyDocumentDetailsToClipboardSuccess({ documentId: 'document-1' }) });

        const expected = cold('b', {
            b: systemActions.notificationShow({
                severity: 'info',
                message: jasmine.any(String) as any,
                messageArgs: { documentId: 'document-1', appName: taskContext.appName, rootProcessInstanceId: taskContext.rootProcessInstanceId },
            }),
        });

        expect(effects.copyDocumentDetailsToClipboardNotificationEffect$).toBeObservable(expected);
    });

    it('should dispatch task action error on task prepare update error', () => {
        const error = new Error('Test Task Data Prepare Update Error');
        actions$ = hot('a', { a: systemActions.taskPrepareUpdateError({ taskAction: 'Save', error }) });
        const expected = cold('b', {
            b: systemActions.taskActionError({ error }),
        });
        expect(effects.taskPrepareDataErrorEffect$).toBeObservable(expected);
    });

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

            processTaskService.getTaskAssignmentContext$.and.returnValue(
                of({ ...taskAssignmentContext, ...taskClaimPermissions, assignee: undefined })
            );

            actions$ = hot('a', { a: systemActions.taskInitialize({ taskContext, taskClaimPermissions }) });
            const expected = cold('b', { b: systemActions.taskInitializeError({ error: jasmine.any(String) as any }) });

            expect(effects.initializeTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskInitializeError from initializeTaskEffect$ when getTaskAssignmentContext$ throws an error', () => {
            const taskClaimPermissions = { canClaimTask: false, canUnclaimTask: false };
            processTaskService.getTaskAssignmentContext$.and.returnValue(cold('#', {}, new Error('Get Task Assignment Context Error')));

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
            processTaskService.claimTask$.and.returnValue(cold('#', {}, error));

            actions$ = hot('       a', { a: systemActions.taskClaim() });
            const expected = cold('b', { b: systemActions.taskClaimError({ error }) });

            expect(effects.claimTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskClaimError from claimTaskEffect$ when getTaskAssignmentContext$ throws an error', () => {
            const error = new Error('Claim Error');
            processTaskService.getTaskAssignmentContext$.and.returnValue(cold('#', {}, error));

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
            const ogConsoleError = console.error;
            console.error = () => {};

            const error = new Error('Test Claim Error');

            const combined$ = merge(effects.broadcastTaskClaimErrorEffect$, effects.taskClaimErrorCancelTaskEffect$);

            actions$ = hot('          a', { a: systemActions.taskClaimError({ error }) });
            const expected = cold('(bc)', {
                b: systemActions.taskActionError({ error, action: 'Claim' }),
                c: systemActions.taskActionSuccess({ action: 'Cancel' }),
            });

            expect(combined$).toBeObservable(expected);

            console.error = ogConsoleError;
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
            processTaskService.unclaimTask$.and.returnValue(cold('#', {}, error));

            actions$ = hot('       a', { a: userActions.taskUnclaim() });
            const expected = cold('b', { b: userActions.taskUnclaimError({ error }) });

            expect(effects.unclaimTaskEffect$).toBeObservable(expected);
        });

        it('should emit taskUnclaimError from unclaimTaskEffect$ when getTaskAssignmentContext$ throws an error', () => {
            store.overrideSelector(selectTaskAssignmentContext, { ...taskAssignmentContext, canUnclaimTask: true });

            const error = new Error('Unclaim Error');
            processTaskService.getTaskAssignmentContext$.and.returnValue(cold('#', {}, error));

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
            const ogConsoleError = console.error;
            console.error = () => {};

            const error = new Error('Unclaim Error');
            actions$ = hot('       a', { a: userActions.taskUnclaimError({ error }) });
            const expected = cold('b', { b: systemActions.taskActionError({ error, action: 'Unclaim' }) });
            expect(effects.broadcastUnclaimTaskErrorEffect$).toBeObservable(expected);

            console.error = ogConsoleError;
        });
    });

    describe('taskActionError', () => {
        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched without action', () => {
            const error = new Error('Test Error');
            actions$ = hot('a', { a: systemActions.taskActionError({ error }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_ACTION_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched with Save action', () => {
            actions$ = hot('a', { a: systemActions.taskActionError({ error: 'err', action: 'Save' }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_SAVE_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched with Complete action', () => {
            actions$ = hot('a', { a: systemActions.taskActionError({ error: 'err', action: 'Complete' }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_COMPLETE_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);
        });

        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched with Claim action', () => {
            const ogConsoleError = console.error;
            console.error = () => {};

            const error = new Error('Claim Error');
            actions$ = hot('       a', { a: systemActions.taskActionError({ error, action: 'Claim' }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_CLAIM_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);

            console.error = ogConsoleError;
        });

        it('should emit notificationShow from taskActionErrorNotificationEffect$ when taskActionError is dispatched with Unclaim action', () => {
            const ogConsoleError = console.error;
            console.error = () => {};

            const error = new Error('Unclaim Error');
            actions$ = hot('       a', { a: systemActions.taskActionError({ error, action: 'Unclaim' }) });
            const expected = cold('b', {
                b: systemActions.notificationShow({ severity: 'error', message: 'IDP_CLASS_VERIFICATION.NOTIFICATIONS.TASK_UNCLAIM_ERROR' }),
            });
            expect(effects.taskActionErrorNotificationEffect$).toBeObservable(expected);

            console.error = ogConsoleError;
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

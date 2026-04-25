/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FieldVerificationContextTaskService } from './field-verification-context-task.service';
import { systemActions, userActions } from '../../store/actions/field-verification.actions';
import { TaskAssignmentContext, TaskClaimPermissions, TaskContext } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { Action } from '@ngrx/store';
import { Subject, take } from 'rxjs';
import { provideMockActions } from '@ngrx/effects/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { selectTaskAssignmentContext, selectTaskInfo } from '../../store/selectors/screen.selectors';
import { selectFieldsWithIssue } from '../../store/selectors/document-field.selectors';
import { selectDocument } from '../../store/selectors/document.selectors';

describe('FieldVerificationContextTaskService', () => {
    let service: FieldVerificationContextTaskService;
    let store: MockStore;

    const triggerAction$ = new Subject<Action>();
    const actions$ = triggerAction$.asObservable();

    const taskContext: TaskContext = {
        appName: 'testApp',
        taskId: '1',
        taskName: 'Test Task',
        rootProcessInstanceId: '123456',
    };

    const taskClaimPermissions: TaskClaimPermissions = {
        canClaimTask: true,
        canUnclaimTask: false,
    };

    const taskAssignmentContext: TaskAssignmentContext = {
        assignee: 'user1',
        candidateGroups: ['group1', 'group2'],
        candidateUsers: ['user1', 'user2'],
        ...taskClaimPermissions,
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [
                FieldVerificationContextTaskService,
                provideMockStore({
                    selectors: [
                        { selector: selectFieldsWithIssue, value: [] },
                        {
                            selector: selectDocument,
                            value: {
                                class: {},
                                pages: [],
                            },
                        },
                        { selector: selectTaskInfo, value: taskContext },
                        { selector: selectTaskAssignmentContext, value: taskAssignmentContext },
                    ],
                }),
                provideMockActions(() => actions$),
            ],
        });

        service = TestBed.inject(FieldVerificationContextTaskService);
        store = TestBed.inject(MockStore);
        spyOn(store, 'dispatch');
    });

    it('should initialize the screen', () => {
        service.initialize(taskContext, taskClaimPermissions);
        expect(store.dispatch).toHaveBeenCalledWith(systemActions.taskInitialize({ taskContext, taskClaimPermissions }));
    });

    it('should dispatch saveTask action', () => {
        service.saveTask();
        expect(store.dispatch).toHaveBeenCalledWith(userActions.taskSave());
    });

    it('should dispatch taskCompleteWithValidationCheck action', () => {
        service.completeTask();
        expect(store.dispatch).toHaveBeenCalledWith(userActions.taskCompleteWithValidationCheck({ openNextTask: undefined }));
    });

    it('should dispatch taskCompleteWithValidationCheck action and pass boolean', () => {
        const openNextTask = true;
        service.completeTask(openNextTask);
        expect(store.dispatch).toHaveBeenCalledWith(userActions.taskCompleteWithValidationCheck({ openNextTask: openNextTask }));
    });

    it('should dispatch cancelTask action', () => {
        service.cancelTask();
        expect(store.dispatch).toHaveBeenCalledWith(userActions.taskCancel());
    });

    it('should dispatch unclaimTask action', () => {
        service.unclaimTask();
        expect(store.dispatch).toHaveBeenCalledWith(userActions.taskUnclaim());
    });

    it('should reset the screen state', () => {
        service.reset();
        expect(store.dispatch).toHaveBeenCalledWith(systemActions.screenStateReset());
    });

    it('should emit taskAction$ when taskActionSuccess emits', () => {
        service.taskAction$.pipe(take(1)).subscribe((taskAction) => {
            expect(taskAction).toEqual({ action: 'Save', openNextTask: undefined });
        });

        triggerAction$.next(systemActions.taskActionSuccess({ action: 'Save' }));
    });

    it('should emit taskAction$ error when taskActionError emits', () => {
        service.taskAction$.pipe(take(1)).subscribe((taskAction) => {
            expect(taskAction).toEqual({ action: 'Error', openNextTask: false });
        });

        triggerAction$.next(systemActions.taskActionError({ error: 'Error' }));
    });

    it('should set default task name when task name is empty string', fakeAsync(() => {
        testTaskName('', 'EXTRACTION.VERIFICATION.TASK_HEADER.TASK_NAME_VALUE');
    }));

    it('should set actual task name when task name is false', fakeAsync(() => {
        testTaskName('false', 'false');
    }));

    it('should set actual task name when task name is zero', fakeAsync(() => {
        testTaskName('0', '0');
    }));

    it('should set actual task name when task name is random', fakeAsync(() => {
        testTaskName('Random string with space ', 'Random string with space');
    }));

    const testTaskName = (taskName: string, expectedHeaderTaskName: string) => {
        let actualTaskInfo: any = {};
        store.overrideSelector(selectTaskInfo, { ...taskContext, taskName: taskName });
        store.refreshState();

        service.taskInfo$.subscribe((taskInfo) => {
            actualTaskInfo = taskInfo;
        });

        tick(1000);

        const taskNameProp = [...actualTaskInfo.props].find((p) => p.label === 'EXTRACTION.VERIFICATION.TASK_HEADER.TASK_NAME');
        expect(taskNameProp.value).toBe(expectedHeaderTaskName);
    };
});

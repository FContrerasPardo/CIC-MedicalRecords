/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DestroyRef, inject, Injectable } from '@angular/core';
import { combineLatest, merge, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
    selectCanComplete,
    selectCanSave,
    selectCanUnclaim,
    selectUnclaimEnabled,
    selectRejectReasons,
    selectScreenReady,
    selectTaskAssignmentContext,
    selectTaskInfo,
} from '../../store/selectors/screen.selectors';
import { selectAllDocumentClasses, selectClassIdsWithDocuments, selectDocumentCountInfo } from '../../store/selectors/document.selectors';
import { systemActions, userActions } from '../../store/actions/class-verification.actions';
import {
    IdpContextTaskBaseService,
    IdpTaskActions,
    RejectReason,
    TaskClaimPermissions,
    TaskContext,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpTaskInfo } from '../../models/screen-models';
import { Actions, ofType } from '@ngrx/effects';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class ClassVerificationContextTaskService extends IdpContextTaskBaseService {
    override readonly taskInfo$: Observable<IdpTaskInfo>;
    override readonly taskAction$: Observable<{ action: IdpTaskActions; openNextTask?: boolean }>;
    override readonly screenReady$: Observable<boolean>;
    override readonly taskCanSave$: Observable<boolean>;
    override readonly taskCanComplete$: Observable<boolean>;
    override readonly taskCanUnclaim$: Observable<boolean>;
    override readonly taskUnclaimEnabled$: Observable<boolean>;
    override readonly rejectReasons$: Observable<RejectReason[]>;

    private readonly store = inject(Store);
    private readonly destroyRef = inject(DestroyRef);
    private readonly actions$ = inject(Actions);
    private readonly translateService = inject(TranslateService);

    constructor() {
        super();

        this.taskInfo$ = combineLatest([
            this.store.select(selectTaskInfo),
            this.store.select(selectDocumentCountInfo),
            this.store.select(selectAllDocumentClasses),
            this.store.select(selectClassIdsWithDocuments),
            this.store.select(selectTaskAssignmentContext),
        ]).pipe(
            takeUntilDestroyed(this.destroyRef),
            map(([taskInfo, documentCountInfo, documentClasses, classesWithDocuments, taskAssignmentContext]) => {
                return {
                    taskId: taskInfo.taskId,
                    taskName: taskInfo.taskName,
                    taskType: taskInfo.taskName,
                    canClaimTask: taskAssignmentContext.canClaimTask ?? false,
                    canUnclaimTask: taskAssignmentContext.canUnclaimTask ?? false,
                    issuesToResolve: documentCountInfo.documentsWithIssues,
                    taskLabel: 'IDP_CLASS_VERIFICATION.TASK_HEADER.TITLE',
                    props: [
                        {
                            label: 'IDP_CLASS_VERIFICATION.TASK_HEADER.TASK_NAME',
                            value: taskInfo.taskName.trim() || this.translateService.instant('IDP_CLASS_VERIFICATION.TASK_HEADER.TASK_NAME_VALUE'),
                        },
                        { label: 'IDP_CLASS_VERIFICATION.TASK_HEADER.DOCUMENT_CLASSES', value: classesWithDocuments.size },
                        { label: 'IDP_CLASS_VERIFICATION.TASK_HEADER.TOTAL_DOCUMENTS', value: documentCountInfo.totalDocuments },
                        { label: 'IDP_CLASS_VERIFICATION.TASK_HEADER.TOTAL_PAGES', value: documentCountInfo.totalPages },
                    ],
                };
            }),
            shareReplay({ bufferSize: 1, refCount: true })
        );

        this.taskAction$ = merge(
            this.actions$.pipe(
                ofType(systemActions.taskActionSuccess),
                map((a) => {
                    return { action: a.action, openNextTask: a.openNextTask };
                })
            ),
            this.actions$.pipe(
                ofType(systemActions.taskActionError),
                map(() => {
                    return { action: 'Error' as const, openNextTask: false };
                })
            )
        );

        this.screenReady$ = this.store.select(selectScreenReady).pipe(distinctUntilChanged());
        this.taskCanSave$ = this.store.select(selectCanSave).pipe(distinctUntilChanged());
        this.taskCanComplete$ = this.store.select(selectCanComplete).pipe(distinctUntilChanged());
        this.taskCanUnclaim$ = this.store.select(selectCanUnclaim).pipe(distinctUntilChanged());
        this.taskUnclaimEnabled$ = this.store.select(selectUnclaimEnabled).pipe(distinctUntilChanged());

        this.rejectReasons$ = this.store.select(selectRejectReasons);
    }

    override initialize(taskContext: TaskContext, taskClaimPermissions: TaskClaimPermissions): void {
        this.store.dispatch(systemActions.taskInitialize({ taskContext, taskClaimPermissions }));
    }

    override reset(): void {
        this.store.dispatch(systemActions.screenStateReset());
    }

    override saveTask(): void {
        this.store.dispatch(userActions.taskSave());
    }

    override completeTask(openNextTask?: boolean): void {
        this.store.dispatch(userActions.taskComplete({ openNextTask }));
    }

    override cancelTask(): void {
        this.store.dispatch(userActions.taskCancel());
    }

    override unclaimTask(): void {
        this.store.dispatch(userActions.taskUnclaim());
    }
}

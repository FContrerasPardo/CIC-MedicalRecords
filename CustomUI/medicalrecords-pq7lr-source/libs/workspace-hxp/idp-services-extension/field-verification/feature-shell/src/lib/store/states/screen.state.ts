/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpLoadState, TaskAssignmentContext, TaskContext } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpTaskData } from '../../models/screen-models';

export interface ScreenState {
    status: IdpLoadState;
    taskContext: TaskContext;
    taskAssignmentContext: TaskAssignmentContext;
    taskInputData: IdpTaskData | undefined;
    taskDataSynced: boolean;
    error?: string;
}

export const initialScreenState: ScreenState = {
    status: IdpLoadState.NotInitialized,
    taskContext: {
        appName: '',
        taskId: '',
        taskName: '',
        rootProcessInstanceId: '',
    },
    taskAssignmentContext: {
        assignee: undefined,
        candidateGroups: undefined,
        candidateUsers: undefined,
        canClaimTask: false,
        canUnclaimTask: false,
    },
    taskInputData: undefined,
    taskDataSynced: false,
};

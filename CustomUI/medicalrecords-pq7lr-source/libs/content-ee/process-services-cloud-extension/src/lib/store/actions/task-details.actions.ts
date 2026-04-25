/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';

export const openTaskAssignmentDialog = createAction(
    '[TaskDetails] Open Task Assignment Dialog',
    props<{
        taskId: string;
        appName: string;
        assignee: string;
    }>()
);

export const assignTask = createAction(
    '[TaskDetails] Assign Task',
    props<{
        taskId: string;
        appName: string;
        assignee: string;
    }>()
);

export const taskAssignmentSuccess = createAction('[TaskDetails] Task Assignment Success');

export const taskAssignmentFailure = createAction('[TaskDetails] Task Assignment Failure', props<{ error: any }>());

export const startFormCompletedRedirection = createAction(
    '[TaskDetails] Start From Completed Redirection',
    props<{ appName: string; processDefinitionName: string; redirectParameter: string; selectedOutcomeId?: string }>()
);

export const taskCompletedRedirection = createAction(
    '[TaskDetails] Task Completed Redirection',
    props<{ taskId: string; selectedOutcomeId?: string }>()
);

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';
import { ProcessManagementFilterPayload } from '../states/extension.state';

export const navigateToTasks = createAction('[ProcessCloud] navigateToTasks', props<{ filterId: string }>());

export const navigateToProcesses = createAction('[ProcessCloud] navigateToProcesses', props<{ filterId: string }>());

export const navigateToFilter = createAction('[ProcessCloud] navigateToFilter', props<{ filterId: string; queryParams?: any }>());

export const setProcessManagementFilter = createAction(
    '[ProcessCloud] setProcessManagementFilter',
    props<{ payload: ProcessManagementFilterPayload }>()
);

export const setDefaultProcessManagementFilter = createAction(
    '[ProcessCloud] set default process management filter',
    props<{ payload: ProcessManagementFilterPayload }>()
);

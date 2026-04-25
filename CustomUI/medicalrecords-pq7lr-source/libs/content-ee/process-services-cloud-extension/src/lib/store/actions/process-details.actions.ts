/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';

export const openProcessCancelConfirmationDialog = createAction(
    '[ProcessDetails] Open Process Cancel Confirmation Dialog',
    props<{
        processInstanceId: string;
        appName: string;
    }>()
);

export const cancelRunningProcess = createAction(
    '[ProcessDetails] Cancel Running process',
    props<{
        processInstanceId: string;
        appName: string;
    }>()
);

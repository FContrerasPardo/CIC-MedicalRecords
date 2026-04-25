/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';

export const initialiseExtension = createAction(
    '[Process Service Cloud Extension] initialise',
    props<{
        health: boolean;
        application: string;
    }>()
);

export const taskOrProcessFilterUpdate = createAction(
    '[Process Service Cloud Extension] task or process filter updated',
    props<{ filterKey: string; canBeRefreshed: boolean }>()
);

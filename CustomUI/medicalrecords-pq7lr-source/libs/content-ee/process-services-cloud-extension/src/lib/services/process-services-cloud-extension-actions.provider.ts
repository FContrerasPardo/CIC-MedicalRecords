/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InjectionToken } from '@angular/core';
import { Action } from '@ngrx/store';

export interface StoreActions {
    getOnInitAction(payload: boolean): Action;
    getOnDestroyAction(payload: boolean): Action;
}

export const STORE_ACTIONS_PROVIDER = new InjectionToken<StoreActions>('STORE_ACTIONS_PROVIDER');

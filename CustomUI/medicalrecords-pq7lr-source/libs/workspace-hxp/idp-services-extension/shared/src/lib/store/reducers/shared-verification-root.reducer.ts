/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Action, combineReducers } from '@ngrx/store';
import { initialSharedVerificationRootState, SharedVerificationRootState } from '../states/shared-verification-root.state';
import { sessionStorageMetaReducer } from './session-storage-meta.reducer';
import { sessionReducer } from './session.reducer';

const sharedVerificationRootReducer = combineReducers(
    {
        session: sessionStorageMetaReducer(sessionReducer),
    },
    initialSharedVerificationRootState
);

export function getSharedVerificationRootReducer(state: SharedVerificationRootState | undefined, action: Action) {
    return sharedVerificationRootReducer(state, action);
}

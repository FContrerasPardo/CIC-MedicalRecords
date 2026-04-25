/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ActionReducer } from '@ngrx/store';
import { ClassVerificationRootState, initialClassVerificationRootState } from '../states/root.state';
import { systemActions } from '../actions/class-verification.actions';

export function screenUnloadMetaReducer(reducer: ActionReducer<ClassVerificationRootState>): ActionReducer<ClassVerificationRootState> {
    return (state, action) => {
        if (!state) {
            return initialClassVerificationRootState;
        }

        if (action.type === systemActions.screenStateReset.type) {
            return initialClassVerificationRootState;
        }

        return reducer(state, action);
    };
}

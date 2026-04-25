/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ActionReducer } from '@ngrx/store';
import { FieldVerificationRootState, initialFieldVerificationRootState } from '../states/root.state';
import { systemActions } from '../actions/field-verification.actions';

export function screenUnloadMetaReducer(reducer: ActionReducer<FieldVerificationRootState>): ActionReducer<FieldVerificationRootState> {
    return (state, action) => {
        if (!state) {
            return initialFieldVerificationRootState;
        }

        if (action.type === systemActions.screenStateReset.type) {
            return initialFieldVerificationRootState;
        }

        return reducer(state, action);
    };
}

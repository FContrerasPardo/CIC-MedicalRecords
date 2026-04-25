/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Action, combineReducers } from '@ngrx/store';
import { ProcessServiceCloudMainState, initialProcessServicesCloudState } from '../states/state';
import { processServicesCloudExtensionReducer } from './extension.reducer';
import { processDefinitionsEntityReducer } from './process-definitions.entities.reducer';

export const featureKey = 'processServicesCloud';

export const mainReducer = combineReducers(
    {
        extension: processServicesCloudExtensionReducer,
        processDefinitions: processDefinitionsEntityReducer,
    },
    initialProcessServicesCloudState
);

export function reducer(state: ProcessServiceCloudMainState | undefined, action: Action) {
    return mainReducer(state, action);
}

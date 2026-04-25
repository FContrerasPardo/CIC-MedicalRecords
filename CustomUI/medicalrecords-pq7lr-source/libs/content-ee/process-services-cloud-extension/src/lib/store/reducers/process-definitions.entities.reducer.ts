/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createReducer, on } from '@ngrx/store';
import { initialProcessDefinitionEntitiesState, processDefinitionsAdapter } from '../states/process-definitions.entities.state';
import {
    loadProcessDefinitionsFailure,
    loadProcessDefinitionsSuccess,
    loadUserStartableProcessDefinitionKeysSuccess,
    setRecentProcessDefinitions,
} from '../actions/process-definition.actions';

export const processDefinitionsEntityReducer = createReducer(
    initialProcessDefinitionEntitiesState,
    on(loadProcessDefinitionsSuccess, (state, action) => ({
        ...processDefinitionsAdapter.addMany(action.definitions, state),
        loaded: true,
    })),
    on(loadUserStartableProcessDefinitionKeysSuccess, (state, action) => ({
        ...state,
        userStartableProcessDefinitionKeys: action.userStartableProcessDefinitionKeys,
    })),
    on(loadProcessDefinitionsFailure, (state, action) => ({
        ...state,
        loadingError: action.error,
    })),
    on(setRecentProcessDefinitions, (state, action) => {
        return {
            ...state,
            recentProcessDefinitionKeys: action.definitionKeys,
        };
    })
);

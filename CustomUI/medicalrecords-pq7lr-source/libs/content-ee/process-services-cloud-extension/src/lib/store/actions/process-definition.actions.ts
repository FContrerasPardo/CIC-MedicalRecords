/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';
import { ProcessDefinitionCloud } from '@alfresco/adf-process-services-cloud';

export const loadProcessDefinitions = createAction('[ProcessDefinition] Load ProcessDefinitions');

export const loadProcessDefinitionsSuccess = createAction(
    '[ProcessDefinition] Load ProcessDefinitions Success',
    props<{ definitions: ProcessDefinitionCloud[] }>()
);

export const loadProcessDefinitionsFailure = createAction('[ProcessDefinition] Load ProcessDefinitions Failure', props<{ error: any }>());

export const loadUserStartableProcessDefinitionKeysSuccess = createAction(
    '[ProcessDefinition] Load User Startable Process Definition Keys Success',
    props<{ userStartableProcessDefinitionKeys: string[] }>()
);

export const loadRecentProcessDefinitions = createAction('[ProcessDefinition] Load Recent Process Definitions');

export const setRecentProcessDefinitions = createAction('[ProcessDefinition] setRecentProcessDefinitions', props<{ definitionKeys: string[] }>());

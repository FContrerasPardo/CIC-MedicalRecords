/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { ProcessDefinitionCloud } from '@alfresco/adf-process-services-cloud';

export interface ProcessDefinitionEntitiesState extends EntityState<ProcessDefinitionCloud> {
    loaded: boolean;
    loadingError?: string;
    recentProcessDefinitionKeys: string[];
    userStartableProcessDefinitionKeys: string[];
}
export const processDefinitionsAdapter: EntityAdapter<ProcessDefinitionCloud> = createEntityAdapter<ProcessDefinitionCloud>({});

export const initialProcessDefinitionEntitiesState = processDefinitionsAdapter.getInitialState({
    loaded: false,
    recentProcessDefinitionKeys: [],
    userStartableProcessDefinitionKeys: [],
});

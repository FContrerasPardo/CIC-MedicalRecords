/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FilterParamsModel, ProcessDefinitionCloud } from '@alfresco/adf-process-services-cloud';
import { EntityState } from '@ngrx/entity';

export interface ProcessDefinitionEntitiesState extends EntityState<ProcessDefinitionCloud> {
    loaded: boolean;
    loadingError?: string;
    recentProcessDefinitionKeys: string[];
}

export interface ProcessServiceCloudMainState {
    extension: ProcessServiceCloudExtensionState;
    processDefinitions: ProcessDefinitionEntitiesState;
}

export interface ProcessServiceCloudExtensionState {
    health: boolean;
    application: string;
    selectedFilter: ProcessManagementFilterPayload;
}

export interface ProcessManagementFilterPayload {
    type: FilterType;
    filter: FilterParamsModel;
}

export const FilterType = {
    TASK: 'TASK',
    PROCESS: 'PROCESS',
} as const;

export type FilterType = typeof FilterType[keyof typeof FilterType];

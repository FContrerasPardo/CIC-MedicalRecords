/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FilterParamsModel } from '@alfresco/adf-process-services-cloud';

export interface ProcessServiceCloudExtensionState {
    health: boolean;
    application: string;
    selectedFilter: ProcessManagementFilterPayload;
    defaultFilter: ProcessManagementFilterPayload;
    filtersThatCanBeRefreshed: {
        [key: string]: boolean;
    };
}
export const initialProcessServicesCloudExtensionState: ProcessServiceCloudExtensionState = {
    health: false,
    application: '',
    selectedFilter: {
        type: null,
        filter: null,
    },
    defaultFilter: {
        type: null,
        filter: null,
    },
    filtersThatCanBeRefreshed: {},
};

export const FilterType = {
    TASK: 'TASK',
    PROCESS: 'PROCESS',
} as const;

export type FilterType = typeof FilterType[keyof typeof FilterType];

export interface ProcessManagementFilterPayload {
    type: FilterType;
    filter: FilterParamsModel;
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const TaskRedirectionMode = {
    BACK: 'back',
    WORKSPACE: 'workspace',
    MESSAGE: 'message',
    URL: 'url',
    QUERY: 'query',
    SUCCESS: 'success',
} as const;

export type TaskRedirectionMode = typeof TaskRedirectionMode[keyof typeof TaskRedirectionMode];

export const TaskRedirectionConstants = {
    REDIRECTION_MODE: '_redirectionMode_',
    REDIRECTION_PARAMETER: '_redirectionParameter_',
} as const;

export interface TaskRedirectionConfig {
    redirectionMode: TaskRedirectionMode;
    redirectionParameter: string;
}

export interface TaskVariablesQueryParams {
    maxItems?: number;
    skipCount?: number;
    sort?: string;
}

export interface TaskVariable {
    appName: string;
    serviceName: string;
    serviceFullName: string;
    serviceType: string;
    serviceVersion: string;
    appVersion: string;
    taskId: string;
    taskVariable: true;
    processInstanceId: string;
    name: string;
    value: any;
    type: string;
}

export interface TaskVariablesEntry {
    entry: TaskVariable;
}

export interface TaskVariablesModel {
    list: {
        entries: TaskVariablesEntry[];
        pagination: {
            skipCount: number;
            maxItems: number;
            count: number;
            hasMoreItems: boolean;
            totalItems: number;
        };
    };
}

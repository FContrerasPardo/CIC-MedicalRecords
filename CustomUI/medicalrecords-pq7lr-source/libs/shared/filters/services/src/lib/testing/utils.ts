/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ProcessVariableDefinition, ProcessDefinitionCloud } from '@alfresco/adf-process-services-cloud';

export const getProcessVariableDefinition = (
    variable: Partial<ProcessVariableDefinition> = {}
): ProcessVariableDefinition & { displayName: string } => {
    return {
        id: 'id',
        name: 'name',
        type: 'string',
        displayName: 'displayName',
        display: true,
        required: false,
        ...variable,
    };
};

export const getProcessDefinitionCloud = (process: Partial<ProcessDefinitionCloud> = {}): ProcessDefinitionCloud => {
    return new ProcessDefinitionCloud({
        id: 'id',
        appName: 'appName',
        key: 'process_definition_key',
        variableDefinitions: [],
        description: 'description',
        ...process,
    });
};

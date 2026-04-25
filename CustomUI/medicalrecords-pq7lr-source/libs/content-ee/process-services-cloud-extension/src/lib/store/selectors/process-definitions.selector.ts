/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ProcessDefinitionCloud, ProcessVariableDefinition } from '@alfresco/adf-process-services-cloud';
import { createSelector } from '@ngrx/store';
import { selectFeature } from './extension.selectors';
import { VariableByProcess } from '@alfresco-dbp/shared-filters-services';

export type ProcessWithVariables = ProcessDefinitionCloud & { variableDefinitions: ProcessVariableDefinition[] };

export const selectProcessDefinitionEntities = createSelector(selectFeature, (state) => Object.values(state.processDefinitions.entities));

const selectUserStartableProcessDefinitionKeys = createSelector(
    selectFeature,
    (state) => state.processDefinitions.userStartableProcessDefinitionKeys
);
export const selectUserStartableProcessDefinitions = createSelector(
    selectProcessDefinitionEntities,
    selectUserStartableProcessDefinitionKeys,
    (allProcessDefinitions, userStartableProcessDefinitionKeys) => {
        return allProcessDefinitions.filter((definition) => userStartableProcessDefinitionKeys.includes(definition.key));
    }
);

export const selectProcessDefinitionsLoaderIndicator = createSelector(selectFeature, (state) => state.processDefinitions.loaded);

export const selectProcessDefinitionsLoadingError = createSelector(selectFeature, (state) => state.processDefinitions.loadingError);

export const selectProcessesWithVariableEntities = createSelector(
    selectProcessDefinitionsLoaderIndicator,
    selectProcessDefinitionEntities,
    (areProcessDefinitionLoaded, definitions): ProcessWithVariables[] => {
        if (!areProcessDefinitionLoaded) {
            return [];
        }

        const processesWithVariables = (definitions ?? []).reduce<ProcessWithVariables[]>((allProcesses, process) => {
            if (process && hasVariables(process)) {
                allProcesses.push(process);
            }

            return allProcesses;
        }, []);

        return processesWithVariables;
    }
);

export const selectVariablesByProcess = createSelector(selectProcessesWithVariableEntities, (processesWithVariables): VariableByProcess[] => {
    return processesWithVariables.reduce<VariableByProcess[]>((acc, process) => {
        for (const variable of process.variableDefinitions) {
            acc.push({ variable, process });
        }

        return acc;
    }, []);
});

export const selectRecentProcessDefinitionKeys = createSelector(selectFeature, (state) => state.processDefinitions.recentProcessDefinitionKeys);

const hasVariables = (process: ProcessDefinitionCloud): process is ProcessWithVariables => {
    return !!process.variableDefinitions?.length;
};

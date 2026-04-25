/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { featureKey } from '../reducers/reducer';
import { ProcessServiceCloudExtensionState, initialProcessServicesCloudExtensionState } from './extension.state';
import { ProcessDefinitionEntitiesState, initialProcessDefinitionEntitiesState } from './process-definitions.entities.state';

export interface FeatureCloudRootState {
    [featureKey]: ProcessServiceCloudMainState;
}

export interface ProcessServiceCloudMainState {
    extension: ProcessServiceCloudExtensionState;
    processDefinitions: ProcessDefinitionEntitiesState;
}
export const initialProcessServicesCloudState: ProcessServiceCloudMainState = {
    extension: initialProcessServicesCloudExtensionState,
    processDefinitions: initialProcessDefinitionEntitiesState,
};

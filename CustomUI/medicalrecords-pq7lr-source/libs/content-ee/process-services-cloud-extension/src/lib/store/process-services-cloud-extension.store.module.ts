/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { ProcessCloudHealthEffects } from './effects/process-cloud-health.effects';
import { ProcessDefinitionEffects } from './effects/process-definition.effects';
import * as fromProcessServicesCloud from './reducers/reducer';
import { ProcessManagementFilterEffects } from './effects/process-management-filter.effects';
import { ProcessDetailsEffects } from './effects/process-details.effects';
import { TaskDetailsEffects } from './effects/task-details.effects';
import { ProcessInstanceEffect } from './effects/process-cloud-instance.effect';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

@NgModule({
    providers: [
        provideState(fromProcessServicesCloud.featureKey, fromProcessServicesCloud.reducer),
        provideEffects([
            ProcessCloudHealthEffects,
            ProcessDefinitionEffects,
            ProcessManagementFilterEffects,
            ProcessDetailsEffects,
            TaskDetailsEffects,
            ProcessInstanceEffect,
        ]),
    ],
})
export class ProcessServicesCloudExtensionStoreModule {}

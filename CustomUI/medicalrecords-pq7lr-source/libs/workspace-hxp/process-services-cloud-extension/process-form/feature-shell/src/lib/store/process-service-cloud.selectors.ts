/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProcessServiceCloudMainState } from './process-service-cloud.state';

export const featureKey = 'processServicesCloud';

export const selectFeature = createFeatureSelector<ProcessServiceCloudMainState>(featureKey);

export const selectProcessManagementFilter = createSelector(selectFeature, (state) => state.extension.selectedFilter.filter);

export const selectApplicationName = createSelector(selectFeature, (state) => state.extension.application);

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { sharedVerificationStateName, SharedVerificationRootState } from '../states/shared-verification-root.state';

export const sharedVerificationRootFeatureSelector = createFeatureSelector<SharedVerificationRootState>(sharedVerificationStateName);

export const sessionFeatureSelector = createSelector(sharedVerificationRootFeatureSelector, (state) => state.session);

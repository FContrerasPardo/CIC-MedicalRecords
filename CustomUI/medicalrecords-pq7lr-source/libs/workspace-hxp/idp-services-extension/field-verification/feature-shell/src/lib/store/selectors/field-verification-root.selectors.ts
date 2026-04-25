/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FieldVerificationRootState, fieldVerificationStateName } from '../states/root.state';

export const fieldVerificationRootFeatureSelector = createFeatureSelector<FieldVerificationRootState>(fieldVerificationStateName);

export const documentFeatureSelector = createSelector(fieldVerificationRootFeatureSelector, (state) => state.document);
export const documentFieldFeatureSelector = createSelector(fieldVerificationRootFeatureSelector, (state) => state.fields);
export const documentTableFeatureSelector = createSelector(fieldVerificationRootFeatureSelector, (state) => state.tables);
export const screenFeatureSelector = createSelector(fieldVerificationRootFeatureSelector, (state) => state.screen);
// export const undoRedoFeatureSelector = createSelector(fieldVerificationRootFeatureSelector, (state) => state.undoRedo);

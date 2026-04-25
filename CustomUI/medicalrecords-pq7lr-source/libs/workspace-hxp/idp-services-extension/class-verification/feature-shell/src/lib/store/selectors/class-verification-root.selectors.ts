/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ClassVerificationRootState, classVerificationStateName } from '../states/root.state';

export const classVerificationRootFeatureSelector = createFeatureSelector<ClassVerificationRootState>(classVerificationStateName);

export const documentFeatureSelector = createSelector(classVerificationRootFeatureSelector, (state) => state.documents);
export const documentClassFeatureSelector = createSelector(classVerificationRootFeatureSelector, (state) => state.documentClasses);
export const screenFeatureSelector = createSelector(classVerificationRootFeatureSelector, (state) => state.screen);
export const screenImportingDocumentFeatureSelector = createSelector(classVerificationRootFeatureSelector, (state) => state.screenImportingDocuments);
export const undoRedoFeatureSelector = createSelector(classVerificationRootFeatureSelector, (state) => state.undoRedo);

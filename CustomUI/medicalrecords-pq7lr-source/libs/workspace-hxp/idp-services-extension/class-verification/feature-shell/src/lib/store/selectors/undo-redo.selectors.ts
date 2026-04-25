/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createSelector } from '@ngrx/store';
import { undoRedoFeatureSelector } from './class-verification-root.selectors';

export const selectCanUndo = createSelector(undoRedoFeatureSelector, (state) => state.undoStack.length > 0);

export const selectCanRedo = createSelector(undoRedoFeatureSelector, (state) => state.redoStack.length > 0);

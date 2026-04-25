/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Action, combineReducers, MetaReducer } from '@ngrx/store';
import { documentReducer } from './document.reducer';
import { documentClassReducer } from './document-class.reducer';
import { ClassVerificationRootState, initialClassVerificationRootState } from '../states/root.state';
import { screenReducer } from './screen.reducer';
import { screenUnloadMetaReducer } from './screen-unload-meta.reducer';
import { documentOpUndoRedoMetaReducer } from './document-op-undo-redo-meta.reducer';
import { docOpUndoRedoReducer } from './doc-op-undo-redo.reducer';
import { screenImportingDocumentReducer } from './screen-uploaded-document.reducer';

const classVerificationRootReducer = combineReducers(
    {
        documents: documentReducer,
        documentClasses: documentClassReducer,
        screen: screenReducer,
        screenImportingDocuments: screenImportingDocumentReducer,
        undoRedo: docOpUndoRedoReducer,
    },
    initialClassVerificationRootState
);

export function getClassVerificationRootReducer(state: ClassVerificationRootState | undefined, action: Action) {
    return classVerificationRootReducer(state, action);
}

export const metaReducers: MetaReducer<ClassVerificationRootState>[] = [screenUnloadMetaReducer, documentOpUndoRedoMetaReducer];

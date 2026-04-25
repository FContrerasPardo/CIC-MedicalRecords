/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DocOpUndoRedoState, initialDocOpUndoRedoState } from './doc-op-undo-redo.state';
import { DocumentClassState, initialDocumentClassState } from './document-class.state';
import { DocumentState, initialDocumentState } from './document.state';
import { initialScreenState, ScreenState } from './screen.state';
import { initialScreenImportingDocumentState, ScreenImportingDocumentState } from './importing-document.state';

export const classVerificationStateName = 'idp-class-verification';

export interface ClassVerificationRootState {
    documents: DocumentState;
    documentClasses: DocumentClassState;
    screen: ScreenState;
    screenImportingDocuments: ScreenImportingDocumentState;
    undoRedo: DocOpUndoRedoState;
}

export const initialClassVerificationRootState: ClassVerificationRootState = {
    documents: initialDocumentState,
    documentClasses: initialDocumentClassState,
    screen: initialScreenState,
    screenImportingDocuments: initialScreenImportingDocumentState,
    undoRedo: initialDocOpUndoRedoState,
};

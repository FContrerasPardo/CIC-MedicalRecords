/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { classVerificationStateName } from './states/root.state';
import { getClassVerificationRootReducer, metaReducers } from './reducers/class-verification-root.reducer';
import { provideState } from '@ngrx/store';
import { ScreenEffects } from './effects/screen.effects';
import { DocumentEffects } from './effects/document.effects';
import { IdpDocumentHxpImportService } from '../services/document-import/idp-document-hxp-import.service';
import { IdpDocumentImportDialogService } from '../services/document-import/idp-document-import-dialog.service';
import { ScreenImportingDocumentEffects } from './effects/screen-importing-document.effects';
import { IdpDocumentImportService } from '../services/document-import/idp-document-import.service';
import { IdpDocumentMetadataService } from '../services/document-import/idp-document-metadata.service';
import { provideEffects } from '@ngrx/effects';

@NgModule({
    providers: [
        provideState(classVerificationStateName, getClassVerificationRootReducer, { metaReducers }),
        provideEffects([ScreenEffects, DocumentEffects, ScreenImportingDocumentEffects]),
        {
            provide: IdpDocumentImportService,
            useClass: IdpDocumentHxpImportService,
        },
        IdpDocumentImportDialogService,
        IdpDocumentMetadataService,
    ],
})
export class ClassVerificationStoreModule {}

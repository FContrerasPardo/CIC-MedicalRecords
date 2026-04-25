/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { DocumentEffects } from './effects/document.effects';
import { fieldVerificationStateName } from './states/root.state';
import { getFieldVerificationRootReducer, metaReducers } from './reducers/field-verification-root.reducer';
import { ScreenEffects } from './effects/screen.effects';
import { ValidationProcessService } from '../services/validation-process/validation-process.service';

@NgModule({
    providers: [
        provideState(fieldVerificationStateName, getFieldVerificationRootReducer, { metaReducers }),
        provideEffects([ScreenEffects, DocumentEffects]),
        ValidationProcessService,
    ],
})
export class FieldVerificationStoreModule {}

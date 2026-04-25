/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { provideState } from '@ngrx/store';
import { sharedVerificationStateName } from './states/shared-verification-root.state';
import { getSharedVerificationRootReducer } from './reducers/shared-verification-root.reducer';

@NgModule({
    providers: [provideState(sharedVerificationStateName, getSharedVerificationRootReducer)],
})
export class SharedVerificationStoreModule {}

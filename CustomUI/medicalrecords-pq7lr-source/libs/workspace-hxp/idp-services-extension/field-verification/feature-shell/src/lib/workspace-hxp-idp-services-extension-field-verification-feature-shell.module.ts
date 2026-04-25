/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { ActionHistoryService, ActionLinearHistoryService } from './services/action-history.service';
import { WorkspaceHxpIdpServicesExtensionSharedModule } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { FieldVerificationStoreModule } from './store/field-verification-store.module';
import { FieldVerificationScreenComponent } from './screens/field-verification-screen';
import { provideScreen } from '@alfresco/adf-process-services-cloud';
import { IdpImageLoadingService } from './services/image/idp-image-loading.service';

@NgModule({
    imports: [FieldVerificationStoreModule, WorkspaceHxpIdpServicesExtensionSharedModule],
    providers: [
        IdpImageLoadingService,
        { provide: ActionHistoryService, useClass: ActionLinearHistoryService },
        provideScreen('idp-field-verification', FieldVerificationScreenComponent),
    ],
})
export class WorkspaceHxpIdpServicesFieldVerificationFeatureShellModule {}

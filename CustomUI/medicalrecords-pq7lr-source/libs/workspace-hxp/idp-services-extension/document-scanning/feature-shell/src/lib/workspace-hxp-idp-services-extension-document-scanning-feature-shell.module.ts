/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { WorkspaceHxpIdpServicesExtensionSharedModule } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { DocumentScanningScreenComponent } from './screens/document-scanning-screen';
import { provideScreen } from '@alfresco/adf-process-services-cloud';

@NgModule({
    imports: [WorkspaceHxpIdpServicesExtensionSharedModule, DocumentScanningScreenComponent],
    providers: [
        provideScreen('screen-idp-document-scanning', DocumentScanningScreenComponent),
    ],
    exports: [DocumentScanningScreenComponent],
})
export class WorkspaceHxpIdpServicesDocumentScanningFeatureShellModule {}

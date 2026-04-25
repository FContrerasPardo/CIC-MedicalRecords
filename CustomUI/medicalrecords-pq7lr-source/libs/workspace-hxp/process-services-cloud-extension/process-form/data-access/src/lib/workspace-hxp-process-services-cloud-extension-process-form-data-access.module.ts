/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { documentApiProvider } from '@alfresco/adf-hx-content-services/api';
import { DownloadService } from './services/download/download.service';
import { PendingDocumentService } from './services/pending-document/pending-document.service';
export { DownloadService, DownloadData } from './services/download/download.service';
export { UploadFileDocumentCreatorService } from './services/upload/upload-file-document-creator.service';
export { PendingDocumentService } from './services/pending-document/pending-document.service';
export { HxpFormCloudService } from './services/form-cloud/hxp-form-cloud.service';
export { HxpStartProcessCloudService } from './services/start-process-cloud/hxp-start-process-cloud.service';

@NgModule({
    providers: [documentApiProvider, DownloadService, PendingDocumentService],
})
export class ProcessServicesCloudExtensionProcessFormDataAccessModule {}

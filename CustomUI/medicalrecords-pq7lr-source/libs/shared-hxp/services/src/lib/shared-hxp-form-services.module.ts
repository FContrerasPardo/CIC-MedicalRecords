/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormRenderingService } from '@alfresco/adf-core';
import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { SharedAttachFileDialogService } from './attach-file-dialog.service';
import { SharedDownloadService } from './download.service';
import { SharedUploadMiddlewareService } from './upload-middleware.service';
import { UPLOAD_MIDDLEWARE_SERVICE } from './upload-middleware.token';
import { HxpPendingDocumentService } from './pending-document.service';
import { PENDING_DOCUMENT_SERVICE } from './pending-document.token';
import { PendingDocumentCleanupService } from './pending-document-cleanup.service';

interface SharedHxpFormServicesModuleConfig {
    UploadMiddlewareService?: new (...args: any) => SharedUploadMiddlewareService;
    PendingDocumentService?: new (...args: any) => HxpPendingDocumentService;
    DownloadService: new (...args: any) => SharedDownloadService;
    AttachFileDialogService: new (...args: any) => SharedAttachFileDialogService;
    FormRenderingService: new (...args: any) => FormRenderingService;
}

@NgModule({
    imports: [CommonModule],
})
export class SharedHxpFormServicesModule {
    static forForm(config: SharedHxpFormServicesModuleConfig): ModuleWithProviders<SharedHxpFormServicesModule> {
        return {
            ngModule: SharedHxpFormServicesModule,
            providers: [
                {
                    provide: SharedDownloadService,
                    useClass: config.DownloadService,
                },
                {
                    provide: SharedAttachFileDialogService,
                    useClass: config.AttachFileDialogService,
                },
                {
                    provide: FormRenderingService,
                    useClass: config.FormRenderingService,
                },
                PendingDocumentCleanupService,
                ...(config.UploadMiddlewareService ? [{ provide: UPLOAD_MIDDLEWARE_SERVICE, useExisting: config.UploadMiddlewareService }] : []),
                ...(config.PendingDocumentService ? [{ provide: PENDING_DOCUMENT_SERVICE, useExisting: config.PendingDocumentService }] : []),
            ],
        };
    }
}

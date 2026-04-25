/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InjectionToken, NgModule } from '@angular/core';
import { ExtensionLoaderCallback, ProcessServicesCloudExtensionModule } from '@alfresco/adf-process-services-cloud-extension';
import {
    DownloadService,
    ProcessServicesCloudExtensionProcessFormDataAccessModule,
    PendingDocumentService,
    UploadFileDocumentCreatorService,
    HxpFormCloudService,
    HxpStartProcessCloudService,
} from '@alfresco-dbp/workspace-hxp/process-services-cloud-extension/process-form/data-access';
import { ExtensionService } from '@alfresco/adf-extensions';
import { FormCloudService, StartProcessCloudService, TaskFiltersCloudModule, ProcessFiltersCloudModule, RICH_TEXT_PARSER_TOKEN } from '@alfresco/adf-process-services-cloud';
import { SharedHxpFormServicesModule, SharedHxpServicesModule } from '@hxp/shared-hxp/services';
import { SidenavProcessManagementComponent } from './components/sidenav-process-management/sidenav-process-management.component';
import { SharedWidgetsHxpFeatureShellModule, ProcessFormRenderingService } from '@hxp/shared-hxp/form-widgets/feature-shell';
import { AttachFileDialogService } from './widgets/attach-file-dialog/services/attach-file-dialog.service';
import { DocumentService, DocumentPropertiesService } from '@alfresco/adf-hx-content-services/services';
import { uploadApiProvider } from '@alfresco/adf-hx-content-services/api';
import { EditorJsParserProvider } from '@hylandsoftware/rich-text-editor';

export const EXTENSION_DATA_LOADERS_TOKEN = new InjectionToken<ExtensionLoaderCallback[]>('HXP_EXTENSION_DATA_LOADERS_TOKEN');

@NgModule({
    imports: [
        ProcessServicesCloudExtensionModule.withConfig({
            extensionDataLoadersToken: EXTENSION_DATA_LOADERS_TOKEN,
        }),
        SharedWidgetsHxpFeatureShellModule,
        SharedHxpServicesModule.forProcess({
            DocumentPropertiesService,
            DocumentService,
        }),
        SharedHxpFormServicesModule.forForm({
            DownloadService: DownloadService,
            AttachFileDialogService: AttachFileDialogService,
            FormRenderingService: ProcessFormRenderingService,
            UploadMiddlewareService: UploadFileDocumentCreatorService,
            PendingDocumentService: PendingDocumentService,
        }),
        ProcessServicesCloudExtensionProcessFormDataAccessModule,
        TaskFiltersCloudModule,
        ProcessFiltersCloudModule,
    ],
    providers: [
        uploadApiProvider,
        {
            provide: RICH_TEXT_PARSER_TOKEN,
            useClass: EditorJsParserProvider,
        },
        { provide: FormCloudService, useClass: HxpFormCloudService },
        { provide: StartProcessCloudService, useClass: HxpStartProcessCloudService },
    ],
})
export class ProcessServicesCloudExtensionProcessFormFeatureShellModule {
    constructor(private readonly extensions: ExtensionService) {
        this.extensions.setComponents({
            'process-services-cloud.process-services-cloud.sidenav': SidenavProcessManagementComponent,
        });
    }
}

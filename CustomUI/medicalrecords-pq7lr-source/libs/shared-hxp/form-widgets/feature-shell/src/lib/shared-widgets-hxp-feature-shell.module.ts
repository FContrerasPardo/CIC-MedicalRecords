/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CoreModule } from '@alfresco/adf-core';
import { PropertiesViewerContentComponent } from '@alfresco/adf-hx-content-services/ui';
import { AttachFileWidgetComponent } from './widgets/attach-file/attach-file.widget';
import { FileViewerWidgetComponent } from './widgets/file-viewer/file-viewer.widget';
import { PropertiesViewerWidgetComponent } from './widgets/properties-viewer/properties-viewer.widget';
import { FormWidgetService } from './services/form-widget/form-widget.service';
import { ADF_HX_CONTENT_SERVICES_API_PROVIDERS } from '@alfresco/adf-hx-content-services/api';
import { FORM_CLOUD_FIELD_VALIDATORS_TOKEN } from '@alfresco/adf-process-services-cloud';
import { FormWidgetsFieldValidator } from './services/validators/form-widgets-field-validator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';

@NgModule({
    imports: [
        CommonModule,
        CoreModule,
        MatIconModule,
        MatTooltipModule,
        MatTableModule,
        MatMenuModule,
        AttachFileWidgetComponent,
        FileViewerWidgetComponent,
        PropertiesViewerWidgetComponent,
        PropertiesViewerContentComponent,
    ],
    providers: [
        ...ADF_HX_CONTENT_SERVICES_API_PROVIDERS,
        FormWidgetService,
        {
            provide: FORM_CLOUD_FIELD_VALIDATORS_TOKEN,
            useClass: FormWidgetsFieldValidator,
            multi: true,
        },
    ],
})
export class SharedWidgetsHxpFeatureShellModule {}

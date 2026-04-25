/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { CloudFormRenderingService } from '@alfresco/adf-process-services-cloud';
import { FileViewerWidgetComponent, PropertiesViewerWidgetComponent, AttachFileWidgetComponent } from '../../widgets';
import { TableReferenceWidgetComponent } from '../../widgets/table-reference/table-reference.widget';

@Injectable()
export class ProcessFormRenderingService extends CloudFormRenderingService {
    constructor() {
        super();

        this.register(
            {
                ['hxp-file-viewer']: () => FileViewerWidgetComponent,
                ['hxp-properties-viewer']: () => PropertiesViewerWidgetComponent,
                ['hxp-upload']: () => AttachFileWidgetComponent,
                ['hxp-table-reference']: () => TableReferenceWidgetComponent,
            },
            true
        );
    }
}

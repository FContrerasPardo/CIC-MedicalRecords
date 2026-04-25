/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input } from '@angular/core';
import { InfoDrawerButtonsDirective, InfoDrawerComponent, InfoDrawerTabComponent } from '@alfresco/adf-core';
import { TaskHeaderCloudComponent } from '@alfresco/adf-process-services-cloud';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    imports: [InfoDrawerButtonsDirective, TaskHeaderCloudComponent, TranslatePipe, InfoDrawerTabComponent, InfoDrawerComponent],
    selector: 'apa-task-details-cloud-metadata',
    templateUrl: './task-details-cloud-metadata.component.html',
    styleUrls: ['./task-details-cloud-metadata.component.scss'],
})
export class TaskDetailsCloudMetadataComponent {
    @Input() appName: string;

    @Input() taskId: string;
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { ExtensionService } from '@alfresco/adf-extensions';
import { TaskDetailsCloudExtComponent } from './components/task-details-cloud-ext/task-details-cloud-ext.component';
import { TaskDetailsCloudMetadataComponent } from './components/task-details-cloud-metadata/task-details-cloud-metadata.component';
import { TaskAssignmentDialogComponent } from './components/task-assignment-dialog/task-assignment-dialog.component';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideEffects } from '@ngrx/effects';
import { ProcessListCloudEffects } from '../../store/effects/process-list-cloud.effects';
import { SharedIdentityModule } from '@alfresco-dbp/shared/identity';

@NgModule({
    imports: [SharedIdentityModule, TaskAssignmentDialogComponent, TaskDetailsCloudExtComponent, TaskDetailsCloudMetadataComponent],
    providers: [provideEffects([ProcessListCloudEffects]), { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { floatLabel: 'never' } }],
})
export class TaskDetailsCloudModule {
    constructor(extensions: ExtensionService) {
        extensions.setComponents({
            'process-services-cloud.task-details': TaskDetailsCloudExtComponent,
        });
    }
}

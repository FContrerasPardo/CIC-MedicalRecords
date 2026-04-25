/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { ExtensionService } from '@alfresco/adf-extensions';
import { ProcessServicesCloudModule } from '@alfresco/adf-process-services-cloud';
import { ProcessListCloudEffects } from '../../store/effects/process-list-cloud.effects';
import { ProcessListCloudContainerExtComponent } from './components/process-list/process-list-cloud-container-ext.component';
import { MainActionButtonComponent } from '../../components/main-action-button/main-action-button.component';
import { RelatedProcessComponent } from './components/related-process/related-process.component';
import { provideEffects } from '@ngrx/effects';

@NgModule({
    imports: [ProcessServicesCloudModule],
    providers: [provideEffects([ProcessListCloudEffects])],
})
export class ProcessListCloudModule {
    constructor(extensions: ExtensionService) {
        extensions.setComponents({
            'process-services-cloud.process-list': ProcessListCloudContainerExtComponent,
            'processes-list-header-action': MainActionButtonComponent,
            'processes-list-related-process': RelatedProcessComponent,
        });
    }
}

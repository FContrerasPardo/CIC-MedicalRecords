/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthGuard, provideTranslations } from '@alfresco/adf-core';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import { TranslateModule } from '@ngx-translate/core';
import { MedicalRecordsShellComponent } from './pages/medical-records-shell/medical-records-shell.component';
import { MetricCardComponent } from './components/metric-card/metric-card.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { WorkflowStepperComponent } from './components/workflow-stepper/workflow-stepper.component';
import { ActionToolbarComponent } from './components/action-toolbar/action-toolbar.component';
import { DataPanelComponent } from './components/data-panel/data-panel.component';
import { MedicalRecordsMenuItemComponent } from './components/medical-records-menu-item/medical-records-menu-item.component';

@NgModule({
    declarations: [
        MedicalRecordsShellComponent,
        MetricCardComponent,
        StatusBadgeComponent,
        WorkflowStepperComponent,
        ActionToolbarComponent,
        DataPanelComponent
    ],
    imports: [
        CommonModule,
        TranslateModule,
        RouterModule,
        MedicalRecordsMenuItemComponent
    ],
    providers: [
        provideExtensionConfig(['medical-records.extension.json']),
        provideTranslations('medical-records', 'assets/medical-records')
    ],
})
export class MedicalRecordsModule {
    constructor(extensions: ExtensionService) {
        extensions.setAuthGuards({
            'medical-records.auth': AuthGuard,
        });

        extensions.setComponents({
            'medical-records.shell': MedicalRecordsShellComponent,
            'medical-records.sidenav': MedicalRecordsMenuItemComponent,
        });
    }
}

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
import { CustomWidgetModule } from './form-widgets/custom-widget/custom-widget.module'
import { AnalysisTaskWidgetModule } from './form-widgets/analysis-task-widget/analysis-task-widget.module';
import { IntakeAccountWidgetModule } from './form-widgets/intake-account-widget/intake-account-widget.module'

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
        MedicalRecordsMenuItemComponent,
        AnalysisTaskWidgetModule,
        CustomWidgetModule,
        IntakeAccountWidgetModule
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

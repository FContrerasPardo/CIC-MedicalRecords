import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthGuard, provideTranslations } from '@alfresco/adf-core';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardOverviewComponent } from './dashboard/components/dashboard-overview/dashboard-overview.component';
import { MedicalRecordsShellComponent } from './pages/medical-records-shell/medical-records-shell.component';
import { DashboardBuilderShellComponent } from './pages/dashboard-builder/dashboard-builder-shell.component';
import { DashboardBuilderPaletteComponent } from './dashboard/components/dashboard-builder-palette/dashboard-builder-palette.component';
import { DashboardBuilderDataBindingComponent } from './dashboard/components/dashboard-builder-data-binding/dashboard-builder-data-binding.component';
import { DashboardBuilderThemePanelComponent } from './dashboard/components/dashboard-builder-theme-panel/dashboard-builder-theme-panel.component';
import { DashboardBuilderWidgetEditorModalComponent } from './dashboard/components/dashboard-builder-widget-editor-modal/dashboard-builder-widget-editor-modal.component';
import { DashboardWidgetGridComponent } from './dashboard/components/dashboard-widget-grid/dashboard-widget-grid.component';
import { MetricCardComponent } from './components/metric-card/metric-card.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { WorkflowStepperComponent } from './components/workflow-stepper/workflow-stepper.component';
import { ActionToolbarComponent } from './components/action-toolbar/action-toolbar.component';
import { DataPanelComponent } from './components/data-panel/data-panel.component';
import { MedicalRecordsMenuItemComponent } from './components/medical-records-menu-item/medical-records-menu-item.component';
import { CustomWidgetModule } from './form-widgets/custom-widget/custom-widget.module'
import { AnalysisTaskWidgetModule } from './form-widgets/analysis-task-widget/analysis-task-widget.module';
import { IntakeAccountWidgetModule } from './form-widgets/intake-account-widget/intake-account-widget.module'
import { AgentRulesWidgetModule } from './form-widgets/agent-rules-widget/agent-rules-widget.module';
import { DASHBOARD_LAYOUT_PERSISTENCE } from './dashboard/services/dashboard-layout-persistence.interface';
import { DashboardLayoutRepositoryService } from './dashboard/services/dashboard-layout-repository.service';

@NgModule({
    declarations: [
        MetricCardComponent,
        StatusBadgeComponent,
        WorkflowStepperComponent,
        ActionToolbarComponent,
        DataPanelComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        RouterModule,
        MedicalRecordsShellComponent,
        DashboardBuilderShellComponent,
        DashboardOverviewComponent,
        DashboardWidgetGridComponent,
        DashboardBuilderPaletteComponent,
        DashboardBuilderDataBindingComponent,
        DashboardBuilderThemePanelComponent,
        DashboardBuilderWidgetEditorModalComponent,
        MedicalRecordsMenuItemComponent,
        AnalysisTaskWidgetModule,
        CustomWidgetModule,
        IntakeAccountWidgetModule,
        AgentRulesWidgetModule
    ],
    providers: [
        provideExtensionConfig(['medical-records.extension.json']),
        provideTranslations('medical-records', 'assets/medical-records'),
        { provide: DASHBOARD_LAYOUT_PERSISTENCE, useExisting: DashboardLayoutRepositoryService },
    ],
})
export class MedicalRecordsModule {
    constructor(extensions: ExtensionService) {
        extensions.setAuthGuards({
            'medical-records.auth': AuthGuard,
        });

        extensions.setComponents({
            'medical-records.shell': MedicalRecordsShellComponent,
            'medical-records.dashboard-builder': DashboardBuilderShellComponent,
            'medical-records.sidenav': MedicalRecordsMenuItemComponent,
        });
    }
}

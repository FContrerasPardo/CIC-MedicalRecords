import { NgModule } from '@angular/core';
import { FormRenderingService } from '@alfresco/adf-core';
import { AnalysisTaskWidgetComponent } from './analysis-task-widget.component';

@NgModule({
    imports: [AnalysisTaskWidgetComponent]
})
export class AnalysisTaskWidgetModule {
    constructor(formService: FormRenderingService) {
        formService.register({
            'analysis-task-widget': () => AnalysisTaskWidgetComponent
        });
    }
}

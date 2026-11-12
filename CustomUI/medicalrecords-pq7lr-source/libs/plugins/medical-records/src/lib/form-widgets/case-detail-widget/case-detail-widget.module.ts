import { NgModule } from '@angular/core';
import { FormRenderingService } from '@alfresco/adf-core';
import { CaseDetailWidgetComponent } from './case-detail-widget.component';

@NgModule({
    imports: [CaseDetailWidgetComponent],
})
export class CaseDetailWidgetModule {
    constructor(formService: FormRenderingService) {
        formService.register({
            'case-detail-widget': () => CaseDetailWidgetComponent,
        });
    }
}

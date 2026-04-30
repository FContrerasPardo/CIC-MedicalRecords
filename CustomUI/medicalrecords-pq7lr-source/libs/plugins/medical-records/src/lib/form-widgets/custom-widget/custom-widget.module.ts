import { NgModule } from '@angular/core';
import { FormRenderingService } from '@alfresco/adf-core';
import { CustomWidgetComponent } from './custom-widget.component';

@NgModule({
    imports: [
        CustomWidgetComponent,
    ],
})
export class CustomWidgetModule {
    constructor(formService: FormRenderingService) {
        formService.register({
            'custom-widget': () => CustomWidgetComponent,
            'intake-task-widget': () => CustomWidgetComponent
        });
    }
}

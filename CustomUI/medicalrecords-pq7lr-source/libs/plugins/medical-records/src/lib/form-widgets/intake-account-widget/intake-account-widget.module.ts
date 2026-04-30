import { NgModule } from '@angular/core';
import { FormRenderingService } from '@alfresco/adf-core';
import { IntakeAccountWidgetComponent } from './intake-account-widget.component';

@NgModule({
    imports: [
        IntakeAccountWidgetComponent,
    ],
})
export class IntakeAccountWidgetModule {
    constructor(formService: FormRenderingService) {
        formService.register({
            'intake-account-widget': () => IntakeAccountWidgetComponent
        });
    }
}

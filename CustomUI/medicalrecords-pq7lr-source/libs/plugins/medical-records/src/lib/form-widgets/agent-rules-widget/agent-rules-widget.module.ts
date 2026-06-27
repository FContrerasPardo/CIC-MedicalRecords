import { NgModule } from '@angular/core';
import { FormRenderingService } from '@alfresco/adf-core';
import { AgentRulesWidgetComponent } from './agent-rules-widget.component';

@NgModule({
    imports: [AgentRulesWidgetComponent],
})
export class AgentRulesWidgetModule {
    constructor(formService: FormRenderingService) {
        formService.register({
            'agent-rules': () => AgentRulesWidgetComponent,
            'agent-rules-widget': () => AgentRulesWidgetComponent,
            'agent-rules-widget-oxfam': () => AgentRulesWidgetComponent,
        });
    }
}

import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { DashboardWidgetConfig } from '../../definitions/dashboard-widget.model';
import { ProcessAttentionListState } from '../../definitions/process-attention.model';
import { MedicalRecordsTaskQueryService } from '../../services/medical-records-task-query.service';
import { PROCESS_LIST_DEFAULT_VARIABLES } from '../../utils/dashboard-data-plan.util';
import { resolveTaskQueryScope, TaskQueryScope } from '../../utils/process-list-scope.util';

/** Builder preview of an open-tasks widget: effective process scope and the live task count. */
@Component({
    selector: 'medical-records-dashboard-builder-process-list-preview',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './dashboard-builder-process-list-preview.component.html',
    styleUrls: ['./dashboard-builder-process-list-preview.component.scss'],
})
export class DashboardBuilderProcessListPreviewComponent implements OnChanges {
    @Input({ required: true }) widget!: DashboardWidgetConfig;

    state$?: Observable<ProcessAttentionListState>;
    scope!: TaskQueryScope;

    private boundScopeKey: string | null = null;

    constructor(private readonly taskQueryService: MedicalRecordsTaskQueryService) {}

    ngOnChanges(): void {
        const options = this.widget?.processListOptions;
        this.scope = resolveTaskQueryScope(options);
        const key = this.taskQueryService.scopeKey(options);
        if (key !== this.boundScopeKey) {
            this.boundScopeKey = key;
            this.state$ = this.taskQueryService.stateFor(options);
            this.taskQueryService.loadAttentionItems(options);
        }
    }

    get configuredVariables(): string[] {
        return (this.widget?.processListOptions?.variables ?? []).map((name) => name.trim()).filter(Boolean);
    }

    get variableCount(): number {
        return this.configuredVariables.length || PROCESS_LIST_DEFAULT_VARIABLES.length;
    }

    get subprocessKeys(): string {
        return this.scope.subprocesses.map((identity) => identity.key).join(', ');
    }

    refresh(): void {
        this.taskQueryService.loadAttentionItems(this.widget?.processListOptions);
    }
}

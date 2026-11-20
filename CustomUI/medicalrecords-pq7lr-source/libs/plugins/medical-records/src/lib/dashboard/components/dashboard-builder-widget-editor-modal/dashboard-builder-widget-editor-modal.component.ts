import { rootProcessKey } from '../../definitions/process-mapping';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DashboardWidgetRegistryService } from '../../services/dashboard-widget-registry.service';
import { DEFAULT_PROCESS_STATUSES } from '../../utils/dashboard-data-source.util';
import { DashboardContainerLayoutMode, DashboardProcessListOptions, DashboardWidgetConfig, ProcessListOpenTarget } from '../../definitions/dashboard-widget.model';
import { DashboardBuilderAppearancePanelComponent } from '../dashboard-builder-appearance-panel/dashboard-builder-appearance-panel.component';
import { DashboardBuilderDataBindingComponent } from '../dashboard-builder-data-binding/dashboard-builder-data-binding.component';
import { DashboardBuilderProcessListPreviewComponent } from '../dashboard-builder-process-list-preview/dashboard-builder-process-list-preview.component';
import { DashboardBuilderProcessListScopeComponent } from '../dashboard-builder-process-list-scope/dashboard-builder-process-list-scope.component';
import { DashboardGaugeWidgetComponent } from '../widgets/dashboard-gauge-widget/dashboard-gauge-widget.component';
import { DashboardChartWidgetComponent } from '../widgets/dashboard-chart-widget/dashboard-chart-widget.component';
import { DashboardLinkCardWidgetComponent } from '../widgets/dashboard-link-card-widget/dashboard-link-card-widget.component';
import { DashboardMetricWidgetComponent } from '../widgets/dashboard-metric-widget/dashboard-metric-widget.component';
import { DashboardProviderCardsWidgetComponent } from '../widgets/dashboard-provider-cards-widget/dashboard-provider-cards-widget.component';
import { BILLING_FIELDS } from '../../../form-widgets/intake-account-widget/batch-state-billing-fields';
import {
    ACTIVE_PROCESS_STATUSES,
    ProviderCardMetric,
    ProviderKpiKey,
    providerRequiredVariables,
    resolveProviderMetrics,
} from '../../utils/dashboard-provider-group.util';
import { DashboardTableWidgetComponent } from '../widgets/dashboard-table-widget/dashboard-table-widget.component';
import { DashboardTaskRecentListWidgetComponent } from '../widgets/dashboard-task-recent-list-widget/dashboard-task-recent-list-widget.component';
import { DashboardTaskStatusSummaryWidgetComponent } from '../widgets/dashboard-task-status-summary-widget/dashboard-task-status-summary-widget.component';

@Component({
    selector: 'medical-records-dashboard-builder-widget-editor-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        DashboardBuilderAppearancePanelComponent,
        DashboardBuilderDataBindingComponent,
        DashboardBuilderProcessListPreviewComponent,
        DashboardBuilderProcessListScopeComponent,
        DashboardChartWidgetComponent,
        DashboardMetricWidgetComponent,
        DashboardGaugeWidgetComponent,
        DashboardTableWidgetComponent,
        DashboardLinkCardWidgetComponent,
        DashboardTaskStatusSummaryWidgetComponent,
        DashboardTaskRecentListWidgetComponent,
        DashboardProviderCardsWidgetComponent,
    ],
    templateUrl: './dashboard-builder-widget-editor-modal.component.html',
    styleUrls: ['./dashboard-builder-widget-editor-modal.component.scss'],
})
export class DashboardBuilderWidgetEditorModalComponent implements OnInit {
    @Input({ required: true }) widget!: DashboardWidgetConfig;
    @Input() containerLayoutMode?: DashboardContainerLayoutMode;
    @Output() widgetPatch = new EventEmitter<Partial<DashboardWidgetConfig>>();
    @Output() closeModal = new EventEmitter<void>();

    readonly bindingScope = 'modal';

    get isDataWidget(): boolean {
        return ['metric', 'chart', 'table', 'gauge'].includes(this.widget.type);
    }

    get isGaugeWidget(): boolean {
        return this.widget.type === 'gauge';
    }

    get isProcessListWidget(): boolean {
        return this.widget.type === 'process-list';
    }

    readonly metricKinds: ReadonlyArray<ProviderCardMetric['kind']> = ['count', 'status', 'field-equals', 'review-required', 'sum'];
    readonly processStatuses: readonly string[] = [...DEFAULT_PROCESS_STATUSES];

    /** Process variable names found in the live process query (for the group/field selectors). */
    discoveredVariables: string[] = [];
    variablesLoading = false;

    private readonly widgetRegistry = inject(DashboardWidgetRegistryService);
    private readonly translate = inject(TranslateService);
    private variablesRequested = false;

    ngOnInit(): void {
        if (this.isProviderCardsWidget) {
            this.loadProcessVariables();
        }
    }

    /** Lists `var_*` fields returned by the medical-records process query (enriched with variables). */
    loadProcessVariables(): void {
        if (this.variablesRequested) {
            return;
        }
        this.variablesRequested = true;
        this.variablesLoading = true;
        const config: DashboardWidgetConfig = {
            ...this.widget,
            dataSource: 'process',
            processQuery: {
                processDefinitionKey: rootProcessKey(),
                includeSubprocesses: false,
                metricScope: 'root',
                ...this.widget.processQuery,
                status: this.providerStatuses,
                includeProcessVariables: true,
            },
        };
        this.widgetRegistry.discoverFields(config).subscribe({
            next: (fields) => {
                this.discoveredVariables = fields
                    .map((field) => field.key)
                    .filter((key) => key.startsWith('var_'))
                    .map((key) => key.slice(4))
                    .sort((a, b) => a.localeCompare(b));
                this.variablesLoading = false;
            },
            error: () => {
                this.discoveredVariables = [];
                this.variablesLoading = false;
            },
        });
    }

    get metrics(): ProviderCardMetric[] {
        return resolveProviderMetrics(this.widget.providerCardsOptions, (key) =>
            this.translate.instant(this.providerKpiLabelKey(key))
        );
    }

    metricKindLabelKey(kind: ProviderCardMetric['kind']): string {
        return `MEDICAL_RECORDS.DASHBOARD_BUILDER.PROVIDER_CARDS_OPTIONS.KIND_${kind.replace(/-/g, '_').toUpperCase()}`;
    }

    addMetric(): void {
        const metric: ProviderCardMetric = {
            id: `metric-${Date.now().toString(36)}`,
            label: this.translate.instant('MEDICAL_RECORDS.DASHBOARD_BUILDER.PROVIDER_CARDS_OPTIONS.NEW_METRIC'),
            kind: 'count',
        };
        this.saveMetrics([...this.metrics, metric]);
    }

    updateMetric(index: number, patch: Partial<ProviderCardMetric>): void {
        this.saveMetrics(this.metrics.map((metric, position) => (position === index ? { ...metric, ...patch } : metric)));
    }

    updateMetricField(index: number, patch: Partial<NonNullable<ProviderCardMetric['field']>>): void {
        const current = this.metrics[index]?.field ?? { source: 'batch-field' as const, name: '' };
        if (patch.source === 'process-variable') {
            this.loadProcessVariables();
        }
        this.updateMetric(index, { field: { ...current, ...patch } });
    }

    moveMetric(index: number, delta: -1 | 1): void {
        const metrics = this.metrics;
        const target = index + delta;
        if (target < 0 || target >= metrics.length) {
            return;
        }
        [metrics[index], metrics[target]] = [metrics[target], metrics[index]];
        this.saveMetrics(metrics);
    }

    removeMetric(index: number): void {
        const metrics = this.metrics;
        if (metrics.length > 1) {
            this.saveMetrics(metrics.filter((_, position) => position !== index));
        }
    }

    patchCrossFilter(patch: Partial<NonNullable<DashboardWidgetConfig['crossFilter']>>): void {
        this.patchWidget({ crossFilter: { ...this.widget.crossFilter, ...patch } });
    }

    /** Variables this widget makes the data planner request, derived from its configuration. */
    get requiredVariables(): string[] {
        return providerRequiredVariables(this.widget.providerCardsOptions);
    }

    patchProviderOptions(patch: Partial<NonNullable<DashboardWidgetConfig['providerCardsOptions']>>): void {
        this.patchWidget({ providerCardsOptions: { ...this.widget.providerCardsOptions, ...patch } });
    }

    get providerStatuses(): string[] {
        const configured = this.widget.providerCardsOptions?.statuses?.filter((status) => !!status);
        return configured?.length ? configured : [...ACTIVE_PROCESS_STATUSES];
    }

    toggleProviderStatus(status: string, checked: boolean): void {
        const next = checked
            ? [...new Set([...this.providerStatuses, status])]
            : this.providerStatuses.filter((entry) => entry !== status);
        if (next.length) {
            this.patchWidget({ providerCardsOptions: { ...this.widget.providerCardsOptions, statuses: next } });
        }
    }

    private saveMetrics(metrics: ProviderCardMetric[]): void {
        this.patchWidget({ providerCardsOptions: { ...this.widget.providerCardsOptions, metrics } });
    }

    /** Known IDP field names suggested for batch-field grouping (provider, payer, invoice). */
    readonly batchFieldSuggestions: readonly string[] = [
        ...BILLING_FIELDS.provider,
        ...BILLING_FIELDS.insurancePlan,
        ...BILLING_FIELDS.invoiceNumber,
    ];

    get groupBySource(): 'batch-field' | 'process-variable' {
        return this.widget.providerCardsOptions?.groupBy?.source ?? 'batch-field';
    }

    get groupByName(): string {
        return this.widget.providerCardsOptions?.groupBy?.name ?? '';
    }

    setGroupBySource(source: 'batch-field' | 'process-variable'): void {
        if (source === 'process-variable') {
            this.loadProcessVariables();
        }
        this.patchWidget({ providerCardsOptions: { ...this.widget.providerCardsOptions, groupBy: { source, name: '' } } });
    }

    setGroupByName(name: string): void {
        this.patchWidget({
            providerCardsOptions: { ...this.widget.providerCardsOptions, groupBy: { source: this.groupBySource, name: name ?? '' } },
        });
    }

    get isProviderCardsWidget(): boolean {
        return this.widget.type === 'provider-cards';
    }

    providerKpiLabelKey(key: ProviderKpiKey): string {
        return `MEDICAL_RECORDS.DASHBOARD.PROVIDER_CARDS.KPI_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    }

    patchWidget(patch: Partial<DashboardWidgetConfig>): void {
        this.widgetPatch.emit(patch);
    }

    updateProcessListOption(key: keyof DashboardProcessListOptions, checked: boolean): void {
        this.patchWidget({
            processListOptions: {
                ...this.widget.processListOptions,
                [key]: checked,
            },
        });
    }

    updateProcessListDisplay(value: 'table' | 'cards'): void {
        this.patchWidget({
            processListOptions: {
                ...this.widget.processListOptions,
                display: value,
            },
        });
    }

    updateProcessListOpenTarget(value: ProcessListOpenTarget): void {
        this.patchWidget({
            processListOptions: {
                ...this.widget.processListOptions,
                openTarget: value,
            },
        });
    }

    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeModal.emit();
        }
    }
}

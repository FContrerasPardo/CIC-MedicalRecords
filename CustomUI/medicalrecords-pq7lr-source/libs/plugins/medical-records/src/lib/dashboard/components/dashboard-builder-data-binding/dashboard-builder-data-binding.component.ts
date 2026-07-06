import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';
import {
    ComparisonPeriod,
    ChartAggregation,
    ValueAggregation,
    ChartDateBucket,
    ChartDisplayMode,
    ChartXLabelFormat,
    DashboardChartAxisOptions,
    DashboardDataSource,
    DashboardFieldDescriptor,
    DashboardFieldKind,
    DashboardJsonFieldPathOption,
    GaugeMode,
    DashboardWidgetConfig,
    DashboardWidgetDataBindings,
    ValueFieldFormat,
} from '../../definitions/dashboard-widget.model';
import {
    DASHBOARD_PROCESS_CATALOG,
    DashboardProcessCatalogEntry,
    defaultIncludedSubprocessKeys,
    findProcessCatalogEntry,
    resolveProcessDefinitionKeys,
} from '../../definitions/dashboard-process-catalog';
import {
    CONTENT_QUERY_PRESETS,
    ContentQueryPreset,
    PROCESS_QUERY_PRESETS,
    ProcessQueryPreset,
} from '../../definitions/dashboard-query-presets';
import { mergeBindingsPatch } from '../../mappers/dashboard-widget-bindings.mapper';
import { DashboardPeriodService } from '../../services/dashboard-period.service';
import { DashboardWidgetRegistryService } from '../../services/dashboard-widget-registry.service';
import { buildFieldsDiscoveryFingerprint, DEFAULT_PROCESS_STATUSES, isLikelyContentFieldKey, resolveWidgetDataSource } from '../../utils/dashboard-data-source.util';
import { toIsoDate } from '../../utils/dashboard-date-range.util';
import { formatBindingFieldLabel, pickDefaultJsonPath } from '../../utils/dashboard-json-field.util';
import { isNumericFieldAggregation } from '../../utils/dashboard-numeric-aggregation.util';

type BindingSlot = 'argument' | 'value' | 'series' | 'column';

@Component({
    selector: 'medical-records-dashboard-builder-data-binding',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, DragDropModule],
    templateUrl: './dashboard-builder-data-binding.component.html',
    styleUrls: ['./dashboard-builder-data-binding.component.scss'],
    host: {
        class: 'data-binding-host',
        '[class.data-binding-host--items-table]': 'isTableItemsPanel',
    },
})
export class DashboardBuilderDataBindingComponent implements OnInit, OnChanges {
    @Input({ required: true }) widget!: DashboardWidgetConfig;
    @Input() panel: 'all' | 'provider' | 'items' | 'axes' = 'all';
    @Input() bindingScope = 'default';
    @Output() widgetPatch = new EventEmitter<Partial<DashboardWidgetConfig>>();

    discoveredFields: DashboardFieldDescriptor[] = [];
    fieldsLoading = false;
    fieldSearchQuery = '';
    fieldKindFilter: DashboardFieldKind | 'all' = 'all';

    readonly dataSources: DashboardDataSource[] = ['demo', 'content', 'process'];
    readonly processCatalog = DASHBOARD_PROCESS_CATALOG;
    readonly contentQueryPresets = CONTENT_QUERY_PRESETS;
    readonly processQueryPresets = PROCESS_QUERY_PRESETS;
    readonly chartDateBuckets: ChartDateBucket[] = ['hour', 'day', 'week', 'month'];
    readonly chartAggregations: ChartAggregation[] = ['count', 'sum'];
    readonly valueMetricAggregations: ValueAggregation[] = ['count', 'sum', 'min', 'max', 'avg'];
    readonly valueFieldFormatOptions: ValueFieldFormat[] = ['number', 'percent'];
    readonly chartDisplayModes: ChartDisplayMode[] = ['bar', 'line', 'stacked-bar', 'horizontal-stacked', 'donut'];
    readonly comparisonPeriods: ComparisonPeriod[] = ['none', 'previous_week', 'previous_month'];
    readonly gaugeModes: GaugeMode[] = ['count', 'ratio'];
    readonly xLabelFormats: ChartXLabelFormat[] = ['auto', 'full'];
    readonly fieldKindFilters: Array<DashboardFieldKind | 'all'> = ['all', 'date', 'number', 'category', 'json'];

    private fieldsQueryFingerprint = '';
    private fieldsRequestId = 0;

    constructor(
        private readonly widgetRegistry: DashboardWidgetRegistryService,
        readonly periodService: DashboardPeriodService
    ) {}

    ngOnInit(): void {
        this.emitProcessChartBindingFixIfNeeded();
        this.refreshFields(true);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['widget'] && this.widget && !changes['widget'].firstChange) {
            const fingerprint = this.buildFieldsQueryFingerprint(this.widget);
            if (fingerprint !== this.fieldsQueryFingerprint) {
                this.refreshFields(false);
            }
        }
    }

    get bindings(): DashboardWidgetDataBindings {
        return this.widget.bindings ?? {};
    }

    get selectedProcessCatalogEntry(): DashboardProcessCatalogEntry | undefined {
        return findProcessCatalogEntry(this.selectedProcessKey);
    }

    get selectedProcessKey(): string {
        return (
            this.widget.processQuery?.processDefinitionKey ??
            this.widget.processQuery?.processDefinitionName ??
            this.processCatalog[0]?.key ??
            'medical-records'
        );
    }

    get processMetricScope(): 'root' | 'tree' {
        const entry = this.selectedProcessCatalogEntry;
        return this.widget.processQuery?.metricScope ?? entry?.defaultMetricScope ?? 'root';
    }

    get includedSubprocessKeys(): string[] {
        const configured = this.widget.processQuery?.includedSubprocessDefinitionKeys;
        if (configured !== undefined) {
            return configured;
        }
        if (this.processMetricScope === 'tree') {
            return defaultIncludedSubprocessKeys(this.selectedProcessKey);
        }
        return [];
    }

    get resolvedProcessDefinitionKeys(): string[] {
        return resolveProcessDefinitionKeys(this.widget.processQuery ?? {});
    }

    formatDateRangeLabel(value: Date): string {
        return toIsoDate(value);
    }

    get isChartWidget(): boolean {
        return this.widget.type === 'chart';
    }

    get isMetricWidget(): boolean {
        return this.widget.type === 'metric';
    }

    get isTableWidget(): boolean {
        return this.widget.type === 'table';
    }

    get isGaugeWidget(): boolean {
        return this.widget.type === 'gauge';
    }

    get usesValueBindings(): boolean {
        return this.isChartWidget || this.isMetricWidget || this.isGaugeWidget;
    }

    get supportsProcessVariablesOption(): boolean {
        return this.isTableWidget || this.usesValueBindings;
    }

    get showProviderPanel(): boolean {
        return this.panel === 'all' || this.panel === 'provider';
    }

    get showItemsPanel(): boolean {
        return this.panel === 'all' || this.panel === 'items';
    }

    get showAxesPanel(): boolean {
        return this.panel === 'axes';
    }

    get showAxisSettingsInItems(): boolean {
        return this.isChartWidget && (this.panel === 'all' || (this.panel === 'items' && this.bindingScope !== 'modal'));
    }

    get filteredFields(): DashboardFieldDescriptor[] {
        const query = this.fieldSearchQuery.trim().toLowerCase();

        return this.discoveredFields.filter((field) => {
            const matchesKind = this.fieldKindFilter === 'all' || field.kind === this.fieldKindFilter;
            const matchesName = !query || field.key.toLowerCase().includes(query);
            return matchesKind && matchesName;
        });
    }

    get hasActiveFieldFilter(): boolean {
        return !!this.fieldSearchQuery.trim() || this.fieldKindFilter !== 'all';
    }

    get showFieldFilters(): boolean {
        return !this.fieldsLoading && this.discoveredFields.length > 0;
    }

    get isTableItemsPanel(): boolean {
        return this.isTableWidget && this.panel === 'items';
    }

    get showTableColumnFieldFilters(): boolean {
        return this.isTableItemsPanel;
    }

    get showRowFilterOption(): boolean {
        return this.isTableWidget && this.showItemsPanel;
    }

    get tableShowRowFilter(): boolean {
        return this.widget.tableOptions?.showRowFilter !== false;
    }

    get groupByFields(): string[] {
        return this.widget.tableOptions?.groupByFields ?? [];
    }

    get availableGroupByFields(): DashboardFieldDescriptor[] {
        const used = new Set(this.groupByFields);
        return this.discoveredFields.filter((field) => !used.has(field.key));
    }

    get showProviderFieldList(): boolean {
        return !this.isTableWidget || this.panel !== 'provider';
    }

    get selectedTableFields(): DashboardFieldDescriptor[] {
        const fieldMap = new Map(this.discoveredFields.map((field) => [field.key, field]));
        return (this.bindings.columnFields ?? [])
            .map((key) => fieldMap.get(key))
            .filter((field): field is DashboardFieldDescriptor => !!field);
    }

    get unselectedTableFields(): DashboardFieldDescriptor[] {
        const selected = new Set(this.bindings.columnFields ?? []);
        return this.filteredFields.filter((field) => !selected.has(field.key));
    }

    get selectedColumnCount(): number {
        return (this.bindings.columnFields ?? []).length;
    }

    get fieldSourceListId(): string {
        return `binding-field-source-${this.bindingScope}`;
    }

    get usesNumericFieldBinding(): boolean {
        return isNumericFieldAggregation(this.bindings.valueAggregation);
    }

    get valueAggregationOptions(): ValueAggregation[] {
        return this.isChartWidget ? this.valueMetricAggregations.filter((item) => item === 'count' || item === 'sum') : this.valueMetricAggregations;
    }

    get bindingDropListIds(): string[] {
        const ids = [this.fieldSourceListId];

        if (this.isChartWidget || this.isMetricWidget || this.isGaugeWidget) {
            ids.push(this.slotId('value'));
        }
        if (this.isChartWidget) {
            ids.push(`binding-argument-slot-${this.bindingScope}`, `binding-series-slot-${this.bindingScope}`);
        }
        if (this.isTableWidget) {
            ids.push(`binding-columns-slot-${this.bindingScope}`);
        }

        return ids;
    }

    slotId(slot: 'value' | 'argument' | 'series' | 'column'): string {
        return `binding-${slot}-slot-${this.bindingScope}`;
    }

    get selectedArgumentKind(): DashboardFieldKind | null {
        const key = this.bindings.argumentField;
        if (!key) {
            return null;
        }
        const field = this.discoveredFields.find((item) => item.key === key);
        if (!field) {
            return null;
        }
        if (field.kind === 'json') {
            const path = this.bindings.argumentFieldPath;
            if (!path) {
                return 'json';
            }
            return field.jsonPaths?.find((item) => item.path === path)?.kind ?? 'category';
        }
        return field.kind;
    }

    get selectedArgumentIsJson(): boolean {
        return this.isBoundFieldJson(this.bindings.argumentField, this.bindings.argumentFieldPath);
    }

    get selectedValueIsJson(): boolean {
        return this.isBoundFieldJson(this.bindings.valueField, this.bindings.valueFieldPath);
    }

    get selectedSeriesIsJson(): boolean {
        return this.isBoundFieldJson(this.bindings.seriesField, this.bindings.seriesFieldPath);
    }

    get argumentJsonPaths(): DashboardJsonFieldPathOption[] {
        return this.jsonPathsForField(this.bindings.argumentField, this.bindings.argumentFieldPath);
    }

    get valueJsonPaths(): DashboardJsonFieldPathOption[] {
        return this.jsonPathsForField(this.bindings.valueField, this.bindings.valueFieldPath);
    }

    get selectedValuePathKind(): DashboardFieldKind | null {
        const path = this.bindings.valueFieldPath;
        if (!path) {
            return null;
        }
        return this.valueJsonPaths.find((item) => item.path === path)?.kind ?? null;
    }

    get showValueJsonPathWarning(): boolean {
        return (
            this.selectedValueIsJson &&
            this.usesNumericFieldBinding &&
            !!this.bindings.valueFieldPath &&
            this.selectedValuePathKind !== 'number'
        );
    }

    get seriesJsonPaths(): DashboardJsonFieldPathOption[] {
        return this.jsonPathsForField(this.bindings.seriesField, this.bindings.seriesFieldPath);
    }

    fieldIcon(kind: DashboardFieldKind): string {
        switch (kind) {
            case 'date':
                return 'schedule';
            case 'number':
                return 'pin';
            case 'json':
                return 'data_object';
            default:
                return 'text_fields';
        }
    }

    refreshFields(force = false, config: DashboardWidgetConfig = this.widget): void {
        const fingerprint = this.buildFieldsQueryFingerprint(config);
        if (!force && fingerprint === this.fieldsQueryFingerprint) {
            return;
        }

        this.fieldsQueryFingerprint = fingerprint;
        this.fieldsLoading = true;
        if (force) {
            this.clearFieldFilters();
        }

        const requestId = ++this.fieldsRequestId;
        this.widgetRegistry.discoverFields(config).subscribe((fields) => {
            if (requestId !== this.fieldsRequestId) {
                return;
            }
            this.discoveredFields = fields;
            this.fieldsLoading = false;
        });
    }

    patchWidget(patch: Partial<DashboardWidgetConfig>): void {
        this.widgetPatch.emit(patch);
    }

    patchBindings(patch: Partial<DashboardWidgetDataBindings>): void {
        const bindings = mergeBindingsPatch(this.widget.bindings, patch);
        const tablePatch: Partial<DashboardWidgetConfig> = { bindings };
        if (patch.columnFields !== undefined) {
            tablePatch.tableColumnKeys = patch.columnFields.join(', ');
        }
        this.patchWidget(tablePatch);
    }

    onDataSourceChange(value: DashboardDataSource): void {
        const patch: Partial<DashboardWidgetConfig> = { dataSource: value };

        if (value === 'content') {
            patch.processQuery = undefined;
            if (!this.widget.contentQuery) {
                patch.contentQuery = CONTENT_QUERY_PRESETS[0].query;
            }
        }

        if (value === 'process') {
            patch.contentQuery = undefined;
            if (!this.widget.processQuery) {
                const entry = this.processCatalog[0];
                patch.processQuery = {
                    processDefinitionKey: entry?.key ?? 'medical-records',
                    includeSubprocesses: entry?.defaultIncludeSubprocesses ?? true,
                    metricScope: this.isTableWidget ? 'tree' : entry?.defaultMetricScope ?? 'root',
                    status: [...(entry?.defaultStatus ?? ['RUNNING', 'COMPLETED', 'SUSPENDED'])],
                };
            }
            if (this.isTableWidget) {
                Object.assign(patch, this.tableDataSourceResetPatch('process'));
            }
        }

        if (value === 'content' && this.isTableWidget) {
            Object.assign(patch, this.tableDataSourceResetPatch('content'));
        }

        if (value === 'demo' && this.isTableWidget) {
            Object.assign(patch, this.tableDataSourceResetPatch('demo'));
        }

        if (value === 'demo') {
            patch.processQuery = undefined;
            patch.contentQuery = undefined;
        }

        Object.assign(patch, this.defaultChartBindingsPatch(value));
        const mergedWidget = this.previewWidgetPatch(patch);
        this.patchWidget(patch);
        this.discoveredFields = [];
        this.refreshFields(true, mergedWidget);
    }

    applyContentPreset(preset: ContentQueryPreset): void {
        const patch: Partial<DashboardWidgetConfig> = { dataSource: 'content', contentQuery: preset.query };
        const mergedWidget = this.previewWidgetPatch(patch);
        this.patchWidget(patch);
        this.refreshFields(true, mergedWidget);
    }

    applyProcessPreset(preset: ProcessQueryPreset): void {
        const entry = findProcessCatalogEntry(preset.processDefinitionKey ?? preset.processDefinitionName);
        const current = this.widget.processQuery ?? {};
        const processKey = preset.processDefinitionKey ?? preset.processDefinitionName;
        const metricScope = this.isTableWidget ? 'tree' : entry?.defaultMetricScope ?? 'root';
        this.patchWidget({
            dataSource: 'process',
            contentQuery: undefined,
            processQuery: {
                ...current,
                processDefinitionKey: processKey,
                processDefinitionName: processKey,
                includeSubprocesses: entry?.defaultIncludeSubprocesses ?? true,
                metricScope,
                includedSubprocessDefinitionKeys:
                    metricScope === 'tree' ? defaultIncludedSubprocessKeys(processKey) : undefined,
                status: [...preset.status],
            },
        });
        this.refreshFields(true);
    }

    formatStatusList(status?: string[]): string {
        return status?.length ? status.join(', ') : DEFAULT_PROCESS_STATUSES.join(', ');
    }

    onProcessCatalogChange(processDefinitionKey: string): void {
        const entry = findProcessCatalogEntry(processDefinitionKey);
        const current = this.widget.processQuery ?? {};
        const metricScope = entry?.defaultMetricScope ?? current.metricScope ?? 'root';
        const patch: Partial<DashboardWidgetConfig> = {
            processQuery: {
                ...current,
                processDefinitionKey,
                processDefinitionName: processDefinitionKey,
                includeSubprocesses: entry?.defaultIncludeSubprocesses ?? true,
                metricScope,
                includedSubprocessDefinitionKeys:
                    metricScope === 'tree' ? defaultIncludedSubprocessKeys(processDefinitionKey) : undefined,
                status: current.status?.length ? current.status : [...(entry?.defaultStatus ?? ['RUNNING', 'COMPLETED', 'SUSPENDED'])],
            },
        };
        Object.assign(patch, this.defaultChartBindingsPatch('process'));
        this.patchWidget(patch);
    }

    onProcessMetricScopeChange(scope: 'root' | 'tree'): void {
        const current = this.widget.processQuery ?? {};
        this.patchWidget({
            processQuery: {
                ...current,
                metricScope: scope,
                includeSubprocesses: scope === 'tree',
                includedSubprocessDefinitionKeys:
                    scope === 'tree'
                        ? current.includedSubprocessDefinitionKeys ?? defaultIncludedSubprocessKeys(this.selectedProcessKey)
                        : undefined,
            },
        });
        this.refreshFields(true);
    }

    isSubprocessIncluded(subprocessKey: string): boolean {
        return this.includedSubprocessKeys.includes(subprocessKey);
    }

    toggleSubprocessDefinition(subprocessKey: string): void {
        const current = this.widget.processQuery ?? {};
        const base =
            current.includedSubprocessDefinitionKeys ??
            (this.processMetricScope === 'tree' ? defaultIncludedSubprocessKeys(this.selectedProcessKey) : []);
        const next = base.includes(subprocessKey)
            ? base.filter((key) => key !== subprocessKey)
            : [...base, subprocessKey];

        this.patchWidget({
            processQuery: {
                ...current,
                metricScope: 'tree',
                includeSubprocesses: true,
                includedSubprocessDefinitionKeys: next,
            },
        });
        this.refreshFields(true);
    }

    private defaultChartBindingsPatch(dataSource: DashboardDataSource): Partial<DashboardWidgetConfig> {
        if (!this.isChartWidget || dataSource !== 'process') {
            return {};
        }

        const bindings = this.widget.bindings ?? {};
        const needsArgumentReset =
            !bindings.argumentField || isLikelyContentFieldKey(bindings.argumentField);
        const needsValueReset = !!bindings.valueField && isLikelyContentFieldKey(bindings.valueField);
        const needsSeriesReset = !!bindings.seriesField && isLikelyContentFieldKey(bindings.seriesField);

        if (!needsArgumentReset && !needsValueReset && !needsSeriesReset) {
            return {};
        }

        return {
            bindings: mergeBindingsPatch(bindings, {
                ...(needsArgumentReset
                    ? {
                          argumentField: 'startDate',
                          valueAggregation: bindings.valueAggregation ?? 'count',
                          dateBucket: bindings.dateBucket ?? 'day',
                          maxBuckets: bindings.maxBuckets ?? 12,
                      }
                    : {}),
                ...(needsValueReset ? { valueField: undefined, valueAggregation: 'count' } : {}),
                ...(needsSeriesReset ? { seriesField: undefined } : {}),
            }),
        };
    }

    private emitProcessChartBindingFixIfNeeded(): void {
        if (resolveWidgetDataSource(this.widget) !== 'process') {
            return;
        }

        const patch = this.defaultChartBindingsPatch('process');
        if (Object.keys(patch).length) {
            this.patchWidget(patch);
        }
    }

    onProcessStatusChange(raw: string): void {
        const status = raw
            .split(',')
            .map((value) => value.trim().toUpperCase())
            .filter(Boolean);
        const current = this.widget.processQuery ?? {};
        this.patchWidget({
            processQuery: {
                ...current,
                status: status.length ? status : [...DEFAULT_PROCESS_STATUSES],
            },
        });
        this.refreshFields(true);
    }

    onIncludeProcessVariablesChange(checked: boolean): void {
        const current = this.widget.processQuery ?? {};
        this.patchWidget({
            processQuery: {
                ...current,
                includeProcessVariables: checked,
            },
        });
        this.refreshFields(true);
    }

    onFieldDrop(event: CdkDragDrop<DashboardFieldDescriptor[]>, slot: BindingSlot): void {
        if (event.previousContainer === event.container) {
            return;
        }

        const field = event.item.data as DashboardFieldDescriptor;
        this.assignFieldToSlot(field, slot);
    }

    onFieldClick(field: DashboardFieldDescriptor): void {
        if (this.isTableWidget) {
            this.toggleColumn(field.key, !this.isColumnSelected(field.key));
            return;
        }

        if (this.isChartWidget) {
            if (!this.bindings.argumentField && this.canDropField(field, 'argument')) {
                this.assignFieldToSlot(field, 'argument');
                return;
            }
            if (this.isNumericFieldBindingActive() && !this.bindings.valueField && this.canDropField(field, 'value')) {
                this.assignFieldToSlot(field, 'value');
                return;
            }
            if (!this.bindings.seriesField && this.canDropField(field, 'series')) {
                this.assignFieldToSlot(field, 'series');
            }
            return;
        }

        if ((this.isMetricWidget || this.isGaugeWidget) && this.canDropField(field, 'value')) {
            this.assignNumericFieldToValueSlot(field);
        }
    }

    private isNumericFieldBindingActive(): boolean {
        return isNumericFieldAggregation(this.bindings.valueAggregation);
    }

    private assignNumericFieldToValueSlot(field: DashboardFieldDescriptor): void {
        if (!isNumericFieldAggregation(this.bindings.valueAggregation)) {
            this.patchBindings({ valueAggregation: 'sum' });
        }
        this.assignFieldToSlot(field, 'value');
    }

    assignFieldToSlot(field: DashboardFieldDescriptor, slot: BindingSlot): void {
        if (!field?.key || !this.canDropField(field, slot)) {
            return;
        }

        if (slot === 'argument') {
            const defaultPath =
                field.kind === 'json' ? pickDefaultJsonPath(field.jsonPaths ?? [], 'argument') : undefined;
            this.patchBindings({ argumentField: field.key, argumentFieldPath: defaultPath });
            if (!this.widget.chartAxes?.xLabel?.trim()) {
                this.patchChartAxes({ xLabel: formatBindingFieldLabel(field.key, defaultPath) });
            }
            return;
        }

        if (slot === 'value') {
            const defaultPath =
                field.kind === 'json' ? pickDefaultJsonPath(field.jsonPaths ?? [], 'value') : undefined;
            const aggregation: ValueAggregation = isNumericFieldAggregation(this.bindings.valueAggregation)
                ? this.bindings.valueAggregation
                : 'sum';
            this.patchBindings({ valueField: field.key, valueFieldPath: defaultPath, valueAggregation: aggregation });
            if (!this.widget.chartAxes?.yLabel?.trim()) {
                this.patchChartAxes({ yLabel: formatBindingFieldLabel(field.key, defaultPath) });
            }
            return;
        }

        if (slot === 'series') {
            const defaultPath =
                field.kind === 'json' ? pickDefaultJsonPath(field.jsonPaths ?? [], 'series') : undefined;
            this.patchBindings({ seriesField: field.key, seriesFieldPath: defaultPath });
            return;
        }

        const columns = [...(this.bindings.columnFields ?? [])];
        if (!columns.includes(field.key)) {
            columns.push(field.key);
            this.patchBindings({ columnFields: columns });
        }
    }

    canDropField(field: DashboardFieldDescriptor, slot: BindingSlot): boolean {
        if (slot === 'argument') {
            return field.kind === 'date' || field.kind === 'category' || field.kind === 'json';
        }
        if (slot === 'value') {
            return field.kind === 'number' || field.kind === 'json';
        }
        if (slot === 'series') {
            if (field.kind === 'category') {
                return true;
            }
            if (field.kind === 'json') {
                return (field.jsonPaths ?? []).some((path) => path.kind === 'category' || path.kind === 'date');
            }
            return false;
        }
        return true;
    }

    clearBinding(key: keyof DashboardWidgetDataBindings): void {
        const patch: Partial<DashboardWidgetDataBindings> = { [key]: undefined };
        if (key === 'argumentField') {
            patch.argumentFieldPath = undefined;
        }
        if (key === 'valueField') {
            patch.valueFieldPath = undefined;
            patch.valueFieldFormat = undefined;
        }
        if (key === 'seriesField') {
            patch.seriesFieldPath = undefined;
        }
        this.patchBindings(patch);
    }

    bindingFieldLabel(fieldKey?: string, fieldPath?: string): string {
        return formatBindingFieldLabel(fieldKey ?? '', fieldPath);
    }

    jsonPathOptionLabel(path: DashboardJsonFieldPathOption): string {
        const base = path.sample?.trim() ? `${path.path} (${path.sample})` : path.path;
        return path.kind ? `${base} · ${path.kind}` : base;
    }

    private isBoundFieldJson(fieldKey?: string, fieldPath?: string): boolean {
        if (!fieldKey) {
            return false;
        }
        const field = this.discoveredFields.find((item) => item.key === fieldKey);
        if (field?.kind === 'json') {
            return true;
        }
        return !!fieldPath?.trim();
    }

    private jsonPathsForField(fieldKey?: string, selectedPath?: string): DashboardJsonFieldPathOption[] {
        if (!fieldKey) {
            return [];
        }
        const paths = this.discoveredFields.find((item) => item.key === fieldKey)?.jsonPaths ?? [];
        if (paths.length) {
            return paths;
        }
        const path = selectedPath?.trim();
        if (path) {
            return [{ path, label: path, kind: 'number' }];
        }
        return [];
    }

    removeColumn(key: string): void {
        const columns = (this.bindings.columnFields ?? []).filter((column) => column !== key);
        this.patchBindings({ columnFields: columns });
        this.syncGroupByAfterColumnChange(key);
    }

    isColumnSelected(key: string): boolean {
        return (this.bindings.columnFields ?? []).includes(key);
    }

    toggleColumn(key: string, selected: boolean): void {
        const columns = [...(this.bindings.columnFields ?? [])];
        if (selected && !columns.includes(key)) {
            columns.push(key);
            this.patchBindings({ columnFields: columns });
            return;
        }
        if (!selected) {
            this.removeColumn(key);
        }
    }

    selectAllColumns(): void {
        const keys = this.filteredFields.map((field) => field.key);
        const columns = [...new Set([...(this.bindings.columnFields ?? []), ...keys])];
        this.patchBindings({ columnFields: columns });
    }

    clearFieldFilters(): void {
        this.fieldSearchQuery = '';
        this.fieldKindFilter = 'all';
    }

    fieldKindFilterLabel(kind: DashboardFieldKind | 'all'): string {
        switch (kind) {
            case 'date':
                return 'MEDICAL_RECORDS.DATA_BINDING.FIELD_KIND_DATE';
            case 'number':
                return 'MEDICAL_RECORDS.DATA_BINDING.FIELD_KIND_NUMBER';
            case 'category':
                return 'MEDICAL_RECORDS.DATA_BINDING.FIELD_KIND_CATEGORY';
            case 'json':
                return 'MEDICAL_RECORDS.DATA_BINDING.FIELD_KIND_JSON';
            default:
                return 'MEDICAL_RECORDS.DATA_BINDING.FIELD_KIND_ALL';
        }
    }

    clearAllColumns(): void {
        this.patchWidget({
            bindings: mergeBindingsPatch(this.widget.bindings, { columnFields: [] }),
            tableColumnKeys: '',
        });
    }

    onTableRowFilterChange(checked: boolean): void {
        this.patchWidget({
            tableOptions: {
                ...this.widget.tableOptions,
                showRowFilter: checked,
            },
        });
    }

    onGroupBySelect(value: string): void {
        if (!value) {
            return;
        }
        this.addGroupByField(value);
    }

    addGroupByField(key: string): void {
        if (!key || this.groupByFields.includes(key)) {
            return;
        }

        this.patchWidget({
            tableOptions: {
                ...this.widget.tableOptions,
                groupByFields: [...this.groupByFields, key],
            },
        });
    }

    removeGroupByField(key: string): void {
        this.patchWidget({
            tableOptions: {
                ...this.widget.tableOptions,
                groupByFields: this.groupByFields.filter((field) => field !== key),
            },
        });
    }

    moveGroupByField(index: number, delta: number): void {
        const fields = [...this.groupByFields];
        const target = index + delta;
        if (target < 0 || target >= fields.length) {
            return;
        }
        [fields[index], fields[target]] = [fields[target], fields[index]];
        this.patchWidget({
            tableOptions: {
                ...this.widget.tableOptions,
                groupByFields: fields,
            },
        });
    }

    clearGroupByFields(): void {
        this.patchWidget({
            tableOptions: {
                ...this.widget.tableOptions,
                groupByFields: [],
            },
        });
    }

    private syncGroupByAfterColumnChange(key: string): void {
        if (!this.groupByFields.includes(key)) {
            return;
        }
        this.removeGroupByField(key);
    }

    moveColumn(index: number, delta: number): void {
        const columns = [...(this.bindings.columnFields ?? [])];
        const target = index + delta;
        if (target < 0 || target >= columns.length) {
            return;
        }
        [columns[index], columns[target]] = [columns[target], columns[index]];
        this.patchBindings({ columnFields: columns });
    }

    columnOrderIndex(key: string): number {
        const index = (this.bindings.columnFields ?? []).indexOf(key);
        return index >= 0 ? index + 1 : 0;
    }

    onTableColumnDrop(event: CdkDragDrop<DashboardFieldDescriptor[]>): void {
        if (event.previousContainer !== event.container || event.previousIndex === event.currentIndex) {
            return;
        }

        const columns = [...(this.bindings.columnFields ?? [])];
        if (event.previousIndex >= columns.length || event.currentIndex >= columns.length) {
            return;
        }

        moveItemInArray(columns, event.previousIndex, event.currentIndex);
        this.patchBindings({ columnFields: columns });
    }

    onValueAggregationChange(valueAggregation: ValueAggregation): void {
        const patch: Partial<DashboardWidgetDataBindings> = { valueAggregation };
        if (valueAggregation === 'count') {
            patch.valueField = undefined;
            patch.valueFieldPath = undefined;
            patch.valueFieldFormat = undefined;
        }
        this.patchBindings(patch);
    }

    valueAggregationLabel(aggregation: ValueAggregation): string {
        switch (aggregation) {
            case 'count':
                return 'MEDICAL_RECORDS.CHART.Y_COUNT';
            case 'sum':
                return 'MEDICAL_RECORDS.CHART.Y_SUM';
            case 'min':
                return 'MEDICAL_RECORDS.CHART.Y_MIN';
            case 'max':
                return 'MEDICAL_RECORDS.CHART.Y_MAX';
            case 'avg':
                return 'MEDICAL_RECORDS.CHART.Y_AVG';
            default:
                return 'MEDICAL_RECORDS.CHART.Y_COUNT';
        }
    }

    valueFieldFormatLabel(format: ValueFieldFormat): string {
        switch (format) {
            case 'percent':
                return 'MEDICAL_RECORDS.DATA_BINDING.VALUE_FIELD_FORMAT_PERCENT';
            default:
                return 'MEDICAL_RECORDS.DATA_BINDING.VALUE_FIELD_FORMAT_NUMBER';
        }
    }

    onChartDisplayModeChange(mode: ChartDisplayMode): void {
        this.patchWidget({ chartDisplayMode: mode });
    }

    patchChartAxes(patch: Partial<DashboardChartAxisOptions>): void {
        this.patchWidget({
            chartAxes: {
                ...this.widget.chartAxes,
                ...patch,
            },
        });
    }

    xLabelFormatLabel(format: ChartXLabelFormat): string {
        return format === 'full'
            ? 'MEDICAL_RECORDS.CHART.X_LABEL_FORMAT_FULL'
            : 'MEDICAL_RECORDS.CHART.X_LABEL_FORMAT_AUTO';
    }

    trackField(_: number, field: DashboardFieldDescriptor): string {
        return field.key;
    }

    chartDisplayModeLabel(mode: ChartDisplayMode): string {
        const key = mode.replace(/-/g, '_').toUpperCase();
        return `MEDICAL_RECORDS.CHART.DISPLAY_${key}`;
    }

    comparisonPeriodLabel(period: ComparisonPeriod): string {
        return `MEDICAL_RECORDS.DASHBOARD.COMPARISON_${period.toUpperCase()}`;
    }

    private buildFieldsQueryFingerprint(widget: DashboardWidgetConfig): string {
        return buildFieldsDiscoveryFingerprint(widget, this.periodService.rangeKey);
    }

    private previewWidgetPatch(patch: Partial<DashboardWidgetConfig>): DashboardWidgetConfig {
        const merged: DashboardWidgetConfig = {
            ...this.widget,
            ...patch,
            processQuery: patch.processQuery
                ? { ...this.widget.processQuery, ...patch.processQuery }
                : this.widget.processQuery,
            tableOptions: patch.tableOptions
                ? { ...this.widget.tableOptions, ...patch.tableOptions }
                : this.widget.tableOptions,
            bindings: patch.bindings
                ? mergeBindingsPatch(this.widget.bindings, patch.bindings)
                : this.widget.bindings,
        };

        if (patch.dataSource === 'process') {
            merged.contentQuery = undefined;
            if (!merged.processQuery) {
                const entry = this.processCatalog[0];
                merged.processQuery = {
                    processDefinitionKey: entry?.key ?? 'medical-records',
                    includeSubprocesses: entry?.defaultIncludeSubprocesses ?? true,
                    metricScope: this.isTableWidget ? 'tree' : entry?.defaultMetricScope ?? 'root',
                    status: [...(entry?.defaultStatus ?? ['RUNNING', 'COMPLETED', 'SUSPENDED'])],
                };
            }
        }

        if (patch.dataSource === 'content') {
            merged.processQuery = undefined;
            if (!merged.contentQuery) {
                merged.contentQuery = CONTENT_QUERY_PRESETS[0].query;
            }
        }

        if (patch.dataSource === 'demo') {
            merged.processQuery = undefined;
            merged.contentQuery = undefined;
        }

        return merged;
    }

    private tableDataSourceResetPatch(dataSource: DashboardDataSource): Partial<DashboardWidgetConfig> {
        const groupByFields = (this.widget.tableOptions?.groupByFields ?? []).filter((field) =>
            this.isFieldValidForDataSource(field, dataSource)
        );

        return {
            bindings: mergeBindingsPatch(this.widget.bindings, { columnFields: [] }),
            tableColumnKeys: '',
            tableOptions: {
                ...this.widget.tableOptions,
                groupByFields,
            },
        };
    }

    private isFieldValidForDataSource(field: string, dataSource: DashboardDataSource): boolean {
        if (dataSource === 'process') {
            return !isLikelyContentFieldKey(field);
        }
        if (dataSource === 'content') {
            return field !== 'startDate' && field !== 'businessKey' && field !== 'parentId';
        }
        return true;
    }
}

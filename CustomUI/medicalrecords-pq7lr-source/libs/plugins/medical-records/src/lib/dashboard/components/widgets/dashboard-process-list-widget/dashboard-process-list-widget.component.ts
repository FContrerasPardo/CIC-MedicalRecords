import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import {
    DEFAULT_PROCESS_LIST_OPTIONS,
    DashboardWidgetConfig,
} from '../../../definitions/dashboard-widget.model';
import {
    MedicalRecordsTaskType,
    ProcessAttentionItem,
    ProcessAttentionListState,
} from '../../../definitions/process-attention.model';
import {
    BulkCompleteResult,
    BulkSelectionEvaluation,
    MedicalRecordsBulkTaskService,
} from '../../../services/medical-records-bulk-task.service';
import { MedicalRecordsTaskQueryService } from '../../../services/medical-records-task-query.service';
import { DashboardCrossFilterSelection, DashboardCrossFilterService } from '../../../services/dashboard-cross-filter.service';
import { rowMatchesCard, variablesToRow } from '../../../utils/dashboard-provider-group.util';
import { MedicalRecordService } from '../../../../services/medical-record.service';
import { resolveAttentionItemUrl } from '../../../utils/process-attention-navigation.util';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';
import { PatientCaseRowComponent } from '../../../../pages/case-detail/patient-case-row/patient-case-row.component';
import { CASE_ROUTE_COMMANDS, CaseTabTarget, buildCaseQueryParams } from '../../../../pages/case-detail/utils/case-navigation.util';
import { ListEntry, buildListEntries } from '../../../../pages/case-detail/utils/case-grouping.util';
import { isPatientCaseTask } from '../../../../pages/case-detail/utils/case-validation-map.util';
import { buildCaseAccountView } from '../../../../pages/case-detail/utils/case-invoice.util';
import { accountSearchText } from '../../../../pages/case-detail/utils/case-account-validation.util';
import { parseBatchState } from '../../../../pages/case-detail/batch-state-case-detail.provider';

@Component({
    selector: 'medical-records-dashboard-process-list-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, DashboardWidgetTextPipe, PatientCaseRowComponent],
    templateUrl: './dashboard-process-list-widget.component.html',
    styleUrls: ['./dashboard-process-list-widget.component.scss'],
})
export class DashboardProcessListWidgetComponent implements OnInit, OnDestroy {
    @Input({ required: true }) config!: DashboardWidgetConfig;
    @Output() itemSelected = new EventEmitter<ProcessAttentionItem>();

    searchTerm = '';
    state$!: Observable<ProcessAttentionListState>;
    selectedIds = new Set<string>();
    selectionEvaluation: BulkSelectionEvaluation | null = null;
    bulkProcessing = false;
    bulkResult: BulkCompleteResult | null = null;
    showIneligibleReasons = false;
    readonly skeletonRows = [0, 1, 2];

    private latestItems: ProcessAttentionItem[] = [];

    /** Current filter-card selection; applied only when `config.crossFilter.follow` is on. */
    crossFilterSelection: DashboardCrossFilterSelection | null = null;
    private crossFilterSubscription?: Subscription;

    constructor(
        private readonly crossFilterService: DashboardCrossFilterService,
        private readonly taskQueryService: MedicalRecordsTaskQueryService,
        private readonly bulkTaskService: MedicalRecordsBulkTaskService,
        private readonly medicalRecordService: MedicalRecordService,
        private readonly router: Router
    ) {
        this.state$ = this.taskQueryService.state$;
    }

    /** Compact one-line rows under a column header (default) instead of stacked cards. */
    get isTableDisplay(): boolean {
        return this.options.display !== 'cards';
    }

    get options() {
        return { ...DEFAULT_PROCESS_LIST_OPTIONS, ...this.config?.processListOptions };
    }

    ngOnInit(): void {
        this.taskQueryService.loadAttentionItems();
        this.crossFilterSubscription = this.crossFilterService.selection$.subscribe((selection) => {
            this.crossFilterSelection = selection;
            this.clearSelection();
        });
    }

    ngOnDestroy(): void {
        this.crossFilterSubscription?.unsubscribe();
    }

    /** Selection that actually filters this list (null when the widget does not follow the filter). */
    get activeCrossFilter(): DashboardCrossFilterSelection | null {
        return this.config?.crossFilter?.follow ? this.crossFilterSelection : null;
    }

    retry(): void {
        this.clearSelection();
        this.taskQueryService.loadAttentionItems();
    }

    /**
     * Called from the template on every change detection: memoized on the inputs that change the
     * result (items, search term, provider filter), because filtering reads each task's batchState.
     */
    filterItems(items: ProcessAttentionItem[]): ProcessAttentionItem[] {
        const crossFilter = this.activeCrossFilter;
        const term = this.effectiveSearchTerm;
        const cached = this.filterCache;
        if (cached && cached.items === items && cached.term === term && cached.crossFilter === crossFilter) {
            return cached.result;
        }
        const result = this.computeFilteredItems(items, crossFilter);
        this.filterCache = { items, term, crossFilter, result };
        return result;
    }

    /** The list's own search box, or (when it follows the filter cards) the search typed there. */
    get effectiveSearchTerm(): string {
        if (this.searchTerm.trim()) {
            return this.searchTerm;
        }
        return this.config?.crossFilter?.follow ? this.crossFilterService.searchTerm : '';
    }

    private filterCache?: {
        items: ProcessAttentionItem[];
        term: string;
        crossFilter: DashboardCrossFilterSelection | null;
        result: ProcessAttentionItem[];
    };

    private entriesCache?: { filtered: ProcessAttentionItem[]; entries: ListEntry[] };

    private computeFilteredItems(
        items: ProcessAttentionItem[],
        crossFilter: DashboardCrossFilterSelection | null
    ): ProcessAttentionItem[] {
        if (crossFilter) {
            items = items.filter((item) =>
                rowMatchesCard(variablesToRow(item.processVariables, item.taskStatus), crossFilter.groupBy, crossFilter.key, crossFilter.context)
            );
        }
        const term = this.effectiveSearchTerm.trim().toLowerCase();
        if (!term) {
            return items;
        }

        return items.filter(
            (item) =>
                item.title.toLowerCase().includes(term) ||
                item.subtitle.toLowerCase().includes(term) ||
                item.meta.toLowerCase().includes(term) ||
                item.taskName.toLowerCase().includes(term) ||
                this.accountSearchTextOf(item).includes(term)
        );
    }

    /**
     * Patients, invoices and provider of the item's account, so the search finds a patient in every
     * account (and hospital) that bills for them. Cached per variables object.
     */
    private accountSearchTextOf(item: ProcessAttentionItem): string {
        const variables = item.processVariables ?? {};
        let text = this.accountSearchCache.get(variables);
        if (text === undefined) {
            const view = buildCaseAccountView(parseBatchState(variables['batchState']));
            text = accountSearchText([view.account.provider, view.account.payer], view.invoices);
            this.accountSearchCache.set(variables, text);
        }
        return text;
    }

    private readonly accountSearchCache = new WeakMap<object, string>();

    selectItem(item: ProcessAttentionItem): void {
        const url = resolveAttentionItemUrl(item, this.options.openTarget, this.medicalRecordService);
        void this.router.navigateByUrl(url);
        this.itemSelected.emit(item);
    }

    /** Patient tasks render as a patient row and open the case detail; other tasks keep the native link. */
    isPatientCase(item: ProcessAttentionItem): boolean {
        return isPatientCaseTask(item.taskType);
    }

    /** One entry per patient case (its tasks grouped); non-patient tasks stay individual. */
    listEntries(items: ProcessAttentionItem[]): ListEntry[] {
        // Same filtered array => same entries, so patient rows keep their inputs and do not re-derive
        // their validation map (which parses the batchState) on every change detection.
        const filtered = this.filterItems(items);
        if (this.entriesCache?.filtered === filtered) {
            return this.entriesCache.entries;
        }
        const entries = buildListEntries(this.trackVisibleItems(filtered));
        this.entriesCache = { filtered, entries };
        return entries;
    }

    trackEntry(_index: number, entry: ListEntry): string {
        return entry.key;
    }

    openCase(item: ProcessAttentionItem, target?: CaseTabTarget): void {
        void this.router.navigate([...CASE_ROUTE_COMMANDS], { queryParams: buildCaseQueryParams(item.nativeReference ?? {}, target) });
        this.itemSelected.emit(item);
    }

    toggleSelection(item: ProcessAttentionItem, event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.selectedIds.has(item.id)) {
            this.selectedIds.delete(item.id);
        } else {
            this.selectedIds.add(item.id);
        }

        this.selectedIds = new Set(this.selectedIds);
        this.refreshSelectionEvaluation();
    }

    /** Table rows select or clear all open tasks of a case at once. */
    setCaseSelection(items: ProcessAttentionItem[], selected: boolean): void {
        for (const item of items) {
            if (selected) {
                this.selectedIds.add(item.id);
            } else {
                this.selectedIds.delete(item.id);
            }
        }
        this.selectedIds = new Set(this.selectedIds);
        this.refreshSelectionEvaluation();
    }

    /** The tools bar (count, search, refresh) is shown only when one of them is enabled. */
    get hasToolbar(): boolean {
        return this.options.showCountBadge || this.options.showSearch || this.options.showRefresh;
    }

    toggleSelectAllFiltered(items: ProcessAttentionItem[], event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        const filtered = this.filterItems(items);
        const allSelected = filtered.every((item) => this.selectedIds.has(item.id));

        if (allSelected) {
            for (const item of filtered) {
                this.selectedIds.delete(item.id);
            }
        } else {
            for (const item of filtered) {
                this.selectedIds.add(item.id);
            }
        }

        this.selectedIds = new Set(this.selectedIds);
        this.refreshSelectionEvaluation();
    }

    isSelected(item: ProcessAttentionItem): boolean {
        return this.selectedIds.has(item.id);
    }

    areAllFilteredSelected(items: ProcessAttentionItem[]): boolean {
        const filtered = this.filterItems(items);
        return filtered.length > 0 && filtered.every((item) => this.selectedIds.has(item.id));
    }

    getSelectedItems(items: ProcessAttentionItem[]): ProcessAttentionItem[] {
        return items.filter((item) => this.selectedIds.has(item.id));
    }

    canApproveSelected(): boolean {
        return (
            !!this.selectionEvaluation &&
            !this.selectionEvaluation.mixedTaskTypes &&
            this.selectionEvaluation.eligibleCount > 0 &&
            !this.bulkProcessing
        );
    }

    approveEligible(items: ProcessAttentionItem[], event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        if (!this.canApproveSelected()) {
            return;
        }

        const selected = this.getSelectedItems(items);
        this.bulkProcessing = true;
        this.bulkResult = null;

        this.bulkTaskService.completeEligible(selected).subscribe({
            next: (result) => {
                this.bulkResult = result;
                this.bulkProcessing = false;
                this.clearSelection();
            },
            error: () => {
                this.bulkProcessing = false;
            },
        });
    }

    toggleIneligibleReasons(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.showIneligibleReasons = !this.showIneligibleReasons;
    }

    getIneligibleItems(): BulkSelectionEvaluation['items'] {
        return this.selectionEvaluation?.items.filter((entry) => !entry.eligible) ?? [];
    }

    countBadgeClass(count: number): string {
        return count > 0 ? 'badge-open' : 'badge-clear';
    }

    taskTypeLabelKey(taskType: MedicalRecordsTaskType): string {
        switch (taskType) {
            case 'intake':
                return 'MEDICAL_RECORDS.TASK_TYPES.INTAKE';
            case 'validateRules':
                return 'MEDICAL_RECORDS.TASK_TYPES.VALIDATE_RULES';
            case 'analysis':
                return 'MEDICAL_RECORDS.TASK_TYPES.ANALYSIS';
            default:
                return 'MEDICAL_RECORDS.TASK_TYPES.UNKNOWN';
        }
    }

    taskTypeChipClass(taskType: MedicalRecordsTaskType): string {
        switch (taskType) {
            case 'validateRules':
                return 'chip-rules';
            case 'analysis':
                return 'chip-analysis';
            default:
                return '';
        }
    }

    statusLabelKey(item: ProcessAttentionItem): string {
        return item.taskStatus === 'ASSIGNED'
            ? 'MEDICAL_RECORDS.TASK_STATUS.ASSIGNED'
            : 'MEDICAL_RECORDS.TASK_STATUS.CREATED';
    }

    statusPillClass(item: ProcessAttentionItem): string {
        return item.taskStatus === 'ASSIGNED' ? 'status-assigned' : 'status-created';
    }

    needsAttention(item: ProcessAttentionItem): boolean {
        return item.meta.includes('Needs attention');
    }

    metaDate(item: ProcessAttentionItem): string | null {
        const parts = item.meta.split(' · ').map((part) => part.trim()).filter(Boolean);
        const skip = new Set(['ASSIGNED', 'CREATED', 'Needs attention']);

        for (let index = parts.length - 1; index >= 0; index -= 1) {
            const part = parts[index];
            if (skip.has(part) || part.startsWith('Assignee:')) {
                continue;
            }
            return part;
        }

        return null;
    }

    trackVisibleItems(items: ProcessAttentionItem[]): ProcessAttentionItem[] {
        this.latestItems = items;
        this.pruneSelection(items);
        return items;
    }

    private refreshSelectionEvaluation(): void {
        this.bulkResult = null;
        this.showIneligibleReasons = false;

        if (!this.selectedIds.size) {
            this.selectionEvaluation = null;
            return;
        }

        this.selectionEvaluation = null;
        this.bulkTaskService.evaluateSelectionFresh(this.getSelectedItemsFromLatestState()).subscribe((evaluation) => {
            this.selectionEvaluation = evaluation;
        });
    }

    private getSelectedItemsFromLatestState(): ProcessAttentionItem[] {
        return Array.from(this.selectedIds)
            .map((id) => this.latestItems.find((item) => item.id === id))
            .filter((item): item is ProcessAttentionItem => !!item);
    }

    private pruneSelection(items: ProcessAttentionItem[]): void {
        const validIds = new Set(items.map((item) => item.id));
        let changed = false;

        for (const id of this.selectedIds) {
            if (!validIds.has(id)) {
                this.selectedIds.delete(id);
                changed = true;
            }
        }

        if (changed) {
            this.selectedIds = new Set(this.selectedIds);
            this.refreshSelectionEvaluation();
        }
    }

    private clearSelection(): void {
        this.selectedIds = new Set();
        this.selectionEvaluation = null;
        this.showIneligibleReasons = false;
    }
}

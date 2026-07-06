import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
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
import { MedicalRecordService } from '../../../../services/medical-record.service';
import { resolveAttentionItemUrl } from '../../../utils/process-attention-navigation.util';
import { DashboardWidgetTextPipe } from '../../../pipes/dashboard-widget-text.pipe';

@Component({
    selector: 'medical-records-dashboard-process-list-widget',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, DashboardWidgetTextPipe],
    templateUrl: './dashboard-process-list-widget.component.html',
    styleUrls: ['./dashboard-process-list-widget.component.scss'],
})
export class DashboardProcessListWidgetComponent implements OnInit {
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

    constructor(
        private readonly taskQueryService: MedicalRecordsTaskQueryService,
        private readonly bulkTaskService: MedicalRecordsBulkTaskService,
        private readonly medicalRecordService: MedicalRecordService,
        private readonly router: Router
    ) {
        this.state$ = this.taskQueryService.state$;
    }

    get options() {
        return { ...DEFAULT_PROCESS_LIST_OPTIONS, ...this.config?.processListOptions };
    }

    ngOnInit(): void {
        this.taskQueryService.loadAttentionItems();
    }

    retry(): void {
        this.clearSelection();
        this.taskQueryService.loadAttentionItems();
    }

    filterItems(items: ProcessAttentionItem[]): ProcessAttentionItem[] {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) {
            return items;
        }

        return items.filter(
            (item) =>
                item.title.toLowerCase().includes(term) ||
                item.subtitle.toLowerCase().includes(term) ||
                item.meta.toLowerCase().includes(term) ||
                item.taskName.toLowerCase().includes(term)
        );
    }

    selectItem(item: ProcessAttentionItem): void {
        const url = resolveAttentionItemUrl(item, this.options.openTarget, this.medicalRecordService);
        void this.router.navigateByUrl(url);
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

import { CommonModule } from '@angular/common';

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { Observable } from 'rxjs';

import { ProcessAttentionItem, ProcessAttentionListState } from '../../../definitions/process-attention.model';

import {

    BulkCompleteResult,

    BulkSelectionEvaluation,

    MedicalRecordsBulkTaskService,

} from '../../../services/medical-records-bulk-task.service';

import { MedicalRecordsTaskQueryService } from '../../../services/medical-records-task-query.service';



@Component({

    selector: 'medical-records-dashboard-process-list-widget',

    standalone: true,

    imports: [CommonModule, FormsModule, TranslateModule],

    templateUrl: './dashboard-process-list-widget.component.html',

    styleUrls: ['./dashboard-process-list-widget.component.scss'],

})

export class DashboardProcessListWidgetComponent implements OnInit {

    @Input() titleKey = 'MEDICAL_RECORDS.SECTIONS.ATTENTION_REQUIRED';

    @Output() itemSelected = new EventEmitter<ProcessAttentionItem>();



    searchTerm = '';

    state$!: Observable<ProcessAttentionListState>;

    selectedIds = new Set<string>();

    selectionEvaluation: BulkSelectionEvaluation | null = null;

    bulkProcessing = false;

    bulkResult: BulkCompleteResult | null = null;

    showIneligibleReasons = false;



    constructor(

        private readonly taskQueryService: MedicalRecordsTaskQueryService,

        private readonly bulkTaskService: MedicalRecordsBulkTaskService

    ) {

        this.state$ = this.taskQueryService.state$;

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

                item.meta.toLowerCase().includes(term)

        );

    }



    selectItem(item: ProcessAttentionItem): void {

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



    private refreshSelectionEvaluation(): void {

        this.bulkResult = null;

        this.showIneligibleReasons = false;



        if (!this.selectedIds.size) {

            this.selectionEvaluation = null;

            return;

        }



        this.selectionEvaluation = null;

        this.bulkTaskService

            .evaluateSelectionFresh(

                this.getSelectedItemsFromLatestState()

            )

            .subscribe((evaluation) => {

                this.selectionEvaluation = evaluation;

            });

    }



    private getSelectedItemsFromLatestState(): ProcessAttentionItem[] {

        return Array.from(this.selectedIds)

            .map((id) => this.latestItems.find((item) => item.id === id))

            .filter((item): item is ProcessAttentionItem => !!item);

    }



    private latestItems: ProcessAttentionItem[] = [];



    trackVisibleItems(items: ProcessAttentionItem[]): ProcessAttentionItem[] {

        this.latestItems = items;

        this.pruneSelection(items);

        return items;

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



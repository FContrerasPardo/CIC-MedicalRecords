/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { EntityListComponent } from '../../../../shared/ui/data-table/entity-list/entity-list.component';
import { ResultsPaginatorComponent } from '../../../../shared/ui/data-table/pagination/results-paginator.component';
import { SearchBoxComponent } from '../../../../shared/ui/search/filters/search-box/search-box.component';
import { DataColumnComponent } from '../../../../shared/ui/data-table/entity-list/data-column.component';
import { RecordDataSourceLabelPipe } from '../../../../shared/ui/format/record-data-source-label.pipe';
import { GovernanceRecord, LegalCase, ActionContext } from '../../../../shared/definitions/governance-shared.interface';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../../../shared/definitions/governance-shared.constants';
import { RecordStatus } from '@alfresco/adf-hx-content-services/services';
import { TranslatePipe } from '@ngx-translate/core';
import { GovernanceLegalRecordService } from '../../services/governance-legal-record.service';
import { TableSkeletonLoaderComponent } from '@alfresco/adf-hx-content-services/ui';
import { Sort } from '@angular/material/sort';
import { ErrorComponent } from '../../../../shared/ui/search/error/error.component';
import { LegalHoldInitiatorType, LegalHoldSortDirection } from '../../definitions/legal-hold.interface';
import {
    LEGAL_HOLD_DEFAULT_SORT_DIRECTION,
    LEGAL_HOLD_RECORDS_DEFAULT_SORT_COLUMN,
    LegalHoldInitiator,
} from '../../definitions/legal-hold.constants';
import { RecordPropertiesButtonComponent } from '../../../records-management/actions/record-properties-button/record-properties-button.component';
import { ActionToolbarComponent } from '../../../../shared/ui/data-table/toolbar/action-toolbar.component';

@Component({
    selector: 'hxp-legal-hold-records',
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        EntityListComponent,
        ResultsPaginatorComponent,
        SearchBoxComponent,
        DataColumnComponent,
        RecordDataSourceLabelPipe,
        TranslatePipe,
        TableSkeletonLoaderComponent,
        ErrorComponent,
        ActionToolbarComponent,
        RecordPropertiesButtonComponent,
    ],
    templateUrl: './legal-hold-records.component.html',
    styleUrl: './legal-hold-records.component.scss',
})
export class LegalHoldRecordsComponent implements OnChanges {
    @Input() selectedCase?: LegalCase;
    @Input() clickedFrom: LegalHoldInitiatorType = LegalHoldInitiator.Legal;

    @Output() backToCasesEvent = new EventEmitter<void>();
    @Output() selectionChangedEvent = new EventEmitter<GovernanceRecord[]>();
    @Output() actionContextChanged = new EventEmitter<ActionContext>();
    @Output() actionContextChange = new EventEmitter<ActionContext>();
    @Output() sidebarToggle = new EventEmitter<boolean>();

    @ViewChild('legalRecordsList') public legalRecordsList!: EntityListComponent<GovernanceRecord>;

    records: GovernanceRecord[] = [];
    selectedRecords: GovernanceRecord[] = [];
    allRecords: GovernanceRecord[] = [];
    noResults = false;
    searchText = '';
    isLoading = false;
    sortColumn = LEGAL_HOLD_RECORDS_DEFAULT_SORT_COLUMN;
    sortDirection: LegalHoldSortDirection = LEGAL_HOLD_DEFAULT_SORT_DIRECTION;
    pageSize = DEFAULT_GOVERNANCE_SEARCH_LIMIT;
    RecordStatus = RecordStatus;
    lastEvaluatedKey = '';
    pageKeyStack: string[] = [];
    currentPageIndex = 0;
    hasError = false;

    actionContext: ActionContext = { records: [], showPanel: false };

    private readonly governanceLegalRecordService = inject(GovernanceLegalRecordService);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['selectedCase'] && this.selectedCase) {
            this.loadRecords();
        }
    }

    private loadRecords(lastEvaluatedKey = '', navigatingBack = false): void {
        this.isLoading = true;
        this.hasError = false;
        this.noResults = false;

        this.governanceLegalRecordService
            .queryLegalRecords({
                legalCaseId: this.selectedCase?.legalCaseId ?? '',
                limit: this.pageSize,
                exclusiveStartKey: lastEvaluatedKey,
                sortDirection: this.sortDirection,
            })
            .subscribe({
                next: (records) => {
                    this.records = this.allRecords = records.contents;
                    this.isLoading = false;
                    this.noResults = records.contents.length === 0;

                    this.lastEvaluatedKey = records.lastEvaluatedKey || '';

                    if (!navigatingBack && this.lastEvaluatedKey) {
                        this.pageKeyStack[this.currentPageIndex + 1] = this.lastEvaluatedKey;
                    }
                },
                error: (err) => {
                    console.error('Error loading legal records', err);
                    this.isLoading = false;
                    this.noResults = true;
                    this.hasError = true;
                },
            });
    }

    onSearchInputChange(value: string) {
        this.searchText = value.trim().toLowerCase();
        this.applyFilter();
    }

    applyFilter() {
        this.records = this.searchText ? this.allRecords.filter((record) => this.matchesSearch(record)) : [...this.allRecords];
        this.noResults = this.records.length === 0;
    }

    private matchesSearch(record: GovernanceRecord): boolean {
        const search = this.searchText;

        if (!search) {
            return true;
        }

        const fileName = (record.fileName ?? '').toLowerCase();
        const dataSourceId = (record.environmentDataSourceId ?? '').toLowerCase();
        const createdByUser = (record.createdByUser ?? '').toLowerCase();
        const createdByUsername = (record.createdByUsername ?? '').toLowerCase();

        return fileName.includes(search) || dataSourceId.includes(search) || createdByUser.includes(search) || createdByUsername.includes(search);
    }

    private escapeHtml(text: string): string {
        // Using split/join instead of replaceAll for ES2019 compatibility (single line per linter preference)
        return text.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;').split("'").join('&#039;');
    }

    highlightMatch(text: string): string {
        if (!text || !this.searchText) {
            return this.escapeHtml(text || '');
        }

        const escapedSearchText = this.searchText.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedSearchText})`, 'gi');
        return text
            .split(regex)
            .map((segment) =>
                segment.toLowerCase() === this.searchText.toLowerCase() ? `<mark>${this.escapeHtml(segment)}</mark>` : this.escapeHtml(segment)
            )
            .join('');
    }

    onSelectionChanged(selection: GovernanceRecord[]) {
        this.selectedRecords = [...selection];
        this.actionContext = { ...this.actionContext, records: [...this.selectedRecords] };

        this.actionContextChanged.emit({ ...this.actionContext });

        if (this.selectedRecords.length !== 1) {
            this.actionContext = { ...this.actionContext, showPanel: false };
            this.actionContextChange.emit({ ...this.actionContext });
            this.sidebarToggle.emit(false);
        }
    }

    clearAll = () => {
        this.selectedRecords = [];
        this.legalRecordsList.clearSelection();
    };

    backToCases() {
        this.backToCasesEvent.emit();
    }

    onSortingChanged(event: Sort) {
        this.sortDirection = event.direction as LegalHoldSortDirection;
        this.loadRecords();
    }

    resetPagination(): void {
        this.pageKeyStack = [''];
        this.currentPageIndex = 0;
        this.lastEvaluatedKey = '';
    }

    onPageSizeChange(size: number): void {
        this.pageSize = size;
        this.resetPagination();
        this.loadRecords('', true);
    }

    loadNextPage() {
        if (this.lastEvaluatedKey) {
            this.currentPageIndex++;
            this.pageKeyStack[this.currentPageIndex] = this.lastEvaluatedKey;
            this.loadRecords(this.lastEvaluatedKey, false);
        }
    }

    loadPreviousPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            const prevKey = this.pageKeyStack[this.currentPageIndex];
            this.loadRecords(prevKey, true);
        }
    }

    onRetry(): void {
        this.loadRecords();
    }

    get selectedCount() {
        return this.selectedRecords.length;
    }

    get previousDisabled(): boolean {
        return this.currentPageIndex <= 0;
    }

    get nextDisabled(): boolean {
        return !this.lastEvaluatedKey;
    }

    get hasSelection(): boolean {
        return this.selectedRecords.length > 0;
    }
}

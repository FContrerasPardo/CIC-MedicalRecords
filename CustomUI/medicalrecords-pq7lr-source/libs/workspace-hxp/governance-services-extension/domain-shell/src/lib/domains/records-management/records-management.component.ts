/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnInit, OnDestroy, ViewChild, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { DatePipe } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { TableSkeletonLoaderComponent } from '@alfresco/adf-hx-content-services/ui';
import { EntityListComponent } from '../../shared/ui/data-table/entity-list/entity-list.component';
import { GovernanceRecord, ActionContext } from '../../shared/definitions/governance-shared.interface';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../shared/definitions/governance-shared.constants';
import { DataColumnComponent } from '../../shared/ui/data-table/entity-list/data-column.component';
import { GovernanceSearchService } from './services/governance-search.service';
import { debounceTime, filter, map, mergeMap, tap, take } from 'rxjs/operators';
import { distinctUntilChanged, finalize, from, merge, Subject, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RecordStatusClassPipe } from '../../shared/ui/format/record-status-class.pipe';
import { SearchFilterValueService } from '../../shared/ui/search/filters/base/search-filter-value.service';
import { RecordDeleteButtonComponent } from './actions/record-delete-button/record-delete-button.component';
import { RecordPropertiesButtonComponent } from './actions/record-properties-button/record-properties-button.component';
import { RecordPropertiesButtonService } from './actions/record-properties-button/record-properties-button.service';
import { CategorySearchFilterComponent } from '../../shared/ui/search/filters/category/category-search-filter.component';
import { StatusSearchFilterComponent } from '../../shared/ui/search/filters/status/status-search-filter.component';
import { ModifierSearchFilterComponent } from '../../shared/ui/search/filters/modifier/modifier-search-filter.component';
import { DataSourceSearchFilterComponent } from '../../shared/ui/search/filters/data-source/data-source-search-filter.component';
import { RecordStatusLabelPipe } from '../../shared/ui/format/record-status-label.pipe';
import { CutoffSearchFilterComponent } from '../../shared/ui/search/filters/cutoff/cutoff-search-filter.component';
import { DispositionSearchFilterComponent } from '../../shared/ui/search/filters/disposition/disposition-search-filter.component';
import { RecordNameSearchFilterComponent } from '../../shared/ui/search/filters/record-name/record-name-search-filter.component';
import { RecordDataSourceLabelPipe } from '../../shared/ui/format/record-data-source-label.pipe';
import { RecordDispositionLabelPipe } from '../../shared/ui/format/record-disposition-display.pipe';
import { ResultsPaginatorComponent } from '../../shared/ui/data-table/pagination/results-paginator.component';
import { GovernanceRecordService } from './services/governance-record.service';
import { AddLegalHoldButtonComponent } from './actions/add-legal-hold-button/add-legal-hold-button.component';
import { HxpNotificationService, RecordStatus } from '@alfresco/adf-hx-content-services/services';
import { GovernanceLegalRecordService } from '../legal-hold-management/services/governance-legal-record.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecordPollingService } from './services/record-polling.service';
import { ActionToolbarComponent } from '../../shared/ui/data-table/toolbar/action-toolbar.component';
import { ErrorComponent } from '../../shared/ui/search/error/error.component';
import { GovernanceRecordWithId } from './definitions/records.interface';
import {
    INFINITE_RETAIN_UNTIL,
    RECORDS_BASE_ROUTE,
    RECORDS_EXPECTED_FILTER_COUNT,
    RECORDS_FILTER_INIT_DEBOUNCE_MS,
    RECORDS_SEARCH_DEBOUNCE_MS,
    RETAIN_UNTIL_LOADING,
} from './definitions/records.constants';
import { RecordCategoryLabelPipe } from '../../shared/ui/format/record-category-label.pipe';

@Component({
    selector: 'hxp-governance-records-management',
    imports: [
        DatePipe,
        CategorySearchFilterComponent,
        DataSourceSearchFilterComponent,
        ModifierSearchFilterComponent,
        StatusSearchFilterComponent,
        MatButtonModule,
        MatDividerModule,
        MatIconModule,
        EntityListComponent,
        RecordStatusClassPipe,
        RecordStatusLabelPipe,
        DataColumnComponent,
        TableSkeletonLoaderComponent,
        RecordDeleteButtonComponent,
        RecordPropertiesButtonComponent,
        TranslatePipe,
        RecordNameSearchFilterComponent,
        CutoffSearchFilterComponent,
        DispositionSearchFilterComponent,
        RecordDataSourceLabelPipe,
        RecordDispositionLabelPipe,
        AddLegalHoldButtonComponent,
        ResultsPaginatorComponent,
        MatProgressSpinnerModule,
        ActionToolbarComponent,
        ErrorComponent,
        RecordCategoryLabelPipe
    ],
    templateUrl: './records-management.component.html',
    styleUrl: './records-management.component.scss',
})
export class GovernanceRecordsManagementComponent implements OnInit, OnDestroy, AfterViewInit {
    @Output() sidebarToggle = new EventEmitter<boolean>();
    @Output() selectedRecordsChange = new EventEmitter<GovernanceRecord[]>();
    @Output() actionContextChange = new EventEmitter<ActionContext>();
    @ViewChild('recordList') public recordList!: EntityListComponent<GovernanceRecord>;

    public records: GovernanceRecord[] = [];
    public hasPendingChanges = false;
    public initialState = true;
    public noResults = false;
    public isLoading = false;
    public hasError = false;
    public pageSize = DEFAULT_GOVERNANCE_SEARCH_LIMIT;
    public query?: any;
    public selectedRecords: GovernanceRecord[] = [];
    public RecordStatus = RecordStatus;
    public lastPollingTickAt = 0;
    public actionContext: ActionContext = {
        records: [],
        showPanel: false,
    };
    public currentPageIndex = 0;

    protected readonly RETAIN_UNTIL_LOADING = RETAIN_UNTIL_LOADING;
    protected readonly INFINITE_RETAIN_UNTIL = INFINITE_RETAIN_UNTIL;
    private readonly triggerSearchSubject = new Subject();
    private readonly governanceSearchService = inject(GovernanceSearchService);
    private readonly searchFilterValueService = inject(SearchFilterValueService);
    private readonly recordPropertiesButtonService = inject(RecordPropertiesButtonService);
    private readonly governanceRecordService = inject(GovernanceRecordService);
    private readonly governanceLegalRecordService = inject(GovernanceLegalRecordService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly polling = inject(RecordPollingService);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly translate = inject(TranslateService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    private assignmentPollingSub?: Subscription;
    private suppressFilterEventsCount = 0;
    private suppressSearch = true;

    constructor() {
        this.triggerSearchSubject
            .pipe(
                filter(() => !this.suppressSearch),
                debounceTime(RECORDS_SEARCH_DEBOUNCE_MS),
                takeUntilDestroyed(this.destroyRef)
            )
            // eslint-disable-next-line rxjs/no-nested-subscribe
            .subscribe(() => this.search());

        this.recordPropertiesButtonService.showSidebar$.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (shouldShow) => {
                this.actionContext = { ...this.actionContext, showPanel: shouldShow };
                this.actionContextChange.emit(this.actionContext);
                this.sidebarToggle.emit(shouldShow);
            },
            error: ({ error }) => console.error(error),
        });

        this.governanceRecordService.updateConfirmed$.pipe(filter(Boolean), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe({
            // eslint-disable-next-line rxjs/no-nested-subscribe
            next: () => this.search(),
            error: ({ error }) => console.error(error),
        });

        this.governanceRecordService.deleteConfirmed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            // eslint-disable-next-line rxjs/no-nested-subscribe
            next: () => this.search(),
            error: ({ error }) => console.error(error),
        });

        this.governanceLegalRecordService.recordAssigned$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            // eslint-disable-next-line rxjs/no-nested-subscribe
            next: (assigned: GovernanceRecord[]) => this.trackAssignedRecordsStatus(assigned),
            error: ({ error }) => console.error(error),
        });

        this.governanceRecordService.patchConfirmed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            // eslint-disable-next-line rxjs/no-nested-subscribe
            next: (patchedRecord: GovernanceRecord) => this.processPatchedRecord(patchedRecord),
            error: ({ error }) => console.error(error),
        });
    }

    ngOnInit(): void {
        // Subscribe to filter changes for user interactions
        merge(this.searchFilterValueService.filterApplied$, this.searchFilterValueService.filterReset$)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this.suppressFilterEventsCount > 0) {
                    this.suppressFilterEventsCount--;
                    return;
                }

                this.currentPageIndex = 0;
                const queryParamsLocal = this.searchFilterValueService.toQueryParams();

                void this.router.navigate([RECORDS_BASE_ROUTE], {
                    queryParams: queryParamsLocal,
                    queryParamsHandling: 'merge',
                });

                // Only debounce/search if searches are allowed right now
                if (!this.suppressSearch) {
                    this.debounceSearch();
                }
            });
    }

    ngOnDestroy(): void {
        this.searchFilterValueService.clearAllFilters();
    }

    ngAfterViewInit(): void {
        const params = this.route.snapshot.queryParams;
        const hasParams = params && Object.keys(params).length > 0;

        if (hasParams) {
            this.searchFilterValueService.filterCount$
                .pipe(
                    filter((count) => count >= RECORDS_EXPECTED_FILTER_COUNT),
                    debounceTime(RECORDS_FILTER_INIT_DEBOUNCE_MS),
                    take(1),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe(() => {
                    this.suppressFilterEventsCount = Object.keys(params).length;
                    this.searchFilterValueService.initFiltersFromQueryParams(params);
                    this.currentPageIndex = 0;
                    this.suppressSearch = false;
                    this.debounceSearch();
                });
        } else {
            this.searchFilterValueService.clearFilters();
            this.suppressSearch = false;
        }
    }
    public search(goingBack = false): void {
        if (!this.searchFilterValueService.hasFilters()) {
            this.reset();
            this.isLoading = false;
            return;
        }

        this.hasPendingChanges = true;
        this.initialState = false;
        this.isLoading = true;
        this.hasError = false;

        this.governanceSearchService
            .getPage(
                this.buildSearchParams(),
                {
                    limit: this.pageSize,
                },
                this.currentPageIndex,
                goingBack
            )
            .pipe(
                map((response) => ({
                    records: response.content,
                    lastEvaluatedKey: response.lastEvaluatedKey,
                })),
                takeUntilDestroyed(this.destroyRef),
                finalize(() => (this.isLoading = false))
            )
            .subscribe({
                next: ({ records }) => {
                    this.noResults = records.length === 0;
                    this.records = records;
                },
                error: (error) => {
                    this.noResults = false;
                    this.hasError = true;
                    this.isLoading = false;
                    console.error('Governance Search failed:', error);
                },
            });
    }

    reset(): void {
        this.hasPendingChanges = false;
        this.initialState = true;
        this.noResults = false;
        this.isLoading = false;
        this.searchFilterValueService.clearFilters();
        this.currentPageIndex = 0;
        this.clearQueryParams();
    }

    get hasSelection(): boolean {
        return this.selectedRecords.length > 0;
    }

    get selectedCount() {
        return this.selectedRecords.length;
    }

    clearAll = () => {
        this.recordList.clearSelection();
    };

    public onSelectionChanged(records: GovernanceRecord[]): void {
        this.selectedRecords = records;
        this.actionContext = { ...this.actionContext, records };

        this.selectedRecordsChange.emit(this.selectedRecords);
        this.actionContextChange.emit(this.actionContext);

        if (this.selectedRecords.length === 0 || this.selectedRecords.length === 2) {
            const updatedContext = { ...this.actionContext, showPanel: false };
            this.recordPropertiesButtonService.execute(updatedContext);

            this.sidebarToggle.emit(false);
        }
    }

    public onPageSizeChange(size: number): void {
        this.pageSize = size;
        this.currentPageIndex = 0;
        this.governanceSearchService.clearCache();
        this.search(false);
    }

    public loadNextPage() {
        this.currentPageIndex++;
        this.search(false);
    }

    public loadPreviousPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            this.search(true);
        }
    }
    public onRetry(): void {
        this.search();
    }

    public isNextDisabled(): boolean {
        return !this.governanceSearchService.hasNextPage(this.currentPageIndex);
    }

    private trackAssignedRecordsStatus(assigned: GovernanceRecord[]) {
        if (!assigned?.length) {
            return;
        }

        this.assignmentPollingSub?.unsubscribe();

        const unique = assigned.filter((rec, i, arr) => !!rec.id && arr.findIndex((record) => rec.id === record.id) === i) as Array<
            GovernanceRecordWithId
        >;

        const ids = new Set(unique.map((r) => r.id));
        this.records = this.records.map((row) => (row.id && ids.has(row.id) ? { ...row, isProcessing: true } : row));

        this.assignmentPollingSub = from(unique)
            .pipe(
                mergeMap((rec) => this.pollRecordStatusAndUpdateRow(rec)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => (this.lastPollingTickAt = Date.now()),
                error: (err) => console.error(err),
            });
    }

    /**
     * Handle patched record → poll retainUntil until valid or timeout.
     */
    private processPatchedRecord(patched: GovernanceRecord): void {
        const id = patched?.id;
        if (!id) {return;}

        this.applyRowPatch(id, { retainUntil: RETAIN_UNTIL_LOADING });

        const loadingRecord: GovernanceRecord = {
            ...patched,
            retainUntil: RETAIN_UNTIL_LOADING,
        };

        this.polling
            .pollUntilRetainUntilValid(loadingRecord)
            .pipe(
                tap(({ record, timedOut }) => {
                    if (timedOut) {
                        this.applyRowPatch(id, {
                            retainUntil: INFINITE_RETAIN_UNTIL,
                            retainUntilUpdateFailed: true,
                        });
                        this.hxpNotificationService.showError(this.translate.instant('GOVERNANCE.NOTIFICATIONS.PROPERTY_UPDATE_TIMEOUT'));
                    } else {
                        this.applyRowPatch(id, { retainUntil: record?.retainUntil });
                        this.hxpNotificationService.showSuccess(this.translate.instant('GOVERNANCE.NOTIFICATIONS.PROPERTY_UPDATE_SUCCESS'));
                    }
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => (this.lastPollingTickAt = Date.now()),
                error: (err) => console.error(err),
            });
    }

    /**
     * Poll one record’s status until OnHold or timeout.
     */
    private pollRecordStatusAndUpdateRow(rec: GovernanceRecordWithId) {
        const id = rec.id;
        return this.polling.pollUntilOnHold(rec).pipe(
            tap(({ record, timedOut }) => {
                if (timedOut) {
                    this.applyRowPatch(id, {
                        isProcessing: false,
                        statusUpdateFailed: true,
                    });
                    this.hxpNotificationService.showError(this.translate.instant('GOVERNANCE.NOTIFICATIONS.STATUS_UPDATE_TIMEOUT'));
                } else {
                    this.applyRowPatch(id, {
                        status: record.status,
                        isProcessing: record.status !== RecordStatus.OnHold,
                    });
                    this.hxpNotificationService.showSuccess(this.translate.instant('GOVERNANCE.NOTIFICATIONS.STATUS_UPDATE_SUCCESS'));
                }
            }),
            finalize(() => {
                // Ensure spinner is cleared even if stuck
                const row = this.records.find((r) => r.id === id);
                if (row?.isProcessing) {
                    this.applyRowPatch(id, { isProcessing: false });
                }
            })
        );
    }

    /**
     * Immutably update a single row by id. No-op if not found.
     */
    private applyRowPatch(id: string, patch: Partial<GovernanceRecord>) {
        const i = this.records.findIndex((r) => r.id === id);
        if (i === -1) {return;}
        const next = [...this.records];
        next[i] = { ...next[i], ...patch };
        this.records = next;
    }

    private debounceSearch(): void {
        this.triggerSearchSubject.next(undefined);
    }

    /**
     * Builds the search params based on the current filters.
     */
    private buildSearchParams() {
        this.query = this.searchFilterValueService.toQueryParams();
        return this.query;
    }

    private clearQueryParams(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
            queryParamsHandling: '',
        });
    }
}

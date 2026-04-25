/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewChild, OnInit, Input, Output, EventEmitter, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityListComponent } from '../../shared/ui/data-table/entity-list/entity-list.component';
import { GovernanceRecord, LegalCase, ActionContext } from '../../shared/definitions/governance-shared.interface';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../shared/definitions/governance-shared.constants';
import { DataColumnComponent } from '../../shared/ui/data-table/entity-list/data-column.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { DatePipe, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { TableSkeletonLoaderComponent } from '@alfresco/adf-hx-content-services/ui';
import { ResultsPaginatorComponent } from '../../shared/ui/data-table/pagination/results-paginator.component';
import { Sort } from '@angular/material/sort';
import { SearchBoxComponent } from '../../shared/ui/search/filters/search-box/search-box.component';
import { CreateLegalHoldCaseButtonComponent } from './actions/create-legal-hold-case-button/create-legal-hold-case-button.component';
import { LegalActionContext, LegalHoldInitiatorType, LegalHoldSortDirection } from './definitions/legal-hold.interface';
import { LEGAL_HOLD_CASES_DEFAULT_SORT_COLUMN, LEGAL_HOLD_DEFAULT_SORT_DIRECTION, LegalHoldInitiator } from './definitions/legal-hold.constants';
import { GovernanceLegalCaseService } from './services/governance-legal-case.service';
import { EditLegalHoldCaseButtonComponent } from './actions/edit-legal-hold-case-button/edit-legal-hold-case-button.component';
import { EditLegalHoldCaseButtonService } from './actions/edit-legal-hold-case-button/edit-legal-hold-case-button.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LegalHoldRecordsComponent } from './feature/legal-hold-records/legal-hold-records.component';
import { ViewMode } from '@alfresco/adf-hx-content-services/services';
import { ActionToolbarComponent } from '../../shared/ui/data-table/toolbar/action-toolbar.component';
import { ErrorComponent } from '../../shared/ui/search/error/error.component';
import { EMPTY, expand, find, map } from 'rxjs';

interface HighlightSegment {
    match: boolean;
    text: string;
}

@Component({
    selector: 'hxp-governance-legal-hold-management',
    templateUrl: './legal-hold-management.component.html',
    styleUrl: './legal-hold-management.component.scss',
    imports: [
        NgClass,
        EntityListComponent,
        DataColumnComponent,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        DatePipe,
        TranslatePipe,
        SatIconModule,
        TableSkeletonLoaderComponent,
        ResultsPaginatorComponent,
        SearchBoxComponent,
        CreateLegalHoldCaseButtonComponent,
        EditLegalHoldCaseButtonComponent,
        LegalHoldRecordsComponent,
        ActionToolbarComponent,
        ErrorComponent,
    ],
})
export class GovernanceLegalHoldManagementComponent implements OnInit {
    private readonly dashboardSourceQueryParam = 'source';
    private readonly dashboardSourceQueryValue = 'dashboard';
    @Input() clickedFrom: LegalHoldInitiatorType = LegalHoldInitiator.Legal;
    @Input() highlightFirstRow = false;
    @Output() selectedLegalCase = new EventEmitter<LegalCase[]>();
    @Output() selectedRecord = new EventEmitter<GovernanceRecord[]>();
    @Output() actionContextChange = new EventEmitter<ActionContext>();
    @Output() sidebarToggle = new EventEmitter<boolean>();

    @ViewChild('legalCasesList') public legalCasesList!: EntityListComponent<LegalCase>;
    @ViewChild('legalCaseRecords') public legalCaseRecords!: EntityListComponent<GovernanceRecord>;

    legalActionContext: LegalActionContext = {
        legalHoldCases: [],
    };
    actionContext: ActionContext = {
        records: [],
        showPanel: false,
    };
    sortColumn = LEGAL_HOLD_CASES_DEFAULT_SORT_COLUMN;
    sortDirection: LegalHoldSortDirection = LEGAL_HOLD_DEFAULT_SORT_DIRECTION;
    legalCases: LegalCase[] = [];
    selectedCase?: LegalCase;
    noResults = false;
    isLoading = false;
    searchText = '';
    allCases: LegalCase[] = [];
    viewMode: ViewMode = ViewMode.Cases;
    ViewMode = ViewMode;
    pageSize = DEFAULT_GOVERNANCE_SEARCH_LIMIT;
    hasError = false;

    private readonly legalCaseQueryParam = 'legalCaseId';

    private selectedLegalCases: LegalCase[] = [];
    private records: GovernanceRecord[] = [];
    private allRecords: GovernanceRecord[] = [];
    private selectedRecords: GovernanceRecord[] = [];
    private currentPageIndex = 0;
    private lastEvaluatedKey = '';
    private pageKeyStack: string[] = [];
    private pendingRouteLookupLegalCaseId: string | null = null;
    private routeLegalCaseId: string | null = null;
    private routeOpenedFromDashboard = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly editLegalHoldCaseButtonService = inject(EditLegalHoldCaseButtonService);
    private readonly governanceLegalCaseService = inject(GovernanceLegalCaseService);

    constructor() {
        this.governanceLegalCaseService.shouldRefreshList$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((shouldReopen: boolean) => {
            if (shouldReopen) {
                // eslint-disable-next-line rxjs/no-nested-subscribe
                this.queryTable('', true);
            }
        });
    }

    onRetry(): void {
        this.queryTable('');
    }

    get selectedCount(): number {
        return this.viewMode === ViewMode.Cases ? this.selectedLegalCases.length : this.selectedRecords.length;
    }

    get previousDisabled(): boolean {
        return this.currentPageIndex <= 0;
    }

    get nextDisabled(): boolean {
        return !this.lastEvaluatedKey;
    }

    get hasSelection(): boolean {
        return this.viewMode === ViewMode.Cases ? this.selectedLegalCases.length > 0 : this.selectedRecords.length > 0;
    }

    ngOnInit() {
        if (this.shouldSyncRoute) {
            this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
                const nextRouteLegalCaseId =
                    typeof params[this.legalCaseQueryParam] === 'string' ? params[this.legalCaseQueryParam].trim() || null : null;
                const nextRouteOpenedFromDashboard = params[this.dashboardSourceQueryParam] === this.dashboardSourceQueryValue;

                if (nextRouteLegalCaseId === this.routeLegalCaseId && nextRouteOpenedFromDashboard === this.routeOpenedFromDashboard) {
                    return;
                }

                this.routeLegalCaseId = nextRouteLegalCaseId;
                this.routeOpenedFromDashboard = nextRouteOpenedFromDashboard;
                this.pendingRouteLookupLegalCaseId = null;

                if (this.routeLegalCaseId) {
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this.tryOpenCaseFromRoute();
                    return;
                }

                if (this.viewMode === ViewMode.Records) {
                    this.selectedCase = undefined;
                    this.viewMode = ViewMode.Cases;
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this.queryTable('', true);
                }
            });
        }

        this.queryTable('', true);
    }

    onSelectionChanged(selection: LegalCase[]): void {
        if (this.viewMode === ViewMode.Cases) {
            this.selectedLegalCases = selection;
            this.legalActionContext = { ...this.legalActionContext, legalHoldCases: this.selectedLegalCases };
            this.selectedLegalCase.emit(this.selectedLegalCases);
        }
    }

    clearAll = () => {
        if (this.viewMode === ViewMode.Cases) {
            this.selectedLegalCases = [];
            this.legalCasesList.clearSelection();
        } else {
            this.selectedRecords = [];
            this.legalCaseRecords.clearSelection();
        }
    };

    onPageSizeChange(size: number): void {
        this.pageSize = size;
        this.resetPagination();
        this.queryTable('', true);
    }

    loadNextPage() {
        if (this.lastEvaluatedKey) {
            this.currentPageIndex++;
            this.pageKeyStack[this.currentPageIndex] = this.lastEvaluatedKey;
            this.queryTable(this.lastEvaluatedKey, false);
        }
    }

    loadPreviousPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            const prevKey = this.pageKeyStack[this.currentPageIndex];
            this.queryTable(prevKey, true);
        }
    }

    onSortingChanged(sort: Sort) {
        this.sortColumn = sort.active;
        this.sortDirection = sort.direction as LegalHoldSortDirection;
        this.resetPagination();
        // Reload the data with the new sorting
        this.queryTable('', true);
    }

    onSearchInputChange(value: string): void {
        this.searchText = value.trim().toLowerCase();
        this.applyFilter();
    }

    onCaseCountClick(legalCase: LegalCase): void {
        this.openCaseRecords(legalCase);
    }

    backToCases() {
        if (this.routeOpenedFromDashboard) {
            void this.router.navigate(['/governance/dashboard']);
            return;
        }

        this.selectedCase = undefined;
        this.viewMode = ViewMode.Cases;
        this.syncLegalCaseQueryParam(null);
        this.queryTable('', true);
    }

    handleChildActionContextChange(actionContext: ActionContext) {
        this.selectedRecords = [...actionContext.records];
        this.actionContextChange.emit(actionContext);
    }

    onSidebarToggle(show: boolean) {
        this.sidebarToggle.emit(show);
    }

    onEditLegalHoldCaseFromRow(legalCase: LegalCase): void {
        if (!legalCase) {
            return;
        }

        this.legalActionContext = { ...this.legalActionContext, legalHoldCases: [legalCase] };
        this.editLegalHoldCaseButtonService.execute(this.legalActionContext);
    }

    getHighlightSegments(value = ''): HighlightSegment[] {
        const text = value;

        if (!text || !this.searchText) {
            return [{ text, match: false }];
        }

        const escapedSearchText = this.searchText.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSearchText, 'gi');
        const segments: HighlightSegment[] = [];
        let lastIndex = 0;
        let match = regex.exec(text);

        while (match) {
            const start = match.index;
            const matchedText = match[0];

            if (start > lastIndex) {
                segments.push({ text: text.slice(lastIndex, start), match: false });
            }

            segments.push({ text: matchedText, match: true });
            lastIndex = start + matchedText.length;

            match = regex.exec(text);
        }

        if (lastIndex < text.length) {
            segments.push({ text: text.slice(lastIndex), match: false });
        }

        return segments.length > 0 ? segments : [{ text, match: false }];
    }

    private queryTable(lastEvaluatedKey = '', navigatingBack = false): void {
        this.isLoading = true;
        this.searchText = '';
        this.hasError = false;
        this.noResults = false;

        this.governanceLegalCaseService
            .queryLegalCases({
                exclusiveStartKey: lastEvaluatedKey,
                limit: this.pageSize,
            })
            .subscribe({
                next: (records) => {
                    this.legalCases = this.allCases = Array.isArray(records?.contents) ? records.contents : [];
                    this.isLoading = false;
                    this.noResults = (records?.contents?.length ?? 0) === 0;

                    this.lastEvaluatedKey = records.lastEvaluatedKey || '';
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this.tryOpenCaseFromRoute();

                    // Only store forward keys when going forward
                    if (!navigatingBack && this.lastEvaluatedKey) {
                        this.pageKeyStack[this.currentPageIndex + 1] = this.lastEvaluatedKey;
                    }
                },
                error: (err) => {
                    console.error('Error loading legal holds', err);
                    this.isLoading = false;
                    this.noResults = true;
                    this.hasError = true;
                },
            });
    }

    private resetPagination(): void {
        this.pageKeyStack = [''];
        this.currentPageIndex = 0;
        this.lastEvaluatedKey = '';
    }

    private applyFilter(): void {
        if (this.viewMode === ViewMode.Cases) {
            this.legalCases = this.searchText
                ? this.allCases.filter((c) => c.legalCaseName?.toLowerCase().includes(this.searchText.toLowerCase()))
                : this.allCases;

            this.noResults = this.legalCases.length === 0;
        } else {
            this.records = this.searchText
                ? this.allRecords.filter((r) => r.fileName?.toLowerCase().includes(this.searchText.toLowerCase()))
                : this.allRecords;

            this.noResults = this.records.length === 0;
        }
    }

    private tryOpenCaseFromRoute(): void {
        const routeLegalCaseId = this.routeLegalCaseId;
        if (!routeLegalCaseId) {
            return;
        }

        if (this.viewMode === ViewMode.Records && this.selectedCase?.legalCaseId === routeLegalCaseId) {
            this.pendingRouteLookupLegalCaseId = null;
            return;
        }

        const legalCase = this.findLegalCase(this.allCases, routeLegalCaseId);
        if (!legalCase) {
            this.lookupRouteLegalCaseAcrossPages();
            return;
        }

        this.pendingRouteLookupLegalCaseId = null;
        this.openCaseRecords(legalCase, false);
    }

    private openCaseRecords(legalCase: LegalCase, syncUrl = true): void {
        const legalCaseId = String(legalCase.legalCaseId ?? '').trim();
        if (!legalCaseId) {
            return;
        }

        if (this.viewMode === ViewMode.Records && this.selectedCase?.legalCaseId === legalCaseId) {
            return;
        }

        this.selectedCase = legalCase;
        this.viewMode = ViewMode.Records;
        this.searchText = '';

        this.actionContext = {
            ...this.actionContext,
            records: this.records,
            showPanel: false,
        };
        this.actionContextChange.emit(this.actionContext);

        if (syncUrl) {
            this.syncLegalCaseQueryParam(legalCaseId);
        }
    }

    private syncLegalCaseQueryParam(legalCaseId: string | null): void {
        if (!this.shouldSyncRoute) {
            return;
        }

        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { [this.legalCaseQueryParam]: legalCaseId },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    private lookupRouteLegalCaseAcrossPages(): void {
        if (!this.routeLegalCaseId || !this.lastEvaluatedKey || this.pendingRouteLookupLegalCaseId === this.routeLegalCaseId) {
            return;
        }

        const legalCaseId = this.routeLegalCaseId;
        this.pendingRouteLookupLegalCaseId = legalCaseId;

        this.governanceLegalCaseService
            .queryLegalCases({
                exclusiveStartKey: this.lastEvaluatedKey,
                limit: this.pageSize,
            })
            .pipe(
                expand((result) => {
                    const matchedLegalCase = this.findLegalCase(this.getLegalCases(result.contents), legalCaseId);
                    if (matchedLegalCase || !result.lastEvaluatedKey || this.routeLegalCaseId !== legalCaseId) {
                        return EMPTY;
                    }

                    return this.governanceLegalCaseService.queryLegalCases({
                        exclusiveStartKey: result.lastEvaluatedKey,
                        limit: this.pageSize,
                    });
                }),
                map((result) => this.findLegalCase(this.getLegalCases(result.contents), legalCaseId) ?? null),
                find((matchedLegalCase): matchedLegalCase is LegalCase => !!matchedLegalCase),
                map((matchedLegalCase) => matchedLegalCase ?? null),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (matchedLegalCase) => {
                    if (this.routeLegalCaseId !== legalCaseId) {
                        return;
                    }

                    this.pendingRouteLookupLegalCaseId = null;

                    if (matchedLegalCase) {
                        this.openCaseRecords(matchedLegalCase, false);
                    }
                },
                error: () => {
                    if (this.routeLegalCaseId === legalCaseId) {
                        this.pendingRouteLookupLegalCaseId = null;
                    }
                },
            });
    }

    private findLegalCase(legalCases: LegalCase[], legalCaseId: string): LegalCase | undefined {
        return legalCases.find((item) => item.legalCaseId === legalCaseId);
    }

    private getLegalCases(contents: unknown): LegalCase[] {
        return Array.isArray(contents) ? contents : [];
    }

    private get shouldSyncRoute(): boolean {
        return this.clickedFrom === LegalHoldInitiator.Legal;
    }
}

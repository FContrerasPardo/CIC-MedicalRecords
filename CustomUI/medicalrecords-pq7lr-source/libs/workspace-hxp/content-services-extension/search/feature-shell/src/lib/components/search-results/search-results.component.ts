/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    inject,
    NgZone,
    OnInit,
    QueryList,
    TemplateRef,
    ViewChild,
    ViewChildren,
    OnDestroy,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { merge, Observable, of, Subject } from 'rxjs';
import { debounceTime, filter, finalize, skip, take, takeUntil, tap } from 'rxjs/operators';
import { Document, QueryResult } from '@hylandsoftware/hxcs-js-client';
import { Pagination } from '@alfresco/js-api';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HttpUrlEncodingCodec } from '@angular/common/http';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import {
    DocumentService,
    ActionContext,
    DocumentModel,
    DocumentModelService,
    DocumentRouterService,
    SearchService,
    ColumnConfig,
    ColumnConfigService,
    ColumnDataService,
    ColumnKeys,
    SearchFiltersExtensionsService,
    SearchFiltersRef,
    SearchFilterValueService,
    SearchFilterValueStoreService,
    SearchType,
    MAX_SEARCH_RESULTS_PAGINATION_LIMIT,
    hasPermission,
    DocumentPermissions,
    ContextActionConfiguration,
    PermissionLevelPipe,
    SidebarService,
} from '@alfresco/adf-hx-content-services/services';
import {
    DataColumn,
    DataColumnComponent,
    DataColumnListComponent,
    IdentityUserModel,
    IdentityUserService,
    JwtHelperService,
    StorageService,
} from '@alfresco/adf-core';
import { DynamicExtensionComponent } from '@alfresco/adf-extensions';
import { PageSizeStorageService, PaginationDefault, PaginationOptions } from '@hxp/workspace-hxp/content-services-extension/shared/util';
import {
    BaseSearchFilterDirective,
    ContentTypeIconComponent,
    FormatDocumentPathDirective,
    HxpMetadataSidebarComponent,
    ManageVersionsSidebarComponent,
    SearchNoResultsComponent,
    SearchTermFilterComponent,
    SearchTermFilterData,
} from '@alfresco/adf-hx-content-services/ui';
import { ContentRepositoryComponent } from '@hxp/workspace-hxp/content-services-extension/shared/content-repository/feature-shell';
import { AsyncPipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';

@Component({
    selector: 'hxp-search-results',
    templateUrl: './search-results.component.html',
    styleUrls: ['./search-results.component.scss'],
    imports: [
        AsyncPipe,
        TranslatePipe,
        MatTabsModule,
        MatPaginatorModule,
        MatIconModule,
        NgTemplateOutlet,
        ContentRepositoryComponent,
        SearchTermFilterComponent,
        DynamicExtensionComponent,
        SearchNoResultsComponent,
        DataColumnListComponent,
        DataColumnComponent,
        ContentTypeIconComponent,
        HxpMetadataSidebarComponent,
        ManageVersionsSidebarComponent,
        PermissionLevelPipe,
        FormatDocumentPathDirective,
        MatButtonModule,
        DecimalPipe,
    ],
    providers: [
        MatPaginatorIntl,
        DecimalPipe
    ]
})
export class SearchResultsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('defaultTemplate') defaultTemplate!: TemplateRef<any>;
    @ViewChild('customTemplate') customTemplate!: TemplateRef<any>;

    @ViewChildren(SearchTermFilterComponent) private searchInputs!: QueryList<SearchTermFilterComponent>;

    @ViewChild('searchTermFilter') private searchTermFilter!: BaseSearchFilterDirective;
    @ViewChildren(DynamicExtensionComponent)
    private searchFiltersComponents!: QueryList<DynamicExtensionComponent>;

    public documents: Document[] = [];
    public pagination = {
        pageIndex: 0,
        pageSize: PaginationDefault,
        skipCount: 0,
        totalItems: 0,
        totalCountIsTruncated: false,
    };
    public readonly pageSizeOptions = PaginationOptions;
    public isLoading = false;
    public query?: string;
    public type: SearchType = SearchType.BASIC;
    public actionContext: ActionContext = { documents: [], refererURL: '/search' };
    public columnConfigs: ColumnConfig[] = [];
    public model!: DocumentModel;
    public defaultColumnKeys = ColumnKeys;

    protected isCreateDisabled: true | undefined = true;
    protected selection: Document[] = [];
    protected selectedTabIndex = 0;
    protected isDirty = false;
    protected searchTerm = '';
    protected searchFilters$?: Observable<SearchFiltersRef>;
    protected columnWidths?: { [key: string]: number };
    protected editablePropertiesSidebar = false;
    protected readonly sidebarService = inject(SidebarService);
    protected readonly translateService = inject(TranslateService);
    protected readonly searchFilterValueService = inject(SearchFilterValueService);
    protected readonly featuresService = inject(FeaturesServiceToken);
    protected readonly searchResults100KEnabled$ = this.featuresService.isOn$(ADF_HX_CONTENT_SERVICES_INTERNAL.SEARCH_RESULTS_100K);
    protected get locale(): string {
        return this.translateService.getCurrentLang() || this.translateService.getFallbackLang() || 'en';
    }
    protected totalItemsCount = 0;

    private destroyed$ = new Subject<void>();
    private searchResults100KEnabled = false;
    private encoder = new HttpUrlEncodingCodec();
    private triggerSearchSubject = new Subject<boolean>();
    private identityUser$: Observable<IdentityUserModel>;
    private userInfo!: IdentityUserModel;
    private activeSortingOptions: Array<string> = [];
    private isPopulatingFilters = false;

    private readonly onDestroy$ = new Subject<void>();
    private readonly activatedRoute = inject(ActivatedRoute);
    private readonly ngZone = inject(NgZone);
    private readonly router = inject(Router);
    private readonly documentRouterService = inject(DocumentRouterService);
    private readonly searchFiltersExtensionsService = inject(SearchFiltersExtensionsService);
    private readonly searchService = inject(SearchService);
    private readonly documentService = inject(DocumentService);
    private readonly ref = inject(ChangeDetectorRef);
    private readonly columnConfigService = inject(ColumnConfigService);
    private readonly columnDataService = inject(ColumnDataService);
    private readonly identityUserService = inject(IdentityUserService);
    private readonly documentModelService = inject(DocumentModelService);
    private readonly searchFilterValueStoreService = inject(SearchFilterValueStoreService);
    private readonly storageService = inject(StorageService);
    private readonly pageSizeStorageService = inject(PageSizeStorageService);
    private readonly jwtHelperService = inject(JwtHelperService);
    private readonly paginatorIntl = inject(MatPaginatorIntl);
    private readonly decimalPipe = inject(DecimalPipe);

    constructor() {
        this.subscribeToDocumentUpdates();

        this.triggerSearchSubject.pipe(debounceTime(500)).subscribe((resetPagination: boolean) => {
            // eslint-disable-next-line rxjs/no-nested-subscribe
            this.executeSearch(resetPagination);
        });

        this.identityUser$ = of(this.identityUserService.getCurrentUserInfo());

        this.documentModelService
            .getModel()
            .pipe(takeUntil(this.destroyed$))
            .subscribe({
                next: (model: DocumentModel) => {
                    this.model = model;
                },
            });

        this.paginatorIntl.getRangeLabel = this.createPaginationRangeLabel;
        this.translateService.onLangChange.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
            this.paginatorIntl.getRangeLabel = this.createPaginationRangeLabel;
            this.paginatorIntl.changes.next();
        });
    }

    ngOnInit(): void {
        this.pagination.pageSize = this.pageSizeStorageService.getSize();

        this.searchResults100KEnabled$.pipe(takeUntil(this.onDestroy$)).subscribe((enabled) => {
            this.searchResults100KEnabled = enabled;
            this.paginatorIntl.changes.next();
        });

        this.identityUser$.pipe(takeUntil(this.destroyed$)).subscribe((userInfo: IdentityUserModel) => {
            this.userInfo = userInfo;
            // eslint-disable-next-line rxjs/no-nested-subscribe
            this.initialize();
        });
    }

    ngAfterViewInit() {
        this.columnConfigService.columnConfigs$.pipe(take(1)).subscribe((columns) => {
            this.updateColumnConfigs(columns);
            this.populateFilters();
            // eslint-disable-next-line rxjs/no-nested-subscribe
            this.executeSearch(true);
            this.ref.detectChanges();
        });

        this.columnConfigService.columnConfigs$.pipe(skip(1), takeUntil(this.destroyed$)).subscribe((columns) => {
            this.updateColumnConfigs(columns);
            // eslint-disable-next-line rxjs/no-nested-subscribe
            this.executeSearch(true);
            this.ref.detectChanges();
        });
    }

    ngOnDestroy() {
        this.onDestroy$.next();
        this.onDestroy$.complete();
        this.searchFilterValueService.clearFilters();
    }

    onPaginationChange($event: PageEvent): void {
        this.pageSizeStorageService.setSize($event.pageSize);

        this.pagination.pageSize = $event.pageSize;
        this.pagination.pageIndex = $event.pageIndex;
        this.pagination.skipCount = $event.pageIndex * $event.pageSize;
        this.executeSearch();
    }

    handleCurrentSelection(documents: Document[]) {
        this.selection = documents;
        this.editablePropertiesSidebar = this.selection.length > 0 ? hasPermission(this.selection[0], DocumentPermissions.READ_WRITE) : false;
    }

    handleCloseSidebarPanel(): void {
        this.sidebarService.closePanel();
    }

    protected onTabChange(event: MatTabChangeEvent): void {
        if (event.index === 0) {
            this.type = SearchType.BASIC;
        } else if (event.index === 1) {
            this.type = SearchType.HXQL;
            if (this.searchTerm !== this.query) {
                this.query = '';
                this.searchTerm = '';
            }
        }
        this.selectedTabIndex = event.index;
        this.resetSearch();
    }

    protected onColumnsWidthChange(columns: DataColumn[]) {
        this.columnWidths = columns.reduce((widthsColumnsMap: any, column: DataColumn) => {
            if (column.width && column.id) {
                widthsColumnsMap[column.id] = Math.ceil(column.width);
            }
            return widthsColumnsMap;
        }, {});
    }

    protected trackByColumn(index: number, config: ColumnConfig): string {
        return `${index}-${config.key}`;
    }

    protected searchTermChanged(searchTerm: string) {
        this.isDirty = !!searchTerm;
        this.searchTerm = searchTerm;
    }

    protected resetSearch(): void {
        this.resetPagination();
        this.resetFilters();
        this.resetFiltersStore();
        this.updateURL();
    }

    protected search() {
        if (this.searchTerm) {
            this.searchTermFilter.applyFilter();
        } else {
            this.debounceSearch();
        }
    }

    protected getColumnValue(document: Document, columnKey: ColumnKeys): Observable<string> {
        return this.columnDataService.getColumnValue(document, columnKey);
    }

    protected getCustomColumnValue(document: Document, columnKey: string, type: any) {
        return this.columnDataService.getCustomColumnValue(document, columnKey, this.model, type);
    }

    protected handleSortingClicked(options: string[]) {
        this.activeSortingOptions = options;
        this.executeSearch();
    }

    protected handleRowClicked(document: Document) {
        this.ngZone.run(() => {
            this.documentRouterService.navigateTo(document);
        });
    }

    private initialize() {
        this.activatedRoute.queryParams
            .pipe(
                filter((params) => params['q'] || params['type']),
                takeUntil(this.onDestroy$)
            )
            .subscribe({
                next: (params) => {
                    this.searchTerm = this.encoder.decodeValue(params['q']);
                    this.type = this.encoder.decodeValue(params['type']) as SearchType;
                    this.query = this.buildSearchQuery();
                    this.selectedTabIndex = this.isHXQL() ? 1 : 0;
                },
            });

        this.searchFilters$ = this.searchFiltersExtensionsService.getSearchFiltersItems();

        merge(
            this.searchFilterValueService.filterApplied$.pipe(
                tap((data) => {
                    this.searchFilterValueStoreService.addValue(data.filter, data.value);
                })
            ),
            this.searchFilterValueService.filterReset$.pipe(
                tap((data) => {
                    this.searchFilterValueStoreService.deleteValue(data);
                })
            )
        )
            .pipe(
                filter(() => !this.isPopulatingFilters),
                takeUntil(this.onDestroy$)
            )
            .subscribe({
                next: () => {
                    this.debounceSearch(true);
                },
            });

        merge(this.documentService.documentCreated$, this.documentService.documentDeleted$, this.documentService.documentRequestReload$)
            .pipe(debounceTime(1000), takeUntil(this.destroyed$))
            .subscribe(() => {
                this.documentService.clearSelectionDocumentList();
                this.debounceSearch();
            });
    }

    private populateFilters(): void {
        const userAuthTimeKey = `${this.userInfo.email}_auth_time`;
        const authTime = `${this.jwtHelperService.getValueFromLocalAccessToken('auth_time')}`;
        const savedAuthTime = this.storageService.getItem(userAuthTimeKey);

        if (authTime !== savedAuthTime) {
            this.resetFiltersStore();
            this.storageService.setItem(userAuthTimeKey, `${authTime}`);
            return;
        }

        if (!this.searchFilterValueStoreService.hasValues()) {
            return;
        }

        this.isPopulatingFilters = true; // prevent search execution for each filter applied
        this.searchFiltersComponents.forEach((f: DynamicExtensionComponent) => {
            const filterInstance = f['componentRef']?.instance as any as BaseSearchFilterDirective;

            const data = this.searchFilterValueStoreService.getValue(filterInstance);
            if (data) {
                filterInstance.populateWith(data);
            }
        });
        const searchTermValue: SearchTermFilterData = this.searchFilterValueStoreService.getValue(this.searchTermFilter) as SearchTermFilterData;

        // if there's a search term coming from the URL, we should use it instead of the one from the store
        if (this.searchTerm) {
            this.searchTermFilter.populateWith(new SearchTermFilterData([{ label: 'Search term', type: this.type, term: this.searchTerm }]));
        } else if (searchTermValue) {
            this.searchTermFilter.populateWith(searchTermValue);
            this.searchTerm = searchTermValue?.values[0]?.term ?? '';
            this.type = searchTermValue?.values[0]?.type as SearchType;
        }
        this.isPopulatingFilters = false;
    }

    private resetFilters(): void {
        this.documents = [];
        this.searchFilterValueService.clearFilters();
        this.searchInputs?.get(this.selectedTabIndex)?.onClear();
        this.debounceSearch();
    }

    private resetPagination(): void {
        this.pagination.pageIndex = 0;
        this.pagination.skipCount = 0;
        this.pagination.totalItems = 0;
        this.totalItemsCount = 0;
        this.pagination.totalCountIsTruncated = false;
    }

    private resetFiltersStore(): void {
        this.searchFilterValueStoreService.reset();
    }

    /**
     * Debounces the search request.
     */
    private debounceSearch(resetPagination: boolean = false): void {
        this.triggerSearchSubject.next(resetPagination);
    }

    /**
     * Executes a new search based on the current search term and filters, and pagination.
     * If no search term or filters are applied, the search view is reset.
     */
    private executeSearch(resetPaginationOffset: boolean = false) {
        if (!this.searchTerm && !this.searchFilterValueService.hasFilters()) {
            this.query = '';
            this.documents = [];
            this.resetPagination();
            return;
        }

        this.router.onSameUrlNavigation = 'reload';
        this.ngZone.run(() => {
            void this.router.navigate([], {
                queryParams: this.getQueryParams(),
                queryParamsHandling: 'merge',
            });
        });

        const routerEventSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.router.onSameUrlNavigation = 'ignore';
                routerEventSubscription.unsubscribe();
            }
        });

        const paginationOptions = {
            maxItems: this.pagination.pageSize,
            skipCount: resetPaginationOffset ? 0 : this.pagination.skipCount,
        };
        this.query = this.buildSearchQuery();
        this.searchRepository(this.query, paginationOptions);
    }

    protected onMenuItemClick(menuItem: ContextActionConfiguration) {
        if (menuItem?.model?.visible) {
            menuItem.subject.next(menuItem);
        }
    }

    private searchRepository(query: string, pagination: Pagination): void {
        this.isLoading = true;

        const options = {
            pagination: pagination,
            sort: this.activeSortingOptions,
        };

        this.searchService
            .getDocumentsByQuery(query, options)
            .pipe(finalize(() => (this.isDirty = false)))
            .subscribe({
                next: (queryResults) => this.handleSearchResults(queryResults),
                error: (err) => this.handleSearchError(err),
            });
    }

    private handleSearchResults({ documents, offset = 0, totalCount = 0, totalCountIsTruncated = false }: QueryResult): void {
        this.documents = documents || [];
        this.totalItemsCount = totalCount;
        this.pagination.totalItems = Math.min(totalCount, MAX_SEARCH_RESULTS_PAGINATION_LIMIT);
        this.pagination.pageIndex = Math.floor(offset / this.pagination.pageSize);
        this.pagination.skipCount = offset;
        this.pagination.totalCountIsTruncated = totalCountIsTruncated;
        this.isLoading = false;
    }

    private handleSearchError(err: Error | string): void {
        console.error(err);
        this.documents = [];
        this.resetPagination();
        this.isLoading = false;
    }

    /**
     * Builds the search query: if type is HXQL, return the searchTerm as is, otherwise convert it to HXQL.
     */
    private buildSearchQuery(): string {
        return this.isHXQL() ? this.searchTerm : this.searchFilterValueService.toHXQL();
    }

    private isHXQL(): boolean {
        return this.type === SearchType.HXQL;
    }

    private updateURL(): void {
        this.ngZone.run(() => {
            void this.router.navigateByUrl('/').then(() =>
                this.router.navigate(['search'], {
                    queryParams: this.getQueryParams(),
                })
            );
        });
    }

    private getQueryParams() {
        return {
            q: this.encoder.encodeValue(this.isHXQL() ? this.buildSearchQuery() : this.searchTerm),
            type: this.encoder.encodeValue(this.type),
        };
    }

    private updateColumnConfigs(columns: ColumnConfig[]): void {
        const userSpecificColumns = this.columnConfigService.getSelectedColumnsForCurrentUser(this.userInfo);
        const effectiveColumns = userSpecificColumns && userSpecificColumns.length > 0 ? userSpecificColumns : columns;
        this.columnConfigs = effectiveColumns.map((col) => ({
            ...col,
            templateRef: this.getTemplateRefByKey(col.key),
        }));

        this.ref.detectChanges();
    }

    private getTemplateRefByKey(templateKey: string): TemplateRef<any> {
        const defaultTemplateKeys = Object.values(ColumnKeys);
        return defaultTemplateKeys.includes(templateKey as ColumnKeys) ? this.defaultTemplate : this.customTemplate;
    }

    private subscribeToDocumentUpdates(): void {
        this.documentService.documentUpdated$
            .pipe(
                filter(({ document }) => !!document && this.documents?.some((doc) => doc.sys_id === document.sys_id)),
                takeUntil(this.destroyed$)
            )
            .subscribe({
                next: () => {
                    this.debounceSearch();
                },
                error: (error) => console.error(error),
            });
    }

    private createPaginationRangeLabel = (): string => {

        const startIndex = this.pagination.pageIndex * this.pagination.pageSize;
        const endIndex = Math.min(startIndex + this.pagination.pageSize, this.pagination.totalItems);

        // New format with localization and truncation support
        if (this.searchResults100KEnabled) {
            const localizedStartIndex = this.decimalPipe.transform(startIndex + 1, '1.0-0', this.locale);
            const localizedEndIndex = this.decimalPipe.transform(endIndex, '1.0-0', this.locale);
            const localizedTotalItems = this.decimalPipe.transform(this.pagination.totalItems, '1.0-0', this.locale);

            return this.translateService.instant('PAGINATION.PAGE_NUMBER', {
                startIndex: localizedStartIndex,
                endIndex: localizedEndIndex,
                totalPages: localizedTotalItems,
            });
        }

        // Fallback to previous format
        return this.translateService.instant('PAGINATION.PAGE_NUMBER', {
            startIndex: startIndex + 1,
            endIndex: endIndex,
            totalPages: this.pagination.totalItems,
        });
    };
}

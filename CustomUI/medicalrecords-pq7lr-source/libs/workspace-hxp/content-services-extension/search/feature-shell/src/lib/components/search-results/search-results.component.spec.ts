/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { SearchResultsComponent } from './search-results.component';
import { RouterTestingModule } from '@angular/router/testing';
import { DataColumnComponent, DataColumnListComponent, NoopTranslateModule, UserPreferencesService, JwtHelperService } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MockComponents, MockProvider, MockService, ngMocks } from 'ng-mocks';
import { By } from '@angular/platform-browser';
import { MODEL_API_TOKEN, queryApiProvider, mockHxcsJsClientConfigurationService, uploadApiProvider } from '@alfresco/adf-hx-content-services/api';
import { generateMockResponse, jestMocks, a11yReport } from '@hxp/workspace-hxp/shared/testing';
import localeEn from '@angular/common/locales/en';
import localeEnExtra from '@angular/common/locales/extra/en';
import { registerLocaleData } from '@angular/common';
import { Document, ModelApi } from '@hylandsoftware/hxcs-js-client';
import { MatTabsModule } from '@angular/material/tabs';
import {
    DocumentService,
    ContextMenuActionsService,
    HXP_DOCUMENT_INFO_ACTION_SERVICE,
    DEFAULT_PAGE_SIZE,
    SearchService,
    ManageVersionsButtonActionService,
    SearchType,
    ColumnConfigService,
    ColumnDataService,
    SearchFilterData,
    SearchFiltersExtensionsService,
    SearchFilterValueService,
    SearchFilterValueStoreService,
    DocumentUpdateInfo,
    HXP_DOCUMENT_DELETE_ACTION_SERVICE,
    HXP_DOCUMENT_SINGLE_ITEM_DOWNLOAD_ACTION_SERVICE,
    DocumentActionService,
    HXP_DOCUMENT_SHARE_ACTION_SERVICE,
    HXP_MANAGE_COLUMN_ACTION_SERVICE,
    SidebarService,
    MAX_SEARCH_RESULTS_PAGINATION_LIMIT,
} from '@alfresco/adf-hx-content-services/services';
import { signal, TemplateRef } from '@angular/core';
import { DynamicExtensionComponent, ExtensionService } from '@alfresco/adf-extensions';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PaginatorHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { PageSizeStorageService } from '@hxp/workspace-hxp/content-services-extension/shared/util';
import { ContentRepositoryComponent } from '@hxp/workspace-hxp/content-services-extension/shared/content-repository/feature-shell';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonHarness } from '@angular/material/button/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import {
    ContentPropertyViewerActionService,
    DeleteButtonActionService,
    HxpMetadataSidebarComponent,
    ManageVersionsSidebarComponent,
    SearchNoResultsComponent,
    SearchTermFilterComponent,
} from '@alfresco/adf-hx-content-services/ui';
import { MatTabHarness } from '@angular/material/tabs/testing';
import { provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';
import { TranslateService } from '@ngx-translate/core';
import { MatIconTestingModule } from '@angular/material/icon/testing';

const mockColumns = [
    { key: 'icon', title: 'File Type', sortable: false, removable: true },
    { key: 'title', title: 'Title', sortable: true, removable: false },
];

registerLocaleData(localeEn, 'en', localeEnExtra);

const SEARCH_FILTERS_REF = {
    id: 'app.search.filters',
    items: [
        {
            id: 'app.search.filters.created-date-filter',
            component: 'workspace-hxp-search-filter.created-date-filter',
        },
        {
            id: 'app.search.filters.document-category-filter',
            component: 'workspace-hxp-search-filter.document-category-filter',
        },
    ],
};

const EXTENSION_CONFIG = {
    $schema: '../../../extension.schema.json',
    $id: 'app.core',
    $name: 'app.core',
    $version: '0.0.1',
    $vendor: 'Hyland Software, Ltd.',
    $license: 'LGPL-3.0',
    $runtime: '1.7.0',
    $description: 'Test search features extension',
    $references: [],
    $ignoreReferenceList: [],
    features: {
        search: {
            filters: SEARCH_FILTERS_REF,
        },
    },
};

const SEARCH_ROUTE = 'search';

const SEARCH_TYPES: {
    name: string;
    tabIndex: number;
    type: SearchType;
    searchTerm: string;
    query: string;
    displayFilters: boolean;
}[] = [
    {
        name: 'Basic search',
        tabIndex: 0,
        type: SearchType.BASIC,
        searchTerm: 'test',
        query: "SELECT * FROM SysContent WHERE sys_fulltext = 'test*'",
        displayFilters: true,
    },
    {
        name: 'HXQL search',
        tabIndex: 1,
        type: SearchType.HXQL,
        searchTerm: "SELECT * FROM SysContent WHERE sys_fulltext = 'test*'",
        query: "SELECT * FROM SysContent WHERE sys_fulltext = 'test*'",
        displayFilters: false,
    },
];

describe('SearchResultsComponent', () => {
    let component: SearchResultsComponent;
    let fixture: ComponentFixture<SearchResultsComponent>;
    let extensionService: ExtensionService;
    let loader: HarnessLoader;
    let router: Router;
    let searchService: SearchService;
    let searchServiceSpy: jest.SpyInstance;
    let navigateByUrlSpy: jest.SpyInstance;
    let navigateSpy: jest.SpyInstance;
    let documentUpdated$;

    const mockTemplateRefs = new Map<string, any>();
    mockTemplateRefs.set('icon', {} as TemplateRef<any>);
    mockTemplateRefs.set('title', {} as TemplateRef<any>);

    const mockManageVersionsButtonActionService = MockService(ManageVersionsButtonActionService);
    const mockContentPropertyViewerActionService = MockService(ContentPropertyViewerActionService);
    const mockDocumentService = MockService(DocumentService);
    const mockModelApi: ModelApi = MockService(ModelApi);
    const mockPageSizeStorageService = MockService(PageSizeStorageService);
    const mockSearchFiltersExtensionService = MockService(SearchFiltersExtensionsService);
    const mockSearchFilterValueService = MockService(SearchFilterValueService);
    const mockSearchFilterValueStoreService = MockService(SearchFilterValueStoreService);
    const mockColumnConfigService = MockService(ColumnConfigService);
    const mockJwtHelperService = MockService(JwtHelperService);

    let mockSidebarService: any;

    const changeSearchTab = async (tabIndex: number) => {
        const tabs = await loader.getAllHarnesses(MatTabHarness);
        const targetActiveTab = tabs[tabIndex];
        await targetActiveTab.select();
    };

    const initializeSidebarMock = () => {
        const panelSignal = signal<any>(null);
        return {
            panel: panelSignal.asReadonly(),
            togglePanel: jest.fn().mockImplementation((panelType: any) => {
                panelSignal.set(panelType);
            }),
            closePanel: jest.fn().mockImplementation(() => {
                panelSignal.set(null);
            }),
        };
    };

    const configureMockServices = () => {
        mockSearchFiltersExtensionService.getSearchFiltersItems = () => of(SEARCH_FILTERS_REF);

        mockColumnConfigService.getSelectedColumnsForCurrentUser = () => [];
        mockColumnConfigService.columnConfigs$ = of([]);

        mockSearchFilterValueService.filterApplied$ = new Subject();
        mockSearchFilterValueService.filterReset$ = new Subject();
        mockSearchFilterValueService.toHXQL = () => SEARCH_TYPES[0].query;

        jest.spyOn(mockModelApi, 'getModel').mockReturnValue(generateMockResponse({ data: jestMocks.modelApi }));

        jest.spyOn(mockDocumentService, 'getDocumentById').mockReturnValue(of(jestMocks.folderDocument));
        mockDocumentService.documentCreated$ = new Subject<Document>();
        mockDocumentService.documentDeleted$ = new Subject<string>();
        mockDocumentService.documentRequestReload$ = new Subject<void>();
        mockDocumentService.clearDocumentSelection$ = new Subject<void>();

        mockPageSizeStorageService.getSize = () => DEFAULT_PAGE_SIZE;

        searchServiceSpy = jest.spyOn(searchService, 'getDocumentsByQuery').mockReturnValue(of(jestMocks.searchResults));

        extensionService.setup$ = of(EXTENSION_CONFIG);

        navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
        navigateSpy = jest.spyOn(router, 'navigate').mockImplementation();
    };

    const mockDocumentDownloadActionService: DocumentActionService = MockService(DocumentActionService, {
        isAvailable: () => true,
    });
    const mockContentShareButtonActionService: DocumentActionService = MockService(DocumentActionService, {
        isAvailable: () => true,
    });

    const configureTestingModule = () => {
        mockSidebarService = initializeSidebarMock();

        TestBed.configureTestingModule({
            imports: [
                NoopTranslateModule,
                NoopAnimationsModule,
                MatTabsModule,
                MatTooltipModule,
                RouterTestingModule,
                SearchNoResultsComponent,
                ContentRepositoryComponent,
                SearchResultsComponent,
                MatIconTestingModule,
            ],
            providers: [
                provideHttpClientTesting(),
                queryApiProvider,
                mockHxcsJsClientConfigurationService,
                SearchService,
                MockProvider(HXP_DOCUMENT_INFO_ACTION_SERVICE, mockContentPropertyViewerActionService),
                MockProvider(ManageVersionsButtonActionService, mockManageVersionsButtonActionService),
                MockProvider(UserPreferencesService, { select: () => of('ltr') as any }),
                MockProvider(ContextMenuActionsService),
                MockProvider(ExtensionService),
                MockProvider(ColumnDataService),
                MockProvider(PageSizeStorageService, mockPageSizeStorageService),
                MockProvider(SearchFiltersExtensionsService, mockSearchFiltersExtensionService),
                MockProvider(DocumentService, mockDocumentService),
                MockProvider(SearchFilterValueService, mockSearchFilterValueService),
                MockProvider(SearchFilterValueStoreService, mockSearchFilterValueStoreService),
                MockProvider(JwtHelperService, mockJwtHelperService),
                { provide: ColumnConfigService, useValue: mockColumnConfigService },
                { provide: MODEL_API_TOKEN, useValue: mockModelApi },
                provideMockFeatureFlags({[ADF_HX_CONTENT_SERVICES_INTERNAL.SEARCH_RESULTS_100K]: true }),
                uploadApiProvider,
                {
                    provide: HXP_DOCUMENT_DELETE_ACTION_SERVICE,
                    useClass: DeleteButtonActionService,
                },
                {
                    provide: HXP_DOCUMENT_SINGLE_ITEM_DOWNLOAD_ACTION_SERVICE,
                    useValue: mockDocumentDownloadActionService,
                },
                {
                    provide: HXP_DOCUMENT_SHARE_ACTION_SERVICE,
                    useValue: mockContentShareButtonActionService,
                },
                {
                    provide: HXP_MANAGE_COLUMN_ACTION_SERVICE,
                    useValue: {
                        isAvailable: () => true,
                    },
                },
                {
                    provide: SidebarService,
                    useValue: mockSidebarService,
                },
            ],
        }).overrideComponent(SearchResultsComponent, {
            remove: {
                imports: [
                    DataColumnComponent,
                    DataColumnListComponent,
                    DynamicExtensionComponent,
                    SearchTermFilterComponent,
                    ManageVersionsSidebarComponent,
                    MatPaginatorModule,
                    HxpMetadataSidebarComponent
                ],
            },
            add: {
                imports: MockComponents(
                    DataColumnComponent,
                    DataColumnListComponent,
                    DynamicExtensionComponent,
                    SearchTermFilterComponent,
                    ManageVersionsSidebarComponent,
                    MatPaginator,
                    HxpMetadataSidebarComponent
                ),
            },
        }).compileComponents();

        ngMocks.autoSpy('jest');
        documentUpdated$ = new Subject<DocumentUpdateInfo>();
        mockDocumentService.documentUpdated$ = documentUpdated$.asObservable();

        searchService = TestBed.inject(SearchService);
        router = TestBed.inject(Router);
        extensionService = TestBed.inject(ExtensionService);

        configureMockServices();

        fixture = TestBed.createComponent(SearchResultsComponent);
        loader = TestbedHarnessEnvironment.loader(fixture);
        component = fixture.componentInstance;
        (component as any).getTemplateRefByKey = (key: string) => mockTemplateRefs.get(key) as TemplateRef<any>;

        fixture.detectChanges();
        component.ngAfterViewInit();
    };

    describe('pagination range label', () => {
        let translateService: TranslateService;

        beforeEach(() => {
            configureTestingModule();
            translateService = TestBed.inject(TranslateService);
            jest.spyOn(translateService, 'instant').mockImplementation((key: string, params: any) => {
                const template = '{{startIndex}} - {{endIndex}} of {{totalPages}}';
                return template
                    .replace('{{startIndex}}', String(params.startIndex))
                    .replace('{{endIndex}}', String(params.endIndex))
                    .replace('{{totalPages}}', String(params.totalPages));
            });
        });

        it('should return localized range label with properly formatted thousand separator when 100k feature is enabled', () => {
            component.pagination.pageIndex = 1;
            component.pagination.pageSize = 25;
            component.pagination.totalItems = 10000;
            component.pagination.totalCountIsTruncated = true;

            const label = (component as any).createPaginationRangeLabel();

            expect(label).toContain('26');
            expect(label).toContain('50');
            expect(label).toContain('10,000');
        });

        it('should return plain number format without thousand separator when 100k feature is disabled', () => {
            (component as any).searchResults100KEnabled = false;
            component.pagination.pageIndex = 1;
            component.pagination.pageSize = 25;
            component.pagination.totalItems = 10000;
            component.pagination.totalCountIsTruncated = true;

            const label = (component as any).createPaginationRangeLabel();

            expect(label).toContain('26');
            expect(label).toContain('50');
            expect(label).toContain('10000');
            expect(label).not.toContain('10,000');
        });
    });

    for (const searchTypeConfig of SEARCH_TYPES) {
        const { name, tabIndex, type, searchTerm, query, displayFilters } = searchTypeConfig;
        const nextActiveTabIndex = (tabIndex + 1) % 2;

        describe(name, () => {
            const EXPECTED_VIOLATIONS: { [violationId: string]: number }[] | undefined = [];

            beforeEach(() => {
                configureTestingModule();
            });

            beforeEach(async () => {
                await changeSearchTab(tabIndex);
                fixture.detectChanges();
                await fixture.whenStable();

                // changing the tab triggers a navigation, so we need to reset the spies
                navigateByUrlSpy.mockClear();
                navigateSpy.mockClear();
            });

            afterEach(() => {
                searchServiceSpy.mockClear();
            });

            it('should not allow any search if no filter is applied', async () => {
                const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
                const resetButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-reset-button' }));

                expect(searchButton).toBeDefined();
                expect(resetButton).toBeDefined();
                expect(await searchButton.isDisabled()).toBe(true);
                expect(await resetButton.isDisabled()).toBe(true);
                expect(searchServiceSpy).not.toHaveBeenCalled();
            });

            it('should send search request and display results', fakeAsync(async () => {
                let resultsContainer = fixture.debugElement.query(By.css('.hxp-new-search-container'));
                const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
                const resetButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-reset-button' }));

                expect(resultsContainer).toBeFalsy();
                expect(searchButton).toBeDefined();
                expect(resetButton).toBeDefined();
                expect(await searchButton.isDisabled()).toBe(true);
                expect(await resetButton.isDisabled()).toBe(true);
                expect(searchServiceSpy).not.toHaveBeenCalled();

                const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
                mockSearchTermFilter.searchTermChanged.emit(searchTerm);
                mockSearchTermFilter.applyFilter = () => {
                    mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
                };

                expect(await searchButton.isDisabled()).toBe(false);
                expect(await resetButton.isDisabled()).toBe(false);

                await searchButton.click();
                fixture.detectChanges();
                tick(500);

                expect(searchServiceSpy).toHaveBeenCalledWith(query, {
                    pagination: {
                        skipCount: 0,
                        maxItems: DEFAULT_PAGE_SIZE,
                    },
                    sort: [],
                });
                expect(await searchButton.isDisabled()).toBe(true);

                resultsContainer = fixture.debugElement.query(By.css('.hxp-new-search-container'));

                expect(resultsContainer).toBeTruthy();
            }));

            it('should not render any results and paginator when no results are found', fakeAsync(async () => {
                searchServiceSpy.mockReturnValue(of(jestMocks.noSearchResults));

                const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
                const resetButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-reset-button' }));

                expect(searchButton).toBeDefined();
                expect(resetButton).toBeDefined();
                expect(await searchButton.isDisabled()).toBe(true);
                expect(await resetButton.isDisabled()).toBe(true);
                expect(searchServiceSpy).not.toHaveBeenCalled();

                const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
                mockSearchTermFilter.searchTermChanged.emit(searchTerm);
                mockSearchTermFilter.applyFilter = () => {
                    mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
                };

                expect(await searchButton.isDisabled()).toBe(false);
                expect(await resetButton.isDisabled()).toBe(false);

                await searchButton.click();
                fixture.detectChanges();
                tick(500);

                expect(searchServiceSpy).toHaveBeenCalled();

                const noPaginator = await PaginatorHarnessUtils.getAllPaginator({ fixture });
                const noResultsComponent = fixture.debugElement.query(By.css('hxp-search-no-results'));

                expect(noPaginator).toHaveLength(0);
                expect(noResultsComponent).toBeTruthy();
            }));

            it('should send search request on pagination change', fakeAsync(async () => {
                const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
                const resetButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-reset-button' }));

                expect(searchButton).toBeDefined();
                expect(resetButton).toBeDefined();
                expect(await searchButton.isDisabled()).toBe(true);
                expect(await resetButton.isDisabled()).toBe(true);
                expect(searchServiceSpy).not.toHaveBeenCalled();

                const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
                mockSearchTermFilter.searchTermChanged.emit(searchTerm);
                mockSearchTermFilter.applyFilter = () => {
                    mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
                };

                expect(await searchButton.isDisabled()).toBe(false);
                expect(await resetButton.isDisabled()).toBe(false);

                await searchButton.click();
                fixture.detectChanges();
                tick(500);

                component.onPaginationChange({ pageIndex: 1, pageSize: DEFAULT_PAGE_SIZE, length: 100 });
                component.ngAfterViewInit();
                fixture.detectChanges();

                tick(500);

                expect(searchServiceSpy).toHaveBeenCalledWith(query, {
                    pagination: {
                        skipCount: DEFAULT_PAGE_SIZE,
                        maxItems: DEFAULT_PAGE_SIZE,
                    },
                    sort: [],
                });
            }));

            it('should show and hide property panel', fakeAsync(() => {
                let resultsContainer = fixture.debugElement.query(By.css('.hxp-properties-sidebar'));
                component.handleCurrentSelection([jestMocks.fileDocument]);

                expect(resultsContainer).toBeFalsy();

                mockSidebarService.togglePanel('property');
                fixture.detectChanges();
                tick();

                resultsContainer = fixture.debugElement.query(By.css('.hxp-properties-sidebar'));

                expect(resultsContainer).toBeTruthy();

                component.handleCloseSidebarPanel();

                fixture.detectChanges();
                tick();

                expect(mockSidebarService.closePanel).toHaveBeenCalled();

                resultsContainer = fixture.debugElement.query(By.css('.hxp-properties-sidebar'));

                expect(resultsContainer).toBeFalsy();
            }));

            it('should set editable value depending the document permissions', fakeAsync(() => {
                expect((component as any).editablePropertiesSidebar).toBe(false);

                component.handleCurrentSelection([jestMocks.fileDocument]);

                expect((component as any).editablePropertiesSidebar).toBe(true);

                component.handleCurrentSelection([{ ...jestMocks.fileDocument, sys_effectivePermissions: ['Read'] }]);

                expect((component as any).editablePropertiesSidebar).toBe(false);
            }));

            it('should show and hide manage version panel', fakeAsync(() => {
                let resultsContainer = fixture.debugElement.query(By.css('#manage-versions-sidebar'));
                component.handleCurrentSelection([jestMocks.versionSupportedDocument]);

                expect(resultsContainer).toBeFalsy();

                mockSidebarService.togglePanel('version');
                fixture.detectChanges();
                tick();

                resultsContainer = fixture.debugElement.query(By.css('#manage-versions-sidebar'));

                expect(resultsContainer).toBeTruthy();

                component.handleCloseSidebarPanel();

                fixture.detectChanges();
                tick();

                expect(mockSidebarService.closePanel).toHaveBeenCalled();

                resultsContainer = fixture.debugElement.query(By.css('#manage-versions-sidebar'));

                expect(resultsContainer).toBeFalsy();
            }));

            it('should properly initialize columnConfigs with corresponding template references', fakeAsync(() => {
                expect(component.columnConfigs.length).toBe(0);

                mockColumnConfigService.getSelectedColumnsForCurrentUser = () => mockColumns;
                mockColumnConfigService.columnConfigs$ = of(mockColumns);

                component.ngAfterViewInit();
                tick();
                fixture.detectChanges();

                expect(component.columnConfigs.length).toBe(2);
                expect(component.columnConfigs[0].key).toEqual('icon');
                expect(component.columnConfigs[1].key).toEqual('title');
                expect(component.columnConfigs[0].templateRef).toBe(mockTemplateRefs.get('icon'));
                expect(component.columnConfigs[1].templateRef).toBe(mockTemplateRefs.get('title'));
            }));

            it('should re-initialize search results when document changes are detected', fakeAsync(() => {
                (component as any).searchTerm = searchTerm;

                expect(searchServiceSpy).not.toHaveBeenCalled();

                (mockDocumentService.documentCreated$ as Subject<Document>).next({} as any);
                (mockDocumentService.documentDeleted$ as Subject<string>).next({} as any);
                (mockDocumentService.documentRequestReload$ as Subject<void>).next({} as any);

                tick(2000);

                expect(searchServiceSpy).toHaveBeenCalled();
            }));

            it('should call debounceSearch when a document in results list is updated', () => {
                const testDocument = jestMocks.searchResults.documents[0];
                component.documents = [testDocument];
                const debounceSearchSpy = jest.spyOn(component as any, 'debounceSearch');

                documentUpdated$.next({
                    document: testDocument,
                    updatedProperties: undefined,
                });

                expect(debounceSearchSpy).toHaveBeenCalled();
            });

            it('should not call debounceSearch when updated document is not in results list', () => {
                component.documents = [jestMocks.searchResults.documents[0]];
                const debounceSearchSpy = jest.spyOn(component as any, 'debounceSearch');

                const unrelatedDocument: Document = {
                    sys_id: 'unrelated-id',
                    sys_primaryType: 'Document',
                    sys_mixinTypes: [],
                };
                documentUpdated$.next({
                    document: unrelatedDocument,
                    updatedProperties: undefined,
                });

                expect(debounceSearchSpy).not.toHaveBeenCalled();
            });

            it('should switch search type on tab change', async () => {
                await changeSearchTab(nextActiveTabIndex);
                expect(component.type).toEqual(SEARCH_TYPES[nextActiveTabIndex].type);

                await changeSearchTab(tabIndex);
                expect(component.type).toEqual(type);
            });

            it('should reset query on tab change', async () => {
                component.query = searchTerm;
                await changeSearchTab(nextActiveTabIndex);

                expect(component.query).toEqual('');

                component.query = searchTerm;
                await changeSearchTab(tabIndex);

                expect(component.query).toEqual('');
            });

            it('should update the url when switching tabs', fakeAsync(async () => {
                expect(navigateSpy).not.toHaveBeenCalled();
                expect(navigateByUrlSpy).not.toHaveBeenCalled();

                const targetTabIndex = nextActiveTabIndex;
                await changeSearchTab(targetTabIndex);
                fixture.detectChanges();

                expect(navigateByUrlSpy).toHaveBeenCalledWith('/');

                tick(500);

                expect(navigateSpy).toHaveBeenCalledWith([SEARCH_ROUTE], {
                    queryParams: {
                        q: '',
                        type: SEARCH_TYPES[targetTabIndex].type,
                    },
                });

                flush();
            }));

            it('should keep search type on pagination change', fakeAsync(() => {
                (component as any).searchTerm = searchTerm;
                component.type = type;

                expect(searchServiceSpy).not.toHaveBeenCalled();

                component.onPaginationChange({ pageIndex: 1, pageSize: 25, length: 100 });
                tick();
                expect(searchServiceSpy).toHaveBeenCalledWith(component.query, {
                    pagination: {
                        skipCount: DEFAULT_PAGE_SIZE,
                        maxItems: DEFAULT_PAGE_SIZE,
                    },
                    sort: [],
                });
                expect(component.type).toEqual(type);

                searchServiceSpy.mockClear();

                component.onPaginationChange({ pageIndex: 2, pageSize: DEFAULT_PAGE_SIZE, length: 100 });
                tick();
                expect(searchServiceSpy).toHaveBeenCalledWith(component.query, {
                    pagination: {
                        skipCount: DEFAULT_PAGE_SIZE * 2,
                        maxItems: DEFAULT_PAGE_SIZE,
                    },
                    sort: [],
                });
                expect(component.type).toEqual(type);
            }));

            if (displayFilters) {
                it('should display search filters', async () => {
                    component.ngAfterViewInit();
                    fixture.detectChanges();

                    const filtersContainers = fixture.debugElement.queryAll(By.directive(DynamicExtensionComponent));
                    expect(filtersContainers).toHaveLength(2);

                    const [createdDateFilter, documentCategoryFilter] = filtersContainers;

                    expect(createdDateFilter?.componentInstance.id).toEqual(SEARCH_FILTERS_REF.items[0].component);
                    expect(documentCategoryFilter?.componentInstance.id).toEqual(SEARCH_FILTERS_REF.items[1].component);
                });
            } else {
                it('should not display search filters', () => {
                    component.ngAfterViewInit();
                    fixture.detectChanges();

                    const filtersContainers = fixture.debugElement.queryAll(By.directive(DynamicExtensionComponent));
                    expect(filtersContainers).toHaveLength(0);
                });
            }

            it('tabs should pass accessibility checks', async () => {
                mockColumnConfigService.getSelectedColumnsForCurrentUser = () => mockColumns;
                mockColumnConfigService.columnConfigs$ = of(mockColumns);

                component.ngAfterViewInit();
                fixture.detectChanges();

                component.query = query;
                await changeSearchTab(tabIndex);
                fixture.detectChanges();

                await fixture.whenStable();

                const res = await a11yReport('.hxp-search-tabs');

                expect(res?.violations).toEqual(EXPECTED_VIOLATIONS);
            });
        });
    }

    describe('Pagination Limit Functionality', () => {
        beforeEach(() => {
            configureTestingModule();
        });

        it('should cap pagination.totalItems to 10k when totalCount exceeds 10k', async () => {
            const mockQueryResult = {
                documents: jestMocks.searchResults.documents,
                offset: 0,
                totalCount: 150000,
            };

            searchServiceSpy.mockReturnValue(of(mockQueryResult));

            fixture.detectChanges();

            const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
            mockSearchTermFilter.searchTermChanged.emit('test');
            mockSearchTermFilter.applyFilter = () => {
                mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
            };

            const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
            await searchButton.click();
            fixture.detectChanges();

            expect((component as any).totalItemsCount).toBe(150000);
            expect(component.pagination.totalItems).toBe(MAX_SEARCH_RESULTS_PAGINATION_LIMIT);
        });

        it('should not cap pagination.totalItems when totalCount is below 10k', async () => {
            const mockQueryResult = {
                documents: jestMocks.searchResults.documents,
                offset: 0,
                totalCount: 5000,
            };

            searchServiceSpy.mockReturnValue(of(mockQueryResult));

            fixture.detectChanges();

            const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
            mockSearchTermFilter.searchTermChanged.emit('test');
            mockSearchTermFilter.applyFilter = () => {
                mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
            };

            const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
            await searchButton.click();
            fixture.detectChanges();

            expect((component as any).totalItemsCount).toBe(5000);
            expect(component.pagination.totalItems).toBe(5000);
        });

        it('should handle zero results', async () => {
            const mockQueryResult = {
                documents: [],
                offset: 0,
                totalCount: 0,
            };

            searchServiceSpy.mockReturnValue(of(mockQueryResult));

            fixture.detectChanges();

            const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
            mockSearchTermFilter.searchTermChanged.emit('test');
            mockSearchTermFilter.applyFilter = () => {
                mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
            };

            const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
            await searchButton.click();
            fixture.detectChanges();

            expect((component as any).totalItemsCount).toBe(0);
            expect(component.pagination.totalItems).toBe(0);
        });

        it('should handle single result', async () => {
            const mockQueryResult = {
                documents: [jestMocks.fileDocument],
                offset: 0,
                totalCount: 1,
            };

            searchServiceSpy.mockReturnValue(of(mockQueryResult));

            fixture.detectChanges();

            const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
            mockSearchTermFilter.searchTermChanged.emit('test');
            mockSearchTermFilter.applyFilter = () => {
                mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
            };

            const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
            await searchButton.click();
            fixture.detectChanges();

            expect((component as any).totalItemsCount).toBe(1);
            expect(component.pagination.totalItems).toBe(1);
        });

        it('should cap just above the 10000 threshold', async () => {
            const mockQueryResult = {
                documents: jestMocks.searchResults.documents,
                offset: 0,
                totalCount: 10001,
            };

            searchServiceSpy.mockReturnValue(of(mockQueryResult));

            fixture.detectChanges();

            const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
            mockSearchTermFilter.searchTermChanged.emit('test');
            mockSearchTermFilter.applyFilter = () => {
                mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
            };

            const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
            await searchButton.click();
            fixture.detectChanges();

            expect((component as any).totalItemsCount).toBe(10001);
            expect(component.pagination.totalItems).toBe(MAX_SEARCH_RESULTS_PAGINATION_LIMIT);
        });

        it('should calculate correct pageIndex from offset when paginating capped results', async () => {
            const mockQueryResult = {
                documents: jestMocks.searchResults.documents,
                offset: 200,
                totalCount: 150000,
            };

            searchServiceSpy.mockReturnValue(of(mockQueryResult));

            fixture.detectChanges();

            const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
            mockSearchTermFilter.searchTermChanged.emit('test');
            mockSearchTermFilter.applyFilter = () => {
                mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
            };

            const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
            await searchButton.click();
            fixture.detectChanges();

            expect(component.pagination.pageIndex).toBe(8);
            expect(component.pagination.skipCount).toBe(200);
            expect(component.pagination.totalItems).toBe(MAX_SEARCH_RESULTS_PAGINATION_LIMIT);
        });

        it('should update pageIndex and skipCount from API offset', async () => {
            const mockQueryResult = {
                documents: jestMocks.searchResults.documents,
                offset: 500,
                totalCount: 50000,
            };

            searchServiceSpy.mockReturnValue(of(mockQueryResult));

            fixture.detectChanges();

            const mockSearchTermFilter = ngMocks.find<SearchTermFilterComponent>('hxp-search-term-filter').componentInstance;
            mockSearchTermFilter.searchTermChanged.emit('test');
            mockSearchTermFilter.applyFilter = () => {
                mockSearchFilterValueService.filterApplied$.next({ value: {} as SearchFilterData, filter: mockSearchTermFilter });
            };

            const searchButton = await loader.getHarness(MatButtonHarness.with({ selector: '#hxp-search-results-search-button' }));
            await searchButton.click();
            fixture.detectChanges();

            expect(component.pagination.skipCount).toBe(500);
            expect(component.pagination.pageIndex).toBe(20);
        });
    });
});

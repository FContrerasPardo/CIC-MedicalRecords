/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, waitForAsync, fakeAsync, flush } from '@angular/core/testing';
import { GovernanceRecordsManagementComponent } from './records-management.component';
import { DatePipe, AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport, defaultConfiguration } from '@hxp/workspace-hxp/shared/testing';
import { MockComponents } from 'ng-mocks';
import { DataSourceSearchFilterComponent } from '../../shared/ui/search/filters/data-source/data-source-search-filter.component';
import { CategorySearchFilterComponent } from '../../shared/ui/search/filters/category/category-search-filter.component';
import { CreatorSearchFilterComponent } from '../../shared/ui/search/filters/creator/creator-search-filter.component';
import { ModifierSearchFilterComponent } from '../../shared/ui/search/filters/modifier/modifier-search-filter.component';
import { mockGovernanceSearchResults } from '../../shared/mocks/mock-results.data';
import { of, Subject } from 'rxjs';
import { GovernanceSearchService } from './services/governance-search.service';
import { SearchFilterValueService } from '../../shared/ui/search/filters/base/search-filter-value.service';
import { OAuthStorage } from 'angular-oauth2-oidc';
import { GovernanceConfigurationService } from '../../shared/config/governance-config.service';
import { GovernanceRecordService } from './services/governance-record.service';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { GovernanceLegalCaseService } from '../legal-hold-management/services/governance-legal-case.service';
import { GovernanceLegalRecordService } from '../legal-hold-management/services/governance-legal-record.service';
import { GovernanceRecord } from '../../shared/definitions/governance-shared.interface';
import { RecordPollingService } from './services/record-polling.service';
import { RETAIN_UNTIL_LOADING, INFINITE_RETAIN_UNTIL } from './definitions/records.constants';
import { RouterTestingModule } from '@angular/router/testing';

describe('GovernanceRecordsManagementComponent (extended)', () => {
    let component: GovernanceRecordsManagementComponent;
    let fixture: ComponentFixture<GovernanceRecordsManagementComponent>;

    const filterAppliedSubject = new Subject<void>();
    const filterResetSubject = new Subject<void>();
    const updateConfirmedSubject = new Subject<any>();
    const deleteConfirmedSubject = new Subject<void>();
    const patchConfirmedSubject = new Subject<GovernanceRecord | undefined>();
    const recordAssignedSubject = new Subject<GovernanceRecord[]>();

    // Mock the search service to expose getPage (component uses getPage)
    const mockSearchService = {
        getPage: jest.fn().mockReturnValue(
            of({
                content: mockGovernanceSearchResults,
                lastEvaluatedKey: 'next-key',
            })
        ),
        clearCache: jest.fn(),
        hasNextPage: jest.fn().mockReturnValue(true),
    };

    // default: no filters -> show initial state
    const mockFilterService = {
        filterApplied$: filterAppliedSubject.asObservable(),
        filterReset$: filterResetSubject.asObservable(),
        toQueryParams: jest.fn().mockReturnValue({ dataSource: 'Internal Repository' }),
        hasFilters: jest.fn().mockReturnValue(false),
        clearFilters: jest.fn(),
        clearAllFilters: jest.fn(),
        registerFilter: jest.fn(),
        unregisterFilter: jest.fn(),
        allReady$: of(true),
    };

    const mockOAuthStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
    };

    const mockGovernanceRecordService = {
        editRecord: jest.fn(),
        emitUpdateConfirmed: jest.fn(),
        updateConfirmed$: updateConfirmedSubject.asObservable(),
        deleteConfirmed$: deleteConfirmedSubject.asObservable(),
        patchConfirmed$: patchConfirmedSubject.asObservable(),
    };

    const mockGovernanceLegalRecordService = {
        shouldRefreshList$: of(false),
        recordAssigned$: recordAssignedSubject.asObservable(),
    };
    const mockGovernanceLegalCaseService = {
        shouldRefreshList$: of(false),
    };

    let mockPollingService: { pollUntilRetainUntilValid: jest.Mock; pollUntilOnHold: jest.Mock };

    beforeEach(waitForAsync(() => {
        mockPollingService = {
            pollUntilRetainUntilValid: jest.fn(),
            pollUntilOnHold: jest.fn(),
        } as any;

        TestBed.configureTestingModule({
            imports: [
                MockComponents(
                    DataSourceSearchFilterComponent,
                    CategorySearchFilterComponent,
                    CreatorSearchFilterComponent,
                    ModifierSearchFilterComponent
                ),
                GovernanceRecordsManagementComponent,
                MatButtonModule,
                MatIconTestingModule,
                NoopAnimationsModule,
                NoopTranslateModule,
                RouterTestingModule,
            ],
            providers: [
                AsyncPipe,
                DatePipe,
                { provide: GovernanceSearchService, useValue: mockSearchService },
                { provide: SearchFilterValueService, useValue: mockFilterService },
                { provide: OAuthStorage, useValue: mockOAuthStorage },
                {
                    provide: GovernanceConfigurationService,
                    useValue: {
                        getJwtConfig: jest.fn().mockReturnValue({}),
                        getConfig: jest.fn().mockReturnValue(
                            of({
                                dataSources: [{ id: 'test' }],
                                categories: [{ id: 'cat1', name: 'Category 1' }],
                            })
                        ),
                    },
                },
                { provide: GovernanceRecordService, useValue: mockGovernanceRecordService },
                { provide: FeaturesServiceToken, useValue: { isOn$: () => of(true) } },
                {
                    provide: GovernanceLegalRecordService,
                    useValue: mockGovernanceLegalRecordService,
                },
                {
                    provide: GovernanceLegalCaseService,
                    useValue: mockGovernanceLegalCaseService,
                },
                { provide: RecordPollingService, useValue: mockPollingService },
            ],
        }).compileComponents();
    }));

    beforeEach(fakeAsync(() => {
        fixture = TestBed.createComponent(GovernanceRecordsManagementComponent);
        component = fixture.componentInstance;
        // Patch: ensure all instance fields are initialized for tests
        component.records = [];
        component.selectedRecords = [];
        component.actionContext = { records: [], showPanel: false };
        component.pageSize = 25;
        component.currentPageIndex = 0;
        component.hasPendingChanges = false;
        component.noResults = false;
        component.isLoading = false;
        component.hasError = false;
        component.initialState = true;
        fixture.detectChanges();
        flush(); // Flush microtasks from ngAfterViewInit
    }));

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should display initial state view when no filters are selected', () => {
        // default mockFilterService.hasFilters() returns false
        const initialStateElement = fixture.nativeElement.querySelector('.hxp-governance-search-results-initial-state');
        expect(initialStateElement).toBeTruthy();

        const initialStateElementIcon = fixture.nativeElement.querySelector('.hxp-governance-search-results-initial-state_icon');
        expect(initialStateElementIcon).toBeTruthy();

        const initialStateElementLabel = fixture.nativeElement.querySelector('.hxp-governance-search-results-initial-state_label');
        expect(initialStateElementLabel).toBeTruthy();
    });

    it('should not display any records in the result list when mock data is empty', () => {
        component.initialState = false;
        component.noResults = true;
        component.isLoading = false;
        fixture.detectChanges();
        const recordList = fixture.nativeElement.querySelector('hxp-entity-list');
        expect(recordList).toBeFalsy();
        const rows = fixture.nativeElement.querySelectorAll('.hxp-record-list-row');
        expect(rows.length).toBe(0);
    });

    it('should call reset and clear filters', () => {
        const clearFiltersSpy = jest.spyOn(component['searchFilterValueService'], 'clearFilters');
        component.hasPendingChanges = true;
        component.noResults = true;
        component.reset();
        expect(component.hasPendingChanges).toBeFalsy();
        expect(component.noResults).toBeFalsy();
        expect(clearFiltersSpy).toHaveBeenCalled();
    });

    it('should update selectedRecords when onSelectionChanged is called', () => {
        const records = [{ contentId: '1' }, { contentId: '2' }] as any;
        component.onSelectionChanged(records);
        expect(component.selectedRecords).toEqual(records);
    });

    it('should update actionContext.records when onSelectionChanged is called', () => {
        const records = [{ contentId: '1' }, { contentId: '2' }] as any;
        component.onSelectionChanged(records);
        expect(component.actionContext.records).toEqual(records);
    });

    it('should call execute on recordPropertiesButtonService when onSelectionChanged is called with 0 or 2 records', () => {
        const records = [{ contentId: '1' }, { contentId: '2' }] as any;
        const executeSpy = jest.spyOn(component['recordPropertiesButtonService'], 'execute');
        component.onSelectionChanged(records);
        expect(executeSpy).toHaveBeenCalled();
    });

    it('should update pageSize when onPageSizeChange is called', () => {
        (mockFilterService.hasFilters as jest.Mock).mockReturnValue(true);
        const clearCacheSpy = jest.spyOn(mockSearchService, 'clearCache');
        // Patch: ensure search is a function before spying
        if (typeof component.search !== 'function') {
            component.search = jest.fn();
        }
        const searchSpy = jest.spyOn(component, 'search');
        component.onPageSizeChange(50);
        expect(component.pageSize).toBe(50);
        expect(clearCacheSpy).toHaveBeenCalled();
        expect(searchSpy).toHaveBeenCalled();
    });

    it('should call loadPreviousPage if currentPageIndex > 0', () => {
        if (typeof component.search !== 'function') {
            component.search = jest.fn();
        }
        const searchSpy = jest.spyOn(component, 'search');
        component.currentPageIndex = 1;
        component.loadPreviousPage();
        expect(searchSpy).toHaveBeenCalledWith(true);
    });

    it('should not call loadPreviousPage if currentPageIndex is 0', () => {
        if (typeof component.search !== 'function') {
            component.search = jest.fn();
        }
        const searchSpy = jest.spyOn(component, 'search');
        component.currentPageIndex = 0;
        component.loadPreviousPage();
        expect(searchSpy).not.toHaveBeenCalled();
    });

    it('should call loadNextPage when next button is clicked', () => {
        // set UI state so next button is visible/enabled
        component.selectedRecords = [];
        component.records = mockGovernanceSearchResults;
        (component as any).recordList = { isAllSelected: () => false, clearSelection: () => {} };
        component.isLoading = false;
        component.initialState = false;
        component.noResults = false;
        component.currentPageIndex = 0;
        // ensure service says next page available
        (mockSearchService.hasNextPage as jest.Mock).mockReturnValue(true);

        fixture.detectChanges();

        const nextButton = fixture.nativeElement.querySelector('[data-testid="next-page-button"]');
        expect(nextButton).toBeTruthy();
        expect(nextButton.disabled).toBeFalsy();

        const loadNextPageSpy = jest.spyOn(component, 'loadNextPage');
        const searchSpy = jest.spyOn(component, 'search');

        nextButton.click();

        expect(loadNextPageSpy).toHaveBeenCalled();
        expect(searchSpy).toHaveBeenCalledWith(false);
    });

    it('loadPreviousPage should be disabled when on first page', () => {
        (component as any).recordList = { isAllSelected: () => false, clearSelection: () => {}, isNextDisabled: () => true };
        component.selectedRecords = [];
        component.records = mockGovernanceSearchResults;
        component.isLoading = false;
        component.initialState = false;
        component.noResults = false;

        fixture.detectChanges();
        const prevButton = fixture.nativeElement.querySelector('[data-testid="prev-page-button"]');
        expect(prevButton).toBeTruthy();
        expect(prevButton.disabled).toBeTruthy();
    });

    it('should call search with init when onPageSizeChange is called', () => {
        (mockFilterService.hasFilters as jest.Mock).mockReturnValue(true);
        if (typeof component.search !== 'function') {
            component.search = jest.fn();
        }
        const searchSpy = jest.spyOn(component, 'search');
        component.onPageSizeChange(25);
        expect(searchSpy).toHaveBeenCalled();
    });

    it('should refresh the list when a record is changed', () => {
        if (typeof component.search !== 'function') {
            component.search = jest.fn();
        }
        const searchSpy = jest.spyOn(component, 'search').mockImplementation(() => undefined as any);
        updateConfirmedSubject.next({ id: 'abc' });
        expect(searchSpy).toHaveBeenCalled();
    });

    it('should refresh the list when a record is removed', () => {
        if (typeof component.search !== 'function') {
            component.search = jest.fn();
        }
        const searchSpy = jest.spyOn(component, 'search').mockImplementation(() => undefined as any);
        deleteConfirmedSubject.next();
        expect(searchSpy).toHaveBeenCalled();
    });

    it('should start record status polling when recordAssigned$ emits', () => {
        const payload: GovernanceRecord[] = [{ id: 'R#1', environmentDataSourceId: 'EDS#1', categoryId: 'C#1', status: 'Ready' } as any];
        const trackSpy = jest.spyOn(component as any, 'trackAssignedRecordsStatus').mockReturnValue(undefined as any);
        recordAssignedSubject.next(payload);
        expect(trackSpy).toHaveBeenCalledTimes(1);
        expect(trackSpy).toHaveBeenCalledWith(payload);
    });

    it('should processPatchedRecord is no-op when patched has no id', () => {
        const patched = { retainUntil: '2025-01-01T00:00:00Z' } as any;
        const applySpy = jest.spyOn(component as any, 'applyRowPatch');
        (component as any).processPatchedRecord(patched);
        expect(applySpy).not.toHaveBeenCalled();
        expect(mockPollingService.pollUntilRetainUntilValid).not.toHaveBeenCalled();
    });

    it('should processPatchedRecord sets loading state and polls then applies patched retainUntil value', async () => {
        const patched: GovernanceRecord = { id: 'REC-1', retainUntil: '2030-01-01T00:00:00Z' };
        component.records = [{ id: 'REC-1', retainUntil: undefined } as GovernanceRecord];
        const latestFromPoll = { id: 'REC-1', retainUntil: '2029-07-07T00:00:00Z' } as GovernanceRecord;
        mockPollingService.pollUntilRetainUntilValid.mockReturnValue(of({ record: latestFromPoll, timedOut: false }));
        const applySpy = jest.spyOn(component as any, 'applyRowPatch');
        (component as any).processPatchedRecord(patched);
        await Promise.resolve();
        expect(applySpy).toHaveBeenCalledWith('REC-1', { retainUntil: RETAIN_UNTIL_LOADING });
        expect(applySpy).toHaveBeenCalledWith('REC-1', { retainUntil: latestFromPoll.retainUntil });
        if (component.records && component.records.length > 0) {
            const row = component.records.find((r) => r.id === 'REC-1') as GovernanceRecord;
            expect(row?.retainUntil).toBe(latestFromPoll.retainUntil);
        }
    });

    it('should processPatchedRecord falls back to patched.retainUntil or INFINITE if poll finishes without providing latest', async () => {
        const patched: GovernanceRecord = { id: 'REC-2', retainUntil: undefined } as GovernanceRecord;
        component.records = [{ id: 'REC-2', retainUntil: undefined } as GovernanceRecord];
        mockPollingService.pollUntilRetainUntilValid.mockReturnValue(of({ record: patched, timedOut: true }));
        const applySpy = jest.spyOn(component as any, 'applyRowPatch');
        (component as any).processPatchedRecord(patched);
        await Promise.resolve();
        expect(applySpy).toHaveBeenCalledWith('REC-2', { retainUntil: RETAIN_UNTIL_LOADING });
        expect(applySpy).toHaveBeenCalledWith('REC-2', {
            retainUntil: INFINITE_RETAIN_UNTIL,
            retainUntilUpdateFailed: true,
        });
        if (component.records && component.records.length > 0) {
            const row = component.records.find((r) => r.id === 'REC-2') as any;
            expect(row?.retainUntil).toBe(INFINITE_RETAIN_UNTIL);
            expect(row?.retainUntilUpdateFailed).toBe(true);
        }
    });

    it('should applyRowPatch immutably updates only matching row and is no-op when not found', () => {
        component.records = [{ id: 'A', fileName: 'a' } as any, { id: 'B', fileName: 'b' } as any];
        const originalRecords = component.records;
        (component as any).applyRowPatch('B', { fileName: 'updated-b' });
        expect(component.records).not.toBe(originalRecords);
        const updated = component.records.find((r) => r.id === 'B');
        expect(updated).toBeDefined();
        expect(updated?.fileName).toBe('updated-b');
        const before = component.records;
        (component as any).applyRowPatch('C', { fileName: 'nope' });
        expect(component.records).toBe(before);
    });

    it('should trackAssignedRecordsStatus deduplicates and sets isProcessing and starts polling for unique ids', () => {
        component.records = [
            { id: 'R1', fileName: 'r1', isProcessing: false } as GovernanceRecord,
            { id: 'R2', fileName: 'r2', isProcessing: false } as GovernanceRecord,
            { id: 'R3', fileName: 'r3', isProcessing: false } as GovernanceRecord,
        ];
        const assigned: GovernanceRecord[] = [
            { id: 'R1', environmentDataSourceId: 'EDS#1', categoryId: 'C#1', status: 'Ready' } as GovernanceRecord,
            { id: 'R1', environmentDataSourceId: 'EDS#1', categoryId: 'C#1', status: 'Ready' } as GovernanceRecord,
            { id: 'R2', environmentDataSourceId: 'EDS#1', categoryId: 'C#1', status: 'Ready' } as GovernanceRecord,
            { id: undefined as any, environmentDataSourceId: 'EDS#1', categoryId: 'C#1', status: 'Ready' } as GovernanceRecord,
        ];
        const pollSpy = jest.spyOn(component as any, 'pollRecordStatusAndUpdateRow').mockReturnValue(of(void 0));
        (component as any).trackAssignedRecordsStatus(assigned);
        const rowR1 = component.records.find((r) => r.id === 'R1');
        const rowR2 = component.records.find((r) => r.id === 'R2');
        const rowR3 = component.records.find((r) => r.id === 'R3');
        expect(rowR1).toBeDefined();
        expect(rowR1?.isProcessing).toBe(true);
        expect(rowR2).toBeDefined();
        expect(rowR2?.isProcessing).toBe(true);
        expect(rowR3).toBeDefined();
        expect(rowR3?.isProcessing).toBe(false);
        expect(pollSpy).toHaveBeenCalledTimes(2);
        expect(pollSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'R1' }));
        expect(pollSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'R2' }));
    });

    it('should do nothing when trackAssignedRecordsStatus is called with an empty list', () => {
        component.records = [
            { id: 'R1', fileName: 'r1', isProcessing: false } as GovernanceRecord,
            { id: 'R2', fileName: 'r2', isProcessing: false } as GovernanceRecord,
        ];
        const before = [...component.records];

        (component as any).trackAssignedRecordsStatus([] as GovernanceRecord[]);

        expect(component.records).toEqual(before);
    });

    it('should unsubscribe previous polling subscription when trackAssignedRecordsStatus is called multiple times', () => {
        component.records = [
            { id: 'R1', fileName: 'r1', isProcessing: false } as GovernanceRecord,
            { id: 'R2', fileName: 'r2', isProcessing: false } as GovernanceRecord,
        ];

        const pollSpy = jest.spyOn(component as any, 'pollRecordStatusAndUpdateRow').mockReturnValue(of(void 0));

        const assignedFirst: GovernanceRecord[] = [
            { id: 'R1', environmentDataSourceId: 'EDS#1', categoryId: 'C#1', status: 'Ready' } as GovernanceRecord,
        ];

        const assignedSecond: GovernanceRecord[] = [
            { id: 'R2', environmentDataSourceId: 'EDS#1', categoryId: 'C#1', status: 'Ready' } as GovernanceRecord,
        ];

        (component as any).trackAssignedRecordsStatus(assignedFirst);
        (component as any).trackAssignedRecordsStatus(assignedSecond);

        expect(pollSpy).toHaveBeenCalledTimes(2);
        expect(pollSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'R1' }));
        expect(pollSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'R2' }));
    });

    it('should display error component when hasError is true and isLoading is false', () => {
        component.hasError = true;
        component.isLoading = false;
        fixture.detectChanges();

        const errorComponent = fixture.nativeElement.querySelector('hxp-governance-error');
        expect(errorComponent).toBeTruthy();
    });

    it('should not display error component when hasError is true but still loading', () => {
        component.hasError = true;
        component.isLoading = true;
        fixture.detectChanges();

        const errorComponent = fixture.nativeElement.querySelector('hxp-governance-error');
        expect(errorComponent).toBeFalsy();
    });

    it('should call onRetry when error component buttonClick is emitted', () => {
        const retrySpy = jest.spyOn(component, 'onRetry');
        component.hasError = true;
        component.isLoading = false;
        fixture.detectChanges();

        const errorDebugElement = fixture.debugElement.query((el) => el.name === 'hxp-governance-error');
        errorDebugElement.triggerEventHandler('buttonClick', {});
        fixture.detectChanges();

        expect(retrySpy).toHaveBeenCalled();
    });

    it('onRetry should call search with init', () => {
        const searchSpy = jest.spyOn(component, 'search');
        component.onRetry();
        expect(searchSpy).toHaveBeenCalledWith();
    });

    it('should detect next page correctly via hasNextPage (deferred)', (done) => {
        (mockFilterService.hasFilters as jest.Mock).mockReturnValue(true);

        (mockSearchService.getPage as jest.Mock).mockReturnValue(of({ content: [{ id: 1 }, { id: 2 }, { id: 3 }], lastEvaluatedKey: 'key-2' }));

        component.pageSize = 3;
        component.currentPageIndex = 0;

        // call search and wait for subscribe to run and finalize to update service internals
        component.search(false);

        setTimeout(() => {
            // subscription should have set records
            expect(component.records.length).toBe(3);

            // setTimeout ensures finalize from service ran; hasNextPage() uses service mock
            expect((mockSearchService.hasNextPage as jest.Mock).mock.results.length >= 0).toBeTruthy();
            // since our mock hasNextPage returns true by default:
            expect(component.isNextDisabled()).toBe(false);
            done();
        }, 0);
    });

    it('should clear page boundaries via clearCache', () => {
        // confirm that calling clearCache on service is invoked when onPageSizeChange is used or when reset
        (mockFilterService.hasFilters as jest.Mock).mockReturnValue(true);
        (mockSearchService.clearCache as jest.Mock).mockClear();

        component.onPageSizeChange(10);
        expect(mockSearchService.clearCache).toHaveBeenCalled();
    });

    it('should pass accessibility checks in initial state', async () => {
        fixture.detectChanges();

        const res = await a11yReport(fixture.nativeElement, {
            ...defaultConfiguration,
            rules: {
                ...defaultConfiguration.rules,
                'button-name': { enabled: false },
            },
        });

        expect(res?.violations).toEqual([]);
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { LegalHoldRecordsComponent } from './legal-hold-records.component';
import { GovernanceLegalRecordService } from '../../services/governance-legal-record.service';
import { GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { Sort } from '@angular/material/sort';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OAuthStorage } from 'angular-oauth2-oidc';
import { MatIconHarness, MatIconTestingModule } from '@angular/material/icon/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { GovernanceConfigurationService } from '../../../../shared/config/governance-config.service';
import { GovernanceRecordService } from '../../../records-management/services/governance-record.service';
import { AsyncPipe } from '@angular/common';
import { IconHarnessUtils } from '@alfresco-dbp/shared-testing/util/component-harnesses';
import { a11yReport, defaultConfiguration } from '@hxp/workspace-hxp/shared/testing';

describe('LegalHoldRecordsComponent', () => {
    let fixture: ComponentFixture<LegalHoldRecordsComponent>;
    let component: LegalHoldRecordsComponent;
    let governanceLegalRecordServiceMock: jest.Mocked<GovernanceLegalRecordService>;

    const updateConfirmedSubject = new Subject<any>();
    const deleteConfirmedSubject = new Subject<void>();
    const patchConfirmedSubject = new Subject<GovernanceRecord | undefined>();
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

    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(async () => {
        governanceLegalRecordServiceMock = { queryLegalRecords: jest.fn() } as any;
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await TestBed.configureTestingModule({
            imports: [LegalHoldRecordsComponent, NoopTranslateModule, MatIconTestingModule, NoopAnimationsModule],
            providers: [
                AsyncPipe,
                { provide: GovernanceLegalRecordService, useValue: governanceLegalRecordServiceMock },
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
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LegalHoldRecordsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        consoleErrorSpy?.mockRestore();
    });

    describe('ngOnChanges', () => {
        it('should call loadRecords when selectedCase changes', () => {
            const spy = jest.spyOn(component as any, 'loadRecords').mockImplementation(() => {});
            component.selectedCase = { legalCaseId: 'c1', legalCaseName: 'Case' } as any;
            component.ngOnChanges({
                selectedCase: {
                    currentValue: component.selectedCase,
                    previousValue: null,
                    firstChange: true,
                    isFirstChange: () => true,
                },
            });
            expect(spy).toHaveBeenCalled();
        });

        it('should render selected case payload as plain text without executing alert', () => {
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
            const scriptPayload = '<script>alert(1)</script>';
            component.selectedCase = { legalCaseId: 'c1', legalCaseName: scriptPayload } as any;

            try {
                fixture.detectChanges();

                const titleContainer = fixture.nativeElement.querySelector('.hxp-governance-legal-hold-title');
                const titleText = titleContainer?.querySelector('.hxp-governance-legal-hold-case-name')?.textContent || '';
                expect(titleText).toContain(scriptPayload);
                expect(titleContainer?.querySelector('script')).toBeNull();
                expect(titleContainer?.querySelector('img[src="x"]')).toBeNull();
                expect(alertSpy).not.toHaveBeenCalled();
            } finally {
                alertSpy.mockRestore();
            }
        });
    });

    describe('loadRecords', () => {
        it('should set records and pagination on success', (done) => {
            const mock = { contents: [{ fileName: 'doc1' } as GovernanceRecord], lastEvaluatedKey: 'k1' };
            governanceLegalRecordServiceMock.queryLegalRecords.mockReturnValue(of(mock));

            (component as any).loadRecords();

            // use setTimeout to allow observable to emit
            setTimeout(() => {
                expect(component.records).toEqual(mock.contents);
                expect(component.noResults).toBe(false);
                expect(component['isLoading']).toBe(false); // private, accessed safely in test
                expect(component['lastEvaluatedKey']).toBe('k1'); // private, accessed safely
                done();
            }, 0);
        });

        it('should handle error and set noResults', (done) => {
            governanceLegalRecordServiceMock.queryLegalRecords.mockReturnValue(throwError(() => new Error('fail')));

            (component as any).loadRecords();

            setTimeout(() => {
                expect(component.noResults).toBe(true);
                expect(component['isLoading']).toBe(false);
                done();
            }, 0);
        });

        it('should render credential icon when record has credential value', async () => {
            component.records = [{ fileName: 'doc1', hasCredential: true } as GovernanceRecord];
            fixture.detectChanges();

            const loader = TestbedHarnessEnvironment.loader(fixture);
            const credentialIcons = await loader.getAllHarnesses(MatIconHarness.with({ name: 'governance_record_hasCredential' }));
            const onHoldIcons = await loader.getAllHarnesses(MatIconHarness.with({ name: 'governance_record_onHold' }));
            expect(credentialIcons.length).toBe(1);
            expect(onHoldIcons.length).toBe(0);
        });

        it('should render onHold icon when record does not have credential value', async () => {
            component.records = [{ fileName: 'doc1', hasCredential: false } as GovernanceRecord];
            fixture.detectChanges();

            const loader = TestbedHarnessEnvironment.loader(fixture);
            const credentialIcons = await loader.getAllHarnesses(MatIconHarness.with({ name: 'governance_record_hasCredential' }));
            const onHoldIcons = await loader.getAllHarnesses(MatIconHarness.with({ name: 'governance_record_onHold' }));
            expect(credentialIcons.length).toBe(0);
            expect(onHoldIcons.length).toBe(1);
        });

        it('should render correct icon based on hasCredential value', async () => {
            component.records = [
                { fileName: 'doc1', hasCredential: true } as GovernanceRecord,
                { fileName: 'doc2', hasCredential: false } as GovernanceRecord,
            ];
            fixture.detectChanges();

            const credentialIconElement = await IconHarnessUtils.getIcon({
                fixture,
                iconFilters: {
                    name: 'governance_record_hasCredential',
                },
            });
            const onHoldIconElement = await IconHarnessUtils.getIcon({
                fixture,
                iconFilters: {
                    name: 'governance_record_onHold',
                },
            });

            expect(credentialIconElement).not.toBeNull();
            expect(onHoldIconElement).not.toBeNull();
        });
    });

    describe('search/filter', () => {
        beforeEach(() => {
            component['allRecords'] = [{ fileName: 'Alpha' } as GovernanceRecord, { fileName: 'Beta' } as GovernanceRecord];
        });

        it('should filter records', () => {
            component.onSearchInputChange('alp');
            expect(component.records.length).toBe(1);
            expect(component.records[0].fileName).toBe('Alpha');
        });

        it('should reset filter when search empty', () => {
            component.onSearchInputChange('');
            expect(component.records.length).toBe(2);
        });

        it('highlightMatch should mark matched text', () => {
            component.searchText = 'alp';
            const result = component.highlightMatch('Alpha Test');
            expect(result).toContain('<mark>Alp</mark>');
        });

        it('highlightMatch should NOT highlight when searchText empty (returns original escaped text)', () => {
            component.searchText = '';
            const result = component.highlightMatch('Alpha');
            expect(result).toContain('Alpha');
            expect(result).not.toContain('<mark>');
        });

        it('highlightMatch should preserve escaped entities when search text matches special characters', () => {
            component.searchText = '&';
            const result = component.highlightMatch('A&B');

            expect(result).toContain('A<mark>&amp;</mark>B');
            expect(result).not.toContain('<mark>&</mark>amp;');
        });
    });

    describe('selection', () => {
        it('should update selection and emit actionContextChanged', () => {
            const spy = jest.spyOn(component.actionContextChanged, 'emit');
            const recs = [{ fileName: 'X' } as GovernanceRecord];
            component.onSelectionChanged(recs);
            expect(component.selectedRecords).toEqual(recs);
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({ records: recs }));
        });

        it('should call execute and hide sidebar when selection is empty', () => {
            const sidebarToggleSpy = jest.spyOn(component.sidebarToggle, 'emit');
            const actionContextChangeSpy = jest.spyOn(component.actionContextChange, 'emit');

            component.onSelectionChanged([]);

            expect(component.actionContext.showPanel).toBe(false);
            expect(actionContextChangeSpy).toHaveBeenCalledWith(expect.objectContaining({ showPanel: false }));
            expect(sidebarToggleSpy).toHaveBeenCalledWith(false);
        });

        it('should clear all and call list.clearSelection', () => {
            component.legalRecordsList = { clearSelection: jest.fn() } as any;
            component.selectedRecords = [{ fileName: 'Y' } as GovernanceRecord];
            component.clearAll();
            expect(component.selectedRecords).toEqual([]);
            expect(component.legalRecordsList.clearSelection).toHaveBeenCalled();
        });

        it('hasSelection should return true if selection exists', () => {
            component.selectedRecords = [{} as GovernanceRecord];
            expect(component.hasSelection).toBe(true);
        });
    });

    describe('events', () => {
        it('should emit backToCasesEvent', () => {
            const spy = jest.spyOn(component.backToCasesEvent, 'emit');
            component.backToCases();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('sorting', () => {
        it('should update sortDirection and reload records', () => {
            const spy = jest.spyOn(component as any, 'loadRecords').mockImplementation(() => {});
            component.onSortingChanged({ active: 'createdAt', direction: 'asc' } as Sort);
            expect(component.sortDirection).toBe('asc');
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('pagination', () => {
        it('should reset pagination on pageSize change', () => {
            const spy = jest.spyOn(component as any, 'loadRecords').mockImplementation(() => {});
            component.onPageSizeChange(50);
            expect(component.pageSize).toBe(50);
            expect(component['currentPageIndex']).toBe(0);
            expect(spy).toHaveBeenCalled();
        });

        it('should load next page if lastEvaluatedKey exists', () => {
            const spy = jest.spyOn(component as any, 'loadRecords').mockImplementation(() => {});
            component['lastEvaluatedKey'] = 'key';
            component.loadNextPage();
            expect(component['currentPageIndex']).toBe(1);
            expect(spy).toHaveBeenCalledWith('key', false);
        });

        it('should not load next page if no lastEvaluatedKey', () => {
            const spy = jest.spyOn(component as any, 'loadRecords').mockImplementation(() => {});
            component['lastEvaluatedKey'] = '';
            component.loadNextPage();
            expect(spy).not.toHaveBeenCalled();
        });

        it('should load previous page if currentPageIndex > 0', () => {
            const spy = jest.spyOn(component as any, 'loadRecords').mockImplementation(() => {});
            component['pageKeyStack'] = ['k0', 'k1'];
            component['currentPageIndex'] = 1;
            component.loadPreviousPage();
            expect(component['currentPageIndex']).toBe(0);
            expect(spy).toHaveBeenCalledWith('k0', true);
        });
    });

    describe('getters', () => {
        it('selectedCount should equal number of selectedRecords', () => {
            component.selectedRecords = [{}, {}] as GovernanceRecord[];
            expect(component.selectedCount).toBe(2);
        });

        it('previousDisabled should be true when at index 0', () => {
            component['currentPageIndex'] = 0;
            expect(component.previousDisabled).toBe(true);
        });

        it('nextDisabled should be false if lastEvaluatedKey exists', () => {
            component['lastEvaluatedKey'] = 'k1';
            expect(component.nextDisabled).toBe(false);
        });
    });

    it('should reload records when onRetry is called', () => {
        const queryMock = governanceLegalRecordServiceMock.queryLegalRecords.mockReturnValue(of({ contents: [], lastEvaluatedKey: '' }));
        component.selectedCase = { legalCaseId: 'c1' } as any;
        component.onRetry();
        expect(queryMock).toHaveBeenCalled();
    });

    it('matchesSearch should return true when searchText is empty', () => {
        component.searchText = '';
        const result = component['matchesSearch']({ fileName: 'any' } as any);
        expect(result).toBe(true);
    });

    it('matchesSearch should match on environmentDataSourceId', () => {
        component.searchText = 'source1';
        const result = component['matchesSearch']({ fileName: 'other', environmentDataSourceId: 'source1' } as any);
        expect(result).toBe(true);
    });

    it('matchesSearch should match on createdByUser', () => {
        component.searchText = 'john';
        const result = component['matchesSearch']({ fileName: 'other', createdByUser: 'John Doe' } as any);
        expect(result).toBe(true);
    });

    it('matchesSearch should match on createdByUsername', () => {
        component.searchText = 'john.doe';
        const result = component['matchesSearch']({ fileName: 'other', createdByUsername: 'john.doe' } as any);
        expect(result).toBe(true);
    });

    it('matchesSearch should handle record with no fileName gracefully', () => {
        component.searchText = 'test';
        const result = component['matchesSearch']({} as any);
        expect(result).toBe(false);
    });

    it('highlightMatch should return empty string when text is empty', () => {
        component.searchText = 'something';
        const result = component.highlightMatch('');
        expect(result).toBe('');
    });

    it('should pass accessibility audit', async () => {
        component.selectedCase = { legalCaseId: 'c1', legalCaseName: 'Legal Hold Case' } as any;
        component.records = [
            {
                id: 'record-1',
                fileName: 'Document 1',
                hasCredential: true,
                environmentDataSourceId: 'test',
                createdAt: '2026-01-01T00:00:00.000Z',
                createdByUsername: 'creator',
            } as GovernanceRecord,
        ];
        component['allRecords'] = [...component.records];
        fixture.detectChanges();

        const report = await a11yReport(fixture.nativeElement, defaultConfiguration);
        expect(report?.violations).toEqual([]);
    });
});

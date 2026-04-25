/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GovernanceLegalHoldManagementComponent } from './legal-hold-management.component';
import { EntityListComponent } from '../../shared/ui/data-table/entity-list/entity-list.component';
import { mockLegalHoldCasesData } from '../../shared/mocks/mock-legal-hold-cases.mock';
import { DataColumnComponent } from '../../shared/ui/data-table/entity-list/data-column.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { NoopTranslateModule, JwtHelperService, AppConfigService } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { a11yReport, defaultConfiguration } from '@hxp/workspace-hxp/shared/testing';
import { GovernanceLegalCaseService } from './services/governance-legal-case.service';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { LegalHoldInitiator } from './definitions/legal-hold.constants';
import { EditLegalHoldCaseButtonService } from './actions/edit-legal-hold-case-button/edit-legal-hold-case-button.service';
import { EditLegalHoldCaseButtonComponent } from './actions/edit-legal-hold-case-button/edit-legal-hold-case-button.component';

describe('GovernanceLegalHoldManagementComponent', () => {
    let component: GovernanceLegalHoldManagementComponent;
    let fixture: ComponentFixture<GovernanceLegalHoldManagementComponent>;
    const refreshListSubject = new Subject<boolean>();
    let routeQueryParams$: BehaviorSubject<Record<string, string | null>>;
    let routerMock: { navigate: jest.Mock };
    const mockLegalCases = mockLegalHoldCasesData.map((legalCase, index) => ({
        ...legalCase,
        legalCaseId: legalCase.id ?? `legal-case-${index + 1}`,
    }));

    const mockGovernanceLegalCaseService = {
        queryLegalCases: jest.fn().mockReturnValue(of({ contents: mockLegalCases, lastEvaluatedKey: 'key2' })),
        shouldRefreshList$: refreshListSubject.asObservable(),
    };

    const mockEditLegalHoldCaseButtonService = {
        execute: jest.fn(),
        isAvailable: jest.fn().mockReturnValue(false),
    };

    beforeEach(async () => {
        routeQueryParams$ = new BehaviorSubject<Record<string, string | null>>({});
        routerMock = {
            navigate: jest.fn().mockResolvedValue(true),
        };
        mockGovernanceLegalCaseService.queryLegalCases.mockClear();
        mockGovernanceLegalCaseService.queryLegalCases.mockReturnValue(of({ contents: mockLegalCases, lastEvaluatedKey: 'key2' }));

        await TestBed.configureTestingModule({
            imports: [
                GovernanceLegalHoldManagementComponent,
                EntityListComponent,
                DataColumnComponent,
                MatIconTestingModule,
                MatCheckboxModule,
                EditLegalHoldCaseButtonComponent,
                DatePipe,
                TranslatePipe,
                NoopTranslateModule,
                NoopAnimationsModule,
            ],
            providers: [
                { provide: JwtHelperService, useValue: { getAccessToken: jest.fn() } },
                { provide: GovernanceLegalCaseService, useValue: mockGovernanceLegalCaseService },
                { provide: EditLegalHoldCaseButtonService, useValue: mockEditLegalHoldCaseButtonService },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
                { provide: ActivatedRoute, useValue: { queryParams: routeQueryParams$.asObservable() } },
                { provide: Router, useValue: routerMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GovernanceLegalHoldManagementComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should emit sidebarToggle when onSidebarToggle is called', () => {
        const spy = jest.spyOn(component.sidebarToggle, 'emit');
        component.onSidebarToggle(true);
        expect(spy).toHaveBeenCalledWith(true);
    });

    it('should emit actionContextChange when onCaseCountClick is triggered', () => {
        const emitSpy = jest.spyOn(component.actionContextChange, 'emit');
        component['records'] = [{ id: 'rec1', fileName: 'Record 1' } as any];
        component.onCaseCountClick(mockLegalCases[0] as any);
        expect(component.viewMode).toBe(component.ViewMode.Records);
        expect(emitSpy).toHaveBeenCalledWith({ records: component['records'], showPanel: false });
        expect(routerMock.navigate).toHaveBeenCalledWith([], {
            relativeTo: TestBed.inject(ActivatedRoute),
            queryParams: { legalCaseId: mockLegalCases[0].legalCaseId },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    });

    it('should switch back to Cases view on backToCases', () => {
        component.viewMode = component.ViewMode.Records;
        component.selectedCase = mockLegalCases[0] as any;

        const spy = jest.spyOn(component as any, 'queryTable');
        component.backToCases();

        expect(component.viewMode).toBe(component.ViewMode.Cases);
        expect(component.selectedCase).toBeUndefined();
        expect(spy).toHaveBeenCalledWith('', true);
        expect(routerMock.navigate).toHaveBeenCalledWith([], {
            relativeTo: TestBed.inject(ActivatedRoute),
            queryParams: { legalCaseId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    });

    it('should update search results via the input', () => {
        component.allCases = mockLegalHoldCasesData;
        const input = 'case a';
        component.onSearchInputChange(input);
        fixture.detectChanges();

        const filtered = component.legalCases.every((c) => c.legalCaseName?.toLowerCase().includes(input));
        expect(filtered).toBe(true);
    });

    it('should split text into highlight and non-highlight segments', () => {
        component.searchText = 'tax';
        const segments = component.getHighlightSegments('Tax Audit for tax year') as Array<{ text: string; match: boolean }>;

        expect(segments.some((segment) => segment.match && segment.text.toLowerCase() === 'tax')).toBe(true);
        expect(segments.some((segment) => !segment.match)).toBe(true);
    });

    it('should render highlighted matches for case name and reason', () => {
        component.searchText = 'tax';
        component.legalCases = [
            {
                legalCaseId: 'c1',
                legalCaseName: 'Tax Audit Notice',
                legalCaseReason: 'All records requested for a tax audit',
                recordsCount: 0,
            } as any,
        ];
        component.noResults = false;
        component.isLoading = false;
        component.viewMode = component.ViewMode.Cases;
        fixture.detectChanges();

        const marks = [...fixture.nativeElement.querySelectorAll('mark')].map((mark) => mark.textContent?.toLowerCase() || '');
        expect(marks.filter((text) => text === 'tax').length).toBeGreaterThanOrEqual(2);
    });

    it('should render legal case payloads as plain text without executing alert', () => {
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
        const imagePayload = '"><img src=x onerror=alert(1)>';
        const scriptPayload = '<script>alert(1)</script>';

        try {
            component.legalCases = [
                {
                    legalCaseId: 'xss-case',
                    legalCaseName: imagePayload,
                    legalCaseReason: scriptPayload,
                    recordsCount: 0,
                } as any,
            ];
            component.noResults = false;
            component.isLoading = false;
            component.viewMode = component.ViewMode.Cases;
            fixture.detectChanges();

            const caseNameText = fixture.nativeElement.querySelector('.hxp-legal-case-name')?.textContent || '';
            const caseReasonText = fixture.nativeElement.querySelector('.hxp-legal-case-reason')?.textContent || '';

            expect(caseNameText).toContain(imagePayload);
            expect(caseReasonText).toContain(scriptPayload);
            expect(fixture.nativeElement.querySelector('img[src="x"]')).toBeNull();
            expect(fixture.nativeElement.querySelector('script')).toBeNull();
            expect(alertSpy).not.toHaveBeenCalled();
        } finally {
            alertSpy.mockRestore();
        }
    });

    it('should clear selection in Cases view', () => {
        component['selectedLegalCases'] = [mockLegalHoldCasesData[0]];
        component.legalCasesList = { clearSelection: jest.fn() } as any;

        component.clearAll();
        expect(component['selectedLegalCases'].length).toBe(0);
        expect(component.legalCasesList.clearSelection).toHaveBeenCalled();
    });

    it('should clear selection in Records view', () => {
        component.viewMode = component.ViewMode.Records;
        component['selectedRecords'] = [{ id: 'rec1' } as any];
        component.legalCaseRecords = { clearSelection: jest.fn() } as any;

        component.clearAll();
        expect(component['selectedRecords'].length).toBe(0);
        expect(component.legalCaseRecords.clearSelection).toHaveBeenCalled();
    });

    it('should reflect selectedCount and hasSelection via getters', () => {
        component['selectedLegalCases'] = [mockLegalHoldCasesData[0]];
        expect(component.selectedCount).toBe(1);
        expect(component.hasSelection).toBe(true);

        component.viewMode = component.ViewMode.Records;
        component['selectedRecords'] = [{ id: 'rec1' } as any];
        expect(component.selectedCount).toBe(1);
        expect(component.hasSelection).toBe(true);
    });

    it('should not select a row when Enter is pressed on row action button', () => {
        component.viewMode = component.ViewMode.Cases;
        component.noResults = false;
        component.isLoading = false;
        component['selectedLegalCases'] = [];
        fixture.detectChanges();

        const actionButton = fixture.nativeElement.querySelector(
            '.hxp-record-list-row button[aria-label="GOVERNANCE.LEGAL_HOLD.ACTIONS"]'
        ) as HTMLButtonElement | null;
        expect(actionButton).toBeTruthy();

        actionButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        fixture.detectChanges();

        expect(component.hasSelection).toBe(false);
        expect(component.selectedCount).toBe(0);
    });

    it('should disable previous/next buttons according to state', () => {
        component['currentPageIndex'] = 0;
        component['lastEvaluatedKey'] = '';
        expect(component.previousDisabled).toBe(true);
        expect(component.nextDisabled).toBe(true);

        component['currentPageIndex'] = 1;
        component['lastEvaluatedKey'] = 'abc';
        expect(component.previousDisabled).toBe(false);
        expect(component.nextDisabled).toBe(false);
    });

    it('should re-query table when shouldRefreshList$ emits true', () => {
        const spy = jest.spyOn(component as any, 'queryTable');
        refreshListSubject.next(true);
        expect(spy).toHaveBeenCalledWith('', true);
    });

    it('should open the legal records view when legalCaseId is provided in the route', () => {
        routeQueryParams$.next({ legalCaseId: mockLegalCases[0].legalCaseId ?? null });

        expect(component.viewMode).toBe(component.ViewMode.Records);
        expect(component.selectedCase).toEqual(mockLegalCases[0]);
    });

    it('should ignore host route legalCaseId when opened from the record assignment dialog', () => {
        const dialogFixture = TestBed.createComponent(GovernanceLegalHoldManagementComponent);
        const dialogComponent = dialogFixture.componentInstance;
        dialogComponent.clickedFrom = LegalHoldInitiator.Record;

        mockGovernanceLegalCaseService.queryLegalCases.mockClear();
        routeQueryParams$.next({ legalCaseId: mockLegalCases[0].legalCaseId ?? null });

        dialogFixture.detectChanges();

        expect(dialogComponent.viewMode).toBe(dialogComponent.ViewMode.Cases);
        expect(dialogComponent.selectedCase).toBeUndefined();
        expect(routerMock.navigate).not.toHaveBeenCalled();
        expect(mockGovernanceLegalCaseService.queryLegalCases).toHaveBeenCalledTimes(1);
    });

    it('should keep the current legal case records view open when the same legalCaseId is received again', () => {
        const openCase = {
            legalCaseId: 'legal-case-open',
            legalCaseName: 'Already Open Case',
            legalCaseReason: 'Already in records view',
        } as any;

        component.viewMode = component.ViewMode.Records;
        component.selectedCase = openCase;
        component.allCases = [mockLegalCases[0]];
        component.legalCases = [mockLegalCases[0]];
        component['lastEvaluatedKey'] = 'next-page-key';

        mockGovernanceLegalCaseService.queryLegalCases.mockClear();

        routeQueryParams$.next({ legalCaseId: openCase.legalCaseId });

        expect(mockGovernanceLegalCaseService.queryLegalCases).not.toHaveBeenCalled();
        expect(component.selectedCase).toEqual(openCase);
    });

    it('should search later legal case pages when the route case is not in the loaded batch', () => {
        const nextPageCase = {
            legalCaseId: 'legal-case-next-page',
            legalCaseName: 'Later Page Case',
            legalCaseReason: 'Loaded from a later page',
        } as any;

        component.allCases = [mockLegalCases[0]];
        component.legalCases = [mockLegalCases[0]];
        component['lastEvaluatedKey'] = 'next-page-key';

        mockGovernanceLegalCaseService.queryLegalCases.mockClear();
        mockGovernanceLegalCaseService.queryLegalCases.mockReturnValueOnce(of({ contents: [nextPageCase], lastEvaluatedKey: '' }));

        routeQueryParams$.next({ legalCaseId: nextPageCase.legalCaseId });

        expect(mockGovernanceLegalCaseService.queryLegalCases).toHaveBeenCalledWith({
            exclusiveStartKey: 'next-page-key',
            limit: component.pageSize,
        });
        expect(component.viewMode).toBe(component.ViewMode.Records);
        expect(component.selectedCase).toEqual(nextPageCase);
    });

    it('should clear the pending route lookup id when the later-page lookup fails', () => {
        component.allCases = [mockLegalCases[0]];
        component.legalCases = [mockLegalCases[0]];
        component['lastEvaluatedKey'] = 'next-page-key';

        mockGovernanceLegalCaseService.queryLegalCases.mockClear();
        mockGovernanceLegalCaseService.queryLegalCases.mockReturnValueOnce(throwError(() => new Error('lookup failed')));

        routeQueryParams$.next({ legalCaseId: 'legal-case-next-page' });

        expect(component['pendingRouteLookupLegalCaseId']).toBeNull();
    });

    it('should navigate back to the dashboard when the records view was opened from dashboard drill-down', () => {
        routeQueryParams$.next({
            legalCaseId: mockLegalCases[0].legalCaseId ?? null,
            source: 'dashboard',
        });

        component.backToCases();

        expect(routerMock.navigate).toHaveBeenCalledWith(['/governance/dashboard']);
    });

    it('should display error component when hasError is true in Cases view', () => {
        component.viewMode = component.ViewMode.Cases;
        component.noResults = true;
        component.hasError = true;
        fixture.detectChanges();

        const errorComponent = fixture.nativeElement.querySelector('hxp-governance-error');
        expect(errorComponent).toBeTruthy();
    });

    it('should not display error component when hasError is false in Cases view', () => {
        component.viewMode = component.ViewMode.Cases;
        component.noResults = true;
        component.hasError = false;
        fixture.detectChanges();

        const errorComponent = fixture.nativeElement.querySelector('hxp-governance-error');
        expect(errorComponent).toBeFalsy();
    });

    it('should call onRetry when error component emits buttonClick', () => {
        const retrySpy = jest.spyOn(component, 'onRetry');
        component.viewMode = component.ViewMode.Cases;
        component.noResults = true;
        component.hasError = true;
        fixture.detectChanges();

        const errorDebugElement = fixture.debugElement.query((el) => el.name === 'hxp-governance-error');
        errorDebugElement.triggerEventHandler('buttonClick', {});
        fixture.detectChanges();

        expect(retrySpy).toHaveBeenCalled();
    });

    it('should call EditLegalHoldCaseButtonService.execute with a single-case legalActionContext when onEditLegalHoldCaseFromRow is called', () => {
        const legalCase = mockLegalHoldCasesData[0] as any;
        component.legalActionContext = { legalHoldCases: [] };

        component.onEditLegalHoldCaseFromRow(legalCase);

        expect(mockEditLegalHoldCaseButtonService.execute).toHaveBeenCalledWith({ legalHoldCases: [legalCase] });
    });

    it('should not call EditLegalHoldCaseButtonService.execute when onEditLegalHoldCaseFromRow is called with a falsy value', () => {
        mockEditLegalHoldCaseButtonService.execute.mockClear();

        component.onEditLegalHoldCaseFromRow(null as any);

        expect(mockEditLegalHoldCaseButtonService.execute).not.toHaveBeenCalled();
    });

    it('should update selectedRecords and emit actionContextChange when handleChildActionContextChange is called', () => {
        const emitSpy = jest.spyOn(component.actionContextChange, 'emit');
        const mockRecords = [{ id: 'r1' } as any];
        const mockContext = { records: mockRecords, showPanel: true };

        component.handleChildActionContextChange(mockContext);

        expect(component['selectedRecords']).toEqual(mockRecords);
        expect(emitSpy).toHaveBeenCalledWith(mockContext);
    });

    it('should pass accessibility audit', async () => {
        const report = await a11yReport(fixture.nativeElement, defaultConfiguration);
        expect(report?.violations).toEqual([]);
    });
});

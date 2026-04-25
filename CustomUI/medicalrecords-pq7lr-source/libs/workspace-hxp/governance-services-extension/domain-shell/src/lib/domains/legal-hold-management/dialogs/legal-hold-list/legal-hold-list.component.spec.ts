/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegalHoldListComponent } from './legal-hold-list.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { By } from '@angular/platform-browser';
import { GovernanceLegalCaseService } from '../../services/governance-legal-case.service';
import { GovernanceLegalRecordService } from '../../services/governance-legal-record.service';
import { GovernanceLegalHoldManagementComponent } from '../../legal-hold-management.component';
import { mockLegalHoldCasesData } from '../../../../shared/mocks/mock-legal-hold-cases.mock';
import { LegalHoldCase } from '../../definitions/legal-hold.interface';
import { GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { a11yReport, defaultConfiguration } from '@hxp/workspace-hxp/shared/testing';

describe('LegalHoldListComponent', () => {
    let fixture: ComponentFixture<LegalHoldListComponent>;
    let component: LegalHoldListComponent;

    const mockShouldRefresh$ = new Subject<boolean>();

    const mockDialogRef = { close: jest.fn() };
    const mockNotificationService = { showSuccess: jest.fn(), showError: jest.fn() };
    const mockLegalCaseService = {
        queryLegalCases: jest.fn().mockReturnValue(of({ contents: mockLegalHoldCasesData, lastEvaluatedKey: 'key2' })),
        shouldRefreshList$: mockShouldRefresh$.asObservable(),
    };

    const mockLegalRecordService = {
        assignRecordToLegalCase: jest.fn(),
        emitRecordAssignmentComplete: jest.fn(),
    };

    async function setupTest(context: { records: GovernanceRecord[]; highlightFirstRow?: boolean }) {
        await TestBed.configureTestingModule({
            imports: [LegalHoldListComponent, NoopTranslateModule, MatIconTestingModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: context },
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: HxpNotificationService, useValue: mockNotificationService },
                { provide: GovernanceLegalCaseService, useValue: mockLegalCaseService },
                { provide: GovernanceLegalRecordService, useValue: mockLegalRecordService },
                { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
                { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LegalHoldListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should shows plural message for multiple records', async () => {
        await setupTest({
            records: [
                { id: 'rec1', categoryId: 'cat1', environmentDataSourceId: 'eds1' },
                { id: 'rec2', categoryId: 'cat2', environmentDataSourceId: 'eds2' },
            ],
        });

        const spanEl = fixture.debugElement.query(By.css('.hxp-legal-hold-info-banner span')).nativeElement;
        expect(spanEl.textContent).toContain('GOVERNANCE.LEGAL_DIALOG.INFO_ADD_RECORDS_plural');
    });

    it('should shows singular message for a single record', async () => {
        await setupTest({
            records: [{ id: 'rec1', categoryId: 'cat1', environmentDataSourceId: 'eds1' }],
        });

        const spanEl = fixture.debugElement.query(By.css('.hxp-legal-hold-info-banner span')).nativeElement;
        expect(spanEl.textContent).toContain('GOVERNANCE.LEGAL_DIALOG.INFO_ADD_RECORDS');
    });

    it('should closes on cancel', async () => {
        await setupTest({ records: [] });

        component.onCancel();
        expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });

    it('should disable Assign button when nothing is selected', async () => {
        await setupTest({ records: [] });

        const assignBtn: HTMLButtonElement = fixture.debugElement.query(By.css('[data-automation-id="hxp-assign-record-to-case-btn"]')).nativeElement;
        expect(assignBtn.disabled).toBe(true);
    });

    it('should assigns records and reports success', async () => {
        const recordContext = {
            records: [
                { id: 'rec1', categoryId: 'cat1', environmentDataSourceId: 'eds1' },
                { id: 'rec2', categoryId: 'cat2', environmentDataSourceId: 'eds2' },
            ],
        };
        await setupTest(recordContext);

        component.selectedLegalCase = [{ legalCaseId: 'case-123' } as LegalHoldCase];
        mockLegalRecordService.assignRecordToLegalCase.mockReturnValue(of({}));

        component.addRecordsToLegalCase();

        expect(mockLegalRecordService.assignRecordToLegalCase).toHaveBeenCalledWith({
            records: recordContext.records.map((record) => ({
                edsId: record.environmentDataSourceId,
                categoryId: record.categoryId,
                recordId: record.id,
            })),
            legalCaseIds: ['case-123'],
        });
        expect(mockDialogRef.close).toHaveBeenCalled();
        expect(mockNotificationService.showSuccess).toHaveBeenCalled();
        expect(mockLegalRecordService.emitRecordAssignmentComplete).toHaveBeenCalled();
    });

    it('should shows error on failed assign', async () => {
        await setupTest({
            records: [{ id: 'rec1', categoryId: 'cat1', environmentDataSourceId: 'eds1' }],
        });

        component.selectedLegalCase = [{ legalCaseId: 'case-999' } as LegalHoldCase];
        mockLegalRecordService.assignRecordToLegalCase.mockReturnValue(throwError(() => new Error('error')));

        component.addRecordsToLegalCase();

        expect(mockNotificationService.showError).toHaveBeenCalled();
        expect(component.isAssigning).toBe(false);
    });

    it('should forwards highlightFirstRow flag to child list', async () => {
        await setupTest({
            records: [{ id: 'rec1', categoryId: 'cat1', environmentDataSourceId: 'eds1' }],
            highlightFirstRow: true,
        });

        const childDE = fixture.debugElement.query(By.directive(GovernanceLegalHoldManagementComponent));
        const childCmp = childDE.componentInstance as GovernanceLegalHoldManagementComponent;
        expect(childCmp.highlightFirstRow).toBe(true);
    });

    it('should pass accessibility audit', async () => {
        await setupTest({
            records: [{ id: 'rec1', categoryId: 'cat1', environmentDataSourceId: 'eds1' }],
        });
        const report = await a11yReport(fixture.nativeElement, defaultConfiguration);
        expect(report?.violations).toEqual([]);
    });
});

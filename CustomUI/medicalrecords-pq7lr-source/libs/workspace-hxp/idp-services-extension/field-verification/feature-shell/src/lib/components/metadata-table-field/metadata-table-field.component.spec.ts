/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetadataTableFieldComponent } from './metadata-table-field.component';
import { IdpVerificationService } from '../../services/verification/verification.service';
import { of } from 'rxjs';
import { ActionHistoryService } from '../../services/action-history.service';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { IdpFieldDataType, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpValidationStatus } from '../../models/screen-models';
import { By } from '@angular/platform-browser';

describe('MetadataTableFieldComponent', () => {
    let component: MetadataTableFieldComponent;
    let fixture: ComponentFixture<MetadataTableFieldComponent>;
    let mockVerificationService: jest.Mocked<IdpVerificationService>;
    let mockActionHistoryService: jest.Mocked<ActionHistoryService>;

    beforeEach(async () => {
        mockVerificationService = {
            getTableSummaryById$: jest.fn().mockReturnValue(of(undefined)),
            getFieldById$: jest.fn().mockReturnValue(of(undefined)),
            selectField: jest.fn(),
            addTableRow: jest.fn(),
        } as unknown as jest.Mocked<IdpVerificationService>;

        mockActionHistoryService = {
            canUndo: jest.fn(),
            undo: jest.fn(),
            canRedo: jest.fn(),
            redo: jest.fn(),
            do: jest.fn(),
            clear: jest.fn(),
        } as unknown as jest.Mocked<ActionHistoryService>;

        await TestBed.configureTestingModule({
            imports: [MetadataTableFieldComponent, NoopTranslateModule],
            providers: [
                { provide: IdpVerificationService, useValue: mockVerificationService },
                { provide: ActionHistoryService, useValue: mockActionHistoryService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(MetadataTableFieldComponent);
        component = fixture.componentInstance;
    });

    it('should call history.do with correct do/undo actions when addTable is called', (done) => {
        const tableId = 'test-table-id';
        const addTableRowSpy = jest.fn();
        const deleteTableRowSpy = jest.fn();
        const selectNextFieldSpy = jest.fn();

        // Patch the verificationService with additional spies for deleteTableRow/selectNextField
        (component as any).verificationService.addTableRow = addTableRowSpy;
        (component as any).verificationService.deleteTableRow = deleteTableRowSpy;
        (component as any).verificationService.selectNextField = selectNextFieldSpy;

        // Capture the object passed to history.do
        let doUndoObj: any;
        mockActionHistoryService.do.mockImplementation((obj: any) => {
            doUndoObj = obj;
        });

        component.addTable(tableId);

        expect(mockActionHistoryService.do).toHaveBeenCalled();
        expect(typeof doUndoObj.do).toBe('function');
        expect(typeof doUndoObj.undo).toBe('function');

        // Test the 'do' function
        doUndoObj.do();
        expect(addTableRowSpy).toHaveBeenCalledWith(tableId, 0);

        // setTimeout is used in the implementation, so we need to wait for it
        setTimeout(() => {
            // Test the 'undo' function
            doUndoObj.undo();
            expect(deleteTableRowSpy).toHaveBeenCalledWith(tableId, 0);

            setTimeout(() => {
                expect(selectNextFieldSpy).toHaveBeenCalled();
                done();
            }, 0);
        }, 0);
    });

    describe('rendered template', () => {
        const mockField = {
            id: 'table1',
            name: 'Invoice Table',
            dataType: IdpFieldDataType.Table,
            format: '',
            confidence: 1,
            verificationStatus: IdpVerificationStatus.AutoValid,
            validationStatus: IdpValidationStatus.Valid,
            hasIssue: false,
        };

        it('should render table name and add-table button when rowCount is 0', () => {
            mockVerificationService.getTableSummaryById$.mockReturnValue(of({ id: 'table1', name: 'Invoice Table', rowCount: 0 }));
            mockVerificationService.getFieldById$.mockReturnValue(of(mockField as any));

            component.id = 'table1';
            fixture.detectChanges();

            const container = fixture.debugElement.query(By.css('#table-issues-container'));
            expect(container).toBeTruthy();

            const tableName = fixture.debugElement.query(By.css('.idp-table-name'));
            expect(tableName.nativeElement.textContent).toContain('Invoice Table');

            const notFoundLabel = fixture.debugElement.query(By.css('.idp-table-not-found'));
            expect(notFoundLabel).toBeTruthy();

            const addButton = fixture.debugElement.query(By.css('[data-automation-id="idp-add-table-button"]'));
            expect(addButton).toBeTruthy();
        });

        it('should render table name but hide add-table button and not-found label when rowCount > 0', () => {
            mockVerificationService.getTableSummaryById$.mockReturnValue(of({ id: 'table1', name: 'Invoice Table', rowCount: 3 }));
            mockVerificationService.getFieldById$.mockReturnValue(of(mockField as any));

            component.id = 'table1';
            fixture.detectChanges();

            const container = fixture.debugElement.query(By.css('#table-issues-container'));
            expect(container).toBeTruthy();

            const tableName = fixture.debugElement.query(By.css('.idp-table-name'));
            expect(tableName.nativeElement.textContent).toContain('Invoice Table');

            const notFoundLabel = fixture.debugElement.query(By.css('.idp-table-not-found'));
            expect(notFoundLabel).toBeFalsy();

            const addButton = fixture.debugElement.query(By.css('[data-automation-id="idp-add-table-button"]'));
            expect(addButton).toBeFalsy();
        });

        it('should not render anything when tableSummary$ emits undefined', () => {
            mockVerificationService.getTableSummaryById$.mockReturnValue(of(undefined));

            component.id = 'table1';
            fixture.detectChanges();

            const container = fixture.debugElement.query(By.css('#table-issues-container'));
            expect(container).toBeFalsy();
        });
    });
});

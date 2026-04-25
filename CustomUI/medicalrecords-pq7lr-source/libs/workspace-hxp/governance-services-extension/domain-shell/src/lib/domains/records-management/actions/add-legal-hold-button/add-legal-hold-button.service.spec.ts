/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { AddLegalHoldButtonService } from './add-legal-hold-button.service';
import { MatDialog } from '@angular/material/dialog';
import { ActionContext, GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { LegalHoldListComponent } from '../../../legal-hold-management/dialogs/legal-hold-list/legal-hold-list.component';

describe('AddLegalHoldButtonService', () => {
    let service: AddLegalHoldButtonService;
    let mockDialog: jest.Mocked<MatDialog>;

    const mockRecords: GovernanceRecord[] = [
        {
            id: 'rec-001',
            contentID: 'doc-001',
            fileName: 'Test Record',
            status: 'Ready',
            environmentDataSourceId: '',
            cutOffDate: new Date().toISOString(),
            categoryId: '',
            retainUntil: new Date().toISOString(),
        },
    ];

    const mockContext: ActionContext = {
        records: mockRecords,
    };

    beforeEach(() => {
        mockDialog = {
            open: jest.fn(),
        } as unknown as jest.Mocked<MatDialog>;

        TestBed.configureTestingModule({
            providers: [AddLegalHoldButtonService, { provide: MatDialog, useValue: mockDialog }],
        });

        service = TestBed.inject(AddLegalHoldButtonService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when records exist', (done) => {
        service.isAvailable(mockRecords).subscribe((result) => {
            expect(result).toBe(true);
            done();
        });
    });

    it('should return false when records array is empty', (done) => {
        service.isAvailable([]).subscribe((result) => {
            expect(result).toBe(false);
            done();
        });
    });

    it('should open the LegalHoldListComponent dialog (no opts)', () => {
        service.execute(mockContext);

        expect(mockDialog.open).toHaveBeenCalledWith(LegalHoldListComponent, {
            maxWidth: '90vw',
            width: '1200px',
            data: mockContext,
        });
    });

    it('should opens the dialog with highlightFirstRow=true when opts provided', () => {
        service.execute(mockContext, { highlightFirstRow: true });

        expect(mockDialog.open).toHaveBeenCalledWith(
            LegalHoldListComponent,
            expect.objectContaining({
                width: '1200px',
                data: expect.objectContaining({
                    ...mockContext,
                    highlightFirstRow: true,
                }),
            })
        );
    });
});

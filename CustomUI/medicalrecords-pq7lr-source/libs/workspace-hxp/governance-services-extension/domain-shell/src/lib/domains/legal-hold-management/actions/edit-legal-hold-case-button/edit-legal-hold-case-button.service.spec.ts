/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';

import { EditLegalHoldCaseButtonService } from './edit-legal-hold-case-button.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfig } from '@alfresco/adf-hx-content-services/ui';
import { LegalActionContext, LegalHoldCase } from '../../definitions/legal-hold.interface';
import { LegalHoldInitiator } from '../../definitions/legal-hold.constants';
import { CreateLegalHoldCaseComponent } from '../../dialogs/create-legal-hold-case/create-legal-hold-case.component';

describe('EditLegalHoldCaseButtonService', () => {
    let service: EditLegalHoldCaseButtonService;
    let mockMatDialog: jest.Mocked<MatDialog>;

    const legalHoldCaseMockRecord = (overrides?: Partial<LegalHoldCase>): LegalHoldCase => ({
        legalCaseId: 'lc-001',
        legalCaseName: 'Test Legal Case',
        legalCaseReason: 'Test Reason',
        legalCaseDescription: 'Test Description',
        ...overrides,
    });

    beforeEach(() => {
        mockMatDialog = {
            open: jest.fn(),
        } as unknown as jest.Mocked<MatDialog>;

        TestBed.configureTestingModule({
            providers: [EditLegalHoldCaseButtonService, { provide: MatDialog, useValue: mockMatDialog }],
        });

        service = TestBed.inject(EditLegalHoldCaseButtonService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when only one legal case is selected', () => {
        const context: LegalActionContext = {
            legalHoldCases: [legalHoldCaseMockRecord()],
        };
        expect(service.isAvailable(context)).toBe(true);
    });

    it('should return false when no legal case is selected', () => {
        const context: LegalActionContext = {
            legalHoldCases: [],
        };
        expect(service.isAvailable(context)).toBe(false);
    });

    it('should return false when multiple legal cases are selected', () => {
        const context: LegalActionContext = {
            legalHoldCases: [legalHoldCaseMockRecord(), legalHoldCaseMockRecord({ legalCaseId: 'lc-002', legalCaseName: 'Another Legal Case' })],
        };
        expect(service.isAvailable(context)).toBe(false);
    });

    it('should open EditLegalHoldCaseComponent with correct config', () => {
        const context: LegalActionContext = {
            legalHoldCases: [legalHoldCaseMockRecord()],
        };
        service.execute(context);

        expect(mockMatDialog.open).toHaveBeenCalledWith(CreateLegalHoldCaseComponent, {
            width: DialogConfig.small.width,
            data: {
                clickedFrom: LegalHoldInitiator.Legal,
                legalHoldCases: context.legalHoldCases,
            },
        });
    });
});

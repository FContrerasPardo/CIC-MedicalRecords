/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { RecordDeleteConfirmationComponent } from './record-delete-confirmation.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { delay, of, throwError } from 'rxjs';
import { GovernanceRecordService } from '../../services/governance-record.service';
import { GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { MatProgressSpinnerHarness } from '@angular/material/progress-spinner/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('RecordDeleteConfirmationComponent', () => {
    const mockRecord: GovernanceRecord = {
        id: 'rec-001',
        contentID: '1',
        fileName: 'Test Record',
        status: 'Ready',
        environmentDataSourceId: 'env123',
        cutOffDate: new Date().toISOString(),
        categoryId: 'cat456',
        retainUntil: new Date().toISOString(),
    };

    interface SetupResult {
        fixture: ComponentFixture<RecordDeleteConfirmationComponent>;
        loader: HarnessLoader;
        dialogRefMock: jest.Mocked<MatDialogRef<RecordDeleteConfirmationComponent>>;
        recordServiceMock: jest.Mocked<GovernanceRecordService>;
        notifyMock: jest.Mocked<HxpNotificationService>;
    }

    function setupTest(records: any[]): SetupResult {
        TestBed.resetTestingModule();

        const dialogRefMock = { close: jest.fn() } as unknown as jest.Mocked<MatDialogRef<RecordDeleteConfirmationComponent>>;
        const recordServiceMock = {
            updateConfirmed$: of(),
            deleteConfirmed$: of(),
            editRecord: jest.fn(),
            emitUpdateConfirmed: jest.fn(),
            deleteRecord: jest.fn(),
            emitDeleteConfirmed: jest.fn(),
        } as unknown as jest.Mocked<GovernanceRecordService>;
        const notifyMock = {
            showSuccess: jest.fn(),
            showError: jest.fn(),
            showInfo: jest.fn(),
            openSnackBar: jest.fn(),
            notificationService: {} as any,
        } as unknown as jest.Mocked<HxpNotificationService>;

        TestBed.configureTestingModule({
            imports: [RecordDeleteConfirmationComponent, NoopTranslateModule, NoopAnimationsModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: MAT_DIALOG_DATA, useValue: { records } },
                { provide: GovernanceRecordService, useValue: recordServiceMock },
                { provide: HxpNotificationService, useValue: notifyMock },
            ],
        });

        const fixture = TestBed.createComponent(RecordDeleteConfirmationComponent);
        const loader = TestbedHarnessEnvironment.loader(fixture);
        fixture.detectChanges();

        return { fixture, loader, dialogRefMock, recordServiceMock, notifyMock };
    }

    it('should close the dialog with false when Cancel is clicked', async () => {
        const { loader, dialogRefMock } = setupTest([mockRecord, { ...mockRecord, id: 'rec-002' }]);

        const cancelBtn = await loader.getHarness(MatButtonHarness.with({ text: /CANCEL/i }));
        await cancelBtn.click();

        expect(dialogRefMock.close).toHaveBeenCalledWith(false);
    });

    it('should delete all records and show success notification on full success', fakeAsync(async () => {
        const { fixture, loader, dialogRefMock, recordServiceMock, notifyMock } = setupTest([mockRecord, { ...mockRecord, id: 'rec-002' }]);

        recordServiceMock.deleteRecord.mockImplementation(() => of(true));

        const deleteBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.DELETE_DIALOG.DELETE/i }));
        await deleteBtn.click();

        tick();
        fixture.detectChanges();
        flush();

        expect(dialogRefMock.close).toHaveBeenCalledWith(true);
        expect(recordServiceMock.emitDeleteConfirmed).toHaveBeenCalled();
        expect(notifyMock.showSuccess).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.RECORD_DELETE_SUCCESS');
    }));

    it('should show partial delete notification when some records fail', fakeAsync(async () => {
        const { fixture, loader, dialogRefMock, recordServiceMock, notifyMock } = setupTest([mockRecord, { ...mockRecord, id: 'rec-002' }]);

        recordServiceMock.deleteRecord.mockReturnValueOnce(of(true)).mockReturnValueOnce(of(false));

        const deleteBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.DELETE_DIALOG.DELETE/i }));
        await deleteBtn.click();

        tick();
        fixture.detectChanges();
        flush();

        expect(dialogRefMock.close).toHaveBeenCalledWith(false);
        expect(notifyMock.showInfo).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.RECORD_DELETE_PARTIAL');
    }));

    it('should show error notification when all records fail', fakeAsync(async () => {
        const { fixture, loader, dialogRefMock, recordServiceMock, notifyMock } = setupTest([mockRecord, { ...mockRecord, id: 'rec-002' }]);

        recordServiceMock.deleteRecord.mockReturnValue(of(false));

        const deleteBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.DELETE_DIALOG.DELETE/i }));
        await deleteBtn.click();

        tick();
        fixture.detectChanges();
        flush();

        expect(dialogRefMock.close).toHaveBeenCalledWith(false);
        expect(notifyMock.showError).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.RECORD_DELETE_ERROR');
    }));

    it('should show spinner while deletion is in progress', fakeAsync(async () => {
        const { fixture, loader, recordServiceMock } = setupTest([mockRecord]);
        const component = fixture.componentInstance;

        recordServiceMock.deleteRecord.mockReturnValue(of(true).pipe(delay(2)));

        const deleteBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.DELETE_DIALOG.DELETE/i }));
        await deleteBtn.click();

        tick();
        fixture.detectChanges();

        expect(component['isDeleting']).toBe(true);

        const spinner = await loader.getHarnessOrNull(MatProgressSpinnerHarness);
        expect(spinner).not.toBeNull();

        tick(2);
        fixture.detectChanges();
        flush();
    }));

    it('should handle thrown error as failure and close with false', fakeAsync(async () => {
        const { fixture, loader, dialogRefMock, recordServiceMock, notifyMock } = setupTest([mockRecord]);

        recordServiceMock.deleteRecord.mockImplementation(() => throwError(() => new Error('boom')));

        const deleteBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.DELETE_DIALOG.DELETE/i }));
        await deleteBtn.click();

        tick();
        fixture.detectChanges();
        flush();

        expect(dialogRefMock.close).toHaveBeenCalledWith(false);
        expect(notifyMock.showError).toHaveBeenCalledWith('GOVERNANCE.NOTIFICATIONS.RECORD_DELETE_ERROR');
    }));

    it('should pass accessibility checks', async () => {
        const { fixture: fix } = setupTest([mockRecord, { ...mockRecord, id: 'rec-002' }]);
        fix.detectChanges();

        const res = await a11yReport(fix.nativeElement);

        expect(res?.violations).toEqual([]);
    });

    it('should not call deleteRecord for records missing required fields', fakeAsync(async () => {
        const invalidRecords: any[] = [
            { id: null, environmentDataSourceId: 'env', categoryId: 'cat' },
            { id: 'rec-1', environmentDataSourceId: null, categoryId: 'cat' },
            { id: 'rec-2', environmentDataSourceId: 'env', categoryId: null },
        ];
        const validRecord = {
            id: 'rec-3',
            environmentDataSourceId: 'env',
            categoryId: 'cat',
        };

        const { loader, recordServiceMock } = setupTest([...invalidRecords, validRecord]);
        recordServiceMock.deleteRecord.mockReturnValue(of(true));

        const deleteBtn = await loader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.DELETE_DIALOG.DELETE/i }));
        await deleteBtn.click();

        tick();
        flush();

        expect(recordServiceMock.deleteRecord).toHaveBeenCalledTimes(1);
        expect(recordServiceMock.deleteRecord).toHaveBeenCalledWith('rec-3', 'env', 'cat');
    }));
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { RecordPropertiesSidebarComponent } from './record-properties-sidebar.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BLOCK_EDIT_STATUSES, HxpNotificationService, RecordStatus } from '@alfresco/adf-hx-content-services/services';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialog } from '@angular/material/dialog';
import { delay, of, throwError } from 'rxjs';
import { GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { GovernanceRecordService } from '../../services/governance-record.service';
import { RecordPropertiesButtonService } from '../../actions/record-properties-button/record-properties-button.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatProgressSpinnerHarness } from '@angular/material/progress-spinner/testing';
import { MatDatepickerToggleHarness } from '@angular/material/datepicker/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('RecordPropertiesSidebarComponent', () => {
    let component: RecordPropertiesSidebarComponent;
    let fixture: ComponentFixture<RecordPropertiesSidebarComponent>;
    let loader: HarnessLoader;
    let notificationServiceMock: jest.Mocked<HxpNotificationService>;

    const mockGovernanceRecordService = {
        editRecord: jest.fn(),
        patchRecord: jest.fn(),
        emitUpdateConfirmed: jest.fn(),
        emitPatchConfirmed: jest.fn(),
        getViewRecordProperty: jest.fn().mockReturnValue(of(true)),
    };

    const mockRecordPropertiesButtonService = {
        execute: jest.fn(),
    };

    const mockRecord: GovernanceRecord = {
        id: 'rec-001',
        contentID: '1',
        fileName: 'Test Record',
        status: RecordStatus.Ready,
        environmentDataSourceId: 'env123',
        cutOffDate: new Date('2025-07-20T00:00:00.000Z').toISOString(),
        categoryId: 'cat456',
        retainUntil: new Date('2025-08-20T00:00:00.000Z').toISOString(),
    };

    const setupRecord = (overrides: Partial<GovernanceRecord> = {}) => {
        component.actionContext = {
            records: [{ ...mockRecord, ...overrides }],
            showPanel: true,
        };
        fixture.detectChanges();
    };

    const mockEditRecordSuccessEcho = () => {
        mockGovernanceRecordService.editRecord.mockImplementation((_id: string, payload: any) =>
            of({ ...mockRecord, ...payload, fileName: 'Updated' }).pipe(delay(1))
        );
    };

    const mockPatchRecordSuccessEcho = () => {
        mockGovernanceRecordService.patchRecord.mockImplementation((_id: string, payload: any) =>
            of({
                ...mockRecord,
                contentMetadata: { indefiniteProperty: payload.indefiniteProperty, indefiniteValue: payload.indefiniteValue },
            }).pipe(delay(1))
        );
    };

    const clickEditButton = async () => {
        const btn = await loader.getHarness(MatButtonHarness.with({ text: /EDIT/i }));
        await btn.click();
        fixture.detectChanges();
    };

    const setNewCutoffDate = (yyyyMmDdLocal: string) => {
        const date = new Date(yyyyMmDdLocal);
        component.cutoffDateControl.setValue(date);
        component.cutoffDateControl.markAsDirty();
        fixture.detectChanges();
        return date;
    };

    const setNewRetentionDate = (yyyyMmDdLocal: string) => {
        const date = new Date(yyyyMmDdLocal);
        component.retentionDurationAdjustmentDateControl.setValue(date);
        component.retentionDurationAdjustmentDateControl.markAsDirty();
        fixture.detectChanges();
        return date;
    };

    const setupUnderRetention = (withValue = false) => {
        const key = 'contract_end_date';
        const meta: any = { retentionAdjustmentPropertyName: key };
        if (withValue) {meta[key] = new Date('2025-07-22T00:00:00.000Z').toISOString();}

        setupRecord({
            status: RecordStatus.UnderRetention,
            contentMetadata: meta,
        });

        component.ngOnInit();
        fixture.detectChanges();
    };

    beforeEach(() => {
        notificationServiceMock = {
            showSuccess: jest.fn(),
            showError: jest.fn(),
        } as unknown as jest.Mocked<HxpNotificationService>;

        TestBed.configureTestingModule({
            imports: [RecordPropertiesSidebarComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: HxpNotificationService, useValue: notificationServiceMock },
                { provide: GovernanceRecordService, useValue: mockGovernanceRecordService },
                { provide: RecordPropertiesButtonService, useValue: mockRecordPropertiesButtonService },
            ],
        });

        fixture = TestBed.createComponent(RecordPropertiesSidebarComponent);
        component = fixture.componentInstance;
        loader = TestbedHarnessEnvironment.loader(fixture);

        jest.clearAllMocks();
        setupRecord();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Accessibility', () => {
        it('should pass accessibility checks in view mode', async () => {
            setupRecord({ status: RecordStatus.Ready });

            const res = await a11yReport(fixture.nativeElement);

            expect(res?.violations).toEqual([]);
        });
    });

    describe('Layout & Toggle', () => {
        it('should expand and collapse the sidebar', async () => {
            const toggleBtn = await loader.getHarness(MatButtonHarness.with({ selector: 'button[aria-label="GOVERNANCE.SIDEBAR.BUTTONS.TOGGLE"]' }));

            await toggleBtn.click();
            expect((component as any).collapsed).toBe(true);

            await toggleBtn.click();
            expect((component as any).collapsed).toBe(false);
        });
    });

    describe('Edit Mode', () => {
        it('should show Edit button for editable records and hide for retained', async () => {
            setupRecord({ status: RecordStatus.Ready });
            component['isEditableRecord'] = !BLOCK_EDIT_STATUSES.includes(RecordStatus.Ready);
            fixture.detectChanges();
            expect(await loader.getHarnessOrNull(MatButtonHarness.with({ text: /EDIT/i }))).not.toBeNull();

            setupRecord({ status: RecordStatus.UnderRetention });
            component['isEditableRecord'] = !BLOCK_EDIT_STATUSES.includes(RecordStatus.UnderRetention);
            fixture.detectChanges();
            expect(await loader.getHarnessOrNull(MatButtonHarness.with({ text: /EDIT/i }))).toBeNull();
        });

        it('should enable edit mode on clicking Edit', async () => {
            await clickEditButton();
            expect((component as any).editMode).toBe(true);
        });

        it('should toggle Save button based on content change', async () => {
            await clickEditButton();
            component.cutoffDateControl.setValue(new Date(component.record.cutOffDate ?? ''));
            component.cutoffDateControl.markAsDirty();
            fixture.detectChanges();

            let saveBtn = await loader.getHarness(MatButtonHarness.with({ text: /SAVE/i }));
            expect(await saveBtn.isDisabled()).toBe(true);

            setNewCutoffDate('2025-07-26T00:00:00');
            saveBtn = await loader.getHarness(MatButtonHarness.with({ text: /SAVE/i }));
            expect(await saveBtn.isDisabled()).toBe(false);
        });
    });

    describe('Save Behavior', () => {
        const expectSavingState = async (expected: boolean) => {
            fixture.detectChanges();
            expect((component as any).isSaving).toBe(expected);
        };

        it('should send selected date + current time in UTC, show spinner, and update on success', fakeAsync(async () => {
            await clickEditButton();
            const pickedLocalDate = setNewCutoffDate('2025-07-26T00:00:00');
            mockEditRecordSuccessEcho();

            const saveBtn = await loader.getHarness(MatButtonHarness.with({ text: /SAVE/i }));
            await saveBtn.click();
            fixture.detectChanges();

            expect((component as any).isSaving).toBe(true);
            tick(10);
            fixture.detectChanges();
            expect((component as any).isSaving).toBe(false);

            const [, payload] = mockGovernanceRecordService.editRecord.mock.calls[0];
            const actual = new Date(payload.cutOffDate);

            expect(actual.getFullYear()).toBe(pickedLocalDate.getFullYear());
            expect(actual.getMonth()).toBe(pickedLocalDate.getMonth());
            expect(actual.getDate()).toBe(pickedLocalDate.getDate());

            const now = new Date();
            const expected = new Date(
                pickedLocalDate.getFullYear(),
                pickedLocalDate.getMonth(),
                pickedLocalDate.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds()
            );

            const diffMs = Math.abs(actual.getTime() - expected.getTime());
            expect(diffMs).toBeLessThan(5000);

            expect(notificationServiceMock.showSuccess).toHaveBeenCalled();
            flush();
        }));

        it('should stop spinner and show error on failure', fakeAsync(async () => {
            await clickEditButton();
            setNewCutoffDate('2025-07-27T00:00:00');
            mockGovernanceRecordService.editRecord.mockReturnValue(throwError(() => new Error('fail')));

            const saveBtn = await loader.getHarness(MatButtonHarness.with({ text: /SAVE/i }));
            await saveBtn.click();
            tick();
            await expectSavingState(false);

            expect(await loader.getHarnessOrNull(MatProgressSpinnerHarness)).toBeNull();
            expect(notificationServiceMock.showError).toHaveBeenCalled();
        }));
    });

    describe('Clear & Close', () => {
        it('should clear the cutoff date via datepicker Clear button', async () => {
            await clickEditButton();

            component.cutoffDateControl.setValue(new Date());
            fixture.detectChanges();

            const toggle = await loader.getHarness(MatDatepickerToggleHarness);
            await toggle.openCalendar();
            await fixture.whenStable();
            fixture.detectChanges();

            const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
            const clearButton = await rootLoader.getHarness(MatButtonHarness.with({ text: /GOVERNANCE.SIDEBAR.DATEPICKER.CLEAR/i }));
            await clearButton.click();

            fixture.detectChanges();
            expect(component.cutoffDateControl.value).toBeNull();
        });

        it('should close the sidebar without confirmation when there are no unsaved changes', async () => {
            const spy = jest.spyOn(TestBed.inject(RecordPropertiesButtonService), 'execute');

            const closeBtn = await loader.getHarness(MatButtonHarness.with({ selector: 'button[aria-label="GOVERNANCE.SIDEBAR.BUTTONS.CLOSE"]' }));
            await closeBtn.click();

            expect(spy).toHaveBeenCalledWith({ records: component.actionContext.records, showPanel: false });
        });

        it('should open confirmation dialog on unsaved changes and close on discard', async () => {
            const spy = jest.spyOn(TestBed.inject(RecordPropertiesButtonService), 'execute');
            const dialogRefMock = { afterClosed: () => of('discard'), close: () => {} };
            jest.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue(dialogRefMock as any);

            await clickEditButton();
            setNewCutoffDate('2025-07-26T00:00:00');

            const closeBtn = await loader.getHarness(MatButtonHarness.with({ selector: 'button[aria-label="GOVERNANCE.SIDEBAR.BUTTONS.CLOSE"]' }));
            await closeBtn.click();
            fixture.detectChanges();

            expect(spy).toHaveBeenCalledWith({ records: component.actionContext.records, showPanel: false });
        });
    });

    describe('Retention Duration Editing', () => {
        const getRetentionEditBtn = () => fixture.nativeElement.querySelector('.hxp-under-retention .hxp-edit-button');

        it('should show retention row with Edit when property exists and value is absent', async () => {
            setupUnderRetention(false);
            (component as any).isEditableRecord = false;
            fixture.detectChanges();
            await fixture.whenStable();

            const retentionEditBtn = getRetentionEditBtn();
            expect(retentionEditBtn).not.toBeNull();

            const valueEl: HTMLElement | null = fixture.nativeElement.querySelector('.hxp-under-retention-value');
            if (valueEl) {
                expect(valueEl.textContent?.trim()).toBe('');
            } else {
                expect(valueEl).toBeNull();
            }
        });

        it('should show retention value when indefiniteValue exists', async () => {
            setupUnderRetention(true);
            (component as any).isEditableRecord = false;
            fixture.detectChanges();
            await fixture.whenStable();

            const valueEl: HTMLElement | null = fixture.nativeElement.querySelector('.hxp-under-retention-value');
            if (!valueEl) {
                throw new Error('Expected retention value element to exist');
            }
            expect(valueEl.textContent?.trim()).toBeTruthy();
        });

        it('should enter retention edit mode when toggled', async () => {
            setupUnderRetention(false);
            (component as any).isEditableRecord = false;
            fixture.detectChanges();
            await fixture.whenStable();

            (component as any).toggleEditModeInRetention();
            fixture.detectChanges();
            await fixture.whenStable();

            expect((component as any).editModeInRetention).toBe(true);
            expect((component as any).editMode).toBe(false);
        });

        it('should toggle retention change detection based on control change', async () => {
            setupUnderRetention(true);
            (component as any).isEditableRecord = false;
            fixture.detectChanges();
            await fixture.whenStable();

            (component as any).toggleEditModeInRetention();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.isRetentionDurationChanged).toBe(false);

            setNewRetentionDate('2025-07-30T00:00:00');
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.isRetentionDurationChanged).toBe(true);
        });

        it('should only allow choosing a retention date after the cutoff date', () => {
            setupRecord({
                cutOffDate: new Date('2025-07-20T00:00:00.000Z').toISOString(),
                status: RecordStatus.UnderRetention,
                contentMetadata: { retentionAdjustmentPropertyName: 'contract_end_date' },
            });

            component.ngOnInit();
            fixture.detectChanges();

            const min = component.retentionMinDate;
            expect(min).not.toBeNull();

            if (min) {
                expect(min.getFullYear()).toBe(2025);
                expect(min.getMonth()).toBe(6);
                expect(min.getDate()).toBe(21);
                expect(min.getHours()).toBe(0);
                expect(min.getMinutes()).toBe(0);
                expect(min.getSeconds()).toBe(0);
            }
        });

        it('should call patchRecord with correct payload and show success on retention save', fakeAsync(async () => {
            setupUnderRetention(false);
            (component as any).isEditableRecord = false;
            fixture.detectChanges();

            (component as any).toggleEditModeInRetention();
            fixture.detectChanges();

            const pickedLocalDate = setNewRetentionDate('2025-07-29T00:00:00');
            mockPatchRecordSuccessEcho();

            component.saveChangesForRetention();
            fixture.detectChanges();

            expect((component as any).isSaving).toBe(true);
            tick(10);
            fixture.detectChanges();
            expect((component as any).isSaving).toBe(false);

            const [, payload] = mockGovernanceRecordService.patchRecord.mock.calls[0];
            expect(payload.indefiniteProperty).toBe('contract_end_date');

            const actual = new Date(payload.indefiniteValue);
            expect(actual.getFullYear()).toBe(pickedLocalDate.getFullYear());
            expect(actual.getMonth()).toBe(pickedLocalDate.getMonth());
            expect(actual.getDate()).toBe(pickedLocalDate.getDate());

            const now = new Date();
            const expected = new Date(
                pickedLocalDate.getFullYear(),
                pickedLocalDate.getMonth(),
                pickedLocalDate.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds()
            );
            const diffMs = Math.abs(actual.getTime() - expected.getTime());
            expect(diffMs).toBeLessThan(5000);

            expect(notificationServiceMock.showSuccess).toHaveBeenCalled();
            flush();
        }));

        it('should stop spinner and show error when patchRecord fails', fakeAsync(async () => {
            setupUnderRetention(false);
            (component as any).isEditableRecord = false;
            fixture.detectChanges();

            (component as any).toggleEditModeInRetention();
            fixture.detectChanges();

            setNewRetentionDate('2025-07-31T00:00:00');
            mockGovernanceRecordService.patchRecord.mockReturnValue(throwError(() => new Error('fail')));

            component.saveChangesForRetention();
            tick();
            fixture.detectChanges();

            expect((component as any).isSaving).toBe(false);
            expect(notificationServiceMock.showError).toHaveBeenCalled();
        }));

        it('should clear the retention date programmatically', async () => {
            setupUnderRetention(true);
            (component as any).isEditableRecord = false;
            fixture.detectChanges();
            await fixture.whenStable();

            (component as any).toggleEditModeInRetention();
            fixture.detectChanges();
            await fixture.whenStable();

            component.retentionDurationAdjustmentDateControl.setValue(new Date());
            fixture.detectChanges();
            await fixture.whenStable();

            component.clearRetentionDate();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.retentionDurationAdjustmentDateControl.value).toBeNull();
        });
    });
});

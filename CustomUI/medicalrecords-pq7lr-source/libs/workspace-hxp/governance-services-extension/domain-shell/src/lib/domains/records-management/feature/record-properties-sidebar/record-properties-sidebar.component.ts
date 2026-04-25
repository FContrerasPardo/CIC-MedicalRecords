/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActionContext, GovernanceRecord, RecordIdentity } from '../../../../shared/definitions/governance-shared.interface';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BLOCK_EDIT_STATUSES, HxpNotificationService, RecordStatus, RecordStatusType } from '@alfresco/adf-hx-content-services/services';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RecordPropertiesButtonService } from '../../actions/record-properties-button/record-properties-button.service';
import { take } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { UnsavedChangesDialogComponent } from '../../dialogs/unsaved-changes/unsaved-changes-dialog.component';
import { GovernanceRecordService } from '../../services/governance-record.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LegalHoldCaseTagComponent } from '../legal-hold-case-tag/legal-hold-case-tag.component';

@Component({
    selector: 'hxp-record-properties-sidebar',
    templateUrl: './record-properties-sidebar.component.html',
    styleUrl: './record-properties-sidebar.component.scss',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatIconModule,
        MatButtonModule,
        MatTabsModule,
        MatFormFieldModule,
        MatProgressSpinnerModule,
        TranslatePipe,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTooltipModule,
        LegalHoldCaseTagComponent,
    ],
})
export class RecordPropertiesSidebarComponent implements OnInit {
    @Input() actionContext!: ActionContext;
    @Output() closeSidebar = new EventEmitter<void>();

    activeTabIndex = 0;
    initialDate: Date | null = null;
    cutoffDateControl!: FormControl<Date | null>;
    initialRetentionDate: Date | null = null;
    retentionDurationAdjustmentDateControl!: FormControl<Date | null>;

    protected collapsed = false;
    protected editMode = false;
    protected editModeInRetention = false;
    protected isSaving = false;
    protected isEditableRecord = false;

    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly recordPropertiesButtonService = inject(RecordPropertiesButtonService);
    private readonly governanceRecordService = inject(GovernanceRecordService);
    private readonly translate = inject(TranslateService);
    private readonly dialog = inject(MatDialog);

    get record(): GovernanceRecord {
        return this.actionContext.records?.[0];
    }

    get isOnHold(): boolean {
        return this.record?.status === RecordStatus.OnHold;
    }

    get isContentChanged(): boolean {
        const nowVal = this.cutoffDateControl?.value ?? null;
        const initVal = this.initialDate ?? null;
        if (!nowVal && !initVal) {
            return false;
        }
        return (nowVal?.toDateString() ?? null) !== (initVal?.toDateString() ?? null);
    }

    get isRetentionDurationChanged(): boolean {
        const nowVal = this.retentionDurationAdjustmentDateControl?.value ?? null;
        const initVal = this.initialRetentionDate ?? null;
        if (!nowVal && !initVal) {
            return false;
        }
        return (nowVal?.toDateString() ?? null) !== (initVal?.toDateString() ?? null);
    }

    get retentionMinDate(): Date | null {
        const cutoff = this.cutoffDateControl?.value ?? (this.record?.cutOffDate ? new Date(this.record.cutOffDate) : null);

        if (!cutoff) {
            return null;
        }

        const dateOnly = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
        dateOnly.setDate(dateOnly.getDate() + 1);
        return dateOnly;
    }

    ngOnInit(): void {
        if (!this.record) {
            return;
        }

        if (this.actionContext.showPanel && this.record.id && this.record.environmentDataSourceId && this.record.categoryId) {
            this.governanceRecordService
                .getViewRecordProperty(this.record.id, this.record.environmentDataSourceId, this.record.categoryId)
                .pipe(take(1))
                .subscribe({
                    next: () => {},
                    error: () => {},
                });
        }

        this.cutoffDateControl = new FormControl<Date | null>(this.record.cutOffDate ? new Date(this.record.cutOffDate) : null);
        this.initialDate = this.cutoffDateControl.value;

        this.isEditableRecord = !BLOCK_EDIT_STATUSES.includes(this.record.status as RecordStatusType);

        if (this.record?.contentMetadata?.retentionAdjustmentPropertyName) {
            const key = this.record.contentMetadata.retentionAdjustmentPropertyName;
            const indValue = this.record.contentMetadata[key] as string | undefined;
            this.initialRetentionDate = indValue ? new Date(indValue) : null;
            this.retentionDurationAdjustmentDateControl = new FormControl<Date | null>(this.initialRetentionDate);
        }
    }

    toggleCollapse(): void {
        this.collapsed = !this.collapsed;
    }

    toggleEditMode(): void {
        this.editModeInRetention = false;
        this.editMode = true;
    }

    toggleEditModeInRetention(): void {
        this.editMode = false;
        this.editModeInRetention = true;
    }

    cancelEdit(): void {
        if (this.isContentChanged || this.isRetentionDurationChanged) {
            this.openUnsavedChangesDialog();
        } else {
            this.editMode = false;
            this.editModeInRetention = false;
        }
    }

    saveChanges(): void {
        if (!this.record?.id || !this.record.environmentDataSourceId || !this.record.categoryId) {return;}

        this.isSaving = true;

        const payload: RecordIdentity = {
            cutOffDate: this.buildUtcFromSelectedDateWithCurrentTime(this.cutoffDateControl.value),
            environmentDataSourceId: this.record.environmentDataSourceId,
            categoryId: this.record.categoryId,
        };

        this.governanceRecordService
            .editRecord(encodeURIComponent(this.record.id), payload)
            .pipe(take(1))
            .subscribe({
                next: (updatedRecord) => this.handleSuccess(updatedRecord, payload),
                error: () => this.handleError(),
            });
    }

    saveChangesForRetention(): void {
        if (!this.record?.id || !this.record.environmentDataSourceId || !this.record.categoryId) {
            return;
        }

        const key: string | undefined = this.record?.contentMetadata?.retentionAdjustmentPropertyName;
        if (!key) {
            this.hxpNotificationService.showError(this.translate.instant('GOVERNANCE.NOTIFICATIONS.PROPERTY_UPDATE_ERROR'));
            return;
        }

        this.isSaving = true;

        const payload: RecordIdentity & { indefiniteProperty: string; indefiniteValue: string } = {
            environmentDataSourceId: this.record.environmentDataSourceId,
            categoryId: this.record.categoryId,
            indefiniteProperty: key,
            indefiniteValue: this.buildUtcFromSelectedDateWithCurrentTime(this.retentionDurationAdjustmentDateControl.value),
        };

        this.governanceRecordService
            .patchRecord(encodeURIComponent(this.record.id), payload)
            .pipe(take(1))
            .subscribe({
                next: (updatedRecord) => this.handleSuccess(updatedRecord, payload),
                error: () => this.handleError(),
            });
    }

    clearCutoffDate(): void {
        this.cutoffDateControl.setValue(null);
    }

    clearRetentionDate(): void {
        this.retentionDurationAdjustmentDateControl.setValue(null);
    }

    onClose(): void {
        if ((this.editMode && this.isContentChanged) || (this.editModeInRetention && this.isRetentionDurationChanged)) {
            this.openUnsavedChangesDialog();
        } else {
            this.recordPropertiesButtonService.execute({ ...this.actionContext, showPanel: false });
        }
    }

    private openUnsavedChangesDialog(): void {
        const dialogRef = this.dialog.open(UnsavedChangesDialogComponent, { width: '400px' });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.editMode = false;
                this.editModeInRetention = false;
                this.recordPropertiesButtonService.execute({ ...this.actionContext, showPanel: false });
            }
        });
    }

    private handleSuccess(
        updatedRecord: GovernanceRecord,
        payload: RecordIdentity | (RecordIdentity & { indefiniteProperty: string; indefiniteValue: string })
    ): void {
        this.isSaving = false;
        this.editMode = false;
        this.editModeInRetention = false;

        if ('cutOffDate' in (payload as any)) {
            this.record.cutOffDate = (payload as RecordIdentity).cutOffDate;
            this.initialDate = this.cutoffDateControl.value;
            this.governanceRecordService.emitUpdateConfirmed(updatedRecord);
            this.hxpNotificationService.showSuccess(this.translate.instant('GOVERNANCE.NOTIFICATIONS.PROPERTY_UPDATE_SUCCESS'));
        } else if ('indefiniteProperty' in (payload as any)) {
            const current = this.record?.contentMetadata ?? {};
            const indProp: string = (payload as any).indefiniteProperty;
            const indVal: string = (payload as any).indefiniteValue;

            const merged = {
                ...current,
                ...(indProp ? { [indProp]: indVal } : {}),
            };
            (this.record as GovernanceRecord).contentMetadata = merged;

            this.initialRetentionDate = this.retentionDurationAdjustmentDateControl.value;
            this.governanceRecordService.emitPatchConfirmed(updatedRecord);
            this.hxpNotificationService.showSuccess(this.translate.instant('GOVERNANCE.NOTIFICATIONS.RETENTION_ADJUSTMENT_SUCCESS'));
        }
        this.recordPropertiesButtonService.execute({ ...this.actionContext, showPanel: false });
    }

    private handleError(): void {
        this.isSaving = false;
        this.hxpNotificationService.showError(this.translate.instant('GOVERNANCE.NOTIFICATIONS.PROPERTY_UPDATE_ERROR'));
    }

    private buildUtcFromSelectedDateWithCurrentTime(selected: Date | null): string {
        const base = selected ?? new Date();
        const now = new Date();
        const combined = new Date(base);
        combined.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        return combined.toISOString();
    }
}

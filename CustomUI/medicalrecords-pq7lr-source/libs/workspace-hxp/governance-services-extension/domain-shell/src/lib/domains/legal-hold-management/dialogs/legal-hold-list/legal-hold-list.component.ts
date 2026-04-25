/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AssignRecordPayload, LegalHoldInitiatorType } from '../../definitions/legal-hold.interface';
import { LegalHoldInitiator } from '../../definitions/legal-hold.constants';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActionContext, LegalCase } from '../../../../shared/definitions/governance-shared.interface';
import { GovernanceLegalHoldManagementComponent } from '../../legal-hold-management.component';
import { MatIcon } from '@angular/material/icon';
import { take } from 'rxjs';
import { HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { GovernanceLegalRecordService } from '../../services/governance-legal-record.service';

@Component({
    selector: 'hxp-legal-hold-list',
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, TranslatePipe, GovernanceLegalHoldManagementComponent, MatIcon],
    templateUrl: './legal-hold-list.component.html',
    styleUrl: '../../../../shared/dialogs/governance-dialogs.shared.scss',
})
export class LegalHoldListComponent {
    context: ActionContext & { highlightFirstRow?: boolean } = inject(MAT_DIALOG_DATA);
    dialogRef = inject(MatDialogRef<LegalHoldListComponent>);
    selectedLegalCase: LegalCase[] = [];
    isAssigning = false;

    protected readonly clickedFrom: LegalHoldInitiatorType = LegalHoldInitiator.Record;

    private readonly governanceLegalRecordService = inject(GovernanceLegalRecordService);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly translate = inject(TranslateService);

    onSelectedLegalCaseChange(legalCases: LegalCase[]): void {
        this.selectedLegalCase = legalCases;
    }

    addRecordsToLegalCase(): void {
        this.isAssigning = true;

        const payload: AssignRecordPayload = {
            records: this.context.records.map((record) => ({
                edsId: record.environmentDataSourceId,
                categoryId: record.categoryId,
                recordId: record.id,
            })),
            legalCaseIds: this.selectedLegalCase.map((c) => c.legalCaseId),
        };

        this.governanceLegalRecordService
            .assignRecordToLegalCase(payload)
            .pipe(take(1))
            .subscribe({
                next: () => this.handleSuccess(),
                error: () => this.handleError(),
            });
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }

    private handleSuccess(): void {
        this.isAssigning = false;
        this.dialogRef.close();
        this.hxpNotificationService.showSuccess(this.translate.instant('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_ASSIGNMENT_SUCCESS'));
        this.governanceLegalRecordService.emitRecordAssignmentComplete(this.context.records);
    }

    private handleError(): void {
        this.isAssigning = false;
        this.hxpNotificationService.showError(this.translate.instant('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_ASSIGNMENT_ERROR'));
    }
}

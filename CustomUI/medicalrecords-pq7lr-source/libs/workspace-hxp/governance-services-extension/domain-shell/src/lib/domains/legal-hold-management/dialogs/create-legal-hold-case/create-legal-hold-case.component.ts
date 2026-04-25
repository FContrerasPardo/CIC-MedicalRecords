/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { LegalHoldCaseDialogData, LegalHoldCaseIdentity } from '../../definitions/legal-hold.interface';
import { LegalHoldInitiator } from '../../definitions/legal-hold.constants';
import { GovernanceLegalCaseService } from '../../services/governance-legal-case.service';
import { filter, take } from 'rxjs';
import { HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const NON_WHITESPACE_PATTERN = /\S/;

@Component({
    selector: 'hxp-create-legal-hold-case',
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatInputModule, MatProgressSpinnerModule, TranslatePipe, ReactiveFormsModule],
    templateUrl: './create-legal-hold-case.component.html',
    styleUrl: './create-legal-hold-case.component.scss',
})
export class CreateLegalHoldCaseComponent {
    readonly dialogData: LegalHoldCaseDialogData = inject(MAT_DIALOG_DATA);
    readonly dialogRef = inject(MatDialogRef<CreateLegalHoldCaseComponent>);

    protected isProcessing = false;
    existingLegalHoldCase = !!this.dialogData.legalHoldCases && this.dialogData.legalHoldCases.length > 0;

    private readonly governanceLegalCaseService = inject(GovernanceLegalCaseService);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly translate = inject(TranslateService);
    private readonly _fb = inject(FormBuilder);

    constructor() {
        this.dialogRef
            .keydownEvents()
            .pipe(
                filter((e) => e.key === 'Escape'),
                takeUntilDestroyed()
            )
            .subscribe(() => this.performCancelEffects());

        this.dialogRef
            .backdropClick()
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.performCancelEffects());
    }

    readonly legalHoldCaseForm = this._fb.group({
        legal_name: [
            this.dialogData.legalHoldCases?.[0]?.legalCaseName ?? '',
            [Validators.required, Validators.pattern(NON_WHITESPACE_PATTERN), Validators.maxLength(64)],
        ],
        legal_reason: [
            this.dialogData.legalHoldCases?.[0]?.legalCaseReason ?? '',
            [Validators.required, Validators.pattern(NON_WHITESPACE_PATTERN), Validators.maxLength(512)],
        ],
        legal_description: [this.dialogData.legalHoldCases?.[0]?.legalCaseDescription ?? '', [Validators.maxLength(512)]],
    });

    canPerformAction(): boolean {
        return this.existingLegalHoldCase
            ? !this.isProcessing && this.legalHoldCaseForm.valid && !this.legalHoldCaseForm.pristine
            : !this.isProcessing && this.legalHoldCaseForm.valid;
    }

    onCancel(): void {
        this.performCancelEffects();
        this.dialogRef.close();
    }

    onAction(): void {
        if (this.legalHoldCaseForm.valid) {
            this.isProcessing = true;

            if (this.existingLegalHoldCase) {
                this.onEdit();
            } else {
                this.onCreate();
            }
        }
    }

    private onEdit(): void {
        const legalCaseName = this.getTrimmedControlValue('legal_name');
        const legalCaseReason = this.getTrimmedControlValue('legal_reason');
        const legalCaseDescription = this.getTrimmedControlValue('legal_description');

        const legalHoldCase: LegalHoldCaseIdentity = {
            legalCaseId: this.dialogData.legalHoldCases?.[0]?.legalCaseId ?? '',
            legalCaseName,
            legalCaseReason,
            legalCaseDescription,
        };

        this.governanceLegalCaseService
            .editLegalHoldCase(legalHoldCase)
            .pipe(take(1))
            .subscribe({
                next: () => this.handleSuccess(),
                error: (err: HttpErrorResponse) => this.handleError(err),
            });
    }

    private onCreate(): void {
        const legalCaseName = this.getTrimmedControlValue('legal_name');
        const legalCaseReason = this.getTrimmedControlValue('legal_reason');
        const legalCaseDescription = this.getTrimmedControlValue('legal_description');

        const payload: LegalHoldCaseIdentity = {
            legalCaseName,
            legalCaseReason,
            legalCaseDescription,
        };

        this.governanceLegalCaseService
            .createLegalHoldCase(payload)
            .pipe(take(1))
            .subscribe({
                next: () => this.handleSuccess(),
                error: (err: HttpErrorResponse) => this.handleError(err),
            });
    }

    private handleSuccess(): void {
        this.isProcessing = false;
        this.dialogRef.close();
        if (this.existingLegalHoldCase) {
            this.hxpNotificationService.showSuccess(this.translate.instant('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_EDIT_SUCCESS'));
        } else {
            this.hxpNotificationService.showSuccess(this.translate.instant('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_CREATE_SUCCESS'));
        }
        this.governanceLegalCaseService.emitRefreshList();
    }

    private handleError(error?: HttpErrorResponse): void {
        this.isProcessing = false;
        if (error?.status === 409) {
            this.hxpNotificationService.showError(this.translate.instant('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_NAME_EXISTS'));
        } else {
            if (this.existingLegalHoldCase) {
                this.hxpNotificationService.showError(this.translate.instant('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_EDIT_ERROR'));
            } else {
            this.hxpNotificationService.showError(this.translate.instant('GOVERNANCE.NOTIFICATIONS.LEGAL_HOLD_CASE_CREATE_ERROR'));
            }
        }
    }

    private performCancelEffects(): void {
        if (this.dialogData.clickedFrom === LegalHoldInitiator.Record) {
            this.governanceLegalCaseService.emitRefreshList();
        }
    }

    private getTrimmedControlValue(controlName: 'legal_name' | 'legal_reason' | 'legal_description'): string {
        return this.legalHoldCaseForm.get(controlName)?.value?.trim() ?? '';
    }
}

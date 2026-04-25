/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, ValidatorFn, AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogData, TranslationService } from '@alfresco/adf-core';

export interface FilterSaveAsDialogData extends DialogData {
    title: string;
    existingFilterNames?: string[];
    currentFilterName?: string;
}

@Component({
    selector: 'hxp-filter-save-as-dialog',
    templateUrl: './filter-save-as-dialog.component.html',
    styleUrls: ['./filter-save-as-dialog.component.scss'],
    imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule, MatDialogModule, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterSaveAsDialogComponent implements OnInit {
    private readonly translationService = inject(TranslationService);

    readonly dialogRef = inject(MatDialogRef<FilterSaveAsDialogComponent>);
    readonly data = inject<FilterSaveAsDialogData>(MAT_DIALOG_DATA);

    name: string | null = null;
    title: string;

    nameControl = new FormControl<string | null>(null);

    ngOnInit() {
        if (this.data?.title) {
            this.title = this.translationService.instant(this.data.title);
        }

        const validators: ValidatorFn[] = [Validators.required];

        if (this.data?.existingFilterNames && this.data.existingFilterNames.length > 0) {
            validators.push(this.uniqueNameValidator(this.data.existingFilterNames));
        }

        this.nameControl.setValidators(validators);
        this.nameControl.updateValueAndValidity();
    }

    get showDuplicateWarning(): boolean {
        return this.nameControl.hasError('duplicateName') && this.nameControl.dirty;
    }

    private uniqueNameValidator(existingNames: string[]): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }
            const isDuplicate = existingNames.includes(control.value);
            if (isDuplicate) {
                this.nameControl.markAsTouched();
                return { duplicateName: true };
            }

            return null;
        };
    }

    onSave(): void {
        if (this.nameControl.valid) {
            this.dialogRef.close({ name: this.nameControl.value });
        }
    }
}

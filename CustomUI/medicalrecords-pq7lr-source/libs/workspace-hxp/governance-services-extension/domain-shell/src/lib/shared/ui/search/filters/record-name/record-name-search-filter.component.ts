/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecordNameSearchFilterService } from './record-name-search-filter.service';
import { AbstractControl, FormControl, FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchFilterContainerComponent } from '../base/search-filter-container/search-filter-container.component';
import { MatInputModule } from '@angular/material/input';
import { MatError, MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseSearchFilterDirective } from '../base/base-search-filter.directive';
import { RecordNameSearchFilterData } from './record-name-search-filter.data';

@Component({
    selector: 'hxp-record-name-search-filter',
    templateUrl: './record-name-search-filter.component.html',
    styleUrl: './record-name-search-filter.component.scss',
    imports: [
        CommonModule,
        FormsModule,
        MatTooltipModule,
        SearchFilterContainerComponent,
        MatInputModule,
        MatFormFieldModule,
        MatChipsModule,
        MatError,
        TranslatePipe,
    ],
    providers: [RecordNameSearchFilterService],
})
export class RecordNameSearchFilterComponent extends BaseSearchFilterDirective {
    inputValue = '';
    private recordNameSearchFilterService = inject(RecordNameSearchFilterService);

    override clearFilter(): void {
        super.clearFilter();
        this.inputValue = '';
        this.searchFilterContainer.clearChanges();
        this.removeQueryParamsForFilter();
    }

    override clearChanges(): void {
        super.clearChanges();
        this.inputValue = '';
    }

    public toQueryParams(data: RecordNameSearchFilterData): Record<string, string> {
        return this.recordNameSearchFilterService.toQueryParams(data);
    }

    public fromQueryParams(params: Record<string, any>): RecordNameSearchFilterData | undefined {
        return this.recordNameSearchFilterService.fromQueryParams(params);
    }

    protected override getFormControls(): { [key: string]: AbstractControl } {
        return {
            selectedRecordName: new FormControl([]),
        };
    }

    protected get isValid() {
        return this.filterForm.valid;
    }

    protected override overlayClosed(): void {
        super.overlayClosed();
        this.inputValue = this.oldFormValue['selectedRecordName'].length === 0 ? '' : this.oldFormValue['selectedRecordName'];
    }

    protected onEnterKey(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (this.filterForm.pristine || this.filterForm.invalid) {
            return;
        }
        this.applyFilter();
        this.searchFilterContainer.applyChanges();
        this.searchFilterContainer.closeFilterOverlay();
    }

    protected onInputChange(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        this.inputValue = inputElement.value;

        if (this.inputValue === '') {
            this.filterForm.markAsPristine();
            return;
        }

        this.filterForm.get('selectedRecordName')?.setErrors(null);
        this.filterForm.markAsDirty();
        this.setSelectedValue();
    }

    protected setSelectedValue(): void {
        if (this.filterForm.valid) {
            this.filterForm?.patchValue({
                selectedRecordName: this.inputValue,
            });

            const selectedValues = [{ label: this.inputValue, value: this.inputValue }];
            this.selectedValue = new RecordNameSearchFilterData(selectedValues);
        }
    }

    protected override getQueryParamKeys(): string[] {
        return [this.recordNameSearchFilterService.QUERY_PARAM];
    }
}

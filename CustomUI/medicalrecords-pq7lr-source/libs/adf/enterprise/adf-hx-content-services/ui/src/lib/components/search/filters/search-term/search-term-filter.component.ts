/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { SearchTermFormType } from './search-term-filter.type';
import { SearchTermFilterData } from './search-term-filter.data';
import { SearchTermFilterService } from './search-term-filter.service';
import { SearchType, FilterId } from '@alfresco/adf-hx-content-services/services';
import { BaseSearchFilterDirective } from '../../directives/base-search-filter.directive';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'hxp-search-term-filter',
    templateUrl: './search-term-filter.component.html',
    styleUrls: ['./search-term-filter.component.scss'],
    imports: [CommonModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, TranslatePipe],
    providers: [SearchTermFilterService],
})
export class SearchTermFilterComponent extends BaseSearchFilterDirective<SearchTermFormType> implements OnChanges {
    @Input() searchType: SearchType = SearchType.BASIC;

    @Input() searchTerm = '';

    @Output() searchTermChanged: EventEmitter<string> = new EventEmitter();

    protected readonly SearchTypeEnum = SearchType;
    protected errorStateMatcher = new ShowOnDirtyErrorStateMatcher();
    private readonly searchTermFilterService = inject(SearchTermFilterService);

    ngOnChanges(): void {
        this.filterForm.get('type')?.setValue(this.searchType);
        this.filterForm.get('query')?.setValue(this.searchTerm);
    }

    public get id(): FilterId {
        return 'SearchTermFilterComponent';
    }

    public toHXQL(data: SearchTermFilterData): string {
        return this.searchTermFilterService.toHXQL(data);
    }

    public onInput(): void {
        this.selectedValue = new SearchTermFilterData([
            {
                label: 'Search term',
                term: this.filterForm.get('query')?.value,
                type: this.filterForm.get('type')?.value,
            },
        ]);

        this.applyChanges();
        this.emitSearchTermChanged();
    }

    public onClear(): void {
        this.filterForm.get('query')?.setValue('');
        this.clearFilter();
        this.emitSearchTermChanged();
    }

    public onSearch(event?: Event): void {
        // Stops textarea from adding a newline on 'enter' button
        if (event) {
            event.preventDefault();
        }

        if (this.filterForm.invalid) {
            return;
        }

        this.applyFilter();
    }

    protected getFormControls(): { [key: string]: AbstractControl } {
        return {
            type: new FormControl<SearchType>(SearchType.BASIC, {
                nonNullable: true,
            }),
            query: new FormControl('', {
                validators: Validators.required,
            }),
        };
    }

    protected setData(data: SearchTermFilterData): void {
        if (!data?.values?.length) {
            return;
        }

        try {
            this.filterForm.setValue({
                type: data.values[0].type ?? SearchType.BASIC,
                query: data.values[0].term ?? '',
            });

            if (data.values[0].term) {
                this.selectedValue = data;
            }
        } catch (error) {
            console.error('Error while setting data for Search Term filter', error);
        }
    }

    private emitSearchTermChanged(): void {
        this.searchTermChanged.emit(this.filterForm.get('query')?.value.trim());
    }
}

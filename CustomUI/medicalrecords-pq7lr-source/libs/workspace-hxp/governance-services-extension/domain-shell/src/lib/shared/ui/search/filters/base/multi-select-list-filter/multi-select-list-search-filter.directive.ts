/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectorRef, Directive, OnInit, inject, ViewChild, Input } from '@angular/core';
import { AbstractControl, FormControl } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { BehaviorSubject, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseSearchFilterDirective } from '../base-search-filter.directive';
import { MultiSelectListFilterFormType } from './multi-select-list-filter-form.type';
import { MultiSelectListSearchFilterData, MultiSelectListSearchFilterValue } from './multi-select-list-search-filter.data';
import { SearchFilterInputComponent } from '../search-filter-input/search-filter-input.component';

@Directive()
export abstract class MultiSelectListSearchFilterBase<T extends MultiSelectListSearchFilterValue = MultiSelectListSearchFilterValue>
    extends BaseSearchFilterDirective<MultiSelectListFilterFormType>
    implements OnInit {
    @Input() filterLabelKey = '';

    protected showSearchInput = true;
    protected showSummaryChips = true;
    protected isLoading = false;
    protected options: T[] = [];
    protected filteredOptions: T[] = [];
    protected searchTerm = '';
    protected selection = new SelectionModel<MultiSelectListSearchFilterValue>(true, []);

    @ViewChild(SearchFilterInputComponent) protected searchFilterComponent?: SearchFilterInputComponent;

    private search$ = new BehaviorSubject<string>('');
    private readySubject = new BehaviorSubject<boolean>(false);
    public override ready$ = this.readySubject.asObservable();

    private changeDetectorRef = inject(ChangeDetectorRef);

    ngOnInit(): void {
        this.isLoading = true;
        this.loadOptions()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((list) => {
                this.options = this.filteredOptions = list;
                this.isLoading = false;
                this.changeDetectorRef.markForCheck();
                this.readySubject.next(true);

                if (this.selectedValue?.values?.length) {
                    this.initializeSelectionFromQueryParams();
                }
            });

        this.search$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((term) => this.applyClientFilter(term));
    }

    override clearFilter(): void {
        super.clearFilter();
        this.searchFilterComponent?.clearInput();
        this.selection.clear();
        this.searchFilterContainer.clearChanges();

        this.removeQueryParamsForFilter();
    }

    override applyFilter(): void {
        if (this.selection.selected.length === 0 && this.selectedValue?.values?.length) {
            this.initializeSelectionFromQueryParams();
        }

        if (this.selection.selected.length === 0 && !this.selectedValue) {
            return this.clearFilter();
        }

        super.applyFilter();
        this.clearSearch();
    }

    override overlayClosed(): void {
        this.selection.clear();
        if (this.oldFormValue.selectedValues.length > 0) {
            for (const selectedValue of this.oldFormValue.selectedValues) {
                this.selection.select(selectedValue);
            }
        }

        this.discardPendingChanges();
        this.clearSearch();
    }

    /**
     * Override this method to provide the options for the multi-select filter.
     */
    protected abstract loadOptions(): Observable<T[]>;

    protected getFormControls(): { [key: string]: AbstractControl } {
        return { selectedValues: new FormControl([]) };
    }

    protected onSearch(term: string): void {
        this.searchTerm = term;
        this.search$.next(term.toLowerCase());
    }

    protected onSelectionChange(value: MultiSelectListSearchFilterValue): void {
        this.selection.toggle(value);
        this.setSelectedValue();
    }

    protected onDeselect(value: MultiSelectListSearchFilterValue): void {
        this.selection.deselect(value);
        this.setSelectedValue();
    }

    protected clearSearch(): void {
        this.clearInput();
        this.searchFilterComponent?.clearInput();
    }

    protected clearInput(): void {
        this.searchTerm = '';
        this.filteredOptions = this.options;
        this.changeDetectorRef.markForCheck();
    }

    protected initializeSelectionFromQueryParams(): void {
        if (!(this.selectedValue instanceof MultiSelectListSearchFilterData) || this.selectedValue.values.length === 0) {
            return;
        }

        this.selection.clear();

        const optionsMap = new Map(this.options.map((opt) => [opt.value, opt]));
        const selected: T[] = this.selectedValue.values.map((val) => optionsMap.get(val.value) ?? ({ ...val } as T)).filter(Boolean);

        this.selection.select(...selected);
        this.filterForm.patchValue({ selectedValues: this.selection.selected });
        this.oldFormValue = { ...this.filterForm.value };

        this.syncSelectedLabelsWithOptions();

        if (this.searchFilterContainer) {
            this.searchFilterContainer.selectedValue = this.selectedValue;
            this.searchFilterContainer.applyChanges();
        }

        this.changeDetectorRef.detectChanges();
    }

    protected setSelectedValue(): void {
        this.filterForm.patchValue({
            selectedValues: this.selection.selected,
        });

        if (this.selection.selected.length === 0) {
            this.selectedValue = undefined;
            return;
        }

        const selectedValues =
            this.selection.selected.length === 0
                ? undefined
                : this.selection.selected.map((sel) => ({
                      ...sel,
                  }));

        this.selectedValue = new MultiSelectListSearchFilterData(selectedValues);
    }

    private syncSelectedLabelsWithOptions(): void {
        const optionsMap = new Map(this.options.map((o) => [o.value, o]));
        const updatedSelection = this.selection.selected.map((sel) => optionsMap.get(sel.value) ?? sel);

        this.selection.clear();
        this.selection.select(...updatedSelection);
        this.filterForm.patchValue({ selectedValues: this.selection.selected });

        this.selectedValue = new MultiSelectListSearchFilterData(this.selection.selected.map((sel) => ({ ...sel })));

        this.changeDetectorRef.markForCheck();
    }

    private applyClientFilter(term: string): void {
        this.filteredOptions = this.options.filter(
            (option) => option.label.toLowerCase().includes(term) || option.tooltip?.toLowerCase().includes(term)
        );
        this.changeDetectorRef.markForCheck();
    }
}

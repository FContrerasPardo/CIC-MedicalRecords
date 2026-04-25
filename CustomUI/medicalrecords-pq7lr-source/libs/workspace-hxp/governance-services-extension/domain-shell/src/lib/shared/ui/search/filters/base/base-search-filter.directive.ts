/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DestroyRef, Directive, EventEmitter, HostBinding, HostListener, inject, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { of, Observable } from 'rxjs';
import { SearchFilterData } from '../../models/search-filter.data';
import { AbstractControl, FormGroup } from '@angular/forms';
import { BaseFilterFormType } from '../../models/base-search-filter-form.type';
import { SearchFilterContainerComponent } from './search-filter-container/search-filter-container.component';
import { SearchFilterValueService } from './search-filter-value.service';
import { BaseSearchFilter } from '../../models/search-filter.interface';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Directive()
export abstract class BaseSearchFilterDirective<T = BaseFilterFormType> implements BaseSearchFilter, OnDestroy {
    @HostBinding('attr.tabindex') hostTabIndex = -1;

    @HostListener('focus')
    onHostFocus(): void {
        this.searchFilterContainer?.focusChip();
    }

    @Input()
    selectedValue?: SearchFilterData;

    @Output()
    filterCleared: EventEmitter<void> = new EventEmitter();

    @Output()
    filterApplied: EventEmitter<SearchFilterData | undefined> = new EventEmitter();

    @ViewChild('searchFilter')
    protected searchFilterContainer!: SearchFilterContainerComponent;

    protected filterForm: FormGroup;
    protected oldFormValue: T;
    protected initialFormValue: T;

    private readonly router = inject(Router);
    private isRegistered = false;

    value?: SearchFilterData;

    [key: string]: any;

    protected searchFilterValueService = inject(SearchFilterValueService);
    protected destroyRef = inject(DestroyRef);
    protected translateService = inject(TranslateService);

    constructor() {
        this.filterForm = new FormGroup(this.getFormControls());
        this.initialFormValue = { ...this.filterForm.value };
        this.oldFormValue = { ...this.filterForm.value };

        queueMicrotask(() => {
            if (!this.isRegistered) {
                this.searchFilterValueService.registerFilter(this);
                this.isRegistered = true;
            }
        });
    }

    // Default ready$ for synchronous filters
    public ready$: Observable<boolean> = of(true);

    ngOnDestroy(): void {
        if (this.isRegistered) {
            this.searchFilterValueService.unregisterFilter(this);
            this.isRegistered = false;
        }
    }

    clearFilter(): void {
        this.clearChanges();
        this.filterCleared.emit();
        this.searchFilterValueService.filterReset$.next(this as BaseSearchFilterDirective);
        this.clearForm();
    }

    applyFilter(): void {
        this.applyChanges();
        this.filterApplied.emit(this.value);
        this.searchFilterValueService.filterApplied$.next({
            filter: this,
            value: this.value as SearchFilterData,
        });
    }

    applyChanges(): void {
        this.value = this.selectedValue;
        this.oldFormValue = { ...this.filterForm.value };
    }

    clearChanges(): void {
        this.selectedValue = undefined;
        this.value = undefined;
        this.clearForm();
    }

    /**
     * A change is pending if the currently selected value is different from the value already applied.
     */
    hasPendingChanges(): boolean {
        return this.oldFormValue !== this.filterForm.value || this.value !== this.selectedValue;
    }

    /**
     * Discards pending changes by resetting the selected value to the applied value.
     */
    discardPendingChanges(): void {
        this.selectedValue = this.value;
        this.filterForm.setValue({ ...(this.oldFormValue as SearchFilterData) });
    }

    protected clearForm(): void {
        this.filterForm.reset({ ...this.initialFormValue });
        this.oldFormValue = { ...this.initialFormValue };
    }

    /**
     * Called when the overlay is closed.
     * Discards any pending changes, because neither clear and filter actions were applied.
     */
    protected overlayClosed(): void {
        this.discardPendingChanges();
    }

    /**
     * Filters extending this class should implement this method to provide the necessary form controls.
     */
    protected abstract getFormControls(): { [key: string]: AbstractControl };

    /**
     * Subclass overrides this to tell which query params it uses.
     */
    protected getQueryParamKeys(): string[] {
        return [];
    }

    protected removeQueryParamsForFilter(): void {
        const paramsToRemove = this.getQueryParamKeys();
        if (!paramsToRemove?.length) {
            return;
        }

        const currentUrlTree = this.router.parseUrl(this.router.url);
        const currentParams = { ...currentUrlTree.queryParams };
        for (const key of paramsToRemove) {
            delete currentParams[key];
        }

        void this.router.navigate([], {
            queryParams: currentParams,
            queryParamsHandling: '',
            replaceUrl: true,
        });
    }

    abstract toQueryParams(data: SearchFilterData): Record<string, any>;

    abstract fromQueryParams(params: Record<string, any>): SearchFilterData | undefined;
}

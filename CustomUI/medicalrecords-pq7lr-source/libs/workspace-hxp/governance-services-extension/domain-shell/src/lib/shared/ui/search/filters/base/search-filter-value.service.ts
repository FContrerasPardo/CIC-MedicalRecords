/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { Subject, Subscription, ReplaySubject } from 'rxjs';
import { BaseSearchFilter } from '../../models/search-filter.interface';
import { SearchFilterData } from '../../models/search-filter.data';

interface AppliedFilterData {
    filter: BaseSearchFilter;
    value: SearchFilterData;
}

@Injectable({
    providedIn: 'root',
})
export class SearchFilterValueService {
    public filterReset$ = new Subject<BaseSearchFilter>();
    public filterApplied$ = new Subject<AppliedFilterData>();

    protected filterValuesByType = new Map<BaseSearchFilter, SearchFilterData>();
    private filterReadyState = new Map<BaseSearchFilter, boolean>();
    private filterSubscriptions = new Map<BaseSearchFilter, Subscription>();
    private allReadySubject = new ReplaySubject<boolean>(1);
    public allReady$ = this.allReadySubject.asObservable();
    private filterCountSubject = new ReplaySubject<number>(1);
    public filterCount$ = this.filterCountSubject.asObservable();

    constructor() {
        // Initialize subjects with default values to ensure subscribers always receive an initial value
        this.allReadySubject.next(false);
        this.filterCountSubject.next(0);

        this.filterApplied$.subscribe({
            next: (filterApplied) => this.filterValuesByType.set(filterApplied.filter, filterApplied.value),
        });

        this.filterReset$.subscribe({
            next: (filterToReset) => this.filterValuesByType.delete(filterToReset),
        });
    }

    public emptyFilters(): void {
        this.filterValuesByType.clear();
    }

    public clearFilters(): void {
        for (const appliedFilter of this.filterValuesByType.keys()) {
            appliedFilter.clearFilter();
        }
        this.filterValuesByType.clear();
    }

    public clearFilter(filter: BaseSearchFilter): void {
        filter.clearFilter();
        this.filterValuesByType.delete(filter);
    }

    public hasFilters(): boolean {
        return this.filterValuesByType.size > 0;
    }

    public registerFilter(filter: BaseSearchFilter): void {
        // Check if this specific filter instance has already been registered
        if (this.filterReadyState.has(filter)) {
            return;
        }

        if (!this.filterValuesByType.has(filter)) {
            const initialValue = filter.selectedValue ?? undefined;
            this.filterValuesByType.set(filter, initialValue as any);
        }

        const ready$ = (filter as { ready$?: { subscribe?: (...args: any[]) => any } }).ready$;

        const markReady = () => {
            this.filterReadyState.set(filter, true);
            this.recomputeAllReady();
        };

        if (ready$ && typeof ready$?.subscribe === 'function') {
            this.filterReadyState.set(filter, false);

            const subscription = ready$.subscribe({
                next: (isReady: boolean) => {
                    if (isReady) {
                        markReady();
                    }
                },
                error: () => {
                    markReady();
                },
            });
            this.filterSubscriptions.set(filter, subscription);
        } else {
            markReady();
        }
    }

    public unregisterFilter(filter: BaseSearchFilter): void {
        if (this.filterReadyState.has(filter)) {
            this.cleanupFilter(filter);
            this.recomputeAllReady();
        }
    }

    private cleanupFilter(filter: BaseSearchFilter): void {
        this.filterValuesByType.delete(filter);
        this.filterReadyState.delete(filter);
        const subscription = this.filterSubscriptions.get(filter);
        if (subscription) {
            subscription.unsubscribe();
            this.filterSubscriptions.delete(filter);
        }
    }

    public toQueryParams() {
        const appliedFilters = [...this.filterValuesByType.entries()];
        let query = {};
        for (const [filter, filterData] of appliedFilters) {
            query = { ...query, ...filter.toQueryParams(filterData) };
        }
        return query;
    }

    public initFiltersFromQueryParams(params: Record<string, any>) {
        for (const filter of this.filterValuesByType.keys()) {
            const data = filter.fromQueryParams(params);
            if (data) {
                filter.selectedValue = data;
                filter.applyFilter();
            }
        }
    }

    public clearAllFilters(): void {
        for (const subscription of this.filterSubscriptions.values()) {
            subscription.unsubscribe();
        }
        this.filterSubscriptions.clear();
        this.filterValuesByType.clear();
        this.filterReadyState.clear();
        this.allReadySubject.next(false);
        this.filterCountSubject.next(0);
    }

    private recomputeAllReady(): void {
        const hasFilters = this.filterReadyState.size > 0;
        const allReady = hasFilters && [...this.filterReadyState.values()].every(Boolean);
        this.allReadySubject.next(allReady);
        this.filterCountSubject.next(this.filterReadyState.size);
    }
}

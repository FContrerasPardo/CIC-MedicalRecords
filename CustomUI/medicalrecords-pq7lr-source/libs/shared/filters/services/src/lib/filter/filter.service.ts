/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Filter } from './filter.model';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { filter, map, share, switchMap, take } from 'rxjs/operators';
import { cloneDeep } from 'es-toolkit/compat';
import { TranslateService } from '@ngx-translate/core';
import { isProcessVariableFilter } from './utils';

@Injectable()
export class FilterService {
    private readonly translateService = inject(TranslateService);

    // stores the filters set in setFilters or resetFilters
    private originalFilters: Filter[] = [];
    // stores the filters set in update
    private mostRecentFilters: Filter[] = [];

    private filtersSubject$ = new BehaviorSubject<Filter[]>([]);

    // indicates if the filters have been changed from their original state
    filtersDirty$ = this.filtersSubject$.pipe(
        map((currentFilters) => {
            return currentFilters.some((currentFilter) => {
                const originalFilter = this.originalFilters.find((f) => f.name === currentFilter.name);
                if (!originalFilter) {
                    throw new Error(`Filter ${currentFilter.name} not found in original filters`);
                }
                return !originalFilter.isValueEqualTo(currentFilter);
            });
        })
    );

    // indicates if the filter values have been changed from their most recent state
    filterValuesChanged$ = this.filtersSubject$.pipe(
        map((currentFilters) => {
            const areFiltersUpdated = currentFilters.some((currentFilter) => {
                const mostRecentFilter = this.mostRecentFilters.find((f) => f.name === currentFilter.name);
                if (!mostRecentFilter) {
                    throw new Error(`Filter ${currentFilter.name} not found in mostRecent filters`);
                }
                return !mostRecentFilter.isValueEqualTo(currentFilter);
            });
            this.mostRecentFilters = cloneDeep(currentFilters);
            return areFiltersUpdated;
        })
    );

    getAllFilters(): Observable<Filter[]> {
        return merge(this.filtersSubject$, this.translateService.onLangChange.pipe(switchMap(() => this.filtersSubject$.pipe(take(1))))).pipe(
            filter((filters) => !!filters?.length),
            map((filters) => this.sortFilters(filters)),
            share()
        );
    }

    setFilters(filters: Filter[]): void {
        this.originalFilters = cloneDeep(filters);
        this.mostRecentFilters = cloneDeep(filters);
        this.filtersSubject$.next(filters);
    }

    resetFilters(): void {
        this.filtersSubject$.next(cloneDeep(this.originalFilters));
    }

    updateFilter(updatedFilter: Filter): void {
        if (!updatedFilter.visible) {
            updatedFilter.value = null;
        }

        this.filtersSubject$.pipe(take(1)).subscribe((previousFilters) => {
            const updatedFilters = previousFilters.map((previousFilter) => {
                return previousFilter.name === updatedFilter.name ? updatedFilter : previousFilter;
            });

            this.filtersSubject$.next(updatedFilters);
        });
    }

    /**
     * Sorts an array of filters based on specific criteria.
     *
     * The sorting strategy is as follows:
     * 1. Split filters into two groups: normal filters and process variable (custom) filters.
     * 2. Sort each group independently.
     * 3. Merge: normal filters first, then custom filters.
     *
     * Normal filters sorting:
     * - Filters with priority are sorted by priority value (lower = first, higher = later).
     * - If two filters have the same priority, they are sorted alphabetically by translated label.
     * - Filters with priority come before filters without priority.
     * - For filters without priority:
     *   a. Visible filters before hidden filters.
     *   b. Mandatory filters (allowEmpty: false) before optional (allowEmpty: true).
     *   c. Alphabetically by translated label.
     *
     * Custom filters sorting:
     * - Visible (selected) filters before hidden filters.
     * - Alphabetically by translated label.
     *
     * @param filters - The array of filters to be sorted.
     * @returns The sorted array of filters.
     */
    sortFilters(filters: Filter[]): Filter[] {
        const normalFilters = filters.filter((f) => !isProcessVariableFilter(f));
        const customFilters = filters.filter((f) => isProcessVariableFilter(f));

        const sortedNormalFilters = this.sortNormalFilters(normalFilters);
        const sortedCustomFilters = this.sortCustomFilters(customFilters);

        return [...sortedNormalFilters, ...sortedCustomFilters];
    }

    private sortNormalFilters(filters: Filter[]): Filter[] {
        return filters.sort((a, b) => {
            const hasPriorityA = a.priority !== undefined;
            const hasPriorityB = b.priority !== undefined;

            if (hasPriorityA && hasPriorityB) {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }

                const samePriorityLabelA = this.translateService.instant(a.translationKey);
                const samePriorityLabelB = this.translateService.instant(b.translationKey);
                return samePriorityLabelA.localeCompare(samePriorityLabelB);
            }

            if (hasPriorityA) {
                return -1;
            }
            if (hasPriorityB) {
                return 1;
            }

            if (a.visible && !b.visible) {
                return -1;
            }
            if (!a.visible && b.visible) {
                return 1;
            }

            if (!a.allowEmpty && b.allowEmpty) {
                return -1;
            }
            if (a.allowEmpty && !b.allowEmpty) {
                return 1;
            }

            const labelA = this.translateService.instant(a.translationKey);
            const labelB = this.translateService.instant(b.translationKey);
            return labelA.localeCompare(labelB);
        });
    }

    private sortCustomFilters(filters: Filter[]): Filter[] {
        return filters.sort((a, b) => {
            if (a.visible && !b.visible) {
                return -1;
            }
            if (!a.visible && b.visible) {
                return 1;
            }

            const labelA = this.translateService.instant(a.translationKey);
            const labelB = this.translateService.instant(b.translationKey);
            return labelA.localeCompare(labelB);
        });
    }
}

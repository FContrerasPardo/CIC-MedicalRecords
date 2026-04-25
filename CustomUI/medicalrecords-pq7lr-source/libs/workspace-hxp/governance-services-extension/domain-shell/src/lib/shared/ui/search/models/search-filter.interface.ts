/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { EventEmitter } from '@angular/core';
import { SearchFilterData } from './search-filter.data';

export interface BaseSearchFilter {
    selectedValue?: SearchFilterData;
    filterCleared: EventEmitter<void>;
    filterApplied: EventEmitter<SearchFilterData | undefined>;
    value?: SearchFilterData;

    clearFilter(): void;
    applyFilter(): void;
    applyChanges(): void;
    clearChanges(): void;

    /**
     * A change is pending if the currently selected value is different from the value already applied.
     */
    hasPendingChanges(): boolean;

    /**
     * Discards pending changes by resetting the selected value to the applied value.
     */
    discardPendingChanges(): void;

    /**
     * Converts the provided data value to a string compatible with Governance API
     */
    toQueryParams(data: SearchFilterData): Record<string, any>;

    /*
     * Initializes filter state from query params.
     */
    fromQueryParams(params: Record<string, any>): SearchFilterData | undefined;
}

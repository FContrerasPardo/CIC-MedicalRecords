/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { SearchFilterData, SearchFilterValue } from './search-filter.data';

export class MockSearchFilterValue implements SearchFilterValue {
    label = '';
    value = '';
}

const compareFn = (a: MockSearchFilterValue, b: MockSearchFilterValue) => a.value.localeCompare(b.value);

export class MockSearchFilterData implements SearchFilterData {
    values: MockSearchFilterValue[] = [];

    constructor(values: MockSearchFilterValue[] = []) {
        this.values = values;
    }

    isEquivalentTo(data?: MockSearchFilterData): boolean {
        if (!data || this.values.length !== data.values.length) {
            return false;
        }

        const sortedValues = this.values.sort(compareFn);
        const sortedDataValues = data.values.sort(compareFn);

        for (const [i, sortedValue] of sortedValues.entries()) {
            if (sortedValue.value !== sortedDataValues[i].value) {
                return false;
            }
        }

        return true;
    }
}

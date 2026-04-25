/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { MultiSelectListSearchFilterData, MultiSelectListSearchFilterValue } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';

type LegalCaseFilterOption = MultiSelectListSearchFilterValue | { id: string; category: string };

@Injectable({
    providedIn: 'root',
})
export class LegalCaseNameSearchFilterService {
    public readonly QUERY_PARAM = 'legalCaseName';

    toQueryParams(data: MultiSelectListSearchFilterData): Record<string, string[]> | Record<string, never> {
        if (!data?.values?.length) {
            return {};
        }

        return {
            [this.QUERY_PARAM]: data.values.map((item) => item.value),
        };
    }

    fromQueryParams(params: Record<string, unknown>, allLegalCases: LegalCaseFilterOption[]): MultiSelectListSearchFilterData | undefined {
        const legalCaseName = params[this.QUERY_PARAM];
        const values = this.parseQueryParamValues(legalCaseName);
        if (values.length === 0) {
            return undefined;
        }

        const normalizedOptions = this.normalizeOptions(allLegalCases);
        const selected = normalizedOptions.filter((opt) => values.includes(opt.value));

        return selected.length > 0 ? new MultiSelectListSearchFilterData(selected) : undefined;
    }

    private parseQueryParamValues(value: unknown): string[] {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        if (Array.isArray(value)) {
            return value
                .filter((item): item is string => typeof item === 'string')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return [];
    }

    private normalizeOptions(options: LegalCaseFilterOption[]): MultiSelectListSearchFilterValue[] {
        return options
            .map((option) => {
                if (this.hasLabelAndValue(option)) {
                    return { label: option.label, value: option.value };
                }

                if (this.hasIdAndCategory(option)) {
                    return { label: option.category, value: option.id };
                }

                return null;
            })
            .filter((option): option is MultiSelectListSearchFilterValue => option !== null);
    }

    private hasLabelAndValue(option: LegalCaseFilterOption): option is MultiSelectListSearchFilterValue {
        return typeof (option as MultiSelectListSearchFilterValue).label === 'string' && typeof (option as MultiSelectListSearchFilterValue).value === 'string';
    }

    private hasIdAndCategory(option: LegalCaseFilterOption): option is { id: string; category: string } {
        return typeof (option as { id: string; category: string }).id === 'string' && typeof (option as { id: string; category: string }).category === 'string';
    }
}

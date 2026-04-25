/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateSearchFilterBase } from './date-search-filter.directive';
import { SearchFilterData } from '../../../models/search-filter.data';
import { DateSearchFilterValue } from './date-search-filter.data';

export abstract class DateSearchGenericFilterBase<
    TService extends {
        toQueryParams(data: SearchFilterData): any;
        fromQueryParams(params: any): SearchFilterData | undefined;
        QUERY_PARAM: string[];
    },
> extends DateSearchFilterBase {
    constructor(protected labelKey: string) {
        super();
        this.filterLabelKey = labelKey;
    }

    protected abstract getService(): TService;

    toQueryParams(data: SearchFilterData): Record<string, any> {
        return this.getService().toQueryParams(data);
    }

    fromQueryParams(params: Record<string, any>): SearchFilterData | undefined {
        const data = this.getService().fromQueryParams(params);
        if (!data) {
            return undefined;
        }

        const value = data.values[0] as DateSearchFilterValue;

        if (value.afterDate || value.beforeDate) {
            this.filterForm.patchValue({
                isCustomDate: true,
                afterDate: value.afterDate ?? null,
                beforeDate: value.beforeDate ?? null,
                defaultOption: null,
            });
            this.updateCustomDateSelectedValue?.();
            return this.selectedValue;
        } else if (value.date) {
            this.filterForm.patchValue({
                isCustomDate: false,
                afterDate: null,
                beforeDate: null,
                defaultOption: data,
            });
            return data;
        }
        return undefined;
    }

    protected override getQueryParamKeys(): string[] {
        return this.getService().QUERY_PARAM;
    }
}

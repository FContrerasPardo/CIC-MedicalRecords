/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { STATUS_OPTIONS } from './status-options.data';

@Injectable({
    providedIn: 'root',
})
export class StatusSearchFilterService {
    public readonly QUERY_PARAM = 'status';

    getStatuses(): { label: string; value: string }[] {
        return STATUS_OPTIONS.map((option) => ({ label: option.label, value: option.value }));
    }

    toQueryParams(data: MultiSelectListSearchFilterData): any {
        if (!data?.values?.length) {
            return {};
        }
        return {
            [this.QUERY_PARAM]: data.values.map((item) => item.value),
        };
    }

    fromQueryParams(params: Record<string, any>): MultiSelectListSearchFilterData | undefined {
        const status = params[this.QUERY_PARAM];
        if (!status) {
            return undefined;
        }

        const values = Array.isArray(status) ? status : (typeof status === 'string' ? status.split(',') : []);

        const allStatuses = this.getStatuses();
        const selected = allStatuses.filter((opt) => values.includes(opt.value));

        return selected.length > 0 ? new MultiSelectListSearchFilterData(selected) : undefined;
    }
}

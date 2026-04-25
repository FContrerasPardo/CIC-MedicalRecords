/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
    MultiSelectListSearchFilterData,
    MultiSelectListSearchFilterValue,
} from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { GovernanceUserService } from '../../../../config/governance-user.service';

@Injectable({
    providedIn: 'root',
})
export class ModifierSearchFilterService {
    private userService = inject(GovernanceUserService);
    private loadedOptions: MultiSelectListSearchFilterValue[] = [];

    public readonly QUERY_PARAM = 'modifier';

    getModifiers(): Observable<{ label: string; value: string; id: string }[]> {
        return this.userService.getUsers().pipe(
            map((users) => {
                const dataSources = users.map((user) => ({
                    label: user.username,
                    value: user.id,
                    id: user.id,
                }));
                this.loadedOptions = dataSources;
                return dataSources;
            })
        );
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
        const valuesParam = params[this.QUERY_PARAM];
        if (!valuesParam) {
            return undefined;
        }

        const values = Array.isArray(valuesParam) ? valuesParam : (typeof valuesParam === 'string' ? valuesParam.split(',') : []);

        if (values.length === 0) {
            return undefined;
        }

        const selected: MultiSelectListSearchFilterValue[] = this.loadedOptions.filter((opt) => values.includes(opt.value));

        return selected.length > 0 ? new MultiSelectListSearchFilterData(selected) : undefined;
    }
}

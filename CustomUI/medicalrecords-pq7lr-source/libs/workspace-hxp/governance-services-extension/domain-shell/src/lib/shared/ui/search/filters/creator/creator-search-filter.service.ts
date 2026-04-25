/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { GovernanceUserService } from '../../../../config/governance-user.service';

@Injectable({
    providedIn: 'root',
})
export class CreatorSearchFilterService {
    private userService = inject(GovernanceUserService);

    public readonly QUERY_PARAM = 'creator';

    getCreators(): Observable<{ label: string; value: string; id: string }[]> {
        return this.userService.getUsers().pipe(
            map((users) => {
                return users.map((user) => ({
                    label: user.username,
                    value: user.id,
                    id: user.id,
                }));
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

    fromQueryParams(params: Record<string, any>): any {
        void params;
        return undefined;
    }
}

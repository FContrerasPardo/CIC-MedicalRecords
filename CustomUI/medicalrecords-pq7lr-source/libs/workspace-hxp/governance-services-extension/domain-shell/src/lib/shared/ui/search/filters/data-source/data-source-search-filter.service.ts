/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { GovernanceConfigurationService } from '../../../../config/governance-config.service';
import { DataSource } from '../../../../config/governance-config.type';

@Injectable({
    providedIn: 'root',
})
export class DataSourceSearchFilterService {
    public readonly QUERY_PARAM = 'eds';

    private configService = inject(GovernanceConfigurationService);

    getDataSources(): Observable<{ label: string; value: string; icon?: string }[]> {
        return this.configService.getConfig().pipe(
            map((config) => {
                const dataSources = config.dataSources.map((dataSource: DataSource) => ({
                    label: dataSource.name,
                    value: dataSource.id,
                    icon: 'cloud',
                }));
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

        // Create placeholder values with empty labels (will be synced when options load)
        const placeholderValues = values.map((id) => ({
            label: '',
            value: id,
            icon: 'internal_repository',
        }));

        return new MultiSelectListSearchFilterData(placeholderValues);
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { SearchFilterService } from '../../models/search-filter-service.interface';
import { RecordNameSearchFilterData } from './record-name-search-filter.data';

@Injectable()
export class RecordNameSearchFilterService implements SearchFilterService {
    public readonly QUERY_PARAM = 'fileName';

    public toQueryParams(data: RecordNameSearchFilterData): Record<string, string> {
        return data?.values?.length ? { [this.QUERY_PARAM]: data.values[0].value } : {};
    }

    public fromQueryParams(params: Record<string, any>): RecordNameSearchFilterData | undefined {
        const value = params[this.QUERY_PARAM];

        return value ? new RecordNameSearchFilterData([{ label: value, value }]) : undefined;
    }
}

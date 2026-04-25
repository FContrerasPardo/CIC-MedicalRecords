/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { SearchFilterService } from '../../models/search-filter-service.interface';
import { ContentIdSearchFilterData } from './content-id-search-filter.data';

@Injectable()
export class ContentIdSearchFilterService implements SearchFilterService {
    public readonly QUERY_PARAM = 'contentId';

    public toQueryParams(data: ContentIdSearchFilterData): Record<string, any> {
        if (!data?.values?.length) {
            return {};
        }
        return { [this.QUERY_PARAM]: data.values[0].value };
    }

    public fromQueryParams(params: Record<string, any>): ContentIdSearchFilterData | undefined {
        const value = params[this.QUERY_PARAM];

        return value ? new ContentIdSearchFilterData([{ label: value, value }]) : undefined;
    }
}

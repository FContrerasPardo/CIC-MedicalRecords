/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, inject } from '@angular/core';
import { SearchFilterService } from '../../models/search-filter-service.interface';
import { SearchFilterData } from '../../models/search-filter.data';
import { DateSearchFilterService } from '../base/date-filter/date-search-filter.service';

@Injectable()
export class DispositionSearchFilterService implements SearchFilterService {
    private dateService = inject(DateSearchFilterService);
    public readonly QUERY_PARAM = ['dispositionDateFrom', 'dispositionDateTo'];

    toQueryParams(data: SearchFilterData): Record<string, any> {
        return this.dateService.toQueryParams(data, 'dispositionDate');
    }

    fromQueryParams(params: Record<string, any>): SearchFilterData | undefined {
        return this.dateService.fromQueryParams(params, 'dispositionDate');
    }
}

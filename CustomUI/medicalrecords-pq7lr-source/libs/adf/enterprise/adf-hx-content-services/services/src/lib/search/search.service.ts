/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Query, QueryApi, QueryResult } from '@hylandsoftware/hxcs-js-client';
import { from, Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { QUERY_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { SearchOptions } from './models/search-options.interface';
import { DEFAULT_PAGE_SIZE, MAX_SEARCH_RESULTS_TOTAL_COUNT_LIMIT } from './configs/config';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';

@Injectable({
    providedIn: 'root',
})
export class SearchService {
    private queryApi = inject<QueryApi>(QUERY_API_TOKEN);
    private featuresService = inject<IFeaturesService>(FeaturesServiceToken);

    public getDocumentsByQuery(search: string, options?: SearchOptions): Observable<QueryResult> {
        const query: Query = {
            query: search,
            limit: options?.pagination?.maxItems || DEFAULT_PAGE_SIZE,
            offset: options?.pagination?.skipCount || 0,
            trackTotalCount: true,
            sort: options?.sort || [],
        };

        return this.featuresService.isOn$(ADF_HX_CONTENT_SERVICES_INTERNAL.SEARCH_RESULTS_100K).pipe(
            take(1),
            switchMap((isEnabled) => {
                if (isEnabled) {
                    query.trackTotalCountUpTo = MAX_SEARCH_RESULTS_TOTAL_COUNT_LIMIT;
                }

                return from(this.queryApi.getDocumentsByQuery(query)).pipe(map(({ data }) => data));
            })
        );
    }

    public sanitizeQuery(query: string): string {
        const pattern = /(\*|%|'|"|\/|\+|_|-|\\)/g;

        return query.replaceAll(pattern, (match) => `\\${match}`);
    }
}

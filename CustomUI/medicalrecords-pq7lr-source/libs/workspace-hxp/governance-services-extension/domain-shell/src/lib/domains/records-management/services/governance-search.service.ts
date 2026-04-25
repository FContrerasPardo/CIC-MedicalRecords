/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { expand, map, switchMap, take, finalize, reduce } from 'rxjs/operators';
import { GovernanceSearchOptions } from '../../../shared/ui/search/models/search-options.interface';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtHelperService } from '@alfresco/adf-core';
import { GovernanceDiscoveryService } from '../../../shared/config/governance-discovery.service';
import { GovernanceSearchResult, PageBoundary } from '../definitions/records.interface';
import { GovernanceConfigurationService } from '../../../shared/config/governance-config.service';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../../shared/definitions/governance-shared.constants';

@Injectable({
    providedIn: 'root',
})
export class GovernanceSearchService {
    private jwtHelperService: JwtHelperService = inject(JwtHelperService);
    private http: HttpClient = inject(HttpClient);
    private governanceDiscoveryService = inject(GovernanceDiscoveryService);
    private governanceConfigurationService = inject(GovernanceConfigurationService);
    private pageBoundaries = new Map<number, PageBoundary>();

    private readonly queryApiPath = '/api/records/query';

    public clearCache(): void {
        this.pageBoundaries.clear();
    }

    public hasNextPage(currentPageIndex: number): boolean {
        const nextBoundary = this.pageBoundaries.get(currentPageIndex);

        return !!nextBoundary?.forwardKey;
    }

    public getPage(query: any, options: GovernanceSearchOptions, pageIndex: number, goingBack = false): Observable<GovernanceSearchResult> {
        if (pageIndex < 0) {
            throw new Error('Invalid page index');
        }

        // Retrieve boundary based on navigation direction
        const boundary = goingBack
            ? this.pageBoundaries.get(pageIndex) // backward: rebuild current page
            : this.pageBoundaries.get(pageIndex - 1); // forward: start from previous page's forwardKey

        // Set exclusiveStartKey based on navigation direction
        const exclusiveStartKey = goingBack ? boundary?.backwardKey : boundary?.forwardKey;
        const newOptions = { ...options, exclusiveStartKey };

        // Delegate to search without modifying boundaries
        return this.search(query, pageIndex, newOptions);
    }

    public search(query: Record<string, any>, pageIndex: number, options?: GovernanceSearchOptions): Observable<GovernanceSearchResult> {
        const requestedLimit = options?.limit || DEFAULT_GOVERNANCE_SEARCH_LIMIT;
        const modifiedOptions = { ...options, limit: requestedLimit };

        const tempCache: {
            cachedRecords: any[];
            lastEvaluatedKey?: string;
        } = { cachedRecords: [] };

        return this.fetchPage(query, modifiedOptions).pipe(
            expand((result) => {
                tempCache.cachedRecords.push(...result.content);
                tempCache.lastEvaluatedKey = result.lastEvaluatedKey;

                const accumulated = tempCache.cachedRecords.length;

                // the first call needs to update the backwardKey for the current page => this key is used for rebuilding the page
                if (!this.pageBoundaries.has(pageIndex)) {
                    this.pageBoundaries.set(pageIndex, { backwardKey: options?.exclusiveStartKey, forwardKey: undefined });
                }

                // stop if we already have enough, or no more data
                if (accumulated >= requestedLimit || !result.lastEvaluatedKey) {
                    return EMPTY;
                }

                // fetch next batch
                const remaining = requestedLimit - accumulated;
                const nextOptions = {
                    ...modifiedOptions,
                    limit: remaining,
                    exclusiveStartKey: result.lastEvaluatedKey,
                };
                return this.fetchPage(query, nextOptions);
            }),
            finalize(() => {
                const currentBoundary = this.pageBoundaries.get(pageIndex) || {};
                currentBoundary.forwardKey = tempCache.lastEvaluatedKey;
                this.pageBoundaries.set(pageIndex, currentBoundary);
            }),
            // ignore individual emissions, only emit once when expand completes
            reduce(() => null, null),
            map(() => ({
                content: tempCache.cachedRecords.slice(0, requestedLimit),
                lastEvaluatedKey: tempCache.lastEvaluatedKey,
            }))
        );
    }

    private fetchPage(query: Record<string, any>, options?: GovernanceSearchOptions): Observable<GovernanceSearchResult> {
        const accessToken = this.jwtHelperService.getAccessToken();

        return this.governanceDiscoveryService.getGovernanceApiContext().pipe(
            switchMap(({ govUrl, environmentKey }) => {
                const headers = new HttpHeaders({
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'x-environment-key': environmentKey,
                });

                const executeSearch = (finalQuery: Record<string, any>) => {
                    let params = new HttpParams();
                    for (const key in finalQuery) {
                        if (Object.prototype.hasOwnProperty.call(finalQuery, key)) {
                            const value = finalQuery[key];
                            params = params.set(key, Array.isArray(value) ? value.join(',') : value);
                        }
                    }

                    if (options?.exclusiveStartKey) {
                        params = params.set('exclusiveStartKey', options.exclusiveStartKey);
                    }

                    if (options?.limit) {
                        params = params.set('limit', options.limit.toString());
                    }

                    return this.http.get<GovernanceSearchResult>(`${govUrl}${this.queryApiPath}`, { headers, params }).pipe(take(1));
                };

                if (!query['eds']) {
                    return this.governanceConfigurationService.getConfig().pipe(
                        take(1),
                        switchMap((config) => {
                            const newQuery = config.dataSources?.[0] ? { ...query, eds: config.dataSources[0].id } : query;
                            return executeSearch(newQuery);
                        })
                    );
                }

                return executeSearch(query);
            }),
            take(1) // ensure outer observable completes after one emission
        );
    }
}

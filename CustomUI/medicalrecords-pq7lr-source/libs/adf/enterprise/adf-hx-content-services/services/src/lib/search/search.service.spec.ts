/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { SearchService } from './search.service';
import { TestBed } from '@angular/core/testing';
import { queryApiProvider, mockHxcsJsClientConfigurationService } from '@alfresco/adf-hx-content-services/api';
import { QueryApi } from '@hylandsoftware/hxcs-js-client';
import { Pagination } from '@alfresco/js-api';
import { MatTooltipModule } from '@angular/material/tooltip';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { firstValueFrom } from 'rxjs';
import { provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';
import { MAX_SEARCH_RESULTS_TOTAL_COUNT_LIMIT } from './configs/config';

describe('SearchService', () => {
    let searchService: SearchService;
    let queryApi: QueryApi;
    let queryApiSpy: jasmine.Spy;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatTooltipModule],
            providers: [
                SearchService,
                mockHxcsJsClientConfigurationService,
                queryApiProvider,
                provideMockFeatureFlags({ [ADF_HX_CONTENT_SERVICES_INTERNAL.SEARCH_RESULTS_100K]: false }),
            ],
        });

        searchService = TestBed.inject(SearchService);
        queryApi = TestBed.inject(queryApiProvider.provide);

        queryApiSpy = spyOn(queryApi, 'getDocumentsByQuery').and.returnValue(
            Promise.resolve({
                data: { ...jestMocks.searchResults },
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {},
            } as any)
        );
    });

    afterEach(() => {
        queryApiSpy?.calls.reset();
    });

    describe('Get documents by query', () => {
        it('should call document api with default pagination and sort options', async () => {
            const queryResult = await firstValueFrom(searchService.getDocumentsByQuery('sys_title = \'test\''));

            expect(queryResult).toEqual(jestMocks.searchResults);
            expect(queryApiSpy).toHaveBeenCalledTimes(1);
            expect(queryApiSpy).toHaveBeenCalledWith({
                query: 'sys_title = \'test\'',
                limit: 25,
                offset: 0,
                trackTotalCount: true,
                sort: [],
            });
        });

        it('should call document api with pagination and sort options', async () => {
            const pagination = new Pagination({ maxItems: 25, skipCount: 0 });
            const sort = ['date DESC'];

            const queryResult = await firstValueFrom(
                searchService.getDocumentsByQuery('sys_title = \'test\'', {
                    pagination: pagination,
                    sort: sort,
                })
            );

            expect(queryResult).toEqual(jestMocks.searchResults);
            expect(queryApiSpy).toHaveBeenCalledTimes(1);
            expect(queryApiSpy).toHaveBeenCalledWith({
                query: 'sys_title = \'test\'',
                limit: 25,
                offset: 0,
                trackTotalCount: true,
                sort: ['date DESC'],
            });
        });
    });

    describe('Get documents by query when 100k feature flag is on', () => {
        beforeEach(() => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [MatTooltipModule],
                providers: [
                    SearchService,
                    mockHxcsJsClientConfigurationService,
                    queryApiProvider,
                    provideMockFeatureFlags({ [ADF_HX_CONTENT_SERVICES_INTERNAL.SEARCH_RESULTS_100K]: true }),
                ],
            });

            searchService = TestBed.inject(SearchService);
            queryApi = TestBed.inject(queryApiProvider.provide);

            queryApiSpy = spyOn(queryApi, 'getDocumentsByQuery').and.returnValue(
                Promise.resolve({
                    data: { ...jestMocks.searchResults },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config: {},
                } as any)
            );
        });

        it('should call document api with trackTotalCountUpTo', async () => {
            const queryResult = await firstValueFrom(searchService.getDocumentsByQuery('sys_title = \'test\''));

            expect(queryResult).toEqual(jestMocks.searchResults);
            expect(queryApiSpy).toHaveBeenCalledTimes(1);
            expect(queryApiSpy).toHaveBeenCalledWith({
                query: 'sys_title = \'test\'',
                limit: 25,
                offset: 0,
                trackTotalCount: true,
                trackTotalCountUpTo: MAX_SEARCH_RESULTS_TOTAL_COUNT_LIMIT,
                sort: [],
            });
        });
    });

    describe('Query sanitization', () => {
        const testCases = [
            {
                description: 'should sanitize query with various special characters',
                rawQuery: "special chars are allowed '%*/+_-\\",
                expectedSanitizedQuery: "special chars are allowed \\'\\%\\*\\/\\+\\_\\-\\\\",
            },
            {
                description: 'should return the original query if no special characters are present',
                rawQuery: 'no special chars',
                expectedSanitizedQuery: 'no special chars',
            },
            {
                description: 'should handle empty string in sanitizeQuery',
                rawQuery: '',
                expectedSanitizedQuery: '',
            },
        ];

        for (const { description, rawQuery, expectedSanitizedQuery } of testCases) {
            it(description, () => {
                const sanitizedQuery = searchService.sanitizeQuery(rawQuery);
                expect(sanitizedQuery).toBe(expectedSanitizedQuery);
            });
        }
    });
});

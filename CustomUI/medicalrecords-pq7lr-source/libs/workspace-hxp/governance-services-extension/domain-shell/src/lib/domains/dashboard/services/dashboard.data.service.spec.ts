/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JwtHelperService } from '@alfresco/adf-core';

import { DashboardDataService } from './dashboard.data.service';
import { GovernanceLegalCaseService } from '../../legal-hold-management/services/governance-legal-case.service';
import { GovernanceDiscoveryService } from '../../../shared/config/governance-discovery.service';

describe('DashboardDataService', () => {
    let service: DashboardDataService;
    let httpMock: HttpTestingController;
    let legalHoldManagementService: { queryLegalCases: jest.Mock };
    let governanceDiscoveryService: { getGovernanceApiContext: jest.Mock };
    let jwtHelperService: { getAccessToken: jest.Mock };

    beforeEach(() => {
        legalHoldManagementService = {
            queryLegalCases: jest.fn(),
        };

        governanceDiscoveryService = {
            getGovernanceApiContext: jest.fn().mockReturnValue(
                of({
                    govUrl: 'https://gov-url',
                    environmentKey: 'env-key',
                    environmentId: 'env-id',
                })
            ),
        };

        jwtHelperService = {
            getAccessToken: jest.fn().mockReturnValue('test-access-token'),
        };

        TestBed.configureTestingModule({
            providers: [
                DashboardDataService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: GovernanceLegalCaseService, useValue: legalHoldManagementService },
                { provide: GovernanceDiscoveryService, useValue: governanceDiscoveryService },
                { provide: JwtHelperService, useValue: jwtHelperService },
            ],
        });

        service = TestBed.inject(DashboardDataService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should fetch and aggregate record health stats from the total statistics endpoint', async () => {
        const responsePromise = firstValueFrom(service.fetchRecordHealth());

        const req = httpMock.expectOne((request) => request.url === 'https://gov-url/api/statistics/total');

        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Authorization')).toBe('Bearer test-access-token');
        expect(req.request.headers.get('x-environment-key')).toBe('env-key');

        req.flush([
            {
                categoryId: 'C#1',
                categoryName: 'Category 1',
                underRetention: 4,
                ready: 2,
                onHold: 1,
                reachedDisposition: 3,
                incomplete: 5,
                deleted: 99,
                total: 114,
            },
            {
                categoryId: 'C#2',
                categoryName: 'Category 2',
                underRetention: 6,
                ready: 1,
                onHold: 0,
                reachedDisposition: 4,
                incomplete: 2,
                archived: 50,
                total: 63,
            },
        ]);

        await expect(responsePromise).resolves.toEqual({
            total: 28,
            breakdown: [
                { status: 'UnderRetention', value: 10 },
                { status: 'Ready', value: 3 },
                { status: 'OnHold', value: 1 },
                { status: 'ReachedDisposition', value: 7 },
                { status: 'Incomplete', value: 7 },
            ],
        });
    });

    it('should filter record health stats to the selected category id', async () => {
        const responsePromise = firstValueFrom(service.fetchRecordHealth('C#2'));

        const req = httpMock.expectOne((request) => request.url === 'https://gov-url/api/statistics/total');
        req.flush([
            {
                categoryId: 'C#1',
                categoryName: 'Category 1',
                underRetention: 4,
                ready: 2,
                onHold: 1,
                reachedDisposition: 3,
                incomplete: 5,
                total: 15,
            },
            {
                categoryId: 'C#2',
                categoryName: 'Category 2',
                underRetention: 6,
                ready: 1,
                onHold: 0,
                reachedDisposition: 4,
                incomplete: 2,
                total: 13,
            },
        ]);

        await expect(responsePromise).resolves.toEqual({
            total: 13,
            breakdown: [
                { status: 'UnderRetention', value: 6 },
                { status: 'Ready', value: 1 },
                { status: 'OnHold', value: 0 },
                { status: 'ReachedDisposition', value: 4 },
                { status: 'Incomplete', value: 2 },
            ],
        });
    });

    it('should reuse one total statistics request across record health category selections', async () => {
        const allCategoriesPromise = firstValueFrom(service.fetchRecordHealth());
        const selectedCategoryPromise = firstValueFrom(service.fetchRecordHealth('C#2'));

        const req = httpMock.expectOne((request) => request.url === 'https://gov-url/api/statistics/total');
        req.flush([
            {
                categoryId: 'C#1',
                categoryName: 'Category 1',
                underRetention: 1,
                ready: 2,
                onHold: 3,
                reachedDisposition: 4,
                incomplete: 5,
                total: 15,
            },
            {
                categoryId: 'C#2',
                categoryName: 'Category 2',
                underRetention: 6,
                ready: 7,
                onHold: 8,
                reachedDisposition: 9,
                incomplete: 10,
                total: 40,
            },
        ]);

        await expect(allCategoriesPromise).resolves.toEqual({
            total: 55,
            breakdown: [
                { status: 'UnderRetention', value: 7 },
                { status: 'Ready', value: 9 },
                { status: 'OnHold', value: 11 },
                { status: 'ReachedDisposition', value: 13 },
                { status: 'Incomplete', value: 15 },
            ],
        });

        await expect(selectedCategoryPromise).resolves.toEqual({
            total: 40,
            breakdown: [
                { status: 'UnderRetention', value: 6 },
                { status: 'Ready', value: 7 },
                { status: 'OnHold', value: 8 },
                { status: 'ReachedDisposition', value: 9 },
                { status: 'Incomplete', value: 10 },
            ],
        });

        expect(governanceDiscoveryService.getGovernanceApiContext).toHaveBeenCalledTimes(1);
    });

    it('should fetch and map active retention stats from the monthly statistics endpoint', async () => {
        const responsePromise = firstValueFrom(service.fetchActiveRetention(new Date(2026, 2, 11)));

        const req = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/monthly'
                && request.params.get('month') === 'MARCH'
                && request.params.get('year') === '2026';
        });

        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Authorization')).toBe('Bearer test-access-token');
        expect(req.request.headers.get('x-environment-key')).toBe('env-key');

        req.flush([
            { categoryId: 'C#1', categoryName: 'Category 1', total: 12, underRetention: 4 },
            { categoryId: 'C#2', categoryName: 'Category 2', total: 6, underRetention: 0 },
            { categoryId: 'C#3', categoryName: 'Category 3', total: 9, underRetention: 5 },
            { categoryId: ' ', categoryName: 'Missing Id', total: 8, underRetention: 3 },
            { categoryId: 'C#4', categoryName: '   ', total: 8, underRetention: 3 },
        ]);

        await expect(responsePromise).resolves.toEqual({
            series: [
                { id: 'C#3', category: 'Category 3', total: 9, value: 5 },
                { id: 'C#1', category: 'Category 1', total: 12, value: 4 },
            ],
        });
    });

    it('should fetch and map incomplete stats from the monthly statistics endpoint', async () => {
        const responsePromise = firstValueFrom(service.fetchMissingProperties(new Date(2026, 6, 5)));

        const req = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/monthly'
                && request.params.get('month') === 'JULY'
                && request.params.get('year') === '2026';
        });

        req.flush([
            { categoryId: 'C#1', categoryName: 'Category 1', total: 4, incomplete: 2 },
            { categoryId: 'C#2', categoryName: 'Category 2', total: 4, incomplete: 0 },
            { categoryId: 'C#3', categoryName: 'Category 3', total: 1, incomplete: 3 },
        ]);

        await expect(responsePromise).resolves.toEqual({
            series: [
                { id: 'C#3', category: 'Category 3', total: 3, value: 3 },
                { id: 'C#1', category: 'Category 1', total: 4, value: 2 },
            ],
        });
    });

    it('should reuse one monthly statistics request across widgets for the same month and year', async () => {
        const date = new Date(2026, 2, 11);
        const activeRetentionPromise = firstValueFrom(service.fetchActiveRetention(date));
        const missingPropertiesPromise = firstValueFrom(service.fetchMissingProperties(date));

        const req = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/monthly'
                && request.params.get('month') === 'MARCH'
                && request.params.get('year') === '2026';
        });

        req.flush([
            { categoryId: 'C#1', categoryName: 'Category 1', total: 9, underRetention: 4, incomplete: 1 },
            { categoryId: 'C#2', categoryName: 'Category 2', total: 4, underRetention: 0, incomplete: 3 },
            { categoryId: 'C#3', categoryName: 'Category 3', total: 2, underRetention: 1, incomplete: 0 },
        ]);

        await expect(activeRetentionPromise).resolves.toEqual({
            series: [
                { id: 'C#1', category: 'Category 1', total: 9, value: 4 },
                { id: 'C#3', category: 'Category 3', total: 2, value: 1 },
            ],
        });

        await expect(missingPropertiesPromise).resolves.toEqual({
            series: [
                { id: 'C#2', category: 'Category 2', total: 4, value: 3 },
                { id: 'C#1', category: 'Category 1', total: 9, value: 1 },
            ],
        });

        expect(governanceDiscoveryService.getGovernanceApiContext).toHaveBeenCalledTimes(1);
    });

    it('should fetch monthly statistics again after the cache is cleared', async () => {
        const date = new Date(2026, 2, 11);

        const firstResponsePromise = firstValueFrom(service.fetchActiveRetention(date));
        const firstReq = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/monthly'
                && request.params.get('month') === 'MARCH'
                && request.params.get('year') === '2026';
        });
        firstReq.flush([{ categoryId: 'C#1', categoryName: 'Category 1', total: 2, underRetention: 1 }]);

        await expect(firstResponsePromise).resolves.toEqual({
            series: [{ id: 'C#1', category: 'Category 1', total: 2, value: 1 }],
        });

        service.clearMonthlyStatisticsCache();

        const secondResponsePromise = firstValueFrom(service.fetchMissingProperties(date));
        const secondReq = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/monthly'
                && request.params.get('month') === 'MARCH'
                && request.params.get('year') === '2026';
        });
        secondReq.flush([{ categoryId: 'C#2', categoryName: 'Category 2', total: 3, incomplete: 2 }]);

        await expect(secondResponsePromise).resolves.toEqual({
            series: [{ id: 'C#2', category: 'Category 2', total: 3, value: 2 }],
        });

        expect(governanceDiscoveryService.getGovernanceApiContext).toHaveBeenCalledTimes(2);
    });

    it('should fetch total statistics again after the total cache is cleared', async () => {
        const firstResponsePromise = firstValueFrom(service.fetchRecordHealth());
        const firstReq = httpMock.expectOne((request) => request.url === 'https://gov-url/api/statistics/total');
        firstReq.flush([{ categoryId: 'C#1', categoryName: 'Category 1', underRetention: 1, ready: 2, onHold: 3, reachedDisposition: 4, incomplete: 5 }]);

        await expect(firstResponsePromise).resolves.toEqual({
            total: 15,
            breakdown: [
                { status: 'UnderRetention', value: 1 },
                { status: 'Ready', value: 2 },
                { status: 'OnHold', value: 3 },
                { status: 'ReachedDisposition', value: 4 },
                { status: 'Incomplete', value: 5 },
            ],
        });

        service.clearTotalStatisticsCache();

        const secondResponsePromise = firstValueFrom(service.fetchRecordHealth('C#2'));
        const secondReq = httpMock.expectOne((request) => request.url === 'https://gov-url/api/statistics/total');
        secondReq.flush([{ categoryId: 'C#2', categoryName: 'Category 2', underRetention: 5, ready: 4, onHold: 3, reachedDisposition: 2, incomplete: 1 }]);

        await expect(secondResponsePromise).resolves.toEqual({
            total: 15,
            breakdown: [
                { status: 'UnderRetention', value: 5 },
                { status: 'Ready', value: 4 },
                { status: 'OnHold', value: 3 },
                { status: 'ReachedDisposition', value: 2 },
                { status: 'Incomplete', value: 1 },
            ],
        });

        expect(governanceDiscoveryService.getGovernanceApiContext).toHaveBeenCalledTimes(2);
    });

    it('should fetch and map cutoff tracker stats from the tracker statistics endpoint', async () => {
        const responsePromise = firstValueFrom(service.fetchCutoffTracker(new Date(2026, 11, 5)));

        const req = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/cutoff'
                && request.params.get('month') === 'DECEMBER'
                && request.params.get('year') === '2026';
        });

        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Authorization')).toBe('Bearer test-access-token');
        expect(req.request.headers.get('x-environment-key')).toBe('env-key');

        req.flush([
            { categoryId: 'C#1', categoryName: 'Category 1', count: 4, totalRecordCount: 12 },
            { categoryId: 'C#2', categoryName: 'Category 2', count: 0, totalRecordCount: 8 },
            { categoryId: 'C#3', categoryName: 'Category 3', count: 6, totalRecordCount: 6 },
            { categoryId: ' ', categoryName: 'Missing Id', count: 3, totalRecordCount: 9 },
            { categoryId: 'C#4', categoryName: '   ', count: 2, totalRecordCount: 10 },
        ]);

        await expect(responsePromise).resolves.toEqual({
            series: [
                { id: 'C#3', category: 'Category 3', total: 6, value: 6 },
                { id: 'C#1', category: 'Category 1', total: 12, value: 4 },
            ],
        });
    });

    it('should fetch and map disposition tracker stats from the tracker statistics endpoint', async () => {
        const responsePromise = firstValueFrom(service.fetchDispositionTracker(new Date(2026, 6, 5)));

        const req = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/disposition'
                && request.params.get('month') === 'JULY'
                && request.params.get('year') === '2026';
        });

        req.flush([
            { categoryId: 'C#1', categoryName: 'Category 1', count: 2, totalRecordCount: 4 },
            { categoryId: 'C#2', categoryName: 'Category 2', count: 0, totalRecordCount: 7 },
            { categoryId: 'C#3', categoryName: 'Category 3', count: 3, totalRecordCount: 1 },
        ]);

        await expect(responsePromise).resolves.toEqual({
            series: [
                { id: 'C#3', category: 'Category 3', total: 3, value: 3 },
                { id: 'C#1', category: 'Category 1', total: 4, value: 2 },
            ],
        });
    });

    it('should fetch tracker statistics again after the tracker cache is cleared', async () => {
        const selectedDate = new Date(2026, 11, 5);

        const firstResponsePromise = firstValueFrom(service.fetchCutoffTracker(selectedDate));
        const firstReq = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/cutoff'
                && request.params.get('month') === 'DECEMBER'
                && request.params.get('year') === '2026';
        });
        firstReq.flush([{ categoryId: 'C#1', categoryName: 'Category 1', count: 2, totalRecordCount: 5 }]);

        await expect(firstResponsePromise).resolves.toEqual({
            series: [{ id: 'C#1', category: 'Category 1', total: 5, value: 2 }],
        });

        service.clearTrackerStatisticsCache();

        const secondResponsePromise = firstValueFrom(service.fetchCutoffTracker(selectedDate));
        const secondReq = httpMock.expectOne((request) => {
            return request.url === 'https://gov-url/api/statistics/cutoff'
                && request.params.get('month') === 'DECEMBER'
                && request.params.get('year') === '2026';
        });
        secondReq.flush([{ categoryId: 'C#2', categoryName: 'Category 2', count: 4, totalRecordCount: 7 }]);

        await expect(secondResponsePromise).resolves.toEqual({
            series: [{ id: 'C#2', category: 'Category 2', total: 7, value: 4 }],
        });

        expect(governanceDiscoveryService.getGovernanceApiContext).toHaveBeenCalledTimes(2);
    });

    it('should provide categories as {id,value,label} items for filter controls', async () => {
        const result = await firstValueFrom(service.fetchCategories());

        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
            expect(result[0]).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    value: expect.any(String),
                    label: expect.any(String),
                })
            );
        }
    });

    it('should map legal hold cases into category-series rows and omit invalid or empty legal cases', async () => {
        legalHoldManagementService.queryLegalCases.mockReturnValue(
            of({
                contents: [
                    { legalCaseId: 'LH-1', legalCaseName: 'Case A', recordsCount: 5 },
                    { legalCaseId: 'LH-2', legalCaseName: 'Case B', recordsCount: 0 },
                    { legalCaseId: 'LH-3', legalCaseName: 'Case C', recordsCount: 2 },
                    { legalCaseId: '', legalCaseName: 'Case Missing Id', recordsCount: 4 },
                    { legalCaseId: 'LH-4', legalCaseName: '   ', recordsCount: 9 },
                ],
            })
        );

        const result = await firstValueFrom(service.fetchLegalHoldSummary());

        expect(Array.isArray(result.series)).toBe(true);
        expect(result.series.length).toBe(2);

        expect(result.series).toEqual([
            { id: 'LH-1', category: 'Case A', value: 5, total: 5 },
            { id: 'LH-3', category: 'Case C', value: 2, total: 2 },
        ]);

        expect(legalHoldManagementService.queryLegalCases).toHaveBeenCalledTimes(1);
    });

    it('should return an empty legal hold series when the backend responds with no cases', async () => {
        legalHoldManagementService.queryLegalCases.mockReturnValue(of({ contents: [] }));

        const result = await firstValueFrom(service.fetchLegalHoldSummary());

        expect(result).toEqual({ series: [] });
    });
});

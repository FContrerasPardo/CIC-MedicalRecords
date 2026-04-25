/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GovernanceSearchService } from './governance-search.service';
import { of } from 'rxjs';
import { GovernanceDiscoveryService } from '../../../shared/config/governance-discovery.service';
import { GovernanceConfigurationService } from '../../../shared/config/governance-config.service';
import { JwtHelperService } from '@alfresco/adf-core';

describe('GovernanceSearchService', () => {
    let service: GovernanceSearchService;
    let httpMock: HttpTestingController;

    const mockGovUrl = 'https://mock-api.com';
    const mockToken = 'mock-token';
    const mockEnvKey = 'env-key';
    const mockQuery = { eds: 'EDS#test' };

    const mockDiscoveryService = {
        getGovernanceApiContext: jest.fn().mockReturnValue(
            of({
                govUrl: mockGovUrl,
                environmentKey: mockEnvKey,
            })
        ),
    };

    const mockConfigService = {
        getConfig: jest.fn().mockReturnValue(
            of({
                dataSources: [{ id: 'test' }],
            })
        ),
    };

    const mockJwtService = {
        getAccessToken: jest.fn().mockReturnValue(mockToken),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                { provide: GovernanceDiscoveryService, useValue: mockDiscoveryService },
                { provide: GovernanceConfigurationService, useValue: mockConfigService },
                { provide: JwtHelperService, useValue: mockJwtService },
            ],
        });

        service = TestBed.inject(GovernanceSearchService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should accumulate multiple rounds until limit is reached and populate page boundaries', (done) => {
        const pageIndex = 0;
        const limit = 3;

        service.search(mockQuery, pageIndex, { limit }).subscribe((result) => {
            expect(result.content.map((r: any) => r.id)).toEqual([1, 2, 3]);

            // Defer to next tick so finalize has executed
            setTimeout(() => {
                const boundary = service['pageBoundaries'].get(pageIndex);
                expect(boundary).toBeDefined();
                expect(boundary?.forwardKey).toBe('key-2');
                expect(service.hasNextPage(pageIndex)).toBe(true);
                done();
            }, 0);
        });

        // First batch
        const req1 = httpMock.expectOne((req) => req.url === `${mockGovUrl}/api/records/query` && req.params.get('limit') === '3');
        req1.flush({
            content: [{ id: 1 }],
            lastEvaluatedKey: 'key-1',
        });

        // Second batch
        const req2 = httpMock.expectOne(
            (req) =>
                req.url === `${mockGovUrl}/api/records/query` && req.params.get('exclusiveStartKey') === 'key-1' && req.params.get('limit') === '2'
        );
        req2.flush({
            content: [{ id: 2 }, { id: 3 }],
            lastEvaluatedKey: 'key-2',
        });
    });

    it('should detect next page correctly', (done) => {
        const pageIndex = 0;
        const limit = 3;

        service.search(mockQuery, pageIndex, { limit }).subscribe((result) => {
            // Defer boundary checks until after finalize runs
            setTimeout(() => {
                const hasNext = service.hasNextPage(pageIndex);
                expect(hasNext).toBe(true);
                expect(result.content.length).toBe(3);
                expect(result.lastEvaluatedKey).toBe('key-2');
                done();
            });
        });

        const req1 = httpMock.expectOne((req) => req.url === `${mockGovUrl}/api/records/query`);
        req1.flush({
            content: [{ id: 1 }],
            lastEvaluatedKey: 'key-1',
        });

        const req2 = httpMock.expectOne(
            (req) =>
                req.url === `${mockGovUrl}/api/records/query` && req.params.get('exclusiveStartKey') === 'key-1' && req.params.get('limit') === '2'
        );
        req2.flush({
            content: [{ id: 2 }, { id: 3 }],
            lastEvaluatedKey: 'key-2', // forwardKey will be set in finalize
        });
    });

    it('should clear page boundaries', () => {
        (service as any).pageBoundaries.set(0, { backwardKey: 'abc', forwardKey: 'def' });
        service.clearCache();
        expect((service as any).pageBoundaries.size).toBe(0);
    });

    it('should leave lastEvaluatedKey undefined when the API omits it', (done) => {
        const pageIndex = 0;

        service.search(mockQuery, pageIndex, { limit: 2 }).subscribe((result) => {
            setTimeout(() => {
                expect(result.content).toEqual([{ id: 1 }]);
                expect(result.lastEvaluatedKey).toBeUndefined();
                expect(service.hasNextPage(pageIndex)).toBe(false);
                done();
            }, 0);
        });

        const req = httpMock.expectOne((request) => request.url === `${mockGovUrl}/api/records/query` && request.params.get('limit') === '2');
        req.flush({
            content: [{ id: 1 }],
        });
    });
});

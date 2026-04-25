/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { JwtHelperService } from '@alfresco/adf-core';
import { GovernanceDiscoveryService } from '../../../shared/config/governance-discovery.service';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../../shared/definitions/governance-shared.constants';
import { LegalHoldCaseIdentity } from '../definitions/legal-hold.interface';
import { GovernanceLegalCaseService } from './governance-legal-case.service';

describe('GovernanceLegalCaseService', () => {
    let service: GovernanceLegalCaseService;
    let httpMock: HttpTestingController;

    const mockJwtHelperService = {
        getAccessToken: jest.fn().mockReturnValue('mock-token'),
    };

    const mockGovernanceDiscoveryService = {
        getGovernanceApiContext: jest.fn().mockReturnValue(
            of({
                govUrl: 'https://gov-url',
                environmentKey: 'env-key',
                environmentId: 'env-id',
            })
        ),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                GovernanceLegalCaseService,
                { provide: JwtHelperService, useValue: mockJwtHelperService },
                { provide: GovernanceDiscoveryService, useValue: mockGovernanceDiscoveryService },
            ],
        });

        service = TestBed.inject(GovernanceLegalCaseService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should create legal hold case with proper request', () => {
        const body: LegalHoldCaseIdentity = {
            legalCaseName: 'test-case-id',
            legalCaseReason: 'Test case reason',
            legalCaseDescription: 'This is a test case description',
        };

        service.createLegalHoldCase(body).subscribe(() => undefined);

        const req = httpMock.expectOne(
            (request) => request.url === 'https://gov-url/api/legal-cases' && request.params.get('environmentId') === 'env-id'
        );

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(body);
        expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
        expect(req.request.headers.get('x-environment-key')).toBe('env-key');

        req.flush({});
    });

    it('should update legal hold case with proper request', () => {
        const body: LegalHoldCaseIdentity = {
            legalCaseId: 'lc-001',
            legalCaseName: 'test-case-id',
            legalCaseReason: 'Test case reason',
            legalCaseDescription: 'This is a test case description',
        };

        service.editLegalHoldCase(body).subscribe(() => undefined);

        const req = httpMock.expectOne(
            (request) => request.url === `https://gov-url/api/legal-cases/${body.legalCaseId}` && request.params.get('environmentId') === 'env-id'
        );

        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(body);
        expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
        expect(req.request.headers.get('x-environment-key')).toBe('env-key');

        req.flush({});
    });

    it('should query legal cases with the default limit', async () => {
        const responsePromise = firstValueFrom(service.queryLegalCases());

        const req = httpMock.expectOne((request) => request.url === 'https://gov-url/api/legal-cases');

        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
        expect(req.request.headers.get('x-environment-key')).toBe('env-key');
        expect(req.request.params.get('limit')).toBe(DEFAULT_GOVERNANCE_SEARCH_LIMIT.toString());

        req.flush({ contents: [], lastEvaluatedKey: '' });

        await expect(responsePromise).resolves.toEqual({ contents: [], lastEvaluatedKey: '' });
    });

    it('should query legal cases with a custom limit and exclusiveStartKey', async () => {
        const responsePromise = firstValueFrom(
            service.queryLegalCases({
                limit: 5,
                exclusiveStartKey: 'abc123',
            })
        );

        const req = httpMock.expectOne((request) => request.url === 'https://gov-url/api/legal-cases');

        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('limit')).toBe('5');
        expect(req.request.params.get('exclusiveStartKey')).toBe('abc123');

        req.flush({ contents: [], lastEvaluatedKey: 'abc123' });

        await expect(responsePromise).resolves.toEqual({ contents: [], lastEvaluatedKey: 'abc123' });
    });

    it('should emit true on emitRefreshList()', (done) => {
        service.shouldRefreshList$.subscribe((val) => {
            expect(val).toBe(true);
            done();
        });

        service.emitRefreshList();
    });
});

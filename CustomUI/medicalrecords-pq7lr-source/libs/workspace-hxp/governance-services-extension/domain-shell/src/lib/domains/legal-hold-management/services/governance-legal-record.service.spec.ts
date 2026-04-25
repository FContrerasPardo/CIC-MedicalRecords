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
import { GovernanceRecord } from '../../../shared/definitions/governance-shared.interface';
import { DEFAULT_GOVERNANCE_SEARCH_LIMIT } from '../../../shared/definitions/governance-shared.constants';
import { AssignRecordPayload } from '../definitions/legal-hold.interface';
import { GovernanceLegalRecordService } from './governance-legal-record.service';

describe('GovernanceLegalRecordService', () => {
    let service: GovernanceLegalRecordService;
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
                GovernanceLegalRecordService,
                { provide: JwtHelperService, useValue: mockJwtHelperService },
                { provide: GovernanceDiscoveryService, useValue: mockGovernanceDiscoveryService },
            ],
        });

        service = TestBed.inject(GovernanceLegalRecordService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should assign records to legal case with proper request', () => {
        const body: AssignRecordPayload = {
            legalCaseIds: ['lc-001'],
            records: [
                {
                    id: 'R#1',
                    environmentDataSourceId: 'EDS#1',
                    categoryId: 'C#1',
                },
            ],
        };

        service.assignRecordToLegalCase(body).subscribe(() => undefined);

        const req = httpMock.expectOne(
            (request) => request.url === 'https://gov-url/api/legal-records' && request.params.get('environmentId') === 'env-id'
        );

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(body);
        expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
        expect(req.request.headers.get('x-environment-key')).toBe('env-key');

        req.flush({});
    });

    it('should query legal records with default limit and encoded legalCaseId', async () => {
        const responsePromise = firstValueFrom(service.queryLegalRecords({ legalCaseId: 'case with space' }));

        const req = httpMock.expectOne((request) => request.url === 'https://gov-url/api/legal-records/case%20with%20space');

        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
        expect(req.request.headers.get('x-environment-key')).toBe('env-key');
        expect(req.request.params.get('limit')).toBe(DEFAULT_GOVERNANCE_SEARCH_LIMIT.toString());

        req.flush({ contents: [], lastEvaluatedKey: '' });

        await expect(responsePromise).resolves.toEqual({ contents: [], lastEvaluatedKey: '' });
    });

    it('should query legal records with pagination and ascendingOrder parameters', async () => {
        const responsePromise = firstValueFrom(
            service.queryLegalRecords({
                legalCaseId: 'case-1',
                limit: 5,
                exclusiveStartKey: 'abc123',
                sortDirection: 'asc',
            })
        );

        const req = httpMock.expectOne((request) => request.url === 'https://gov-url/api/legal-records/case-1');

        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('limit')).toBe('5');
        expect(req.request.params.get('exclusiveStartKey')).toBe('abc123');
        expect(req.request.params.get('ascendingOrder')).toBe('true');

        req.flush({ contents: [], lastEvaluatedKey: 'abc123' });

        await expect(responsePromise).resolves.toEqual({ contents: [], lastEvaluatedKey: 'abc123' });
    });

    it('should query legal records with descending sort', async () => {
        const responsePromise = firstValueFrom(
            service.queryLegalRecords({
                legalCaseId: 'case-2',
                sortDirection: 'desc',
            })
        );

        const req = httpMock.expectOne((request) => request.url === 'https://gov-url/api/legal-records/case-2');

        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('ascendingOrder')).toBe('false');

        req.flush({ contents: [], lastEvaluatedKey: '' });

        await expect(responsePromise).resolves.toEqual({ contents: [], lastEvaluatedKey: '' });
    });

    it('should emit the assigned records via recordAssigned$', async () => {
        const records: GovernanceRecord[] = [
            { id: 'R#1', environmentDataSourceId: 'EDS#1', categoryId: 'C#1', status: 'Ready' },
            { id: 'R#2', environmentDataSourceId: 'EDS#2', categoryId: 'C#2', status: 'Ready' },
        ];

        const emitted$ = firstValueFrom(service.recordAssigned$);
        service.emitRecordAssignmentComplete(records);
        const emitted = await emitted$;

        expect(emitted).toEqual(records);
    });
});

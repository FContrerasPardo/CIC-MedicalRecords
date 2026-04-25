/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { GovernanceRecordService } from './governance-record.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { JwtHelperService } from '@alfresco/adf-core';
import { GovernanceDiscoveryService } from '../../../shared/config/governance-discovery.service';
import { firstValueFrom, of } from 'rxjs';
import { GovernanceRecord } from '../../../shared/definitions/governance-shared.interface';
import { LegalHoldCase } from '../../legal-hold-management/definitions/legal-hold.interface';

describe('GovernanceRecordService', () => {
    let service: GovernanceRecordService;
    let httpMock: HttpTestingController;

    const mockAccessToken = 'mock-access-token';
    const mockContext = {
        govUrl: 'https://mock-api',
        environmentKey: 'mock-env-key',
        environmentId: 'mock-env-id',
    };

    const mockJwtHelperService = {
        getAccessToken: jest.fn().mockReturnValue(mockAccessToken),
    };

    const mockGovernanceDiscoveryService = {
        getGovernanceApiContext: jest.fn().mockReturnValue(of(mockContext)),
    };

    const verifyAuthHeaders = (req: any) => {
        expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockAccessToken}`);
        expect(req.request.headers.get('x-environment-key')).toBe(mockContext.environmentKey);
    };

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                GovernanceRecordService,
                { provide: JwtHelperService, useValue: mockJwtHelperService },
                { provide: GovernanceDiscoveryService, useValue: mockGovernanceDiscoveryService },
            ],
        });

        service = TestBed.inject(GovernanceRecordService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should updates a record when save is requested (PUT)', async () => {
        const recordId = 'R%231234';
        const payload = {
            cutOffDate: '2025-12-31T00:00:00Z',
            environmentDataSourceId: 'EDS#3456',
            categoryId: 'C#1004',
        };

        const res$ = firstValueFrom(service.editRecord(recordId, payload));

        const req = httpMock.expectOne(`${mockContext.govUrl}/api/records/${recordId}?environmentId=${mockContext.environmentId}`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(payload);
        verifyAuthHeaders(req);
        req.flush({ success: true });

        await expect(res$).resolves.toEqual({ success: true });
    });

    it('should update a record when patch is requested (PATCH)', async () => {
        const recordId = 'R%231234';
        const payload = {
            cutOffDate: '2026-01-01T00:00:00Z',
            environmentDataSourceId: 'EDS#7777',
            categoryId: 'C#2002',
        };

        const res$ = firstValueFrom(service.patchRecord(recordId, payload));

        const req = httpMock.expectOne(`${mockContext.govUrl}/api/records/${recordId}?environmentId=${mockContext.environmentId}`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual(payload);
        verifyAuthHeaders(req);
        req.flush({ success: true });

        await expect(res$).resolves.toEqual({ success: true });
    });

    it('should removes a record when delete is triggered', async () => {
        const recordId = 'Record123',
            edsId = 'EDS456',
            categoryId = 'CAT789';

        const res$ = firstValueFrom(service.deleteRecord(recordId, edsId, categoryId));

        const encodedUrl = `${mockContext.govUrl}/api/records/${encodeURIComponent(recordId)}?eds=${encodeURIComponent(
            edsId
        )}&categoryId=${encodeURIComponent(categoryId)}`;
        const req = httpMock.expectOne(encodedUrl);

        expect(req.request.method).toBe('DELETE');
        verifyAuthHeaders(req);
        req.flush({});

        await expect(res$).resolves.toBe(true);
    });

    it('should return false when delete fails', async () => {
        const recordId = 'Record123',
            edsId = 'EDS456',
            categoryId = 'CAT789';
        const res$ = firstValueFrom(service.deleteRecord(recordId, edsId, categoryId));

        const url = `${mockContext.govUrl}/api/records/${encodeURIComponent(recordId)}?eds=${encodeURIComponent(
            edsId
        )}&categoryId=${encodeURIComponent(categoryId)}`;
        const req = httpMock.expectOne(url);
        expect(req.request.method).toBe('DELETE');
        verifyAuthHeaders(req);
        req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

        await expect(res$).resolves.toBe(false);
    });

    it('should GETs latest snapshot by id with correct headers and params', async () => {
        const recordIdRaw = 'R#1234',
            edsId = 'EDS#456',
            categoryId = 'C#789';
        const expected: GovernanceRecord = {
            id: recordIdRaw,
            environmentDataSourceId: edsId,
            categoryId,
            status: 'Ready',
            fileName: 'foo.txt',
        } as any;

        const res$ = firstValueFrom(service.getRecordById(recordIdRaw, edsId, categoryId));

        const expectedUrl = `${mockContext.govUrl}/api/records/${encodeURIComponent(recordIdRaw)}`;
        const req = httpMock.expectOne((r) => r.url === expectedUrl);

        expect(req.request.method).toBe('GET');
        verifyAuthHeaders(req);
        expect(req.request.params.get('eds')).toBe(edsId);
        expect(req.request.params.get('categoryId')).toBe(categoryId);

        req.flush(expected);
        await expect(res$).resolves.toEqual(expected);
    });

    it('notifies when a record update is confirmed', async () => {
        const updatedRecord = { id: '123' } as GovernanceRecord;

        const emitted$ = firstValueFrom(service.updateConfirmed$);
        service.emitUpdateConfirmed(updatedRecord);

        await expect(emitted$).resolves.toEqual(updatedRecord);
    });

    it('notifies when a record deletion is confirmed', async () => {
        const emitted$ = firstValueFrom(service.deleteConfirmed$);
        service.emitDeleteConfirmed();
        await expect(emitted$).resolves.toBeUndefined();
    });

    it('should fetch linked legal hold cases with correct headers and query params', async () => {
        const edsId = 'EDS456';
        const contentId = 'CID#007';

        const mockCases: LegalHoldCase[] = [
            { legalCaseId: 'LC1', legalCaseName: 'Case A' } as any,
            { legalCaseId: 'LC2', legalCaseName: 'Case B' } as any,
        ];

        const promise = firstValueFrom(service.getLinkedLegalHoldCases(contentId, edsId));

        const expectedUrl = `${mockContext.govUrl}/api/legal-records/legal-cases?contentId=${encodeURIComponent(contentId)}&eds=${encodeURIComponent(
            edsId
        )}`;

        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('GET');
        verifyAuthHeaders(req);

        req.flush(mockCases);

        const cases = await promise;
        expect(cases).toEqual(mockCases);
    });

    it('should return true when view record property request succeeds', async () => {
        const recordId = 'R#123';
        const edsId = 'EDS#456';
        const categoryId = 'CAT#789';

        const res$ = firstValueFrom(service.getViewRecordProperty(recordId, edsId, categoryId));

        const encodedRecordId = encodeURIComponent(recordId);
        const encodedEdsId = encodeURIComponent(edsId);
        const encodedCategoryId = encodeURIComponent(categoryId);

        const expectedUrl = `${mockContext.govUrl}/api/events/${encodedRecordId}?eds=${encodedEdsId}&categoryId=${encodedCategoryId}`;

        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('GET');
        verifyAuthHeaders(req);

        req.flush({});

        await expect(res$).resolves.toBe(true);
    });

    it('should return false when view record property request fails', async () => {
        const recordId = 'R#123';
        const edsId = 'EDS#456';
        const categoryId = 'CAT#789';

        const res$ = firstValueFrom(service.getViewRecordProperty(recordId, edsId, categoryId));

        const encodedRecordId = encodeURIComponent(recordId);
        const encodedEdsId = encodeURIComponent(edsId);
        const encodedCategoryId = encodeURIComponent(categoryId);

        const expectedUrl = `${mockContext.govUrl}/api/events/${encodedRecordId}?eds=${encodedEdsId}&categoryId=${encodedCategoryId}`;

        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('GET');
        verifyAuthHeaders(req);

        req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

        await expect(res$).resolves.toBe(false);
    });
});

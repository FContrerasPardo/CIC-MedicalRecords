/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { AppConfigService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { HxpStartProcessCloudService } from './hxp-start-process-cloud.service';
import { PendingDocument, PendingDocumentCleanupService, PENDING_DOCUMENT_SERVICE, HxpPendingDocumentService } from '@hxp/shared-hxp/services';

const MOCK_DOCUMENT: Document = {
    sys_id: 'doc-123',
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
};

const MOCK_RESTORED_DOCUMENT: Document = {
    sys_id: 'doc-123',
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
    sys_acl: [],
};

const MOCK_PENDING_DOCUMENT: PendingDocument = {
    document: MOCK_DOCUMENT,
    originalPermissions: [{ permission: 'Read', granted: true, user: { id: 'some-user', username: 'some-user' } }],
    pendingBy: 'user-123', persisted: false,
};

const MOCK_PROCESS_INSTANCE = { id: 'process-123' };

describe('HxpStartProcessCloudService', () => {
    let service: HxpStartProcessCloudService;
    let mockDocumentOps: jest.Mocked<HxpPendingDocumentService>;
    let startProcessSpy: jest.SpyInstance;

    const setupWithFF = (featureFlagEnabled: boolean) => {
        mockDocumentOps = {
            restorePermissions: jest.fn().mockResolvedValue(MOCK_RESTORED_DOCUMENT),
            deleteDocument: jest.fn().mockResolvedValue(undefined),
        };

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                HxpStartProcessCloudService,
                PendingDocumentCleanupService,
                { provide: PENDING_DOCUMENT_SERVICE, useValue: mockDocumentOps },
                { provide: AdfHttpClient, useValue: { request: jest.fn().mockReturnValue(of(MOCK_PROCESS_INSTANCE)) } },
                { provide: FeaturesServiceToken, useValue: { isOn$: jest.fn().mockReturnValue(of(featureFlagEnabled)) } },
                {
                    provide: AppConfigService,
                    useValue: { get: () => '' },
                },
            ],
        });

        service = TestBed.inject(HxpStartProcessCloudService);
        startProcessSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'startProcessWithForm')
            .mockReturnValue(of(MOCK_PROCESS_INSTANCE));
    };

    beforeEach(() => setupWithFF(true));

    afterEach(() => {
        jest.clearAllMocks();
        TestBed.resetTestingModule();
    });

    it('should restore permissions on pending documents before starting process', async () => {
        const payload = {
            values: { attachFile: MOCK_PENDING_DOCUMENT },
        };

        await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

        expect(mockDocumentOps.restorePermissions).toHaveBeenCalledWith(
            'doc-123',
            MOCK_PENDING_DOCUMENT.originalPermissions
        );
    });

    it('should pass restored document to super.startProcessWithForm instead of PendingDocument', async () => {
        const payload = {
            values: { attachFile: MOCK_PENDING_DOCUMENT },
        };

        await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

        expect(startProcessSpy).toHaveBeenCalledWith(
            'app', 'form-1', 1,
            expect.objectContaining({
                values: expect.objectContaining({ attachFile: MOCK_RESTORED_DOCUMENT }),
            })
        );
    });

    it('should delegate to super without processing when payload has no values', async () => {
        const payload = { processDefinitionKey: 'some-key' };

        await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

        expect(mockDocumentOps.restorePermissions).not.toHaveBeenCalled();
        expect(startProcessSpy).toHaveBeenCalledWith('app', 'form-1', 1, payload);
    });

    it('should not call restorePermissions when no pending documents exist', async () => {
        const payload = {
            values: { textField: 'some text', numberField: 42 },
        };

        await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

        expect(mockDocumentOps.restorePermissions).not.toHaveBeenCalled();
    });

    it('should handle arrays containing pending documents', async () => {
        const payload = {
            values: { attachFiles: [MOCK_PENDING_DOCUMENT, MOCK_PENDING_DOCUMENT] },
        };

        await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

        expect(mockDocumentOps.restorePermissions).toHaveBeenCalledTimes(2);
    });

    it('should throw when pending document has no sys_id', async () => {
        const badPendingDoc: PendingDocument = {
            document: { sys_primaryType: 'SysFile' },
            originalPermissions: [],
            pendingBy: 'user-123', persisted: false,
        };

        await expect(
            firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, { values: { file: badPendingDoc } }))
        ).rejects.toThrow('Cannot restore permissions: document has no sys_id');
    });

    it('should call markPersistedInFormValues when starting process', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const markPersistedSpy = jest.spyOn(cleanupService, 'markPersistedInFormValues');
        const payload = { values: { attachFile: MOCK_PENDING_DOCUMENT } };

        await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

        expect(markPersistedSpy).toHaveBeenCalledWith(payload.values);
    });

    it('should clear tracking after starting process', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const clearTrackingSpy = jest.spyOn(cleanupService, 'clearTracking');
        const payload = { values: { attachFile: MOCK_PENDING_DOCUMENT } };

        await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

        expect(clearTrackingSpy).toHaveBeenCalled();
    });

    it('should clear tracking even when startProcessWithForm fails', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const clearTrackingSpy = jest.spyOn(cleanupService, 'clearTracking');
        startProcessSpy.mockReturnValue(throwError(() => new Error('server error')));
        const payload = { values: { attachFile: MOCK_PENDING_DOCUMENT } };

        await expect(
            firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload))
        ).rejects.toThrow('server error');

        expect(clearTrackingSpy).toHaveBeenCalled();
    });

    it('should not clear tracking when payload has no values', async () => {
        const cleanupService = TestBed.inject(PendingDocumentCleanupService);
        const clearTrackingSpy = jest.spyOn(cleanupService, 'clearTracking');

        await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, { processDefinitionKey: 'some-key' }));

        expect(clearTrackingSpy).not.toHaveBeenCalled();
    });

    describe('when FORMS_DEFERRED_DOC_CREATION feature flag is off', () => {
        beforeEach(() => {
            TestBed.resetTestingModule();
            setupWithFF(false);
        });

        it('should call super.startProcessWithForm directly without processing pending documents', async () => {
            const payload = { values: { attachFile: MOCK_PENDING_DOCUMENT } };

            await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

            expect(mockDocumentOps.restorePermissions).not.toHaveBeenCalled();
            expect(startProcessSpy).toHaveBeenCalledWith('app', 'form-1', 1, payload);
        });

        it('should not call markPersistedInFormValues when starting process', async () => {
            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const markPersistedSpy = jest.spyOn(cleanupService, 'markPersistedInFormValues');
            const payload = { values: { attachFile: MOCK_PENDING_DOCUMENT } };

            await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

            expect(markPersistedSpy).not.toHaveBeenCalled();
        });

        it('should not clear tracking when starting process', async () => {
            const cleanupService = TestBed.inject(PendingDocumentCleanupService);
            const clearTrackingSpy = jest.spyOn(cleanupService, 'clearTracking');
            const payload = { values: { attachFile: MOCK_PENDING_DOCUMENT } };

            await firstValueFrom(service.startProcessWithForm('app', 'form-1', 1, payload));

            expect(clearTrackingSpy).not.toHaveBeenCalled();
        });
    });
});

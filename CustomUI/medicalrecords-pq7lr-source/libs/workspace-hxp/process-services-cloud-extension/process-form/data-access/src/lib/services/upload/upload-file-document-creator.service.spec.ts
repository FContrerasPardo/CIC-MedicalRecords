/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { Document, DocumentApi } from '@hylandsoftware/hxcs-js-client';
import { DOCUMENT_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { JwtHelperService } from '@alfresco/adf-core';
import { PendingDocumentCleanupService, UploadSuccessData, isPendingDocument } from '@hxp/shared-hxp/services';
import { UploadFileDocumentCreatorService } from './upload-file-document-creator.service';

const MOCK_USER_ID = 'user-abc-123';

const MOCK_CREATED_DOCUMENT: Document = {
    sys_id: 'created-doc-id',
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
};

interface CreateDocumentPayload {
    sys_acl?: unknown;
    sys_primaryType?: string;
}

const MOCK_UPLOAD_DATA: UploadSuccessData = {
    uploadedFile: { id: 'upload-blob-id', fileName: 'test-file.pdf' } as UploadSuccessData['uploadedFile'],
    uploadFileOptions: {
        parentId: 'parent-folder-id',
        contentType: 'SysFile',
        permissions: [{ permission: 'Read', granted: true, user: { id: 'some-user', username: 'some-user' } }],
    },
};

describe('UploadFileDocumentCreatorService', () => {
    let service: UploadFileDocumentCreatorService;
    let mockDocumentApi: jest.Mocked<Partial<DocumentApi>>;
    let mockFeaturesService: { isOn$: jest.Mock };
    let mockJwtHelper: Partial<JwtHelperService>;
    let mockCleanupService: { track: jest.Mock; clearTracking: jest.Mock };
    let mockRouter: { url: string };

    beforeEach(() => {
        mockDocumentApi = {
            createDocumentUnderParentById: jest.fn().mockResolvedValue({ data: MOCK_CREATED_DOCUMENT }),
        };
        mockFeaturesService = {
            isOn$: jest.fn().mockReturnValue(of(false)),
        };
        mockJwtHelper = {
            getValueFromLocalIdToken: jest.fn().mockReturnValue(MOCK_USER_ID),
        };
        mockCleanupService = {
            track: jest.fn(),
            clearTracking: jest.fn(),
        };
        mockRouter = { url: '/processes' };

        TestBed.configureTestingModule({
            providers: [
                UploadFileDocumentCreatorService,
                { provide: DOCUMENT_API_TOKEN, useValue: mockDocumentApi },
                { provide: FeaturesServiceToken, useValue: mockFeaturesService },
                { provide: JwtHelperService, useValue: mockJwtHelper },
                { provide: PendingDocumentCleanupService, useValue: mockCleanupService },
                { provide: Router, useValue: mockRouter },
            ],
        });

        service = TestBed.inject(UploadFileDocumentCreatorService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return null when uploadFile is null', async () => {
        const result = await service.onUploadFile(null);
        expect(result).toBeNull();
        expect(mockDocumentApi.createDocumentUnderParentById).not.toHaveBeenCalled();
    });

    describe('when pending document upload is disabled', () => {
        beforeEach(() => {
            mockFeaturesService.isOn$.mockReturnValue(of(false));
        });

        it('should create document with normal permissions from upload options', async () => {
            const result = await service.onUploadFile(MOCK_UPLOAD_DATA);

            expect(result).toEqual(MOCK_CREATED_DOCUMENT);
            expect(mockDocumentApi.createDocumentUnderParentById).toHaveBeenCalledWith(
                'parent-folder-id',
                undefined,
                expect.objectContaining({
                    sys_name: 'test-file.pdf',
                    sys_parentId: 'parent-folder-id',
                    sys_primaryType: 'SysFile',
                    sys_title: 'test-file.pdf',
                    sysfile_blob: { uploadId: 'upload-blob-id' },
                    sys_acl: MOCK_UPLOAD_DATA.uploadFileOptions.permissions,
                })
            );
        });

        it('should omit sys_acl when no permissions provided', async () => {
            const uploadDataNoPerms: UploadSuccessData = {
                ...MOCK_UPLOAD_DATA,
                uploadFileOptions: { ...MOCK_UPLOAD_DATA.uploadFileOptions, permissions: undefined },
            };

            await service.onUploadFile(uploadDataNoPerms);

            const callArgs = (mockDocumentApi.createDocumentUnderParentById as jest.Mock).mock.calls[0][2] as CreateDocumentPayload;
            expect(callArgs.sys_acl).toBeUndefined();
        });

        it('should not track document for cleanup', async () => {
            await service.onUploadFile(MOCK_UPLOAD_DATA);
            expect(mockCleanupService.track).not.toHaveBeenCalled();
        });

        it('should return plain Document, not PendingDocument', async () => {
            const result = await service.onUploadFile(MOCK_UPLOAD_DATA);
            expect(isPendingDocument(result)).toBe(false);
            expect(result).toEqual(MOCK_CREATED_DOCUMENT);
        });
    });

    describe('when pending document upload is enabled', () => {
        beforeEach(() => {
            mockFeaturesService.isOn$.mockReturnValue(of(true));
        });

        it('should create non-pending document on public form routes', async () => {
            mockRouter.url = '/public/process/testProcessId';

            const result = await service.onUploadFile(MOCK_UPLOAD_DATA);
            const callArgs = (mockDocumentApi.createDocumentUnderParentById as jest.Mock).mock.calls[0][2] as CreateDocumentPayload;

            expect(result).toEqual(MOCK_CREATED_DOCUMENT);
            expect(callArgs.sys_acl).toEqual(MOCK_UPLOAD_DATA.uploadFileOptions.permissions);
            expect(mockCleanupService.track).not.toHaveBeenCalled();
        });

        it('should create document with restrictive ACL', async () => {
            await service.onUploadFile(MOCK_UPLOAD_DATA);

            const callArgs = (mockDocumentApi.createDocumentUnderParentById as jest.Mock).mock.calls[0][2] as CreateDocumentPayload;
            expect(callArgs.sys_acl).toEqual([
                { user: { id: '__Everyone__' }, permission: 'Everything', granted: false },
                { user: { id: MOCK_USER_ID }, permission: 'Everything', granted: true },
            ]);
        });

        it('should return PendingDocument wrapping the created document', async () => {
            const result = await service.onUploadFile(MOCK_UPLOAD_DATA);

            expect(result).toEqual(expect.objectContaining({
                document: MOCK_CREATED_DOCUMENT,
                originalPermissions: MOCK_UPLOAD_DATA.uploadFileOptions.permissions,
                pendingBy: MOCK_USER_ID,
                persisted: false,
            }));
        });

        it('should track pending document for cleanup', async () => {
            await service.onUploadFile(MOCK_UPLOAD_DATA);

            expect(mockCleanupService.track).toHaveBeenCalledWith(
                expect.objectContaining({ document: MOCK_CREATED_DOCUMENT })
            );
        });

        it('should use empty array for originalPermissions when none provided', async () => {
            const uploadDataNoPerms: UploadSuccessData = {
                ...MOCK_UPLOAD_DATA,
                uploadFileOptions: { ...MOCK_UPLOAD_DATA.uploadFileOptions, permissions: undefined },
            };

            const result = await service.onUploadFile(uploadDataNoPerms);

            expect(result).toEqual(expect.objectContaining({ originalPermissions: [] }));
        });

        it('should fall back to immediate document creation when user ID is empty', async () => {
            (mockJwtHelper.getValueFromLocalIdToken as jest.Mock).mockReturnValue('');

            const result = await service.onUploadFile(MOCK_UPLOAD_DATA);

            expect(result).toEqual(MOCK_CREATED_DOCUMENT);
            expect(isPendingDocument(result)).toBe(false);
            expect(mockCleanupService.track).not.toHaveBeenCalled();
        });

        it('should fall back to immediate document creation when user ID is whitespace', async () => {
            (mockJwtHelper.getValueFromLocalIdToken as jest.Mock).mockReturnValue('   ');

            const result = await service.onUploadFile(MOCK_UPLOAD_DATA);

            expect(result).toEqual(MOCK_CREATED_DOCUMENT);
            expect(isPendingDocument(result)).toBe(false);
            expect(mockCleanupService.track).not.toHaveBeenCalled();
        });

        it('should fall back to immediate document creation when user ID is null', async () => {
            (mockJwtHelper.getValueFromLocalIdToken as jest.Mock).mockReturnValue(null);

            const result = await service.onUploadFile(MOCK_UPLOAD_DATA);

            expect(result).toEqual(MOCK_CREATED_DOCUMENT);
            expect(isPendingDocument(result)).toBe(false);
            expect(mockCleanupService.track).not.toHaveBeenCalled();
        });

        it('should default contentType to SysFile when not provided', async () => {
            const uploadDataNoContentType: UploadSuccessData = {
                ...MOCK_UPLOAD_DATA,
                uploadFileOptions: { ...MOCK_UPLOAD_DATA.uploadFileOptions, contentType: undefined },
            };

            await service.onUploadFile(uploadDataNoContentType);

            const callArgs = (mockDocumentApi.createDocumentUnderParentById as jest.Mock).mock.calls[0][2] as CreateDocumentPayload;
            expect(callArgs.sys_primaryType).toBe('SysFile');
        });
    });

    describe('feature flag error handling', () => {
        it('should fall back to non-pending upload when feature flag throws', async () => {
            mockFeaturesService.isOn$.mockReturnValue(throwError(() => new Error('flag error')));

            const result = await service.onUploadFile(MOCK_UPLOAD_DATA);

            expect(result).toEqual(MOCK_CREATED_DOCUMENT);
            expect(mockCleanupService.track).not.toHaveBeenCalled();
        });
    });
});

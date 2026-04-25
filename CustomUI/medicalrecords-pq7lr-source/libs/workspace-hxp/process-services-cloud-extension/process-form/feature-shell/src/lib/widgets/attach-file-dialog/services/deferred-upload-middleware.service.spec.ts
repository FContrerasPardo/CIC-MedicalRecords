/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { DeferredUploadMiddlewareService, FlushResult } from './deferred-upload-middleware.service';
import { UploadFileDocumentCreatorService } from '@alfresco-dbp/workspace-hxp/process-services-cloud-extension/process-form/data-access';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { UploadSuccessData } from '@hxp/shared-hxp/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom, of, Subscription } from 'rxjs';

const MOCK_DOCUMENT: Document = {
    sys_id: 'doc-1',
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
};

const createUploadData = (id: string): UploadSuccessData => ({
    uploadedFile: { id, fileName: `${id}.pdf` } as any,
    uploadFileOptions: {} as any,
});

describe('DeferredUploadMiddlewareService', () => {
    let service: DeferredUploadMiddlewareService;
    let mockDocumentCreator: { onUploadFile: jest.Mock };
    let mockUploadApi: { deleteUpload: jest.Mock };
    let mockFeaturesService: { isOn$: jest.Mock };

    beforeEach(() => {
        mockDocumentCreator = {
            onUploadFile: jest.fn().mockResolvedValue(MOCK_DOCUMENT),
        };
        mockUploadApi = {
            deleteUpload: jest.fn().mockResolvedValue(undefined),
        };
        mockFeaturesService = {
            isOn$: jest.fn().mockReturnValue(of(true)),
        };

        TestBed.configureTestingModule({
            providers: [
                DeferredUploadMiddlewareService,
                { provide: UploadFileDocumentCreatorService, useValue: mockDocumentCreator },
                { provide: UPLOAD_API_TOKEN, useValue: mockUploadApi },
                { provide: FeaturesServiceToken, useValue: mockFeaturesService },
            ],
        });

        service = TestBed.inject(DeferredUploadMiddlewareService);
    });

    describe('onUploadFile', () => {
        it('should return null when uploadFile is null', async () => {
            const result = await service.onUploadFile(null);
            expect(result).toBeNull();
        });

        it('should delegate to documentCreator when feature flag is off', async () => {
            mockFeaturesService.isOn$.mockReturnValue(of(false));
            const upload = createUploadData('upload-1');

            const result = await service.onUploadFile(upload);

            expect(mockDocumentCreator.onUploadFile).toHaveBeenCalledWith(upload);
            expect(result).toBe(MOCK_DOCUMENT);
        });

        it('should queue the upload and return null when feature flag is on', async () => {
            const upload = createUploadData('upload-1');

            const result = await service.onUploadFile(upload);

            expect(result).toBeNull();
            expect(mockDocumentCreator.onUploadFile).not.toHaveBeenCalled();
            expect(await firstValueFrom(service.hasPendingUploads$)).toBe(true);
        });

        it('should accumulate multiple uploads in the queue', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            await service.onUploadFile(createUploadData('upload-2'));
            await service.onUploadFile(createUploadData('upload-3'));

            const queue = await firstValueFrom(service.queue$);
            expect(queue).toHaveLength(3);
        });

        it('should not call documentCreator when deferral is enabled', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            await service.onUploadFile(createUploadData('upload-2'));

            expect(mockDocumentCreator.onUploadFile).not.toHaveBeenCalled();
        });

        it('should fall back to documentCreator when feature flag throws', async () => {
            mockFeaturesService.isOn$.mockImplementation(() => {
                throw new Error('feature flag error');
            });
            const upload = createUploadData('upload-1');

            const result = await service.onUploadFile(upload);

            expect(mockDocumentCreator.onUploadFile).toHaveBeenCalledWith(upload);
            expect(result).toBe(MOCK_DOCUMENT);
        });
    });

    describe('queue state observables', () => {
        it('should emit empty array from queue$ initially', async () => {
            const queue = await firstValueFrom(service.queue$);
            expect(queue).toEqual([]);
        });

        it('should emit false from hasPendingUploads$ initially', async () => {
            const hasPending = await firstValueFrom(service.hasPendingUploads$);
            expect(hasPending).toBe(false);
        });

        it('should emit true from hasPendingUploads$ after queuing an upload', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            const hasPending = await firstValueFrom(service.hasPendingUploads$);
            expect(hasPending).toBe(true);
        });

        it('should emit false from hasPendingUploads$ after clear', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            service.clear();
            const hasPending = await firstValueFrom(service.hasPendingUploads$);
            expect(hasPending).toBe(false);
        });

        it('should emit a snapshot (not a reference) of the queue on each update', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            const snapshot1 = await firstValueFrom(service.queue$);
            await service.onUploadFile(createUploadData('upload-2'));
            const snapshot2 = await firstValueFrom(service.queue$);

            expect(snapshot1).toHaveLength(1);
            expect(snapshot2).toHaveLength(2);
            expect(snapshot1).not.toBe(snapshot2);
        });
    });

    describe('flush', () => {
        it('should return empty array when queue is empty', async () => {
            const result = await firstValueFrom(service.flush());
            expect(result).toEqual([]);
        });

        it('should call documentCreator.onUploadFile for each queued upload', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            await service.onUploadFile(createUploadData('upload-2'));

            await firstValueFrom(service.flush());

            expect(mockDocumentCreator.onUploadFile).toHaveBeenCalledTimes(2);
        });

        it('should return a FlushResult for each queued upload on success', async () => {
            await service.onUploadFile(createUploadData('upload-1'));

            const result = await firstValueFrom(service.flush());

            expect(result).toEqual<FlushResult[]>([{ document: MOCK_DOCUMENT }]);
        });

        it('should include a null document result when documentCreator returns null', async () => {
            mockDocumentCreator.onUploadFile
                .mockResolvedValueOnce(MOCK_DOCUMENT)
                .mockResolvedValueOnce(null);

            await service.onUploadFile(createUploadData('upload-1'));
            await service.onUploadFile(createUploadData('upload-2'));

            const result = await firstValueFrom(service.flush());

            expect(result).toEqual<FlushResult[]>([{ document: MOCK_DOCUMENT }, { document: null }]);
        });

        it('should drain the queue eagerly before document creation begins', async () => {
            await service.onUploadFile(createUploadData('upload-1'));

            let queueDuringFlush: UploadSuccessData[] = [];
            mockDocumentCreator.onUploadFile.mockImplementation(async () => {
                queueDuringFlush = await firstValueFrom(service.queue$);
                return MOCK_DOCUMENT;
            });

            await firstValueFrom(service.flush());

            expect(queueDuringFlush).toHaveLength(0);

            const queueAfterFlush = await firstValueFrom(service.queue$);
            expect(queueAfterFlush).toHaveLength(0);
        });

        it('should drain queue eagerly even when subscription is cancelled before completion', async () => {
            mockDocumentCreator.onUploadFile.mockReturnValue(
                new Promise<Document>(() => {})
            );

            await service.onUploadFile(createUploadData('upload-1'));

            const subscription: Subscription = service.flush().subscribe({});
            subscription.unsubscribe();

            const queue = await firstValueFrom(service.queue$);
            expect(queue).toHaveLength(0);
        });

        it('should set failedFileName to undefined when upload has no fileName', async () => {
            const uploadWithoutFileName: UploadSuccessData = {
                uploadedFile: { id: 'upload-no-name' } as any,
                uploadFileOptions: {} as any,
            };
            mockDocumentCreator.onUploadFile.mockRejectedValue(new Error('creation failed'));
            await service.onUploadFile(uploadWithoutFileName);

            const result = await firstValueFrom(service.flush());

            expect(result).toEqual<FlushResult[]>([{ document: null, failedFileName: undefined }]);
        });

        it('should include failedFileName in result when documentCreator rejects', async () => {
            const doc2: Document = { ...MOCK_DOCUMENT, sys_id: 'doc-2' };
            mockDocumentCreator.onUploadFile
                .mockRejectedValueOnce(new Error('creation failed'))
                .mockResolvedValueOnce(doc2);

            await service.onUploadFile(createUploadData('upload-1'));
            await service.onUploadFile(createUploadData('upload-2'));

            const result = await firstValueFrom(service.flush());

            expect(result).toEqual<FlushResult[]>([
                { document: null, failedFileName: 'upload-1.pdf' },
                { document: doc2 },
            ]);
        });

        it('should not carry failed results across consecutive flushes', async () => {
            mockDocumentCreator.onUploadFile.mockRejectedValue(new Error('creation failed'));
            await service.onUploadFile(createUploadData('upload-1'));
            const firstResult = await firstValueFrom(service.flush());
            expect(firstResult[0].failedFileName).toBe('upload-1.pdf');

            mockDocumentCreator.onUploadFile.mockResolvedValue(MOCK_DOCUMENT);
            await service.onUploadFile(createUploadData('upload-2'));
            const secondResult = await firstValueFrom(service.flush());
            expect(secondResult).toEqual<FlushResult[]>([{ document: MOCK_DOCUMENT }]);
        });

        it('should only process first caller\'s snapshot when called twice concurrently (second gets empty queue)', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            await service.onUploadFile(createUploadData('upload-2'));

            const [result1, result2] = await Promise.all([
                firstValueFrom(service.flush()),
                firstValueFrom(service.flush()),
            ]);

            const totalCalls = mockDocumentCreator.onUploadFile.mock.calls.length;
            expect(totalCalls).toBe(2);

            expect(result1).toHaveLength(2);
            expect(result1.every((r) => r.document !== undefined)).toBe(true);
            expect(result2).toHaveLength(0);

            const queueAfter = await firstValueFrom(service.queue$);
            expect(queueAfter).toHaveLength(0);
        });
    });

    describe('clear', () => {
        it('should empty the pending queue', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            service.clear();
            const queue = await firstValueFrom(service.queue$);
            expect(queue).toEqual([]);
        });

        it('should reset hasPendingUploads$ to false', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            service.clear();
            const hasPending = await firstValueFrom(service.hasPendingUploads$);
            expect(hasPending).toBe(false);
        });

        it('should be safe to call when queue is already empty', () => {
            expect(() => service.clear()).not.toThrow();
        });
    });

    describe('discardUploads', () => {
        it('should call uploadApi.deleteUpload for each queued upload with an id', async () => {
            await service.onUploadFile(createUploadData('upload-1'));
            await service.onUploadFile(createUploadData('upload-2'));

            await firstValueFrom(service.discardUploads());

            expect(mockUploadApi.deleteUpload).toHaveBeenCalledWith('upload-1');
            expect(mockUploadApi.deleteUpload).toHaveBeenCalledWith('upload-2');
        });

        it('should skip uploads without an id', async () => {
            const uploadWithoutId: UploadSuccessData = {
                uploadedFile: {} as any,
                uploadFileOptions: {} as any,
            };
            await service.onUploadFile(uploadWithoutId);

            await firstValueFrom(service.discardUploads());

            expect(mockUploadApi.deleteUpload).not.toHaveBeenCalled();
        });

        it('should drain the queue', async () => {
            await service.onUploadFile(createUploadData('upload-1'));

            await firstValueFrom(service.discardUploads());

            const queue = await firstValueFrom(service.queue$);
            expect(queue).toEqual([]);
        });

        it('should tolerate individual deleteUpload failures', async () => {
            mockUploadApi.deleteUpload
                .mockRejectedValueOnce(new Error('delete failed'))
                .mockResolvedValueOnce(undefined);

            await service.onUploadFile(createUploadData('upload-1'));
            await service.onUploadFile(createUploadData('upload-2'));

            await expect(firstValueFrom(service.discardUploads())).resolves.toBeUndefined();
            expect(mockUploadApi.deleteUpload).toHaveBeenCalledTimes(2);
        });

        it('should be safe to call when queue is empty', async () => {
            await expect(firstValueFrom(service.discardUploads())).resolves.toBeUndefined();
            expect(mockUploadApi.deleteUpload).not.toHaveBeenCalled();
        });
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { firstValueFrom, skip, Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { MockProvider, MockService } from 'ng-mocks';
import { AppConfigService } from '@alfresco/adf-core';
import { HxpUploadService } from './hxp-upload.service';
import { UploadApi } from '@hylandsoftware/hxcs-js-client';
import { FileReaderService } from './hxp-file-reader.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { FileModel, FileUploadStatus, UPLOAD_MIDDLEWARE_SERVICE } from '@hxp/shared-hxp/services';

describe('HxpUploadService', () => {
    let uploadService: HxpUploadService;
    const mockUploadApi = MockService(UploadApi);

    const file = { name: 'bigFile.png', size: 1000001 } as File;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                HxpUploadService,
                FileReaderService,
                provideHttpClientTesting(),
                MockProvider(UPLOAD_MIDDLEWARE_SERVICE),
                {
                    provide: AppConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key) => {
                            if (key === 'upload.threads') {
                                return 2;
                            }
                            if (key === 'files.excluded') {
                                return [];
                            }
                            if (key === 'folders.excluded') {
                                return [];
                            }
                            if (key === 'files.match-options') {
                                return {};
                            }
                            if (key === 'folders.match-options') {
                                return {};
                            }
                            return null;
                        }),
                    },
                },
                { provide: FileReaderService, useValue: { readAsDataURL: jest.fn() } },
                { provide: UPLOAD_API_TOKEN, useValue: mockUploadApi },
            ],
        });
        uploadService = TestBed.inject(HxpUploadService);
        jest.clearAllMocks();
    });

    afterEach(() => {
        TestBed.resetTestingModule();
        jest.clearAllMocks();
    });
    it('should set the request to error state if upload fails', async () => {
        const fileModel = new FileModel(file);

        const uploadPromise = new Promise((_, reject) => {
            return reject({ message: 'Network error' });
        });

        jest.spyOn(mockUploadApi, 'upload').mockReturnValue(uploadPromise as any);

        const errorEvent = firstValueFrom(uploadService.fileUploadError);

        uploadService.addToQueue(fileModel);
        uploadService.uploadFilesInTheQueue();

        const event = await errorEvent;
        expect(event.file).toEqual(fileModel);
        expect(event.error).toEqual({ message: 'Network error' });
        expect(event.status).toEqual(FileUploadStatus.Error);
        expect(mockUploadApi.upload).toHaveBeenCalled();
    });

    it('should set the totalError if upload fails', async () => {
        const fileModel = new FileModel(file);

        const uploadPromise = new Promise((_, reject) => {
            return reject({ message: 'Network error' });
        });

        jest.spyOn(mockUploadApi, 'upload').mockReturnValue(uploadPromise as any);

        const errorEvent = firstValueFrom(uploadService.fileUploadError);

        uploadService.addToQueue(fileModel);
        uploadService.uploadFilesInTheQueue();

        const event = await errorEvent;
        expect(event.totalError).toEqual(1);
    });

    it('should set the request to complete state if upload is successful', async () => {
        const fileModel = new FileModel(file);
        const uploadResponse = {
            id: '123',
            name: file.name,
            data: {
                nodeId: 'fake-node-id',
                name: file.name,
                size: file.size,
                mimeType: 'image/png',
                isFile: true,
                isFolder: false,
                parentId: 'fake-parent-id',
            },
        } as unknown;
        const uploadPromise = Promise.resolve(uploadResponse);

        jest.spyOn(mockUploadApi, 'upload').mockReturnValue(uploadPromise as any);

        const completeEvent = firstValueFrom(uploadService.fileUploadComplete);

        uploadService.addToQueue(fileModel);
        uploadService.uploadFilesInTheQueue();

        const event = await completeEvent;
        expect(event.file).toEqual(fileModel);
        expect(event.status).toEqual(FileUploadStatus.Complete);
        expect(event.file.data).toEqual(uploadResponse['data']);
        expect(mockUploadApi.upload).toHaveBeenCalled();
    });

    it('should set the totalCompleted if upload is successful', async () => {
        const firstFileModel = new FileModel(file);
        const secondFileModel = new FileModel(file);
        const uploadResponse = {
            id: '123',
            name: file.name,
            data: {
                nodeId: 'fake-node-id',
                name: file.name,
                size: file.size,
                mimeType: 'image/png',
                isFile: true,
                isFolder: false,
                parentId: 'fake-parent-id',
            },
        } as unknown;
        const uploadPromise = Promise.resolve(uploadResponse);

        jest.spyOn(mockUploadApi, 'upload').mockReturnValue(uploadPromise as any);

        const completeEvent = firstValueFrom(uploadService.fileUploadComplete.pipe(skip(1)));
        uploadService.addToQueue(firstFileModel, secondFileModel);
        uploadService.uploadFilesInTheQueue();

        const event = await completeEvent;
        expect(event.totalComplete).toEqual(2);
    });

    it('should abort upload when request is still ongoing', async () => {
        const fileModel = new FileModel(file);
        const cancelUpload = new Subject<void>();
        const uploadPromise = new Promise((_, reject) => {
            cancelUpload.subscribe(() => reject('Not relevant as the upload is aborted'));
        });

        jest.spyOn(mockUploadApi, 'upload').mockReturnValue(uploadPromise as any);

        const abortedEvent = firstValueFrom(uploadService.fileUploadAborted);

        uploadService.addToQueue(fileModel);
        uploadService.uploadFilesInTheQueue();

        // Simulate progress update
        fileModel.progress = {
            loaded: 200_000,
            total: 1_000_000,
            percent: 20,
            bytes: 200_000,
            lengthComputable: true,
        };
        fileModel.status = FileUploadStatus.Progress;

        uploadService.cancelUpload(fileModel);

        const event = await abortedEvent;
        expect(event.file).toEqual(fileModel);
        expect(event.status).toBe(FileUploadStatus.Aborted);
        expect(mockUploadApi.upload).toHaveBeenCalled();
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DocumentModelService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { TestBed } from '@angular/core/testing';
import { FileModel, FileUploadStatus } from '@hxp/shared-hxp/services';
import { SYS_FILISH } from '@hxp/workspace-hxp/content-services-extension/shared/util';
import { HxpUploadService } from '@hxp/workspace-hxp/shared/upload-files/feature-shell';
import { BehaviorSubject, Subject, combineLatest, firstValueFrom, lastValueFrom, of, take, throwError, toArray } from 'rxjs';
import { UploadActionStrategy } from '../..';
import { generateMockUploadData } from '../data/upload-data.mock';
import { CreateDocumentStrategy } from '../document-update-strategies/create-document-strategy';
import { NoopUploadActionStrategy } from '../document-update-strategies/noop-action-strategy';
import { UploadContentModel } from '../model/upload-content.model';
import { UploadDocumentModelStatus } from '../model/upload-document.model';
import { UploadManagerService } from './upload-manager.service';

describe('UploadManagerService', () => {
    let uploadManagerService: UploadManagerService;
    let noopDocumentAction: UploadActionStrategy;
    let documentCreateAction: UploadActionStrategy;
    const hxpUploadServiceSpy = {
        queueChanged: new Subject(),
        fileUploadComplete: new Subject(),
        fileUploadError: new Subject(),
        fileUploadCancelled: new Subject(),
        fileUploadProgress: new Subject(),
        cancelUpload: jest.fn(),
        deleteUpload: jest.fn(),
        retryUpload: jest.fn(),
        addToQueue: jest.fn(),
        clearQueue: jest.fn(),
        uploadFilesInTheQueue: jest.fn(),
    };
    const documentServiceSpy = {
        createDocument: jest.fn()
    };
    const documentModelServiceSpy = {
        getModel: jest.fn()
    };
    let modelSubject: BehaviorSubject<any>;

    beforeEach(() => {
        const mockModel = {
            hasMixin: jest.fn().mockReturnValue(false)
        };
        modelSubject = new BehaviorSubject(mockModel);
        documentModelServiceSpy.getModel.mockReturnValue(modelSubject);

        TestBed.configureTestingModule({
            providers: [
                UploadManagerService,
                { provide: DocumentService, useValue: documentServiceSpy },
                { provide: HxpUploadService, useValue: hxpUploadServiceSpy },
                { provide: DocumentModelService, useValue: documentModelServiceSpy },
            ],
        });

        hxpUploadServiceSpy.queueChanged = new Subject();
        hxpUploadServiceSpy.fileUploadCancelled = new Subject();
        hxpUploadServiceSpy.fileUploadComplete = new Subject();
        hxpUploadServiceSpy.fileUploadError = new Subject();
        hxpUploadServiceSpy.fileUploadProgress = new Subject();

        uploadManagerService = TestBed.inject(UploadManagerService);
        noopDocumentAction = TestBed.inject(NoopUploadActionStrategy);
        documentCreateAction = TestBed.inject(CreateDocumentStrategy);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should upload file', async () => {
        const data = generateMockUploadData(1);
        const upload = data[0];

        const uploadPromise = firstValueFrom(uploadManagerService.initiateUpload(upload));

        upload.fileModel.status = FileUploadStatus.Complete;
        upload.fileModel.data = { id: 0 };

        hxpUploadServiceSpy.fileUploadComplete.next({ file: upload.fileModel });

        const uploaded = await uploadPromise;
        expect(uploaded).toEqual(upload);
        expect(uploaded.fileModel.status).toBe(FileUploadStatus.Complete);
        expect(uploaded.documentModel.document.sysfile_blob.uploadId).toBe(uploaded.fileModel.data.id);
    });

    it('should add upload requests to queue', async () => {
        expect(uploadManagerService.getQueue()).toHaveLength(0);

        const data = generateMockUploadData(3);
        const queuePromise = lastValueFrom(uploadManagerService.queueChanged.pipe(take(3)));

        for (const upload of data) {
            uploadManagerService.addToQueue(upload);
        }

        const queue = await queuePromise;
        expect(queue).toHaveLength(3);
        expect(uploadManagerService.getQueue()).toHaveLength(3);
        expect(queue).toEqual(data);
    });

    it('should clear the queue', async () => {
        for (const upload of generateMockUploadData(3)) {
            uploadManagerService.addToQueue(upload);
        }

        const queuePromise = firstValueFrom(uploadManagerService.queueChanged);

        expect(uploadManagerService.getQueue()).toHaveLength(3);
        uploadManagerService.clearQueue();

        const queue = await queuePromise;
        expect(queue).toHaveLength(0);
        expect(uploadManagerService.getQueue()).toHaveLength(0);
    });

    it('should cancel upload', () => {
        const data = generateMockUploadData(1);
        const upload = data[0];

        uploadManagerService.cancelUpload(upload);

        expect(hxpUploadServiceSpy.cancelUpload).toHaveBeenCalledWith(upload.fileModel);
    });

    it('should stop all uploads in the queue', () => {
        for (const upload of generateMockUploadData(3)) {
            uploadManagerService.addToQueue(upload);
        }

        uploadManagerService.cancelAllUploads();

        expect(uploadManagerService.getQueue()).toHaveLength(3);
        expect(hxpUploadServiceSpy.cancelUpload).toHaveBeenCalledTimes(3);
        expect(hxpUploadServiceSpy.clearQueue).not.toHaveBeenCalled();
    });

    it('should stop all uploads and clear the queue', async () => {
        for (const upload of generateMockUploadData(3)) {
            uploadManagerService.addToQueue(upload);
        }

        expect(uploadManagerService.getQueue()).toHaveLength(3);
        expect(hxpUploadServiceSpy.cancelUpload).not.toHaveBeenCalled();
        expect(hxpUploadServiceSpy.clearQueue).not.toHaveBeenCalled();

        const queuePromise = firstValueFrom(uploadManagerService.queueChanged);
        const queueEmptiedPromise = firstValueFrom(uploadManagerService.queueEmptied$);
        uploadManagerService.cancelAllAndClearQueue();

        expect(uploadManagerService.getQueue()).toHaveLength(0);
        expect(hxpUploadServiceSpy.cancelUpload).toHaveBeenCalledTimes(3);
        expect(hxpUploadServiceSpy.clearQueue).toHaveBeenCalled();

        const queueChangedResult = await queuePromise;
        const queueEmptiedResult = await queueEmptiedPromise;

        expect(queueChangedResult).toHaveLength(0);
        expect(queueEmptiedResult).toBeUndefined();
    });

    it('should complete with files already uploaded', async () => {
        const data = generateMockUploadData(3);
        for (const [index, upload] of data.entries()) {
            upload.postFileUploadAction = noopDocumentAction;
            upload.fileModel.status = FileUploadStatus.Complete;
            upload.fileModel.data = { id: index };
            upload.documentModel.document['sysfile_blob'] = {
                uploadId: index + '',
            };
        }
        documentServiceSpy.createDocument.mockImplementation((doc) => {
            const match = data.find((u) => u.documentModel.document === doc);
            return of(match ? match.documentModel.document : doc);
        });

        for (const upload of data) {
            uploadManagerService.addToQueue(upload);
        }

        const completedPromise = lastValueFrom(
            uploadManagerService.uploadCompleted.pipe(take(data.length), toArray())
        );

        for (const upload of data) {
            hxpUploadServiceSpy.fileUploadComplete.next({ file: upload.fileModel });
        }

        uploadManagerService.completeQueuedUploads();

        const completed = await completedPromise;
        expect(completed).toHaveLength(data.length);
        for (const upload of completed) {
            expect(upload.documentModel.status).toBe(UploadDocumentModelStatus.COMPLETED);
        }
    });

    it('should complete with files still uploading', async () => {
        const data = generateMockUploadData();
        for (const upload of data) {
            upload.postFileUploadAction = noopDocumentAction;
        }
        documentServiceSpy.createDocument.mockImplementation((doc) => {
            const match = data.find((u) => u.documentModel.document === doc);
            return of(match ? match.documentModel.document : doc);
        });

        for (const upload of data) {
            uploadManagerService.addToQueue(upload);
        }

        const completedPromise = lastValueFrom(
            uploadManagerService.uploadCompleted.pipe(take(data.length), toArray())
        );

        for (const [index, upload] of data.entries()) {
            upload.fileModel.status = FileUploadStatus.Complete;
            upload.fileModel.data = { id: index };
        }
        uploadManagerService.completeQueuedUploads();

        for (const upload of data) {
            hxpUploadServiceSpy.fileUploadComplete.next({ file: upload.fileModel });
        }

        const completed = await completedPromise;
        expect(completed).toHaveLength(data.length);
        for (const upload of completed) {
            expect(upload.documentModel.status).toBe(UploadDocumentModelStatus.COMPLETED);
        }
    });

    it('should retry file upload if file upload has failed', async () => {
        hxpUploadServiceSpy.retryUpload.mockImplementation((model: FileModel) => {
            model.status = FileUploadStatus.Complete;
        });

        const data = generateMockUploadData();
        for (const [index, upload] of data.entries()) {
            if (index === 0) {
                upload.fileModel.status = FileUploadStatus.Error;
            }
            upload.fileModel.data = { id: index };
        }
        documentServiceSpy.createDocument.mockImplementation((doc) => {
            const match = data.find((u) => u.documentModel.document === doc);
            return of(match ? match.documentModel.document : doc);
        });
        for (const upload of data) {
            uploadManagerService.addToQueue(upload);
        }

        const retriedPromise = firstValueFrom(uploadManagerService.uploadRetried);

        expect(hxpUploadServiceSpy.retryUpload).not.toHaveBeenCalled();

        uploadManagerService.completeQueuedUploads();

        expect(hxpUploadServiceSpy.retryUpload).not.toHaveBeenCalled();

        uploadManagerService.retryUpload(data[0]);

        const retriedUpload = await retriedPromise;
        expect(retriedUpload).toBe(data[0]);
        expect(hxpUploadServiceSpy.retryUpload).toHaveBeenCalledWith(data[0].fileModel);
    });

    it('should retry document update action if file has been uploaded', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const data = generateMockUploadData();
        const erroredUpload = data[0];

        for (const [index, upload] of data.entries()) {
            upload.postFileUploadAction = documentCreateAction;
            upload.fileModel.status = FileUploadStatus.Complete;
            upload.fileModel.data = { id: index };
        }
        documentServiceSpy.createDocument
            .mockImplementationOnce(() => throwError(() => 'Unknown random error'))
            .mockImplementation((doc) => {
                const match = data.find((u) => u.documentModel.document === doc);
                return of(match ? match.documentModel.document : doc);
            });
        for (const upload of data) {
            uploadManagerService.addToQueue(upload);
        }

        const resultPromise = firstValueFrom(
            combineLatest([uploadManagerService.uploadError, uploadManagerService.uploadRetried])
        );

        uploadManagerService.completeQueuedUploads();

        uploadManagerService.retryUpload(erroredUpload);

        const [errorModel, retriedModel] = await resultPromise;
        consoleErrorSpy.mockRestore();

        expect(errorModel).toEqual(erroredUpload);
        expect(retriedModel).toEqual(erroredUpload);
        expect(documentServiceSpy.createDocument).toHaveBeenCalledWith(erroredUpload.documentModel.document);
    });

    describe('updateBlobId', () => {
        let mockUpload: UploadContentModel;
        let mockDocumentModel: any;

        beforeEach(() => {
            mockDocumentModel = {
                hasMixin: jest.fn()
            };

            modelSubject.next(mockDocumentModel);

            mockUpload = {
                fileModel: new FileModel({ name: 'testFile.pdf', size: 500000, type: 'application/pdf' } as File),
                documentModel: {
                    status: UploadDocumentModelStatus.PENDING,
                    document: {
                        sys_primaryType: 'TestDocType',
                        sys_title: 'Test Document',
                        sysfile_blob: undefined
                    }
                },
                postFileUploadAction: noopDocumentAction
            } as UploadContentModel;

            mockUpload.fileModel.data = { id: 'test-upload-id-123' };
        });

        it('should exit if primaryType is missing', async () => {
            (mockUpload.documentModel.document.sys_primaryType as any) = undefined;

            const uploadPromise = firstValueFrom(uploadManagerService.initiateUpload(mockUpload));

            mockUpload.fileModel.status = FileUploadStatus.Complete;
            hxpUploadServiceSpy.fileUploadComplete.next({ file: mockUpload.fileModel });

            const uploaded = await uploadPromise;
            expect(uploaded.documentModel.document.sysfile_blob).toBeUndefined();
        });

        it('should initialize sysfile_blob and set uploadId when document has SysFilish mixins', async () => {
            mockDocumentModel.hasMixin.mockImplementation((type: string, mixin: string) => {
                return mixin === SYS_FILISH;
            });

            const uploadPromise = firstValueFrom(uploadManagerService.initiateUpload(mockUpload));

            mockUpload.fileModel.status = FileUploadStatus.Complete;
            hxpUploadServiceSpy.fileUploadComplete.next({ file: mockUpload.fileModel });

            const uploaded = await uploadPromise;
            expect(uploaded.documentModel.document.sysfile_blob).toBeDefined();
            expect(uploaded.documentModel.document.sysfile_blob.uploadId).toBe('test-upload-id-123');
            expect(uploaded.documentModel.document.sysfile_blob.filename).toBe('testFile.pdf');
            expect(uploaded.documentModel.document.sysfile_blob.length).toBe(500000);
            expect(uploaded.documentModel.document.sysfile_blob.mimeType).toBe('application/pdf');
            expect(mockDocumentModel.hasMixin).toHaveBeenCalledWith('TestDocType', SYS_FILISH);
        });

        it('should set uploadId when sysfile_blob already exists', async () => {
            mockUpload.documentModel.document.sysfile_blob = { uploadId: 'old-id' };
            mockDocumentModel.hasMixin.mockImplementation((type: string, mixin: string) => {
                return mixin === SYS_FILISH;
            });

            const uploadPromise = firstValueFrom(uploadManagerService.initiateUpload(mockUpload));

            mockUpload.fileModel.status = FileUploadStatus.Complete;
            hxpUploadServiceSpy.fileUploadComplete.next({ file: mockUpload.fileModel });

            const uploaded = await uploadPromise;
            expect(uploaded.documentModel.document.sysfile_blob.uploadId).toBe('test-upload-id-123');
        });

        it('should not initialize sysfile_blob when document doesn\'t have SysFilish mixin', async () => {
            mockDocumentModel.hasMixin.mockReturnValue(false);

            const uploadPromise = firstValueFrom(uploadManagerService.initiateUpload(mockUpload));

            mockUpload.fileModel.status = FileUploadStatus.Complete;
            hxpUploadServiceSpy.fileUploadComplete.next({ file: mockUpload.fileModel });

            const uploaded = await uploadPromise;
            expect(uploaded.documentModel.document.sysfile_blob).toBeUndefined();
            expect(mockDocumentModel.hasMixin).toHaveBeenCalledWith('TestDocType', SYS_FILISH);
        });
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppConfigService, NoopTranslateModule } from '@alfresco/adf-core';
import { UploadBase } from './upload-base';
import { UploadFilesEvent } from '../events/upload-files.event';
import { FileReaderService } from '../services/hxp-file-reader.service';
import { HxpUploadService } from '../services/hxp-upload.service';
import { FileUploadErrorEvent } from '../events/file.event';
import { mockHxcsJsClientConfigurationService, uploadApiProvider } from '@alfresco/adf-hx-content-services/api';
import { firstValueFrom } from 'rxjs';
import { EveryonePermission, GroupPermission, PermissionEnum, UserPermission } from '@hxp/shared-hxp/services';

@Component({
    selector: 'hxp-upload-button-test',
    template: 'test component',
})
export class UploadTestComponent extends UploadBase {}

const file = { name: 'bigFile.png', size: 1000 } as File;

const mockAppConfigService = {
    status: 'loaded',
    get: () => {
        return undefined;
    },
};

describe('UploadBase', () => {
    let component: UploadTestComponent;
    let fixture: ComponentFixture<UploadTestComponent>;
    let uploadService: HxpUploadService;

    beforeEach(() => {
        TestBed.resetTestingModule();

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, UploadTestComponent],
            declarations: [],
            providers: [
                FileReaderService,
                HxpUploadService,
                mockHxcsJsClientConfigurationService,
                {
                    provide: AppConfigService,
                    useValue: mockAppConfigService,
                },
                uploadApiProvider,
            ],
        });
        fixture = TestBed.createComponent(UploadTestComponent);
        uploadService = TestBed.inject(HxpUploadService);

        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        TestBed.resetTestingModule();
    });

    describe('beginUpload', () => {
        it('should raise event', () => {
            jest.spyOn(uploadService, 'addToQueue').mockImplementation();
            jest.spyOn(uploadService, 'uploadFilesInTheQueue').mockImplementation();

            component.beginUpload.subscribe((uploadFilesEvent: UploadFilesEvent) => {
                expect(uploadFilesEvent.files[0].file).toEqual(file);
            });

            component.uploadFiles([file]);
            fixture.detectChanges();
        });

        it('should pause upload', fakeAsync(() => {
            jest.spyOn(uploadService, 'addToQueue').mockImplementation();
            jest.spyOn(uploadService, 'uploadFilesInTheQueue').mockImplementation();

            let prevented = false;
            component.beginUpload.subscribe((event) => {
                event.preventDefault();
                prevented = true;
            });

            component.uploadFiles([file]);

            tick();
            expect(prevented).toBeTruthy();
            expect(uploadService.addToQueue).not.toHaveBeenCalled();
            expect(uploadService.uploadFilesInTheQueue).not.toHaveBeenCalled();
        }));

        it('should resume upload', fakeAsync(() => {
            const addToQueue = jest.spyOn(uploadService, 'addToQueue').mockImplementation();
            const uploadFilesInTheQueue = jest.spyOn(uploadService, 'uploadFilesInTheQueue').mockImplementation();

            let prevented = false;
            let uploadEvent: UploadFilesEvent | undefined;

            component.beginUpload.subscribe((event) => {
                uploadEvent = event;
                event.preventDefault();
                prevented = true;
            });

            component.uploadFiles([file]);

            tick();
            expect(prevented).toBeTruthy();
            expect(addToQueue).not.toHaveBeenCalled();
            expect(uploadFilesInTheQueue).not.toHaveBeenCalled();

            addToQueue.mockClear();
            uploadFilesInTheQueue.mockClear();

            uploadEvent?.resumeUpload();

            expect(addToQueue).toHaveBeenCalled();
            expect(uploadFilesInTheQueue).toHaveBeenCalled();
        }));

        it('should emit callback events on resume', () => {
            let uploadEvent: UploadFilesEvent | undefined;

            component.beginUpload.subscribe((event) => {
                uploadEvent = event;
            });

            component.successUpload.subscribe((success) => {
                expect(success).toBeTruthy();
            });

            component.uploadFiles([file]);
            uploadEvent?.resumeUpload();
        });
    });

    describe('fileSize', () => {
        const files: File[] = [{ name: 'bigFile.png', size: 1000 } as File, { name: 'smallFile.png', size: 10 } as File];

        let addToQueueSpy: jest.SpyInstance;

        beforeEach(() => {
            addToQueueSpy = jest.spyOn(uploadService, 'addToQueue');
        });

        afterEach(() => {
            fixture.destroy();
            TestBed.resetTestingModule();
        });

        it('should filter out file, which are too big if max file size is set', () => {
            component.maxFilesSize = 100;

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(1);
            expect(filesCalledWith[0].name).toBe('smallFile.png');
        });

        it('should filter out all files if maxFilesSize is 0', () => {
            component.maxFilesSize = 0;

            component.uploadFiles(files);

            expect(addToQueueSpy.mock.calls.length).toBe(0);
        });

        it('should allow file of 0 size when the max file size is set to 0', () => {
            const zeroFiles: File[] = [{ name: 'zeroFile.png', size: 0 } as File];
            component.maxFilesSize = 0;

            component.uploadFiles(zeroFiles);

            expect(addToQueueSpy.mock.calls.length).toBeGreaterThan(0);
        });

        it('should filter out all files if maxFilesSize is <0', () => {
            component.maxFilesSize = -2;

            component.uploadFiles(files);

            expect(addToQueueSpy.mock.calls.length).toBe(0);
        });

        it('should output an error when you try to upload a file too big', async () => {
            component.maxFilesSize = 100;

            const errorEventPromise: Promise<FileUploadErrorEvent> = firstValueFrom(component.errorUpload);
            component.uploadFiles(files);
            const errorEvent = await errorEventPromise;

            expect(errorEvent.error).toBe('FILE_UPLOAD.MESSAGES.EXCEED_MAX_FILE_SIZE');
        });

        it('should not filter out files if max file size is not set', () => {
            component.maxFilesSize = undefined;

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(2);
        });
    });

    describe('uploadFiles', () => {
        const files: File[] = [
            { name: 'phobos.jpg', size: 10 } as File,
            { name: 'deimos.png', size: 10 } as File,
            { name: 'ganymede.bmp', size: 10 } as File,
        ];

        let addToQueueSpy: jest.SpyInstance;

        beforeEach(() => {
            addToQueueSpy = jest.spyOn(uploadService, 'addToQueue');
        });

        afterEach(() => {
            fixture.destroy();
            TestBed.resetTestingModule();
        });

        it('should filter out file, when file type having white space in the beginning', () => {
            component.acceptedFilesType = ' .jpg';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(1);
            expect(filesCalledWith[0].name).toBe('phobos.jpg');
        });

        it('should filter out file, when file types having white space in the beginning', () => {
            component.acceptedFilesType = '.jpg, .png';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(2);
            expect(filesCalledWith[0].name).toBe('phobos.jpg');
            expect(filesCalledWith[1].name).toBe('deimos.png');
        });

        it('should not filter out file, when file type having white space in the middle', () => {
            component.acceptedFilesType = '.jpg, .p ng';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(1);
            expect(filesCalledWith[0].name).toBe('phobos.jpg');
        });

        it('should filter out file, when file types having white space in the end', () => {
            component.acceptedFilesType = '.jpg ,.png ';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(2);
            expect(filesCalledWith[0].name).toBe('phobos.jpg');
            expect(filesCalledWith[1].name).toBe('deimos.png');
        });

        it('should filter out file, when file types not having space and dot', () => {
            component.acceptedFilesType = 'jpg,png';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(2);
            expect(filesCalledWith[0].name).toBe('phobos.jpg');
            expect(filesCalledWith[1].name).toBe('deimos.png');
        });

        it('should filter out file, which is not part of the acceptedFilesType', () => {
            component.acceptedFilesType = '.jpg';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(1);
            expect(filesCalledWith[0].name).toBe('phobos.jpg');
        });

        it('should filter out files, which are not part of the acceptedFilesType', () => {
            component.acceptedFilesType = '.jpg,.png';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(2);
            expect(filesCalledWith[0].name).toBe('phobos.jpg');
            expect(filesCalledWith[1].name).toBe('deimos.png');
        });

        it('should not filter out anything if acceptedFilesType is wildcard', () => {
            component.acceptedFilesType = '*';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(3);
            expect(filesCalledWith[0].name).toBe('phobos.jpg');
            expect(filesCalledWith[1].name).toBe('deimos.png');
            expect(filesCalledWith[2].name).toBe('ganymede.bmp');
        });

        it('should not add any file to que if everything is filtered out', () => {
            component.acceptedFilesType = 'doc';

            component.uploadFiles(files);

            expect(addToQueueSpy).not.toHaveBeenCalled();
        });

        it('should add permissions to all of the file models in the upload queue if permissions are set', () => {
            const mockFilePermissions = [
                {
                    permission: PermissionEnum.WRITE,
                    granted: true,
                    user: {
                        id: 'ce96ab1c-2c1c-4b42-b896-8fbf36a46215',
                        firstName: 'test-admin',
                        lastName: 'test-admin',
                        username: 'test-admin',
                        email: 'test-admin@hyland.com',
                        displayName: 'test-admin test-admin',
                    },
                } as UserPermission,
                {
                    permission: PermissionEnum.WRITE,
                    granted: true,
                    group: {
                        id: 'c417a65b-e42f-4b7f-a028-b0ef6a1d5340',
                        name: 'hr',
                    },
                } as GroupPermission,
                {
                    permission: PermissionEnum.EVERYTHING,
                    granted: false,
                    user: {
                        id: '__Everyone__',
                    },
                } as EveryonePermission,
            ];
            component.permissions = mockFilePermissions;
            component.acceptedFilesType = '*';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(3);
            expect(filesCalledWith[0].options.permissions).toBe(mockFilePermissions);
            expect(filesCalledWith[1].options.permissions).toBe(mockFilePermissions);
            expect(filesCalledWith[2].options.permissions).toBe(mockFilePermissions);
        });

        it('should add content type to all of the file models in the upload queue if content type is set', () => {
            const contentType = 'ContentTypeA';
            component.contentType = contentType;
            component.acceptedFilesType = '*';

            component.uploadFiles(files);

            const filesCalledWith = addToQueueSpy.mock.calls.at(-1);
            expect(filesCalledWith.length).toBe(3);
            expect(filesCalledWith[0].options.contentType).toBe(contentType);
            expect(filesCalledWith[1].options.contentType).toBe(contentType);
            expect(filesCalledWith[2].options.contentType).toBe(contentType);
        });
    });
});

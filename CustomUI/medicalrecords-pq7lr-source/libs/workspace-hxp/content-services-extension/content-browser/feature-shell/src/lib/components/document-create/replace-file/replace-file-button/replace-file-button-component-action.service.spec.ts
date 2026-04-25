/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ReplaceFileButtonComponentActionService } from './replace-file-button-component-action.service';
import { ActionContext, DocumentPermissions, HxpNotificationService } from '@alfresco/adf-hx-content-services/services';
import { UploadManagerService, UploadContentModel } from '@hxp/workspace-hxp/content-services-extension/shared/upload/feature-shell';
import { UpdateDocumentBlobActionStrategy } from './update-document-blob-action-strategy';
import { Document } from '@hylandsoftware/hxcs-js-client';

describe('ReplaceFileButtonComponentActionService', () => {
    let replaceFileButtonComponentActionService: ReplaceFileButtonComponentActionService;

    const notificationServiceSpy = { showSuccess: jest.fn(), showError: jest.fn() };
    const uploadManagerServiceSpy = {
        createUploadModel: jest.fn(),
        addToQueue: jest.fn(),
        initiateUpload: jest.fn(),
        upload: jest.fn(),
        uploadFilesInTheQueue: jest.fn(),
    };
    const updateDocumentBlobActionStrategySpy: any = {};

    const replaceFileDocument: Document = {
        sys_id: '123',
        sys_title: 'test',
        sys_primaryType: 'SysFile',
        sys_mixinTypes: ['SysFilish'],
        sys_effectivePermissions: [DocumentPermissions.WRITE],
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ReplaceFileButtonComponentActionService,
                { provide: HxpNotificationService, useValue: notificationServiceSpy },
                { provide: UploadManagerService, useValue: uploadManagerServiceSpy },
                { provide: UpdateDocumentBlobActionStrategy, useValue: updateDocumentBlobActionStrategySpy },
            ],
        });

        replaceFileButtonComponentActionService = TestBed.inject(ReplaceFileButtonComponentActionService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        notificationServiceSpy.showSuccess.mockClear();
        notificationServiceSpy.showError.mockClear();
        uploadManagerServiceSpy.createUploadModel.mockClear();
        uploadManagerServiceSpy.addToQueue.mockClear();
        uploadManagerServiceSpy.initiateUpload.mockClear();
        uploadManagerServiceSpy.upload.mockClear();
    });

    it('should not be available if document is not filish', () => {
        const nonFilishDocument = { ...replaceFileDocument, sys_mixinTypes: [] } as Document;
        const actionContext = { documents: [nonFilishDocument] } as ActionContext;

        expect(replaceFileButtonComponentActionService.isAvailable(actionContext)).toBe(false);
    });

    it('should not be available if document does not have write permissions', () => {
        const nonWritableDocument = { ...replaceFileDocument, sys_effectivePermissions: [] } as Document;
        const actionContext = { documents: [nonWritableDocument] } as ActionContext;

        expect(replaceFileButtonComponentActionService.isAvailable(actionContext)).toBe(false);
    });

    it('should be available if document is filish and has write permission', () => {
        const actionContext = { documents: [replaceFileDocument] } as ActionContext;

        expect(replaceFileButtonComponentActionService.isAvailable(actionContext)).toBe(true);
    });

    it('should upload and display success notification', () => {
        const uploadContentModel = {} as UploadContentModel;
        const actionContext = { documents: [replaceFileDocument] } as ActionContext;
        const inputSpy = jest.spyOn(document, 'createElement');

        uploadManagerServiceSpy.createUploadModel.mockReturnValue(uploadContentModel);
        uploadManagerServiceSpy.initiateUpload.mockReturnValue(of(uploadContentModel));
        uploadManagerServiceSpy.upload.mockReturnValue(of(uploadContentModel));

        replaceFileButtonComponentActionService.execute(actionContext);

        expect(inputSpy).toHaveBeenCalledWith('input');

        const inputElement = inputSpy.mock.results.at(-1).value as HTMLInputElement;

        expect(inputElement).toBeTruthy();

        const mockFile = new File([''], 'filename', { type: 'text/html' });
        const event = new Event('change');
        Object.defineProperty(event, 'target', { writable: false, value: { files: [mockFile] } });

        inputElement.dispatchEvent(event);

        expect(uploadManagerServiceSpy.initiateUpload).toHaveBeenCalledWith(uploadContentModel);
        expect(uploadManagerServiceSpy.upload).toHaveBeenCalledWith(uploadContentModel);
        expect(notificationServiceSpy.showSuccess).toHaveBeenCalledWith('REPLACE_FILE.SUCCESS');
    });

    it('should not upload and display error notification', () => {
        const uploadContentModel = {} as UploadContentModel;
        const actionContext = { documents: [replaceFileDocument] } as ActionContext;
        const inputSpy = jest.spyOn(document, 'createElement');

        uploadManagerServiceSpy.createUploadModel.mockReturnValue(uploadContentModel);
        uploadManagerServiceSpy.initiateUpload.mockReturnValue(throwError(() => new Error('Upload failed')));
        uploadManagerServiceSpy.upload.mockReturnValue(throwError(() => new Error('Upload failed')));

        expect(uploadManagerServiceSpy.initiateUpload).not.toHaveBeenCalled();
        expect(uploadManagerServiceSpy.upload).not.toHaveBeenCalled();
        expect(notificationServiceSpy.showSuccess).not.toHaveBeenCalled();

        replaceFileButtonComponentActionService.execute(actionContext);

        expect(inputSpy).toHaveBeenCalledWith('input');

        const inputElement = inputSpy.mock.results.at(-1).value as HTMLInputElement;

        expect(inputElement).toBeTruthy();

        const mockFile = new File([''], 'filename', { type: 'text/html' });
        const event = new Event('change');
        Object.defineProperty(event, 'target', { writable: false, value: { files: [mockFile] } });

        inputElement.dispatchEvent(event);

        expect(uploadManagerServiceSpy.initiateUpload).toHaveBeenCalledWith(uploadContentModel);
        expect(uploadManagerServiceSpy.upload).not.toHaveBeenCalled();
        expect(notificationServiceSpy.showError).toHaveBeenCalledWith('REPLACE_FILE.ERROR');
    });
});

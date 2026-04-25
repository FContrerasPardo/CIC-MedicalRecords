/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { UpdateDocumentBlobActionStrategy } from './update-document-blob-action-strategy';
import { UploadContentModel, UploadDocumentModel } from '@hxp/workspace-hxp/content-services-extension/shared/upload/feature-shell';

describe('UpdateDocumentBlobActionStrategy', () => {
    let updateDocumentBlobActionStrategy: UpdateDocumentBlobActionStrategy;
    let documentService: any;

    beforeEach(() => {
        const spy = { updateDocument: jest.fn() };

        TestBed.configureTestingModule({
            providers: [UpdateDocumentBlobActionStrategy, { provide: DocumentService, useValue: spy }],
        });

        updateDocumentBlobActionStrategy = TestBed.inject(UpdateDocumentBlobActionStrategy);
        documentService = TestBed.inject(DocumentService) as any;
    });

    it('should update document blob', async () => {
        const mockDocument: Document = { sys_id: '123', sys_title: 'test' } as Document;
        const uploadModel: UploadContentModel = {
            documentModel: new UploadDocumentModel({
                ...mockDocument,
                sysfile_blob: { uploadId: 'abc' },
            }),
        } as UploadContentModel;

        documentService.updateDocument.mockReturnValue(of(mockDocument));

        expect(documentService.updateDocument).not.toHaveBeenCalled();

        const document = await firstValueFrom(updateDocumentBlobActionStrategy.execute(uploadModel));
        expect(document).toEqual(mockDocument);
        expect(documentService.updateDocument).toHaveBeenCalledWith('123', {
            sysfile_blob: { uploadId: 'abc' },
        });
    });
});

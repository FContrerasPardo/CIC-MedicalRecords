/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { CreateDocumentStrategy } from './create-document-strategy';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { UploadContentModel } from '../model/upload-content.model';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { of } from 'rxjs';

describe('CreateDocumentStrategy', () => {
    let strategy: CreateDocumentStrategy;
    let documentServiceSpy: jest.Mocked<DocumentService>;

    beforeEach(() => {
        const spy = {
            createDocument: jest.fn()
        } as unknown as jest.Mocked<DocumentService>;

        TestBed.configureTestingModule({
            providers: [CreateDocumentStrategy, { provide: DocumentService, useValue: spy }],
        });

        strategy = TestBed.inject(CreateDocumentStrategy);
        documentServiceSpy = TestBed.inject(DocumentService) as jest.Mocked<DocumentService>;
    });

    it('should call createDocument and return the created document', (done) => {
        const mockDocument: Document = { sys_id: '123', sys_title: 'test' } as Document;
        const uploadModel: UploadContentModel = { documentModel: { document: mockDocument } } as UploadContentModel;

        documentServiceSpy.createDocument.mockReturnValue(of(mockDocument));

        expect(documentServiceSpy.createDocument).not.toHaveBeenCalled();

        strategy.execute(uploadModel).subscribe({
            next: (document) => {
                expect(document).toEqual(mockDocument);
                expect(documentServiceSpy.createDocument).toHaveBeenCalledWith(mockDocument);
                done();
            },
        });
    });
});

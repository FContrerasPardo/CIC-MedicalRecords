/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { BreadcrumbLabelPipe } from './breadcrumb-label.pipe';
import { CacheLabelService } from '../services/cache-label-service';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Subject } from 'rxjs';

describe('BreadcrumbLabelPipe', () => {
    let pipe: BreadcrumbLabelPipe;
    let cacheLabelService: CacheLabelService;
    const mockDocumentService = {
        documentUpdated$: new Subject<{ document: Document }>()
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [
                BreadcrumbLabelPipe,
                { provide: DocumentService, useValue: mockDocumentService }
            ],
        });

        pipe = TestBed.inject(BreadcrumbLabelPipe);
        cacheLabelService = TestBed.inject(CacheLabelService);

        jest.spyOn(cacheLabelService, 'getTranslation').mockReturnValue('some translation');
    });

    it('should create the pipe', () => {
        expect(pipe).toBeTruthy();
    });

    describe('transform', () => {
        it('should return an empty string when doc is null or undefined', () => {

            const resultNull = pipe.transform(null as unknown as Document, 'someKey');
            const resultUndefined = pipe.transform(undefined as unknown as Document, 'someKey');

            expect(resultNull).toBe('');
            expect(resultUndefined).toBe('');
        });

        it('should call getTranslation with the correct parameters and return the translated value', () => {
            const mockDoc = {} as Document;
            const translationKey = 'DOCUMENT_BREADCRUMB.ROOT';
            const translationValue = 'some translation';

            const result = pipe.transform(mockDoc, translationKey);

            expect(result).toBe(translationValue);

            expect(cacheLabelService.getTranslation).toHaveBeenCalledWith(mockDoc, translationKey);
        });
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { EMPTY, of } from 'rxjs';
import { IdpImageLoadingService } from './idp-image-loading.service';
import { IdpBackendService, IdpSharedImageLoadingService, ResponseFormat } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';

type Members<T> = Pick<T, keyof T>;

export function MockIdpImageLoadingService() {
    return {
        getImageDataForPage$() {
            return EMPTY;
        },
        getPageOcrData$() {
            return EMPTY;
        },
        cleanup() {},
    } satisfies Members<IdpImageLoadingService>;
}

describe('IdpImageLoadingService', () => {
    let service: IdpImageLoadingService;
    let storeMock: any;
    let sharedImageLoadingServiceMock: any;
    let idpBackendServiceMock: any;

    beforeEach(() => {
        storeMock = {
            select: jest.fn(),
            dispatch: jest.fn(),
        };
        sharedImageLoadingServiceMock = {
            getImageDataForPage$: jest.fn(),
            getCachedMetadata: jest.fn(),
            cleanup: jest.fn(),
            maxCacheSize: 10,
        };
        idpBackendServiceMock = {
            getPageOcr$: jest.fn(),
        };

        TestBed.configureTestingModule({
            providers: [
                IdpImageLoadingService,
                { provide: Store, useValue: storeMock },
                { provide: IdpSharedImageLoadingService, useValue: sharedImageLoadingServiceMock },
                { provide: IdpBackendService, useValue: idpBackendServiceMock },
            ],
        });

        service = TestBed.inject(IdpImageLoadingService);
    });

    it('should call sharedImageLoadingService.getImageDataForPage$ if page exists', (done) => {
        const page = { documentId: 'docId' };
        const correlationId = 'corrId';
        const taskInfo = { appName: 'app', taskId: 'task-1', taskName: 'name', rootProcessInstanceId: 'root-1' };
        const imageInfo = { viewerRotation: 90, correctionAngle: 45 };
        storeMock.select.mockReturnValueOnce(of(page)).mockReturnValueOnce(of(correlationId)).mockReturnValueOnce(of(taskInfo));
        sharedImageLoadingServiceMock.getImageDataForPage$.mockReturnValueOnce(of(imageInfo));

        service.getImageDataForPage$('pageId').subscribe((result) => {
            expect(sharedImageLoadingServiceMock.getImageDataForPage$).toHaveBeenCalledWith(page, correlationId, false, taskInfo.taskId);
            expect(storeMock.dispatch).toHaveBeenCalled();
            expect(result).toEqual(imageInfo);
            done();
        });
    });

    it('should call idpBackendService.getPageOcr$ if page exists in getPageOcrData$', (done) => {
        const page = { fileReference: 'ref', sourcePageIndex: 1 };
        const correlationId = 'corrId';
        const ocrData = { text: 'ocr' };
        storeMock.select.mockReturnValueOnce(of(page)).mockReturnValueOnce(of(correlationId));
        idpBackendServiceMock.getPageOcr$.mockReturnValueOnce(of(ocrData));

        service.getPageOcrData$('pageId', ResponseFormat.Ocr).subscribe((result) => {
            expect(idpBackendServiceMock.getPageOcr$).toHaveBeenCalledWith(
                correlationId,
                page.fileReference,
                page.sourcePageIndex,
                ResponseFormat.Ocr
            );
            expect(result).toEqual(ocrData);
            done();
        });
    });

    it('should call cleanup on sharedImageLoadingService and clear ocrCache', () => {
        const clearSpy = jest.spyOn((service as any).ocrCache, 'clear');
        service.cleanup();
        expect(sharedImageLoadingServiceMock.cleanup).toHaveBeenCalled();
        expect(clearSpy).toHaveBeenCalled();
    });
});

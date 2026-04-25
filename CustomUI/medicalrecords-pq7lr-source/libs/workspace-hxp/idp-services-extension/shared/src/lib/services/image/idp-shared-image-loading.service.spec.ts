/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom, forkJoin } from 'rxjs';
import { IdpSharedImageLoadingService } from './idp-shared-image-loading.service';
import { IdpBackendService } from '../backend/idp-backend.service';
import { IdpDocumentPage, IdpImageInfo } from '../../models/common-models';
import { IdpFileMetadata } from '../../models/api-models/idp-api-recognition-models';
import { DestroyRef } from '@angular/core';

class MockIdpBackendService implements Partial<IdpBackendService> {
    getFileMetadata$ = jest.fn().mockReturnValue(of(undefined));
    getFilePageImageBlob$ = jest.fn().mockReturnValue(of(undefined));
}

describe('IdpSharedImageLoadingService', () => {
    let service: IdpSharedImageLoadingService;
    let idpBackendService: IdpBackendService;
    const mockBlobUrl = 'blobUrl';
    const mockPage: IdpDocumentPage = {
        id: 'page1',
        name: 'Page 1',
        documentId: 'doc1',
        fileReference: 'fileRef1',
        sourcePageIndex: 0,
        rotation: 0,
        viewerRotation: 0,
    };
    const mockFileMetadata: IdpFileMetadata = {
        status: 'Succeeded',
        pageCount: 1,
        pages: [
            {
                pageIndex: 0,
                imageWidth: 100,
                imageHeight: 100,
                rotation: 0,
                skew: 0,
            },
        ],
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                IdpSharedImageLoadingService,
                { provide: IdpBackendService, useClass: MockIdpBackendService },
                { provide: DestroyRef, useValue: { onDestroy: (fn: () => void) => fn() } },
            ],
        });

        service = TestBed.inject(IdpSharedImageLoadingService);
        idpBackendService = TestBed.inject(IdpBackendService);

        global.URL.createObjectURL = jest.fn(() => mockBlobUrl);
        global.URL.revokeObjectURL = jest.fn();
    });

    it('should scope original image cache by taskId so the same page.id does not leak across tasks', async () => {
        const cachedForTaskAlpha: IdpImageInfo = {
            blobUrl: 'blob-cached-task-alpha',
            width: 100,
            height: 100,
            viewerRotation: 0,
            correctionAngle: 0,
            skew: 0,
        };
        service.addImageDataToCache(`task-alpha:${mockPage.id}`, cachedForTaskAlpha);

        const metadataApiSpy = spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(of(mockFileMetadata));
        const blob = new Blob();
        spyOn(idpBackendService, 'getFilePageImageBlob$').and.returnValue(of(blob));

        const dataForTaskBeta = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId', false, 'task-beta'));
        expect(dataForTaskBeta?.blobUrl).toBe(mockBlobUrl);
        expect(dataForTaskBeta?.blobUrl).not.toBe(cachedForTaskAlpha.blobUrl);
        expect(metadataApiSpy).toHaveBeenCalledTimes(1);

        const dataForTaskAlpha = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId', false, 'task-alpha'));
        expect(dataForTaskAlpha).toEqual({ ...cachedForTaskAlpha, viewerRotation: mockPage.viewerRotation });
        expect(metadataApiSpy).toHaveBeenCalledTimes(1);
    });

    it('should return cached image data if available', async () => {
        const imageData: IdpImageInfo = {
            blobUrl: 'blobUrl',
            width: 100,
            height: 100,
            viewerRotation: 0,
            correctionAngle: 0,
            skew: 0,
        };

        const spy = spyOn(idpBackendService, 'getFileMetadata$');

        service.addImageDataToCache(mockPage.id, imageData);

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));
        expect(data).toEqual({ ...imageData, viewerRotation: mockPage.viewerRotation });
        expect(spy).not.toHaveBeenCalled();
    });

    it('should fetch image data if not cached', async () => {
        const blob = new Blob();
        const metadataApiSpy = spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(of(mockFileMetadata));
        const imageApiSpy = spyOn(idpBackendService, 'getFilePageImageBlob$').and.returnValue(of(blob));

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));
        expect(data).toEqual({
            blobUrl: mockBlobUrl,
            width: 100,
            height: 100,
            viewerRotation: 0,
            correctionAngle: 0,
            skew: 0,
        });
        expect(metadataApiSpy).toHaveBeenCalledWith('correlationId', mockPage.fileReference);
        expect(imageApiSpy).toHaveBeenCalledWith('correlationId', mockPage.fileReference, 0);
    });

    it('should include hasMachineTextLayer from metadata when present', async () => {
        const blobUrl = mockBlobUrl;
        const metadataApiSpy = spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(
            of({
                ...mockFileMetadata,
                pages: [{ ...mockFileMetadata.pages[0], hasMachineTextLayer: true }],
            })
        );
        const imageApiSpy = spyOn(idpBackendService, 'getFilePageImageBlob$').and.returnValue(of(blobUrl));

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));
        expect(data).toEqual({
            blobUrl: mockBlobUrl,
            width: 100,
            height: 100,
            viewerRotation: 0,
            correctionAngle: 0,
            skew: 0,
            hasMachineTextLayer: true,
        });
        expect(metadataApiSpy).toHaveBeenCalledWith('correlationId', mockPage.fileReference);
        expect(imageApiSpy).toHaveBeenCalledWith('correlationId', mockPage.fileReference, 0);
    });

    it.each([
        // [pageRotation, viewerRotation, metadataRotation, expectedViewerRotation, expectedCorrectionAngle]
        [270, 0, 90, 0, 270],
        [0, 90, 90, 90, 270],
        [90, 180, 90, 180, 270],
        [180, 270, 90, 270, 270],

        [180, 0, 180, 0, 180],
        [270, 90, 180, 90, 180],
        [0, 180, 180, 180, 180],
        [90, 270, 180, 270, 180],

        [90, 0, 270, 0, 90],
        [180, 90, 270, 90, 90],
        [270, 180, 270, 180, 90],
        [0, 270, 270, 270, 90],

        [0, 0, 0, 0, 0],
        [90, 90, 0, 90, 0],
        [180, 180, 0, 180, 0],
        [270, 270, 0, 270, 0],
    ])(
        'should fetch image data with pageRotation=%i, viewerRotation=%i, metadataRotation=%i',
        async (pageRotation, viewerRotation, metadataRotation, expectedViewerRotation, expectedCorrectionAngle) => {
            const blob = new Blob();
            const mockFileMetadataLocal = {
                pages: [
                    {
                        pageIndex: 0,
                        imageWidth: 100,
                        imageHeight: 100,
                        rotation: metadataRotation,
                        skew: 0,
                    },
                ],
            };
            const mockPageLocal: IdpDocumentPage = {
                id: 'page1',
                name: 'Page 1',
                documentId: 'doc1',
                fileReference: 'fileRef1',
                sourcePageIndex: 0,
                rotation: pageRotation,
                viewerRotation: viewerRotation,
            };
            const metadataApiSpy = spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(of(mockFileMetadataLocal));
            const imageApiSpy = spyOn(idpBackendService, 'getFilePageImageBlob$').and.returnValue(of(blob));

            const data = await firstValueFrom(service.getImageDataForPage$(mockPageLocal, 'correlationId'));
            expect(data).toEqual({
                blobUrl: mockBlobUrl,
                width: 100,
                height: 100,
                viewerRotation: expectedViewerRotation,
                correctionAngle: expectedCorrectionAngle,
                skew: 0,
            });
            expect(metadataApiSpy).toHaveBeenCalledWith('correlationId', mockPageLocal.fileReference);
            expect(imageApiSpy).toHaveBeenCalledWith('correlationId', mockPageLocal.fileReference, 0);
        }
    );

    it('should return cached thumbnail image data if available', async () => {
        const imageData: IdpImageInfo = {
            blobUrl: 'blobUrl',
            width: 100,
            height: 100,
            viewerRotation: 0,
        };

        const spy = spyOn(idpBackendService, 'getFileMetadata$');

        service.addImageDataToCache(mockPage.id, imageData, true);

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId', true));
        expect(data).toEqual({ ...imageData, viewerRotation: mockPage.viewerRotation });
        expect(spy).not.toHaveBeenCalled();
    });

    it('should fetch thumbnail image data if not cached', async () => {
        const blob = new Blob();
        const imageApiSpy = spyOn(idpBackendService, 'getFilePageImageBlob$').and.returnValue(of(blob));

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId', true));
        expect(data).toEqual({
            blobUrl: mockBlobUrl,
            width: 100,
            height: 100,
        });
        expect(imageApiSpy).toHaveBeenCalledWith('correlationId', mockPage.fileReference, 0, true);
    });

    it('should call concurrent thumbnail requests via pendingImageBlobRequests', async () => {
        const blobUrl = mockBlobUrl;
        const imageApiSpy = spyOn(idpBackendService, 'getFilePageImageBlob$').and.returnValue(of(blobUrl));

        const obs1 = service.getImageDataForPage$(mockPage, 'correlationId', true);
        const obs2 = service.getImageDataForPage$(mockPage, 'correlationId', true);

        const [res1, res2] = await firstValueFrom(forkJoin([obs1, obs2]));

        expect(res1).toEqual({ blobUrl: mockBlobUrl, width: 100, height: 100 });
        expect(res2).toEqual({ blobUrl: mockBlobUrl, width: 100, height: 100 });

        expect(imageApiSpy).toHaveBeenCalledTimes(1);
        expect(imageApiSpy).toHaveBeenCalledWith('correlationId', mockPage.fileReference, 0, true);
    });

    it('should handle undefined metadata response', async () => {
        spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(of(undefined));

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));
        expect(data).toBeUndefined();
    });

    it('should handle undefined blob response', async () => {
        spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(of(mockFileMetadata));
        spyOn(idpBackendService, 'getFilePageImageBlob$').and.returnValue(of(undefined));

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));
        expect(data).toBeUndefined();
    });

    it('should not cache invalid image data', async () => {
        service.addImageDataToCache('', { blobUrl: 'test', width: 100, height: 100 } as IdpImageInfo);

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));
        expect(data?.blobUrl).not.toBe('test');
    });

    it('should use metadataCache if metadata is already cached', async () => {
        service.addMetadataToCache(mockPage.fileReference, mockFileMetadata);

        const blob = new Blob();
        const imageApiSpy = spyOn(idpBackendService, 'getFilePageImageBlob$').and.returnValue(of(blob));
        const metadataApiSpy = spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(of(mockFileMetadata));

        const data = await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));
        expect(data).toEqual({
            blobUrl: mockBlobUrl,
            width: 100,
            height: 100,
            viewerRotation: 0,
            correctionAngle: 0,
            skew: 0,
        });
        expect(imageApiSpy).toHaveBeenCalledWith('correlationId', mockPage.fileReference, 0);
        expect(metadataApiSpy).not.toHaveBeenCalled();
    });

    it('should cache metadata when fetched', async () => {
        const metadataApiSpy = spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(of(mockFileMetadata));

        await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));

        expect(metadataApiSpy).toHaveBeenCalledWith('correlationId', mockPage.fileReference);
        expect(service.getCachedMetadata(mockPage.fileReference)).toEqual(mockFileMetadata);
    });

    it('should not cache undefined metadata', async () => {
        spyOn(idpBackendService, 'getFileMetadata$').and.returnValue(of(undefined));

        await firstValueFrom(service.getImageDataForPage$(mockPage, 'correlationId'));

        expect(service.hasMetadataInCache(mockPage.fileReference)).toBe(false);
    });

    it('should clear metadataCache on clearCache', () => {
        service.addMetadataToCache(mockPage.fileReference, mockFileMetadata);

        service.cleanup();

        expect(service.getMetadataCacheSize()).toBe(0);
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { EMPTY, of } from 'rxjs';
import { IdpImageLoadingService } from './idp-image-loading.service';
import { IdpFileMetadata, IdpSharedImageLoadingService } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { userActions } from '../../store/actions/class-verification.actions';
import { IdpPagesMetadata } from '../../store/models/document-state-updates';

type Members<T> = Pick<T, keyof T>;

export function MockIdpImageLoadingService() {
    return {
        getImageDataForPage$() {
            return EMPTY;
        },
        cleanup() {},
    } satisfies Members<IdpImageLoadingService>;
}

describe('IdpImageLoadingService', () => {
    let service: IdpImageLoadingService;
    let storeMock: jasmine.SpyObj<Store>;
    let sharedImageLoadingServiceMock: jasmine.SpyObj<IdpSharedImageLoadingService>;

    interface PageOverrides {
        id?: string;
        documentId?: string;
        fileReference?: string;
        sourcePageIndex?: number;
        hasMachineTextLayer?: boolean | undefined;
        name?: string;
        contentFileReferenceIndex?: number;
        width?: number;
        height?: number;
    }

    const createPage = (overrides: PageOverrides = {}) => ({
        id: 'pageId',
        documentId: 'docId',
        fileReference: 'file1',
        sourcePageIndex: 0,
        name: 'Page',
        contentFileReferenceIndex: 0,
        width: 800,
        height: 1000,
        ...overrides,
    });

    const createFileMetadata = (pages: { pageIndex: number; hasMachineTextLayer?: boolean }[]): IdpFileMetadata => ({
        status: 'Succeeded',
        pageCount: pages.length,
        pages: pages.map((p) => ({
            pageIndex: p.pageIndex,
            imageWidth: 100,
            imageHeight: 100,
            skew: 0,
            rotation: 0,
            hasMachineTextLayer: p.hasMachineTextLayer,
        })),
    });

    const taskInfo = { appName: 'app', taskId: 'task-1', taskName: 'name', rootProcessInstanceId: 'root-1' };

    beforeEach(() => {
        storeMock = jasmine.createSpyObj('Store', ['select', 'dispatch']);
        sharedImageLoadingServiceMock = jasmine.createSpyObj('IdpSharedImageLoadingService', [
            'getImageDataForPage$',
            'getCachedMetadata',
            'cleanup',
        ]);

        TestBed.configureTestingModule({
            providers: [
                IdpImageLoadingService,
                { provide: Store, useValue: storeMock },
                { provide: IdpSharedImageLoadingService, useValue: sharedImageLoadingServiceMock },
            ],
        });

        service = TestBed.inject(IdpImageLoadingService);
    });

    const getDispatchedPages = (): IdpPagesMetadata[] => {
        const action = storeMock.dispatch.calls.mostRecent().args[0] as unknown as { pages: IdpPagesMetadata[] };
        return action.pages;
    };

    describe('getImageDataForPage$', () => {
        it('should return undefined if page does not exist', (done) => {
            storeMock.select.and.returnValues(of(undefined), of('corrId'), of([]), of(taskInfo));

            service.getImageDataForPage$('pageId').subscribe((result) => {
                expect(result).toBeUndefined();
                expect(sharedImageLoadingServiceMock.getImageDataForPage$).not.toHaveBeenCalled();
                expect(storeMock.dispatch).not.toHaveBeenCalled();
                done();
            });
        });

        it('should call sharedImageLoadingService.getImageDataForPage$ and dispatch updatePagesRotation for hasMachineTextLayer only (no auto-correction)', (done) => {
            const page = createPage({ id: 'pageId', documentId: 'docId' });
            const correlationId = 'corrId';
            const allDocuments = [{ id: 'docId', pages: [page] }];
            const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 90, correctionAngle: 45, hasMachineTextLayer: true };

            storeMock.select.and.returnValues(of(page), of(correlationId), of(allDocuments), of(taskInfo));
            sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
            sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(undefined);

            service.getImageDataForPage$('pageId').subscribe((result) => {
                expect(sharedImageLoadingServiceMock.getImageDataForPage$).toHaveBeenCalledWith(page, correlationId, false, taskInfo.taskId);
                expect(storeMock.dispatch).toHaveBeenCalledWith(
                    userActions.updatePagesRotation({
                        pages: [
                            {
                                pageId: 'pageId',
                                documentId: 'docId',
                                hasMachineTextLayer: true,
                            },
                        ],
                        taskDataSynced: undefined,
                    })
                );
                expect(result).toEqual(imageInfo);
                done();
            });
        });

        it('should request thumbnail when thumbnail parameter is true', (done) => {
            const page = createPage();
            const correlationId = 'corrId';
            const allDocuments = [{ id: 'docId', pages: [page] }];
            const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0 };

            storeMock.select.and.returnValues(of(page), of(correlationId), of(allDocuments), of(taskInfo));
            sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
            sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(undefined);

            service.getImageDataForPage$('pageId', true).subscribe(() => {
                expect(sharedImageLoadingServiceMock.getImageDataForPage$).toHaveBeenCalledWith(page, correlationId, true, taskInfo.taskId);
                done();
            });
        });

        it('should not dispatch if imageInfo is undefined', (done) => {
            const page = createPage();
            const correlationId = 'corrId';
            const allDocuments = [{ id: 'docId', pages: [page] }];

            storeMock.select.and.returnValues(of(page), of(correlationId), of(allDocuments), of(taskInfo));
            sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(undefined));

            service.getImageDataForPage$('pageId').subscribe((result) => {
                expect(storeMock.dispatch).not.toHaveBeenCalled();
                expect(result).toBeUndefined();
                done();
            });
        });

        it('should not include hasMachineTextLayer in dispatch when undefined in imageInfo', (done) => {
            const page = createPage();
            const correlationId = 'corrId';
            const allDocuments = [{ id: 'docId', pages: [page] }];
            const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 90, correctionAngle: 45 };

            storeMock.select.and.returnValues(of(page), of(correlationId), of(allDocuments), of(taskInfo));
            sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
            sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(undefined);

            service.getImageDataForPage$('pageId').subscribe(() => {
                const pages = getDispatchedPages();
                expect('hasMachineTextLayer' in pages[0]).toBeFalse();
                done();
            });
        });

        describe('hasMachineTextLayer propagation to other pages from same file', () => {
            it('should update hasMachineTextLayer for all pages from the same file when metadata is cached', (done) => {
                const page1 = createPage({ id: 'page1', sourcePageIndex: 0, hasMachineTextLayer: undefined });
                const page2 = createPage({ id: 'page2', sourcePageIndex: 1, hasMachineTextLayer: undefined });
                const page3 = createPage({ id: 'page3', sourcePageIndex: 2, hasMachineTextLayer: undefined });
                const correlationId = 'corrId';
                const allDocuments = [{ id: 'docId', pages: [page1, page2, page3] }];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 90, correctionAngle: 45, hasMachineTextLayer: true };
                const fileMetadata = createFileMetadata([
                    { pageIndex: 0, hasMachineTextLayer: true },
                    { pageIndex: 1, hasMachineTextLayer: false },
                    { pageIndex: 2, hasMachineTextLayer: true },
                ]);

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(fileMetadata);

                service.getImageDataForPage$('page1').subscribe(() => {
                    expect(storeMock.dispatch).toHaveBeenCalledWith(
                        userActions.updatePagesRotation({
                            pages: [
                                { pageId: 'page1', documentId: 'docId', hasMachineTextLayer: true },
                                { pageId: 'page2', documentId: 'docId', hasMachineTextLayer: false },
                                { pageId: 'page3', documentId: 'docId', hasMachineTextLayer: true },
                            ],
                            taskDataSynced: undefined,
                        })
                    );
                    done();
                });
            });

            it('should not update pages that already have hasMachineTextLayer set', (done) => {
                const page1 = createPage({ id: 'page1', sourcePageIndex: 0, hasMachineTextLayer: undefined });
                const page2 = createPage({ id: 'page2', sourcePageIndex: 1, hasMachineTextLayer: true });
                const page3 = createPage({ id: 'page3', sourcePageIndex: 2, hasMachineTextLayer: undefined });
                const correlationId = 'corrId';
                const allDocuments = [{ id: 'docId', pages: [page1, page2, page3] }];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0, hasMachineTextLayer: true };
                const fileMetadata = createFileMetadata([
                    { pageIndex: 0, hasMachineTextLayer: true },
                    { pageIndex: 1, hasMachineTextLayer: true },
                    { pageIndex: 2, hasMachineTextLayer: false },
                ]);

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(fileMetadata);

                service.getImageDataForPage$('page1').subscribe(() => {
                    const pages = getDispatchedPages();
                    expect(pages.length).toBe(2);
                    expect(pages.find((p) => p.pageId === 'page2')).toBeUndefined();
                    expect(pages.find((p) => p.pageId === 'page3')).toBeDefined();
                    done();
                });
            });

            it('should not update pages from different files', (done) => {
                const page1 = createPage({ id: 'page1', documentId: 'doc1', fileReference: 'file1', hasMachineTextLayer: undefined });
                const page2 = createPage({ id: 'page2', documentId: 'doc2', fileReference: 'file2', hasMachineTextLayer: undefined });
                const correlationId = 'corrId';
                const allDocuments = [
                    { id: 'doc1', pages: [page1] },
                    { id: 'doc2', pages: [page2] },
                ];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0, hasMachineTextLayer: true };
                const fileMetadata = createFileMetadata([{ pageIndex: 0, hasMachineTextLayer: true }]);

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(fileMetadata);

                service.getImageDataForPage$('page1').subscribe(() => {
                    const pages = getDispatchedPages();
                    expect(pages.length).toBe(1);
                    expect(pages[0].pageId).toBe('page1');
                    done();
                });
            });

            it('should handle pages across multiple documents from the same file', (done) => {
                const page1 = createPage({ id: 'page1', documentId: 'doc1', sourcePageIndex: 0, hasMachineTextLayer: undefined });
                const page2 = createPage({ id: 'page2', documentId: 'doc2', sourcePageIndex: 1, hasMachineTextLayer: undefined });
                const correlationId = 'corrId';
                const allDocuments = [
                    { id: 'doc1', pages: [page1] },
                    { id: 'doc2', pages: [page2] },
                ];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0, hasMachineTextLayer: true };
                const fileMetadata = createFileMetadata([
                    { pageIndex: 0, hasMachineTextLayer: true },
                    { pageIndex: 1, hasMachineTextLayer: false },
                ]);

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(fileMetadata);

                service.getImageDataForPage$('page1').subscribe(() => {
                    const pages = getDispatchedPages();
                    expect(pages.length).toBe(2);
                    expect(pages[1]).toEqual({ pageId: 'page2', documentId: 'doc2', hasMachineTextLayer: false });
                    done();
                });
            });

            it('should skip pages when their metadata is not found in file metadata', (done) => {
                const page1 = createPage({ id: 'page1', sourcePageIndex: 0, hasMachineTextLayer: undefined });
                const page2 = createPage({ id: 'page2', sourcePageIndex: 5, hasMachineTextLayer: undefined });
                const correlationId = 'corrId';
                const allDocuments = [{ id: 'docId', pages: [page1, page2] }];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0, hasMachineTextLayer: true };
                const fileMetadata = createFileMetadata([{ pageIndex: 0, hasMachineTextLayer: true }]);

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(fileMetadata);

                service.getImageDataForPage$('page1').subscribe(() => {
                    const pages = getDispatchedPages();
                    expect(pages.length).toBe(1);
                    expect(pages[0].pageId).toBe('page1');
                    done();
                });
            });

            it('should handle undefined hasMachineTextLayer in file metadata', (done) => {
                const page1 = createPage({ id: 'page1', sourcePageIndex: 0, hasMachineTextLayer: undefined });
                const page2 = createPage({ id: 'page2', sourcePageIndex: 1, hasMachineTextLayer: undefined });
                const correlationId = 'corrId';
                const allDocuments = [{ id: 'docId', pages: [page1, page2] }];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0, hasMachineTextLayer: undefined };
                const fileMetadata = createFileMetadata([{ pageIndex: 0 }, { pageIndex: 1 }]);

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(fileMetadata);

                service.getImageDataForPage$('page1').subscribe(() => {
                    const pages = getDispatchedPages();
                    expect(pages.length).toBe(2);
                    expect('hasMachineTextLayer' in pages[0]).toBeFalse();
                    expect('hasMachineTextLayer' in pages[1]).toBeFalse();
                    done();
                });
            });

            it('should only update the loaded page when no metadata is cached', (done) => {
                const page1 = createPage({ id: 'page1', sourcePageIndex: 0, hasMachineTextLayer: undefined });
                const page2 = createPage({ id: 'page2', sourcePageIndex: 1, hasMachineTextLayer: undefined });
                const correlationId = 'corrId';
                const allDocuments = [{ id: 'docId', pages: [page1, page2] }];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0, hasMachineTextLayer: true };

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(undefined);

                service.getImageDataForPage$('page1').subscribe(() => {
                    const pages = getDispatchedPages();
                    expect(pages.length).toBe(1);
                    expect(pages[0].pageId).toBe('page1');
                    done();
                });
            });

            it('should handle page with hasMachineTextLayer set to false (not undefined)', (done) => {
                const page1 = createPage({ id: 'page1', sourcePageIndex: 0, hasMachineTextLayer: undefined });
                const page2 = createPage({ id: 'page2', sourcePageIndex: 1, hasMachineTextLayer: false });
                const correlationId = 'corrId';
                const allDocuments = [{ id: 'docId', pages: [page1, page2] }];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0, hasMachineTextLayer: true };
                const fileMetadata = createFileMetadata([
                    { pageIndex: 0, hasMachineTextLayer: true },
                    { pageIndex: 1, hasMachineTextLayer: true },
                ]);

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(fileMetadata);

                service.getImageDataForPage$('page1').subscribe(() => {
                    const pages = getDispatchedPages();
                    expect(pages.length).toBe(1);
                    expect(pages.find((p) => p.pageId === 'page2')).toBeUndefined();
                    done();
                });
            });

            it('should handle empty documents list', (done) => {
                const page1 = createPage({ id: 'page1' });
                const correlationId = 'corrId';
                const allDocuments: any[] = [];
                const imageInfo = { blobUrl: 'blob', width: 100, height: 100, viewerRotation: 0, correctionAngle: 0, hasMachineTextLayer: true };
                const fileMetadata = createFileMetadata([{ pageIndex: 0, hasMachineTextLayer: true }]);

                storeMock.select.and.returnValues(of(page1), of(correlationId), of(allDocuments), of(taskInfo));
                sharedImageLoadingServiceMock.getImageDataForPage$.and.returnValue(of(imageInfo));
                sharedImageLoadingServiceMock.getCachedMetadata.and.returnValue(fileMetadata);

                service.getImageDataForPage$('page1').subscribe(() => {
                    const pages = getDispatchedPages();
                    expect(pages.length).toBe(1);
                    done();
                });
            });
        });
    });

    describe('cleanup', () => {
        it('should call cleanup on sharedImageLoadingService', () => {
            service.cleanup();
            expect(sharedImageLoadingServiceMock.cleanup).toHaveBeenCalled();
        });
    });
});

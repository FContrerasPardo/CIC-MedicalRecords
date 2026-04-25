/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DestroyRef, inject, Injectable } from '@angular/core';
import { Subject, catchError, finalize, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IdpDocumentPage, IdpImageInfo } from '../../models/common-models';
import { IdpBackendService } from '../backend/idp-backend.service';
import { IdpFileMetadata } from '../../models/api-models/idp-api-recognition-models';
import { LruCache } from './lru-cache';

/**
 * Helper function to conditionally include hasMachineTextLayer property if it's defined.
 * Returns an object with the property if defined, or an empty object otherwise.
 */
export function getHasMachineTextLayerProperty(hasMachineTextLayer: boolean | undefined): { hasMachineTextLayer: boolean } | Record<string, never> {
    return hasMachineTextLayer === undefined ? {} : { hasMachineTextLayer };
}

@Injectable()
export class IdpSharedImageLoadingService {
    readonly maxCacheSize = 300;
    private readonly originalCache = new LruCache<string, IdpImageInfo>(this.maxCacheSize, (_key, value) => URL.revokeObjectURL(value.blobUrl));
    private readonly thumbnailCache = new LruCache<string, IdpImageInfo>(this.maxCacheSize, (_key, value) => URL.revokeObjectURL(value.blobUrl));
    private readonly metadataCache = new Map<string, IdpFileMetadata>();
    private readonly pendingMetadataRequests = new Map<string, Observable<IdpFileMetadata | undefined>>();
    private readonly pendingImageBlobRequests = new Map<string, Observable<Blob | undefined>>();
    private readonly destroyRef = inject(DestroyRef);

    private readonly cancel$ = new Subject<void>();
    private readonly idpBackendService = inject(IdpBackendService);

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.clearCache();
            this.cancel$.next();
            this.cancel$.complete();
        });
    }

    cleanup(): void {
        this.clearCache();
        this.cancel$.next();
    }

    getImageDataForPage$(
        page: IdpDocumentPage,
        correlationId: string,
        thumbnail: boolean = false,
        taskId?: string
    ): Observable<IdpImageInfo | undefined> {
        const { fileReference, sourcePageIndex } = page;
        const pageId = page.id;
        const cacheKey = this.lruCacheKey(taskId, pageId);

        const cache = thumbnail ? this.thumbnailCache : this.originalCache;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return of({
                ...cachedData,
                viewerRotation: page.viewerRotation ?? cachedData.viewerRotation,
                ...getHasMachineTextLayerProperty(page.hasMachineTextLayer),
            });
        }

        return thumbnail
            ? this.getThumbnailImageData$(correlationId, fileReference, sourcePageIndex, cacheKey)
            : this.getOriginalImageData$(correlationId, fileReference, sourcePageIndex, cacheKey, page);
    }

    /** LRU cache key: scoped per task when taskId is provided (workspace verification). */
    private lruCacheKey(taskId: string | undefined, pageId: string): string {
        return taskId ? `${taskId}:${pageId}` : pageId;
    }

    addImageDataToCache(cacheKey: string, imageData: IdpImageInfo | undefined, thumbnail = false): void {
        const cache = thumbnail ? this.thumbnailCache : this.originalCache;
        if (!cacheKey || !imageData) {
            return;
        }
        cache.set(cacheKey, imageData);
    }

    getCachedImageData(cacheKey: string, thumbnail = false): IdpImageInfo | undefined {
        const cache = thumbnail ? this.thumbnailCache : this.originalCache;
        return cache.get(cacheKey);
    }

    hasImageDataInCache(cacheKey: string, thumbnail = false): boolean {
        const cache = thumbnail ? this.thumbnailCache : this.originalCache;
        return cache.has(cacheKey);
    }

    getImageCacheSize(thumbnail = false): number {
        const cache = thumbnail ? this.thumbnailCache : this.originalCache;
        return cache.size;
    }

    addMetadataToCache(key: string, metadata: IdpFileMetadata | undefined): void {
        if (!key || !metadata) {
            return;
        }
        this.cacheData(this.metadataCache, key, metadata);
    }

    getCachedMetadata(key: string): IdpFileMetadata | undefined {
        return this.metadataCache.get(key);
    }

    hasMetadataInCache(key: string): boolean {
        return this.metadataCache.has(key);
    }

    getMetadataCacheSize(): number {
        return this.metadataCache.size;
    }

    private getThumbnailImageData$(
        correlationId: string,
        fileReference: string,
        sourcePageIndex: number,
        cacheKey: string
    ): Observable<IdpImageInfo | undefined> {
        const requestKey = `${fileReference}_${sourcePageIndex}_thumbnail`;

        if (!this.pendingImageBlobRequests.has(requestKey)) {
            const imageBlobRequest$ = this.idpBackendService.getFilePageImageBlob$(correlationId, fileReference, sourcePageIndex, true).pipe(
                finalize(() => this.pendingImageBlobRequests.delete(requestKey)),
                shareReplay({ bufferSize: 1, refCount: false }),
                takeUntilDestroyed(this.destroyRef)
            );
            this.pendingImageBlobRequests.set(requestKey, imageBlobRequest$);
        }

        return (this.pendingImageBlobRequests.get(requestKey) ?? of(undefined)).pipe(
            switchMap((blob) => this.createImageDataFromBlob$(blob, { width: 100, height: 100 })),
            tap((imageData) => this.cacheThumbnailImageData(cacheKey, imageData)),
            takeUntilDestroyed(this.destroyRef)
        );
    }

    private getOriginalImageData$(
        correlationId: string,
        fileReference: string,
        sourcePageIndex: number,
        cacheKey: string,
        page: IdpDocumentPage
    ): Observable<IdpImageInfo | undefined> {
        if (!fileReference) {
            return of(undefined);
        }

        const fileMetadataCache = this.metadataCache.get(fileReference);
        if (fileMetadataCache) {
            return this.processPageMetadata$(fileMetadataCache, correlationId, fileReference, sourcePageIndex, page, cacheKey);
        }

        if (!this.pendingMetadataRequests.has(fileReference)) {
            const metadataRequest$ = this.idpBackendService.getFileMetadata$(correlationId, fileReference).pipe(
                tap((fileMetadata) => {
                    if (fileMetadata) {
                        this.cacheData(this.metadataCache, fileReference, fileMetadata);
                    }
                }),
                finalize(() => this.pendingMetadataRequests.delete(fileReference)),
                shareReplay({ bufferSize: 1, refCount: false }),
                takeUntilDestroyed(this.destroyRef)
            );
            this.pendingMetadataRequests.set(fileReference, metadataRequest$);
        }

        return (this.pendingMetadataRequests.get(fileReference) ?? of(undefined)).pipe(
            switchMap((fileMetadata) =>
                fileMetadata ? this.processPageMetadata$(fileMetadata, correlationId, fileReference, sourcePageIndex, page, cacheKey) : of(undefined)
            ),
            catchError(() => of(undefined))
        );
    }

    private getOriginalImageBlob$(correlationId: string, fileReference: string, sourcePageIndex: number): Observable<Blob | undefined> {
        const requestKey = `${fileReference}_${sourcePageIndex}_original`;

        if (!this.pendingImageBlobRequests.has(requestKey)) {
            const imageBlobRequest$ = this.idpBackendService.getFilePageImageBlob$(correlationId, fileReference, sourcePageIndex).pipe(
                finalize(() => this.pendingImageBlobRequests.delete(requestKey)),
                shareReplay({ bufferSize: 1, refCount: false }),
                takeUntilDestroyed(this.destroyRef)
            );
            this.pendingImageBlobRequests.set(requestKey, imageBlobRequest$);
        }

        return this.pendingImageBlobRequests.get(requestKey) ?? of(undefined);
    }

    private processPageMetadata$(
        fileMetadata: IdpFileMetadata,
        correlationId: string,
        fileReference: string,
        sourcePageIndex: number,
        page: IdpDocumentPage,
        cacheKey: string
    ): Observable<IdpImageInfo | undefined> {
        const pageMetadata = fileMetadata.pages.find((p) => p.pageIndex === sourcePageIndex);
        if (!pageMetadata) {
            return of(undefined);
        }

        return this.getOriginalImageBlob$(correlationId, fileReference, sourcePageIndex).pipe(
            switchMap((blob) => {
                const correctionAngle = (360 - pageMetadata.rotation) % 360;
                const viewerRotation = page.viewerRotation ?? 0;
                const hasMachineTextLayer = pageMetadata.hasMachineTextLayer;
                return this.createImageDataFromBlob$(blob, {
                    width: pageMetadata.imageWidth,
                    height: pageMetadata.imageHeight,
                    viewerRotation,
                    correctionAngle,
                    skew: pageMetadata.skew,
                    ...getHasMachineTextLayerProperty(hasMachineTextLayer),
                });
            }),
            tap((imageData) => this.cacheOriginalImageData(cacheKey, imageData)),
            takeUntilDestroyed(this.destroyRef)
        );
    }

    private createImageDataFromBlob$(blob: Blob | undefined, metadata: Partial<IdpImageInfo>): Observable<IdpImageInfo | undefined> {
        if (!blob) {
            return of(undefined);
        }
        const blobUrl = URL.createObjectURL(blob);
        return of({
            blobUrl,
            ...metadata,
        } as IdpImageInfo);
    }

    private cacheOriginalImageData(cacheKey: string, imageData: IdpImageInfo | undefined): void {
        if (!cacheKey || !imageData) {
            return;
        }
        this.originalCache.set(cacheKey, imageData);
    }

    private cacheThumbnailImageData(pageId: string, imageData: IdpImageInfo | undefined): void {
        if (!pageId || !imageData) {
            return;
        }
        this.thumbnailCache.set(pageId, imageData);
    }

    private cacheData<T>(cache: Map<string, T>, cacheId: string, data: T | undefined, maxCacheSize: number = this.maxCacheSize): void {
        if (!cacheId || !data) {
            return;
        }

        if (cache.size >= maxCacheSize) {
            const key = cache.keys().next().value;
            if (key) {
                cache.delete(key);
            }
        }
        cache.set(cacheId, data);
    }

    private clearCache(): void {
        this.originalCache.clear();
        this.thumbnailCache.clear();
        this.metadataCache.clear();
        this.pendingMetadataRequests.clear();
        this.pendingImageBlobRequests.clear();
    }
}

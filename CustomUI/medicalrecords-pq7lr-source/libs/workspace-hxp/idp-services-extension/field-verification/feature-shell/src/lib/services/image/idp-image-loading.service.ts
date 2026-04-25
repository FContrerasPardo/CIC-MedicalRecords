/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Observable, of, shareReplay, switchMap, take, tap, withLatestFrom } from 'rxjs';
import { FieldVerificationRootState } from '../../store/states/root.state';
import { Store } from '@ngrx/store';
import { selectPageById } from '../../store/selectors/document.selectors';
import { selectCorrelationId, selectTaskInfo } from '../../store/selectors/screen.selectors';
import {
    IdpBackendService,
    IdpFilePageOcrData,
    IdpImageInfo,
    IdpSharedImageLoadingService,
    ResponseFormat,
    getHasMachineTextLayerProperty,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { userActions } from '../../store/actions/field-verification.actions';

@Injectable()
export class IdpImageLoadingService {
    private readonly store: Store<FieldVerificationRootState> = inject(Store);
    private readonly sharedImageLoadingService = inject(IdpSharedImageLoadingService);
    private readonly idpBackendService = inject(IdpBackendService);

    getImageDataForPage$(pageId: string, thumbnail = false): Observable<IdpImageInfo | undefined> {
        return this.store.select(selectPageById(pageId)).pipe(
            take(1),
            withLatestFrom(this.store.select(selectCorrelationId), this.store.select(selectTaskInfo)),
            switchMap(([page, correlationId, taskInfo]) => {
                if (!page) {
                    return of(undefined);
                }

                return this.sharedImageLoadingService.getImageDataForPage$(page, correlationId, thumbnail, taskInfo.taskId).pipe(
                    tap((imageInfo) => {
                        if (imageInfo) {
                            const pageUpdate: { pageId: string; documentId: string; hasMachineTextLayer?: boolean } = {
                                pageId,
                                documentId: page.documentId,
                                ...getHasMachineTextLayerProperty(imageInfo.hasMachineTextLayer),
                            };

                            // Dispatch hasMachineTextLayer update only (rotation sync happens on task load)
                            this.store.dispatch(
                                userActions.updatePagesRotation({
                                    pages: [pageUpdate],
                                    taskDataSynced: undefined,
                                })
                            );
                        }
                    })
                );
            })
        );
    }

    getPageOcrData$(pageId: string, responseFormat: ResponseFormat = ResponseFormat.Ocr) {
        return this.ocrCache({ pageId, responseFormat });
    }

    private readonly ocrCache = cacheObservable(
        ({ pageId, responseFormat }: { pageId: string; responseFormat: ResponseFormat }) => this._getPageOcrData$(pageId, responseFormat),
        {
            maxSize: this.sharedImageLoadingService.maxCacheSize,
        }
    );

    private _getPageOcrData$(pageId: string, responseFormat: ResponseFormat): Observable<IdpFilePageOcrData | undefined> {
        return this.store.select(selectPageById(pageId)).pipe(
            take(1),
            withLatestFrom(this.store.select(selectCorrelationId)),
            switchMap(([page, correlationId]) => {
                if (!page) {
                    return of(undefined);
                }
                return this.idpBackendService.getPageOcr$(correlationId, page.fileReference, page.sourcePageIndex, responseFormat);
            })
        );
    }

    cleanup(): void {
        this.sharedImageLoadingService.cleanup();
        this.ocrCache.clear();
    }
}

function cacheObservable<K, V>(func: (k: K) => Observable<V>, { maxSize }: { maxSize?: number }) {
    type MapKey = string | number | boolean;
    function serializeKey(key: K): MapKey {
        if (typeof key === 'string' || typeof key === 'number' || typeof key === 'boolean') {
            return key;
        }
        return JSON.stringify(key);
    }

    const inFlightCache = new Map<MapKey, Observable<V>>();
    const resultCache = new Map<MapKey, V>();
    const cache = (key: K) => {
        const mapKey = serializeKey(key);
        if (resultCache.has(mapKey)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return of(resultCache.get(mapKey)!);
        }

        if (inFlightCache.has(mapKey)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return inFlightCache.get(mapKey)!;
        }

        while (maxSize && resultCache.size >= maxSize) {
            const firstKey = resultCache.keys().next().value;
            if (firstKey !== undefined) {
                resultCache.delete(firstKey);
            }
        }

        const obs$ = func(key).pipe(
            shareReplay(),
            tap((result) => {
                resultCache.set(mapKey, result);
                inFlightCache.delete(mapKey);
            })
        );
        inFlightCache.set(mapKey, obs$);
        return obs$;
    };
    cache.clear = () => {
        resultCache.clear();
        inFlightCache.clear();
    };
    return cache;
}

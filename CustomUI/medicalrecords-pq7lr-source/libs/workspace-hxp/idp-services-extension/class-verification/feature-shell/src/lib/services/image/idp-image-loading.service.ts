/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Observable, of, switchMap, take, tap, withLatestFrom } from 'rxjs';
import { ClassVerificationRootState } from '../../store/states/root.state';
import { Store } from '@ngrx/store';
import { selectDocumentsRawState, selectPageById } from '../../store/selectors/document.selectors';
import { selectCorrelationId, selectTaskInfo } from '../../store/selectors/screen.selectors';
import { IdpImageInfo, IdpSharedImageLoadingService, getHasMachineTextLayerProperty } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { userActions } from '../../store/actions/class-verification.actions';
import { IdpPagesMetadata } from '../../store/models/document-state-updates';

@Injectable()
export class IdpImageLoadingService {
    private readonly store = inject(Store<ClassVerificationRootState>);
    private readonly sharedImageLoadingService = inject(IdpSharedImageLoadingService);

    getImageDataForPage$(pageId: string, thumbnail = false): Observable<IdpImageInfo | undefined> {
        return this.store.select(selectPageById(pageId)).pipe(
            take(1),
            withLatestFrom(this.store.select(selectCorrelationId), this.store.select(selectDocumentsRawState), this.store.select(selectTaskInfo)),
            switchMap(([page, correlationId, allDocuments, taskInfo]) => {
                if (!page) {
                    return of(undefined);
                }
                return this.sharedImageLoadingService.getImageDataForPage$(page, correlationId, thumbnail, taskInfo.taskId).pipe(
                    tap((imageInfo) => {
                        if (imageInfo) {
                            const fileMetadata = this.sharedImageLoadingService.getCachedMetadata(page.fileReference);
                            const pagesToUpdate: IdpPagesMetadata[] = [];

                            // Update current page with hasMachineTextLayer
                            pagesToUpdate.push({
                                pageId,
                                documentId: page.documentId ?? '',
                                ...getHasMachineTextLayerProperty(imageInfo.hasMachineTextLayer),
                            });

                            // Update other pages from same file with hasMachineTextLayer
                            if (fileMetadata) {
                                const allPages = allDocuments.flatMap((doc) => doc.pages.map((p) => ({ ...p, documentId: doc.id })));
                                const pagesFromSameFile = allPages.filter(
                                    (p) => p.fileReference === page.fileReference && p.id !== pageId && p.hasMachineTextLayer === undefined
                                );

                                for (const samePage of pagesFromSameFile) {
                                    const pageMetadata = fileMetadata.pages.find((pm) => pm.pageIndex === samePage.sourcePageIndex);
                                    if (pageMetadata) {
                                        pagesToUpdate.push({
                                            pageId: samePage.id,
                                            documentId: samePage.documentId ?? '',
                                            ...getHasMachineTextLayerProperty(pageMetadata.hasMachineTextLayer),
                                        });
                                    }
                                }
                            }

                            // Dispatch hasMachineTextLayer updates only (rotation sync happens on task load)
                            if (pagesToUpdate.length > 0) {
                                this.store.dispatch(
                                    userActions.updatePagesRotation({
                                        pages: pagesToUpdate,
                                        taskDataSynced: undefined,
                                    })
                                );
                            }
                        }
                    })
                );
            })
        );
    }

    cleanup(): void {
        this.sharedImageLoadingService.cleanup();
    }
}

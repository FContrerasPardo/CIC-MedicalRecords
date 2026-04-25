/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { DocumentModel, DocumentModelService } from '@alfresco/adf-hx-content-services/services';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { SYS_FILISH, SYS_FOLDERISH } from '@hxp/workspace-hxp/content-services-extension/shared/util';

const SYS_FILE = 'SysFile';
const SYS_FOLDER = 'SysFolder';

@Pipe({
    name: 'isViewableAsFile',
    pure: false,
})
export class IsViewableAsFilePipe implements PipeTransform {
    private readonly documentModelService = inject(DocumentModelService);
    private readonly asyncPipe = inject(AsyncPipe);
    private readonly model$: Observable<DocumentModel> = this.documentModelService.getModel().pipe(shareReplay({ bufferSize: 1, refCount: true }));

    transform(document: Document, isViewerToggled?: boolean): boolean {
        return this.asyncPipe.transform(this.checkIsViewableAsFile(document, isViewerToggled)) ?? false;
    }

    private checkIsViewableAsFile(document: Document, isViewerToggled?: boolean): Observable<boolean> {
        return this.model$.pipe(
            map((model: DocumentModel) => {
                const primaryType = document?.sys_primaryType;

                if (!model || !primaryType) {
                    return false;
                }

                if (model.inherits(primaryType, SYS_FILE)) {
                    return true;
                } else if (!isViewerToggled && model.inherits(primaryType, SYS_FOLDER)) {
                    return false;
                } else if (model.hasMixin(primaryType, SYS_FILISH)) {
                    return true;
                } else if (model.hasMixin(primaryType, SYS_FOLDERISH)) {
                    return false;
                }
                return true;
            })
        );
    }
}

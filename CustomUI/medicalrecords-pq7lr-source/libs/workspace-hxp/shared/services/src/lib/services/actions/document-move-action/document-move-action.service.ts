/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { inject, Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { DocumentPathChangeNotifierService } from '../models/document-path-change-notifier.service';

@Injectable({
    providedIn: 'root',
})
export class DocumentMoveActionService extends DocumentPathChangeNotifierService {
    private readonly documentService = inject(DocumentService);

    move(moveDocument: Document, targetFolder: Document): Observable<Document | undefined> {
        const origin = moveDocument.sys_parentId;
        return this.documentService.moveDocument(moveDocument.sys_id || '', targetFolder.sys_id || '').pipe(
            take(1),
            map((response) => response.document),
            tap((document) => {
                if (origin && document?.sys_parentId) {
                    this.emitDocumentPathChange({ origin, target: document.sys_parentId });
                }
            })
        );
    }
}

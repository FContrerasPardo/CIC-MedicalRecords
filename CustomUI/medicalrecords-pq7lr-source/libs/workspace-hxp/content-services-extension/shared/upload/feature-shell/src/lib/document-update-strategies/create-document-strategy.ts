/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { UploadActionStrategy } from './upload-action-strategy';
import { UploadContentModel } from '../model/upload-content.model';

@Injectable({
    providedIn: 'root',
})
export class CreateDocumentStrategy implements UploadActionStrategy {
    private readonly documentService = inject(DocumentService);

    execute(upload: UploadContentModel): Observable<Document> {
        return this.documentService.createDocument(upload.documentModel.document);
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { ModelApi } from '@hylandsoftware/hxcs-js-client';
import { MODEL_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DocumentModel } from './document-model.model';

@Injectable({
    providedIn: 'root',
})
export class DocumentModelService {
    private model$: Observable<DocumentModel> | undefined;
    private errored = false;

    protected readonly modelApi = inject<ModelApi>(MODEL_API_TOKEN);

    getModel(): Observable<DocumentModel> {
        if (!this.model$ || this.errored) {
            this.errored = false;
            this.model$ = from(this.modelApi.getModel()).pipe(
                map((response) => new DocumentModel(response.data)),
                catchError((error) => {
                    this.errored = true;
                    if (error.status === 400 || error.response?.status === 400) {
                        console.warn('User cannot access the document model.');
                        return of(new DocumentModel({}));
                    }
                    throw error;
                })
            );
        }
        return this.model$;
    }
}

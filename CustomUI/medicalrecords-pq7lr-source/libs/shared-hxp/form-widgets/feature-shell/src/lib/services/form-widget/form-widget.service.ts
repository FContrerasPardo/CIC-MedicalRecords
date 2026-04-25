/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FormFieldModel, ViewUtilService } from '@alfresco/adf-core';
import {
    BlobDownloadService,
    DEFAULT_RENDITION_ID,
    DOCUMENT_SERVICE,
    hasRenditionBlob,
    pollWhile,
    RenditionsService,
    RenditionStatus,
    SharedDocumentService,
} from '@alfresco/adf-hx-content-services/services';
import { inject, Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { defer, EMPTY, forkJoin, iif, Observable, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { DownloadInfo } from '../../model/download-info.model';
import { PendingDocument, isPendingDocument } from '@hxp/shared-hxp/services';

export interface ContentReference {
    type: 'id' | 'path';
    reference?: string;
}

export interface ContentObject extends Document {
    uri: string | undefined;
}

@Injectable()
export class FormWidgetService {
    private static readonly HXP_URI_SCHEMA = 'hxpr:/';

    private static get HXP_URI_PATH_PREFIX() {
        return FormWidgetService.HXP_URI_SCHEMA + 'path/';
    }

    private documentService: SharedDocumentService = inject(DOCUMENT_SERVICE);
    private viewUtilService: ViewUtilService = inject(ViewUtilService);
    private blobDownloadService: BlobDownloadService = inject(BlobDownloadService);
    private renditionsService: RenditionsService | null = inject(RenditionsService, { optional: true });

    getContentReferenceFromField(field: FormFieldModel): ContentReference {
        let contentReference: ContentReference = { type: 'id' };

        if (this.fieldContainsOneFile(field)) {
            const value = this.extractDocumentFromValue(field.value);
            contentReference = this.createContentReference(value);
        } else if (this.fieldContainsMultipleFiles(field)) {
            const firstValue = this.extractDocumentFromValue(field.value[0]);
            contentReference = this.createContentReference(firstValue);
        }

        return contentReference;
    }

    getContentReferencesFromField(field: FormFieldModel): ContentReference[] {
        const contentReferences: ContentReference[] = [];

        if (this.fieldContainsOneFile(field)) {
            const value = this.extractDocumentFromValue(field.value);
            contentReferences.push(this.createContentReference(value));
        } else if (this.fieldContainsMultipleFiles(field)) {
            field.value.forEach((file: ContentObject | PendingDocument) => {
                const extractedDoc = this.extractDocumentFromValue(file);
                contentReferences.push(this.createContentReference(extractedDoc));
            });
        }

        return contentReferences;
    }

    createContentReference(contentObject: ContentObject): ContentReference {
        const contentReference: ContentReference = { type: 'id' };

        if (contentObject?.uri && contentObject.uri.startsWith(FormWidgetService.HXP_URI_SCHEMA)) {
            if (contentObject.uri.startsWith(FormWidgetService.HXP_URI_PATH_PREFIX)) {
                contentReference.type = 'path';
                contentReference.reference = contentObject.uri.slice(Math.max(0, FormWidgetService.HXP_URI_PATH_PREFIX.length - 1));
            } else {
                contentReference.reference = contentObject.uri.slice(FormWidgetService.HXP_URI_SCHEMA.length);
            }
        } else if (contentObject?.sys_id) {
            contentReference.reference = contentObject.sys_id;
        } else if (contentObject?.sys_path) {
            contentReference.type = 'path';
            contentReference.reference = contentObject.sys_path;
        }

        return contentReference;
    }

    getDocumentFromField(field: FormFieldModel): Observable<Document | null> {
        const contentReference = this.getContentReferenceFromField(field);

        if (contentReference?.reference) {
            return contentReference.type === 'path'
                ? this.documentService.getDocumentByPath(contentReference.reference)
                : this.documentService.getDocumentById(contentReference.reference);
        } else {
            return of(null);
        }
    }

    getDocumentsFromField(field: FormFieldModel): Observable<(Document | PendingDocument)[]> {
        if (!field?.value) {
            return of([]);
        }

        const fieldValues = Array.isArray(field.value) ? field.value : [field.value];
        const observables: Observable<Document | PendingDocument>[] = [];

        for (const item of fieldValues) {
            if (isPendingDocument(item)) {
                observables.push(of(item));
            } else {
                const contentReference = this.createContentReference(item);
                if (contentReference?.reference) {
                    const obs = contentReference.type === 'path'
                        ? this.documentService.getDocumentByPath(contentReference.reference)
                        : this.documentService.getDocumentById(contentReference.reference);
                    observables.push(obs);
                }
            }
        }

        if (observables.length > 0) {
            return forkJoin(observables);
        }

        return of([]);
    }

    getViewerContentFromField(field: FormFieldModel): Observable<DownloadInfo | null> {
        return this.getDocumentFromField(field).pipe(mergeMap((document) => this.getViewerContentFromDocument(document)));
    }

    getViewerContentFromDocument(document: Document | null): Observable<DownloadInfo | null> {
        let blobFile: Observable<DownloadInfo | null> = of(null);
        if (document && document.sys_id) {
            const mimeType = document['sysfile_blob']?.['mimeType'];
            const name = document['sysfile_blob']?.['filename'];
            const title = document['sysfile_blob']?.['title'] || document.sys_title;
            const isMimeTypeSupported = this.viewUtilService.getViewerTypeByMimeType(mimeType) !== 'unknown';
            if (isMimeTypeSupported) {
                blobFile = this.blobDownloadService.downloadBlob(document.sys_id).pipe(
                    map((blob) => ({ name, mimeType, title, blob })),
                    catchError(() => of({ name, mimeType, title, blob: new Blob() }))
                );
            } else {
                blobFile = this.renditionsService
                    ? this.renditionsService.listRenditions(document.sys_id).pipe(
                          mergeMap((renditions) => iif(() => renditions.length === 0, this.requestRendition(document), this.getRendition(document))),
                          mergeMap((rendition) => {
                              return rendition?.sys_id && hasRenditionBlob(rendition)
                                  ? this.blobDownloadService.downloadBlob(rendition.sys_id, 'sysrendition_blob').pipe(
                                        map((blob) => ({ name, mimeType, title, blob })),
                                        catchError(() => of({ name, mimeType, title, blob: new Blob() }))
                                    )
                                  : of({ name, mimeType, title, blob: new Blob() });
                          })
                      )
                    : of(null);
            }
        }
        return blobFile;
    }

    private extractDocumentFromValue(value: Document | PendingDocument): ContentObject {
        if (isPendingDocument(value)) {
            return value.document as ContentObject;
        }
        return value as ContentObject;
    }

    private fieldContainsMultipleFiles(field: FormFieldModel): boolean {
        return !isPendingDocument(field?.value) && field?.value?.length && field?.value?.length > 0;
    }

    private fieldContainsOneFile(field: FormFieldModel): boolean {
        if (isPendingDocument(field?.value)) {
            return true;
        }
        return !!field?.value?.sys_id || !!field?.value?.sys_path || !!field?.value?.uri;
    }

    private requestRendition = (document: Document): Observable<Document> =>
        defer(() => {
            if (this.renditionsService) {
                return this.renditionsService?.requestRenditionCreation(document.sys_id as string, DEFAULT_RENDITION_ID).pipe(
                    mergeMap(
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        (rendition: Document) => this.renditionsService!.getRendition(rendition['sysrendition_sourceDoc'], DEFAULT_RENDITION_ID)
                    ),
                    pollWhile(1000, (rendition) => rendition['sysrendition_sourceDoc'] === RenditionStatus.PENDING, 1000, true)
                );
            } else {
                return EMPTY;
            }
        });

    private getRendition = (document: Document): Observable<Document> =>
        defer(() => {
            if (this.renditionsService) {
                return this.renditionsService
                    .getRendition(document.sys_id as string, DEFAULT_RENDITION_ID)
                    .pipe(pollWhile(1000, (rendition) => rendition['sysrendition_status'] === RenditionStatus.PENDING, 1000, true));
            }

            return EMPTY;
        });
}

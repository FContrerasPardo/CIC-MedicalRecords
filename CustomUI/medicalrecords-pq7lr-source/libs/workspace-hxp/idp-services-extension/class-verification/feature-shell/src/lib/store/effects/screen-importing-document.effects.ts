/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable, Injector } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, of, map, Observable, catchError, mergeMap, EMPTY, filter, concatMap } from 'rxjs';
import { systemActions, userActions } from '../actions/class-verification.actions';
import { IdpDocumentImportService } from '../../services/document-import/idp-document-import.service';
import { IdpDocumentImportDialogService } from '../../services/document-import/idp-document-import-dialog.service';
import { DocumentUploadErrorCode } from '../../services/document-import/idp-document-hxp-import.service';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { selectImportingDocumentById } from '../selectors/screen-importing-document.selectors';
import { TranslateService } from '@ngx-translate/core';
import { ImportingDocument } from '../states/importing-document.state';
import { selectCorrelationId } from '../selectors/screen.selectors';
import { IdpDocumentMetadataService } from '../../services/document-import/idp-document-metadata.service';
import { IMPORT_ACCEPT_FILE_SIZE_BYTES } from '../../constants';

@Injectable()
export class ScreenImportingDocumentEffects {
    private readonly actions$ = inject(Actions);
    private readonly injector = inject(Injector);
    private readonly store = inject(Store);
    private readonly translationService = inject(TranslateService);

    private lazyDocumentImportService: IdpDocumentImportService | undefined;
    private lazyDocumentImportDialogService: IdpDocumentImportDialogService | undefined;
    private lazyDocumentMetadataService: IdpDocumentMetadataService | undefined;

    private get documentImportService(): IdpDocumentImportService {
        if (this.lazyDocumentImportService) {
            return this.lazyDocumentImportService;
        } else {
            this.lazyDocumentImportService = this.injector.get(IdpDocumentImportService);
            return this.lazyDocumentImportService;
        }
    }

    private get documentImportDialogService(): IdpDocumentImportDialogService {
        if (this.lazyDocumentImportDialogService) {
            return this.lazyDocumentImportDialogService;
        } else {
            this.lazyDocumentImportDialogService = this.injector.get(IdpDocumentImportDialogService);
            return this.lazyDocumentImportDialogService;
        }
    }

    private get documentMetadataService(): IdpDocumentMetadataService {
        if (this.lazyDocumentMetadataService) {
            return this.lazyDocumentMetadataService;
        } else {
            this.lazyDocumentMetadataService = this.injector.get(IdpDocumentMetadataService);
            return this.lazyDocumentMetadataService;
        }
    }

    onLoadScreenSuccessLoadDocumentUploadEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.screenLoadSuccess),
            map(({ taskData }) => {
                return systemActions.screenLoadDocumentUpload({ taskData });
            })
        )
    );

    loadDocumentUploadEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.screenLoadDocumentUpload),
            // eslint-disable-next-line rxjs/no-unsafe-switchmap
            switchMap(({ taskData }) =>
                taskData.targetFolder ? this.getLoadDocumentUploadAction$() : of(systemActions.screenLoadDocumentUploadSuccess({ enabled: false }))
            )
        )
    );

    loadDocumentUploadErrorNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.screenLoadDocumentUploadError),
            map(({ message }) => {
                const error = message ?? 'IDP_CLASS_VERIFICATION.DOCUMENT_UPLOAD.LOAD_ERROR.GENERIC';
                return systemActions.notificationShow({ severity: 'error', message: error });
            })
        )
    );

    queueDocumentUploadEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(userActions.queueDocumentUpload),
            mergeMap(({ files }) => {
                return this.documentImportService.queueDocumentUpload$(files).pipe(
                    mergeMap((result) => {
                        const actions = [];
                        if (result.erroneous.length > 0) {
                            actions.push(systemActions.queueDocumentUploadError({ documents: result.erroneous }));
                        }
                        if (result.queued.length > 0) {
                            actions.push(systemActions.queueDocumentUploadSuccess({ documents: [...result.erroneous, ...result.queued] }));
                        }
                        return actions;
                    })
                );
            })
        )
    );

    queueDocumentUploadSuccessOpenProgressDialogEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.queueDocumentUploadSuccess),
            map(({ documents }) => {
                this.documentImportDialogService.queueDocumentUpload(documents);
                return systemActions.documentImportStarted();
            })
        )
    );

    queueDocumentUploadErrorNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.queueDocumentUploadError),
            mergeMap(({ documents }) => {
                return of(
                    systemActions.notificationShow({
                        severity: 'error',
                        message: documents.map((document) => this.getDocumentUploadErrorMessage(document)).join(', '),
                    })
                );
            })
        )
    );

    cancelDocumentUploadEffect$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(userActions.cancelDocumentUpload),
                map(({ documentIds }) => {
                    this.documentImportService.cancelDocumentUpload(documentIds);
                })
            ),
        { dispatch: false }
    );

    documentUploadErrorNotificationEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.documentUploadError),
            concatLatestFrom(({ documentId }) => this.store.select(selectImportingDocumentById(documentId))),
            mergeMap(([{ errorCode }, document]) => {
                return document
                    ? of(systemActions.notificationShow({ severity: 'error', message: this.getDocumentUploadErrorMessage(document, errorCode) }))
                    : EMPTY;
            })
        )
    );

    documentUploadCompleteCreateDocumentEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.documentUploadComplete),
            concatLatestFrom(({ documentId }) => this.store.select(selectImportingDocumentById(documentId))),
            filter((entry): entry is [ReturnType<typeof systemActions.documentUploadComplete>, ImportingDocument] => !!entry[1]),
            concatMap(([{ documentId }, document]) => {
                return this.documentImportService.createDocumentUnderProcessDocumentUploadFolder$(document).pipe(
                    map(([sysId, processFolderId]) => systemActions.uploadedDocumentCreated({ documentId, sysId, processFolderId })),
                    catchError(() => of(systemActions.documentUploadError({ documentId: documentId })))
                );
            })
        )
    );

    uploadedDocumentCreateEffect$ = createEffect(() =>
        this.actions$.pipe(
            ofType(systemActions.uploadedDocumentCreated),
            concatLatestFrom(({ documentId }) => [
                this.store.select(selectImportingDocumentById(documentId)),
                this.store.select(selectCorrelationId),
            ]),
            filter((entry): entry is [ReturnType<typeof systemActions.uploadedDocumentCreated>, ImportingDocument, string] => !!entry[1]),
            mergeMap(([{ documentId }, document, correlationId]) => {
                if (document.sysId) {
                    return this.documentMetadataService.extractDocumentMetadata$(document, correlationId).pipe(
                        map((res) => {
                            return systemActions.uploadedDocumentReceivedMetadataSuccess({ metadata: res, documentId, uploadedDocument: document });
                        }),
                        catchError(() => of(systemActions.uploadedDocumentReceivedMetadataError({ documentId: documentId })))
                    );
                }
                return EMPTY;
            })
        )
    );

    private getLoadDocumentUploadAction$(): Observable<
        ReturnType<typeof systemActions.screenLoadDocumentUploadSuccess> | ReturnType<typeof systemActions.screenLoadDocumentUploadError>
    > {
        return this.documentImportService.isDocumentUploadTargetFolderExists$().pipe(
            switchMap((exists) =>
                exists
                    ? of(systemActions.screenLoadDocumentUploadSuccess({ enabled: true }))
                    : of(systemActions.screenLoadDocumentUploadError({ message: 'IDP_CLASS_VERIFICATION.DOCUMENT_UPLOAD.LOAD_ERROR.0' }))
            ),
            catchError(() => of(systemActions.screenLoadDocumentUploadError({})))
        );
    }

    private getDocumentUploadErrorMessage(document: ImportingDocument, errorCode?: number): string {
        errorCode = errorCode ?? document.errorCode;
        if (errorCode === DocumentUploadErrorCode.ExceedsSize) {
            return this.translationService.instant(`IDP_CLASS_VERIFICATION.DOCUMENT_UPLOAD.UPLOAD_ERROR.${errorCode}`, {
                fileName: document.fileName,
                fileMaxSize: `${Math.floor(IMPORT_ACCEPT_FILE_SIZE_BYTES / (1024 * 1024))} MB`,
            });
        }

        return this.translationService.instant(`IDP_CLASS_VERIFICATION.DOCUMENT_UPLOAD.UPLOAD_ERROR.${errorCode ?? 'GENERIC'}`, {
            fileName: document.fileName,
        });
    }
}

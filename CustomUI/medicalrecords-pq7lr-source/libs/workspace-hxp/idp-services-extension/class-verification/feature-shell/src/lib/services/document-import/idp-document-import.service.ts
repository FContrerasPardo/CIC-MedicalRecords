/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Observable } from 'rxjs';
import { ImportingDocument } from '../../store/states/importing-document.state';

export interface QueueDocumentUploadResult {
    queued: ImportingDocument[];
    erroneous: ImportingDocument[];
}

export abstract class IdpDocumentImportService {
    abstract readonly isDocumentImportEnabled$: Observable<boolean>;
    abstract readonly isDocumentImportRunning$: Observable<boolean>;

    /**
     * @summary Emits progress updates for an ongoing document upload.
     * @returns Observable that emits an updated ImportingDocument with progress information.
     */
    abstract readonly documentUploadProgress$: Observable<ImportingDocument>;

    /**
     * @summary Emits when a document upload completes successfully.
     * @returns Observable that emits the final ImportingDocument.
     */
    abstract readonly documentUploadComplete$: Observable<ImportingDocument>;

    /**
     * @summary Emits when a document upload is cancelled.
     * @returns Observable that emits the cancelled ImportingDocument.
     */
    abstract readonly documentUploadCancelled$: Observable<ImportingDocument>;

    /**
     * @summary Emits when a document upload encounters an error.
     * @returns Observable that emits the failed ImportingDocument.
     */
    abstract readonly documentUploadError$: Observable<ImportingDocument>;

    /**
     * @summary Emits when a metadata extraction completes successfully.
     * @returns Observable that emits the final ImportingDocument.
     */
    abstract readonly documentMetadataExtractionCompleted$: Observable<ImportingDocument>;

    /**
     * @summary Emits when a metadata extraction encounters an error.
     * @returns Observable that emits the failed ImportingDocument.
     */
    abstract readonly documentMetadataExtractionError$: Observable<ImportingDocument>;

    /**
     * @summary Emits when a metadata extraction is cancelled.
     * @returns Observable that emits the cancelled ImportingDocument.
     */
    abstract readonly documentMetadataExtractionCancelled$: Observable<ImportingDocument>;

    abstract isDocumentUploadTargetFolderExists$(): Observable<boolean>;
    abstract createDocumentUnderProcessDocumentUploadFolder$(document: ImportingDocument): Observable<[string, string]>;
    abstract queueDocumentUpload(files: File[]): void;
    abstract queueDocumentUpload$(files: File[]): Observable<QueueDocumentUploadResult>;
    abstract cancelDocumentUpload(documentIds: string[]): void;
}

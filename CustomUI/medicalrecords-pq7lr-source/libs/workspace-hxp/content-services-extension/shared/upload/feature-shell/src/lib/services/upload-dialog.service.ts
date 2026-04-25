/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { FileModel } from '@hxp/shared-hxp/services';
import { UploadManagerService } from './upload-manager.service';
import { UploadContentModel } from '../model/upload-content.model';
import { CreateDocumentStrategy } from '../document-update-strategies/create-document-strategy';

@Injectable({
    providedIn: 'root',
})
export class UploadDialogService {
    protected uploadManagerService = inject(UploadManagerService);
    protected createDocumentStrategy = inject(CreateDocumentStrategy);

    newUploads: Subject<UploadContentModel[]> = new Subject<UploadContentModel[]>();
    uploadError: Subject<UploadContentModel> = new Subject<UploadContentModel>();
    uploadCanceled: Subject<UploadContentModel> = new Subject<UploadContentModel>();

    constructor() {
        this.uploadManagerService.uploadError.subscribe((upload: UploadContentModel) => this.uploadError.next(upload));
        this.uploadManagerService.uploadCanceled.subscribe((upload: UploadContentModel) => this.uploadCanceled.next(upload));
    }

    uploadFiles(fileModels: FileModel[]): void {
        const uploadDataModel: UploadContentModel[] = fileModels.map((fileModel) =>
            this.uploadManagerService.createUploadModel(fileModel, this.createDocumentStrategy)
        );
        this.addToQueue(uploadDataModel);

        for (const uploadModel of uploadDataModel) {
            this.uploadManagerService.initiateUpload(uploadModel).subscribe({
                error: (err) => {
                    console.error('Error initiating upload for file:', uploadModel.fileModel.name, err);
                },
            });
        }
        this.uploadManagerService.uploadFilesInTheQueue();
        this.newUploads.next(uploadDataModel);
    }

    addToQueue(uploadList: UploadContentModel[]): void {
        for (const upload of uploadList) {
            this.uploadManagerService.addToQueue(upload);
        }
    }

    cancelAllUploads(): void {
        this.uploadManagerService.cancelAllAndClearQueue();
    }

    cancelUpload(uploadModel: UploadContentModel): void {
        this.uploadManagerService.cancelUpload(uploadModel);
    }

    completeQueuedUploads(): void {
        this.uploadManagerService.completeQueuedUploads();
    }

    retryUpload(upload: UploadContentModel): void {
        this.uploadManagerService.retryUpload(upload);
    }

    clearQueue(): void {
        this.uploadManagerService.clearQueue();
    }

    removeFromQueue(model: UploadContentModel): void {
        this.uploadManagerService.removeFromQueue(model);
    }

    isFileUploadPending(fileModel: FileModel): boolean {
        return this.uploadManagerService.isFileUploadPending(fileModel);
    }

    isFileUploadAborted(fileModel: FileModel): boolean {
        return this.uploadManagerService.isFileUploadAborted(fileModel);
    }

    isFileUploadCanceled(fileModel: FileModel): boolean {
        return this.uploadManagerService.isFileUploadCanceled(fileModel);
    }

    isFileUploadErrored(fileModel: FileModel): boolean {
        return this.uploadManagerService.isFileUploadErrored(fileModel);
    }

    isUploadOngoing(): boolean {
        return this.uploadManagerService.isUploadOngoing();
    }
}

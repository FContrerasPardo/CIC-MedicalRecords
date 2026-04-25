/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Minimatch } from 'minimatch';
import { AppConfigService } from '@alfresco/adf-core';
import { FileReaderService } from './hxp-file-reader.service';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Upload, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { FileUploadCompleteEvent, FileUploadDeleteEvent, FileUploadErrorEvent, FileUploadEvent } from '../events/file.event';
import { asapScheduler, catchError, defer, EMPTY, filter, map, mergeMap, Observable, of, scheduled, Subject, take, throwError } from 'rxjs';
import {
    FileModel,
    FileUploadStatus,
    SharedUploadMiddlewareService,
    UPLOAD_MIDDLEWARE_SERVICE,
    UploadSuccessData,
    UploadProgressEvent,
    UploadResponse,
} from '@hxp/shared-hxp/services';

@Injectable({
    providedIn: 'root',
})
export class HxpUploadService {
    private readonly destroyRef = inject(DestroyRef);
    private readonly uploadApi: UploadApi = inject(UPLOAD_API_TOKEN);
    private readonly appConfigService: AppConfigService = inject(AppConfigService);
    private readonly fileReaderService: FileReaderService = inject(FileReaderService);
    private readonly uploadFileMiddleware: SharedUploadMiddlewareService | null = inject(UPLOAD_MIDDLEWARE_SERVICE, { optional: true });

    private totalError = 0;
    private totalAborted = 0;
    private totalComplete = 0;
    private excludedFileList: string[] = [];
    private excludedFoldersList: string[] = [];
    private matchingOptions: Record<string, unknown> = {};
    private folderMatchingOptions: Record<string, unknown> = {};
    private abortControllers = new WeakMap<FileModel, AbortController>();
    private queueChangedSubject: Subject<FileModel[]> = new Subject<FileModel[]>();
    private fileUploadSubject: Subject<FileUploadEvent> = new Subject<FileUploadEvent>();
    private fileUploadAbortedSubject: Subject<FileUploadEvent> = new Subject<FileUploadEvent>();
    private fileUploadStartingSubject: Subject<FileUploadEvent> = new Subject<FileUploadEvent>();
    private fileUploadProgressSubject: Subject<FileUploadEvent> = new Subject<FileUploadEvent>();
    private fileUploadCancelledSubject: Subject<FileUploadEvent> = new Subject<FileUploadEvent>();
    private fileUploadSuccessSubject: Subject<UploadSuccessData> = new Subject<UploadSuccessData>();
    private fileUploadErrorSubject: Subject<FileUploadErrorEvent> = new Subject<FileUploadErrorEvent>();
    private fileUploadDeletedSubject: Subject<FileUploadDeleteEvent> = new Subject<FileUploadDeleteEvent>();
    private fileUploadCompleteSubject: Subject<FileUploadCompleteEvent> = new Subject<FileUploadCompleteEvent>();

    queue: FileModel[] = [];
    queueChanged: Observable<FileModel[]> = this.queueChangedSubject.asObservable();
    fileUpload: Observable<FileUploadEvent> = this.fileUploadSubject.asObservable();
    fileUploadAborted: Observable<FileUploadEvent> = this.fileUploadAbortedSubject.asObservable();
    fileUploadError: Observable<FileUploadErrorEvent> = this.fileUploadErrorSubject.asObservable();
    fileUploadProgress: Observable<FileUploadEvent> = this.fileUploadProgressSubject.asObservable();
    fileUploadStarting: Observable<FileUploadEvent> = this.fileUploadStartingSubject.asObservable();
    fileUploadCancelled: Observable<FileUploadEvent> = this.fileUploadCancelledSubject.asObservable();
    fileUploadComplete: Observable<FileUploadCompleteEvent> = this.fileUploadCompleteSubject.asObservable();
    fileUploadDeleted: Observable<FileUploadDeleteEvent> = this.fileUploadDeletedSubject.asObservable();
    fileUploadSuccess: Observable<UploadSuccessData> = this.fileUploadSuccessSubject.asObservable();

    /**
     * Returns the number of concurrent threads for uploading.
     *
     * @returns Number of concurrent threads (default 1)
     */
    getThreadsCount(): number {
        return this.appConfigService.get<number>('upload.threads', 1);
    }

    /**
     * Checks whether the service still has files uploading or awaiting upload.
     *
     * @returns True if files in the queue are still uploading, false otherwise
     */
    isUploading(): boolean {
        return this.queue.some(
            (file) =>
                file.status === FileUploadStatus.Pending || file.status === FileUploadStatus.Starting || file.status === FileUploadStatus.Progress
        );
    }

    /**
     * Gets the file Queue
     *
     * @returns Array of files that form the queue
     */
    getQueue(): FileModel[] {
        return this.queue;
    }

    /**
     * Adds files to the uploading queue to be uploaded
     *
     * @param files One or more separate parameters or an array of files to queue
     * @returns Array of files that were not blocked from upload by the ignore list
     */
    addToQueue(...files: FileModel[]): FileModel[] {
        const allowedFiles = files.filter((currentFile) => this.filterElement(currentFile));
        this.queue = [...this.queue, ...allowedFiles];
        this.queueChangedSubject.next(this.queue);
        return allowedFiles;
    }

    /**
     * Finds all the files in the queue that are not yet uploaded and uploads them into the directory folder.
     */
    uploadFilesInTheQueue(): void {
        this.uploadFiles(this.queue);
    }

    private uploadFile(file: FileModel): void {
        if (file.status === FileUploadStatus.Pending) {
            this.uploadFiles([file]);
        }
    }

    private uploadFiles(filesToUpload: FileModel[] = []): void {
        const files = filesToUpload.filter((file) => file.status === FileUploadStatus.Pending);
        const threadsCount = this.getThreadsCount();

        if (files && files.length > 0) {
            scheduled(files, asapScheduler)
                .pipe(
                    mergeMap(
                        (file) =>
                            defer(() => this.initializeUpload(file)).pipe(
                                filter((fileUploadResult) => !!fileUploadResult),
                                mergeMap((fileUploadResult) =>
                                    this.handleUploadMiddleware(file, fileUploadResult).pipe(
                                        map((middlewareResults) => ({ file, fileUploadResult, middlewareResults }))
                                    )
                                ),
                                catchError((error) => {
                                    this.onUploadError(file, error);
                                    return EMPTY;
                                })
                            ),
                        threadsCount
                    ),
                    catchError((error) => throwError(() => error)),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe(({ file, fileUploadResult, middlewareResults }) => {
                    this.onUploadComplete(file, fileUploadResult.data);

                    this.fileUploadSuccessSubject.next({
                        uploadedFile: fileUploadResult.data as unknown as Upload,
                        uploadFileOptions: file.options,
                        ...(middlewareResults ? { middlewareResults } : {}),
                    });
                });
        }
    }

    /**
     * Cancels uploading of files.
     *
     * @param files One or more separate parameters or an array of files specifying uploads to cancel
     */
    cancelUpload(...files: FileModel[]) {
        for (const file of files) {
            const existingFileInQueue = this.queue.find((currentFile) => currentFile.name === file.name);
            if (existingFileInQueue) {
                switch (existingFileInQueue.status) {
                    case FileUploadStatus.Pending:
                    case FileUploadStatus.Starting: {
                        this.onUploadCancelled(existingFileInQueue);
                        break;
                    }
                    case FileUploadStatus.Progress: {
                        this.onUploadAborted(existingFileInQueue);
                        break;
                    }

                    case FileUploadStatus.Deleted: {
                        this.onUploadDeleted(existingFileInQueue);
                        break;
                    }
                }
            }
        }
    }

    /**
     * Deletes the uploaded file from the server.
     */
    deleteUpload(fileModel: FileModel): void {
        void this.uploadApi.deleteUpload(fileModel.data.id);
    }

    /**
     * Retries the upload of a file.
     */
    retryUpload(fileModel: FileModel): void {
        if (
            fileModel.status === FileUploadStatus.Aborted ||
            fileModel.status === FileUploadStatus.Cancelled ||
            fileModel.status === FileUploadStatus.Error
        ) {
            fileModel.data = null;
            fileModel.errorCode = null;
            fileModel.progress = {
                loaded: 0,
                total: 0,
                percent: 0,
                bytes: 0,
                lengthComputable: false,
            };
            fileModel.status = FileUploadStatus.Pending;
        }

        this.uploadFile(fileModel);
    }

    /** Clears the upload queue */
    clearQueue() {
        this.queue = [];
        this.totalComplete = 0;
        this.totalAborted = 0;
        this.totalError = 0;
    }

    private initializeUpload(fileModel: FileModel): Promise<UploadResponse<Upload> | null> {
        if (fileModel.status !== FileUploadStatus.Cancelled) {
            this.onUploadStarting(fileModel);

            const abortController = new AbortController();
            this.abortControllers.set(fileModel, abortController);

            return this.sendFileUploadRequest(fileModel, abortController);
        }
        return Promise.resolve(null);
    }

    private handleUploadMiddleware(file: FileModel, fileUploadResult: UploadResponse<Upload>) {
        if (this.uploadFileMiddleware) {
            return scheduled(
                this.uploadFileMiddleware.onUploadFile({
                    uploadedFile: fileUploadResult.data as unknown as Upload,
                    uploadFileOptions: file.options,
                }),
                asapScheduler
            ).pipe(take(1));
        }

        return of(null);
    }

    private async sendFileUploadRequest(fileModel: FileModel, abortController: AbortController): Promise<UploadResponse<Upload>> {
        let payload: any = fileModel.file;

        if (fileModel.file.type === 'application/json') {
            payload = await this.fileReaderService.readFileAsText(fileModel.file);
        }

        const requestOptions = {
            headers: {
                'Content-Type': fileModel.file.type,
            },
            onUploadProgress: (progressEvent: UploadProgressEvent) => {
                this.onUploadProgress(fileModel, progressEvent);
            },
            signal: abortController.signal,
        };

        return this.uploadApi
            .upload(undefined, undefined, undefined, undefined, fileModel.file.name, undefined, fileModel.file.type, payload, requestOptions)
            .then((response) => response as UploadResponse<Upload>)
            .catch((error) => {
                this.onUploadError(fileModel, error);
                throw error;
            });
    }

    private onUploadStarting(file: FileModel): void {
        if (file) {
            file.status = FileUploadStatus.Starting;

            const event = new FileUploadEvent(file, FileUploadStatus.Starting);
            this.fileUploadSubject.next(event);
            this.fileUploadStartingSubject.next(event);
        }
    }

    private onUploadProgress(file: FileModel, progress: UploadProgressEvent): void {
        if (file) {
            file.progress = progress;
            file.status = FileUploadStatus.Progress;

            const event = new FileUploadEvent(file, FileUploadStatus.Progress);
            this.fileUploadSubject.next(event);
            this.fileUploadProgressSubject.next(event);
        }
    }

    private onUploadError(file: FileModel, error: any): void {
        if (file) {
            file.errorCode = error?.status || error?.response?.status;
            file.status = FileUploadStatus.Error;
            this.totalError++;

            this.deleteAbortController(file);

            const event = new FileUploadErrorEvent(file, error, this.totalError);
            this.fileUploadSubject.next(event);
            this.fileUploadErrorSubject.next(event);
        }
    }

    private onUploadComplete(file: FileModel, data: any): void {
        if (file) {
            file.status = FileUploadStatus.Complete;
            file.data = data;
            this.totalComplete++;

            this.deleteAbortController(file);

            const event = new FileUploadCompleteEvent(file, this.totalComplete, data, this.totalAborted);
            this.fileUploadSubject.next(event);
            this.fileUploadCompleteSubject.next(event);
        }
    }

    private onUploadAborted(fileModel: FileModel): void {
        if (fileModel) {
            const abortController = this.abortControllers.get(fileModel);
            if (abortController) {
                abortController.abort();
                this.deleteAbortController(fileModel);
            }
            fileModel.status = FileUploadStatus.Aborted;
            this.totalAborted++;

            const event = new FileUploadEvent(fileModel, FileUploadStatus.Aborted);
            this.fileUploadSubject.next(event);
            this.fileUploadAbortedSubject.next(event);
        }
    }

    private onUploadCancelled(file: FileModel): void {
        if (file) {
            file.status = FileUploadStatus.Cancelled;
            this.deleteAbortController(file);

            const event = new FileUploadEvent(file, FileUploadStatus.Cancelled);
            this.fileUploadSubject.next(event);
            this.fileUploadCancelledSubject.next(event);
        }
    }

    private onUploadDeleted(file: FileModel): void {
        if (file) {
            file.status = FileUploadStatus.Deleted;
            this.totalComplete--;
            this.deleteAbortController(file);

            const event = new FileUploadDeleteEvent(file, this.totalComplete);
            this.fileUploadSubject.next(event);
            this.fileUploadDeletedSubject.next(event);
        }
    }

    private filterElement(file: FileModel) {
        this.excludedFileList = this.appConfigService.get<string[]>('files.excluded');
        this.excludedFoldersList = this.appConfigService.get<string[]>('folders.excluded');
        let isAllowed = true;

        if (this.excludedFileList) {
            this.matchingOptions = this.appConfigService.get('files.match-options');
            isAllowed = this.isFileNameAllowed(file);
        }

        if (isAllowed && this.excludedFoldersList) {
            this.folderMatchingOptions = this.appConfigService.get('folders.match-options');
            isAllowed = this.isParentFolderAllowed(file);
        }
        return isAllowed;
    }

    private isParentFolderAllowed(file: FileModel): boolean {
        let isAllowed = true;

        const currentFile: any = file.file;
        const fileRelativePath = currentFile.webkitRelativePath ?? file.options.path;
        if (currentFile && fileRelativePath) {
            isAllowed =
                this.excludedFoldersList.filter((folderToExclude) =>
                    fileRelativePath.split('/').some((pathElement: string) => {
                        const minimatch = new Minimatch(folderToExclude, this.folderMatchingOptions);
                        return minimatch.match(pathElement);
                    })
                ).length === 0;
        }
        return isAllowed;
    }

    private isFileNameAllowed(file: FileModel): boolean {
        return (
            this.excludedFileList.filter((pattern) => {
                const minimatch = new Minimatch(pattern, this.matchingOptions);
                return minimatch.match(file.name);
            }).length === 0
        );
    }

    private deleteAbortController(fileModel: FileModel): void {
        this.abortControllers.delete(fileModel);
    }
}

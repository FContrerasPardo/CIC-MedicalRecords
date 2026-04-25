/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { computed, DestroyRef, inject, Injectable, InjectionToken, OnDestroy, Signal, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
    asapScheduler, catchError, concatMap, defer, filter, finalize, first, forkJoin, from, map, mergeMap, observeOn, retry, shareReplay,
    startWith, Subject, Subscription, switchMap, takeUntil, tap, throwError, timer,
} from 'rxjs';
import { ScanningHubClient } from './scanning-hub-client.service';
import { ScannerDetails } from '../models/scanning-models';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FileUploadCompleteEvent, HxpUploadService } from '@hxp/workspace-hxp/shared/upload-files/feature-shell';
import { FileModel, FileUploadStatus } from '@hxp/shared-hxp/services';
import { DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { ProcessPayloadCloud, StartProcessCloudService } from '@alfresco/adf-process-services-cloud';
import { ApiBaseDocument, ApiDocPage, ContentFileReference } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { lastOrDefault } from '../util';

export interface ScanningSessionContext {
    readonly appName: string;
    readonly processDefinitionId: string;
    readonly targetFolder: string;
}

export const SCANNING_SESSION_CONTEXT = new InjectionToken<Signal<ScanningSessionContext>>('SCANNING_SESSION_CONTEXT');

const TASK_LIST = '/task-list-cloud';

interface ScanningPage {
    id: string;
    file: File;
    url: string;
    fileDocument?: Document;
}

interface ScanningDocument {
    id: string;
    pages: ScanningPage[];
}

interface ScanningBatch {
    documents: ScanningDocument[];
}

interface ScanScreenOutputVariables {
    batchState: BatchState;
    sys_task_assignee?: string;
    contents: ContentFileReference[]; // for compatibility with old processes
}

interface BatchState {
    documents: ApiDocument[];
    extractionStatus?: 'Awaiting' | 'Extracted' | 'ReviewRequired';
    contentFileReferences: ContentFileReference[];
    hasRejectedDocuments?: boolean;

    deletedPages?: ApiDocPage[];
    separationStatus?: 'Awaiting' | 'Separated' | 'ReviewRequired';
    classificationStatus?: 'Awaiting' | 'Classified' | 'ReviewRequired';
}

type PartOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface ApiDocument extends Omit<ApiBaseDocument, 'pages'> {
    pages: PartOptional<ApiDocPage, 'height' | 'width'>[];
    classId?: string;
    extractionReviewStatus?: 'ReviewRequired' | 'ReviewNotRequired';
    markAsRejected?: boolean;
    rejectReasonId?: string;
    rejectNote?: string;
}


@Injectable()
export class ScanningSession implements OnDestroy {
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly scanClient = inject(ScanningHubClient);
    private readonly uploadService = inject(HxpUploadService);
    private readonly adfDocumentService = inject(DocumentService);
    private readonly startProcessService = inject(StartProcessCloudService);
    private readonly context = inject(SCANNING_SESSION_CONTEXT);
    private readonly enableImportFiles = localStorage.getItem('idp-scanning-import-files') === 'true';

    readonly scanClientState = toSignal(this.scanClient.state$, { initialValue: { status: 'disconnected' } });

    readonly scanners$ = timer(0, 10_000).pipe(
        switchMap(() =>
            this.scanClient.findScanners$().pipe(
                retry({ delay: 1_000 })
            )
        ),
        startWith([]),
        map((scanners) => this.enableImportFiles ? [...scanners, { name: 'Import Files', protocol: 'Files' }] : scanners),
        tap((scanners) => {
            if (!this.selectedScanner()) {
                this.selectedScanner.set(scanners[0]);
            }
        })
    );

    readonly selectedScanner = optSignal<ScannerDetails>();

    private readonly scanInProgress = optSignal<Subscription>();
    private readonly stopScanSubject = new Subject<void>();
    private readonly configurationInProgress = optSignal<Subscription>();
    private readonly uploadInProgress = optSignal<Subscription>();

    readonly isScanning = computed(() => isActive(this.scanInProgress()));
    readonly isConfiguring = computed(() => isActive(this.configurationInProgress()));
    readonly isUploading = computed(() => isActive(this.uploadInProgress()));
    readonly isBusy = computed(() => this.isScanning() || this.isConfiguring() || this.isUploading());
    readonly canUploadBatch = computed(() => {
        if (this.isBusy()) { return false; }
        const batch = this.batch();
        return batch.documents.length > 0 && batch.documents.every((doc) => doc.pages.length > 0 && doc.pages.every((page) => page.fileDocument?.sys_id));
    });

    private readonly scannerCustomConfig = new Map<string, string>();
    private getScannerSettings(scanner: ScannerDetails) {
        return {
            configurationData: this.scannerCustomConfig.get(`${scanner.name}:${scanner.protocol}`),
            parentWindowTitle: document.title,
        };
    }
    private setScannerConfigData(scanner: ScannerDetails, configData: string) {
        this.scannerCustomConfig.set(`${scanner.name}:${scanner.protocol}`, configData);
    }

    private readonly _batch = signal<ScanningBatch>({ documents: [] });
    readonly batch = this._batch.asReadonly();

    readonly selectedPageIds = signal<ReadonlySet<string>>(new Set<string>());
    readonly activePageId = computed(() => lastOrDefault(this.selectedPageIds()));
    readonly pageCount = computed(() => this.batch().documents.reduce((total, doc) => total + doc.pages.length, 0));

    ngOnDestroy() {
        const batch = this.batch();
        for (const document of batch.documents) {
            for (const page of document.pages) {
                URL.revokeObjectURL(page.url);
            }
        }
        this._batch.set({ documents: [] });
    }

    configureScanner(scanner = this.selectedScanner()) {
        if (!scanner) {
            throw new Error('Scanner not selected');
        }
        if (this.isBusy()) {
            throw new Error('Scanner is busy');
        }
        if (scanner.protocol === 'Files') {
            return new Subscription();
        }

        const scannerSettings = this.getScannerSettings(scanner);
        const subscription = this.scanClient.showUserInterface$(scanner, scannerSettings)
            .pipe(
                observeOn(asapScheduler),
                finalize(() => this.configurationInProgress.update((sub) => sub === subscription ? undefined : sub)),
                takeUntilDestroyed(this.destroyRef)
            ).subscribe({
                next: (configEvent) => this.setScannerConfigData(scanner, configEvent.config),
                error: (err) => console.warn(err),
            });
        this.configurationInProgress.set(subscription);
        return subscription;
    }

    startScan(scanner = this.selectedScanner()) {
        if (!scanner) {
            throw new Error('Scanner not selected');
        }
        if (this.isBusy()) {
            throw new Error('Scanner is busy');
        }

        const subscription = this.scanFiles$(scanner).pipe(
            observeOn(asapScheduler),
            map((file) => ({
                file,
                id: crypto.randomUUID(),
                url: URL.createObjectURL(file),
            })),
            tap((newPage) => {
                this._batch.update((batch) => {
                    const document = batch.documents.at(-1) ?? {
                        id: crypto.randomUUID(),
                        pages: [],
                    };
                    return {
                        ...batch,
                        documents: [...batch.documents.slice(0, -1), {
                            ...document,
                            pages: [...document.pages, newPage],
                        }],
                    };
                });
                this.selectedPageIds.update((selectedPageIds) => selectedPageIds.size === 0 ? new Set([newPage.id]) : selectedPageIds);
            }),
            mergeMap((newPage) =>
                forkJoin([this.uploadFile$(newPage.file), this.batchFolder$]).pipe(
                    concatMap(([uploadComplete, folder]) => this.createDocumentForFile$(uploadComplete, folder)),
                    map((fileDocument) => [newPage, fileDocument] as const)
                )
            ),
            tap(([newPage, fileDocument]) =>  {
                this._batch.update((batch) => ({
                    ...batch,
                    documents: batch.documents.map((document) => ({
                        ...document,
                        pages: document.pages.map((page) => ({
                            ...page,
                            ...(page.id === newPage.id ? { fileDocument } : {}),
                        }))
                    })),
                }));
            }),
            finalize(() => this.scanInProgress.update((sub) => sub === subscription ? undefined : sub)),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            error: (err) => console.warn(err),
        });
        this.scanInProgress.set(subscription);
        return subscription;
    }

    private scanFiles$(scanner: ScannerDetails) {
        if (scanner.protocol === 'Files') {
            return from(pickFiles()).pipe(
                concatMap((files) => files)
            );
        }

        const scannerSettings = this.getScannerSettings(scanner);
        const scanSettings = {
            preferredFormats: ['image/png', 'image/jpeg'] as const,
        };
        return this.scanClient
            .scan$(scanner, scannerSettings, scanSettings)
            .pipe(
                tap((event) => {
                    if ('config' in event) {
                        this.setScannerConfigData(scanner, event.config);
                    }
                }),
                filter((event) => 'file' in event),
                map((event) => {
                    const format = event.file.details.format;
                    return new File([event.file.data], `scan-${new Date().toISOString()}.${format.fileExtensions[0]}`, {
                        type: format.mimeType,
                    });
                }),
                takeUntil(this.stopScanSubject),
            );
    }

    cancelBatch() {
        this.stopScan();
        return this.router.navigate([TASK_LIST]);
    }

    stopScan() {
        this.stopScanSubject.next();
    }

    uploadBatch() {
        if (!this.canUploadBatch()) {
            throw new Error('Not ready to upload batch');
        }

        const batch = this.batch();
        const contentFileReferences = batch.documents.flatMap((doc) => doc.pages.map((page) => ({
            sys_id: page.fileDocument?.sys_id ?? __throw(new Error('sys_id not defined')),
            sysfile_blob: {
                mimeType: page.file.type,
            },
        })));

        const documents = batch.documents.map((document) => ({
            id: document.id,
            name: document.pages[0]?.file?.name ?? 'Unnamed Document',
            pages: document.pages.map((page) => ({
                contentFileReferenceIndex: contentFileReferences.findIndex((ref) => ref.sys_id === page.fileDocument?.sys_id),
                sourcePageIndex: 0,
                // rotation: 0,
                // height: 0,
                // width: 0,
            })),
        }));

        const context = this.context();
        const payload = new ProcessPayloadCloud({
            processDefinitionKey: context.processDefinitionId,
            variables: {
                batchState: {
                    documents,
                    contentFileReferences,
                },
                contents: contentFileReferences,
            } satisfies ScanScreenOutputVariables,
        });

        const subscription = this.startProcessService.startProcess(context.appName, payload).pipe(
            observeOn(asapScheduler),
            finalize(() => this.uploadInProgress.update((sub) => sub === subscription ? undefined : sub)),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            complete: () => this.router.navigate([TASK_LIST]),
            error: (err) => console.warn(err),
        });
        this.uploadInProgress.set(subscription);
        return subscription;
    }

    private createBatchFolder$() {
        const name = `batch-${new Date().toISOString()}`;
        return this.adfDocumentService.createDocument({
            sys_name: name,
            sys_title: name,
            sys_parentPath: this.context().targetFolder,
            sys_primaryType: 'SysFolder',
        });
    }

    private readonly batchFolder$ = defer(() => this.createBatchFolder$()).pipe(
        catchError((err) => throwError(() => err)), // do not replay errors
        shareReplay({ bufferSize: 1, refCount: false })
    );

    private createDocumentForFile$(uploadComplete: FileUploadCompleteEvent, parentFolder: Document | string) {
        return this.adfDocumentService.createDocument({
            sys_name: uploadComplete.file.name,
            sys_title: uploadComplete.file.name,
            sys_parentPath: typeof parentFolder === 'string' ? parentFolder : undefined,
            sys_parentId: typeof parentFolder === 'string' ? undefined : parentFolder.sys_id,
            sys_primaryType: 'SysFile',
            sysfile_blob: {
                uploadId: uploadComplete.file.data.id,
            },
        });
    }

    private uploadFile$(file: File) {
        const fileModel = new FileModel(file);
        const results$ = this.uploadService.fileUpload.pipe(
            filter((event) => event.file === fileModel),
            tap((event) => {
                if (event.error) {
                    throw event.error;
                }
                switch (event.status) {
                    case FileUploadStatus.Aborted: { throw new Error('file upload aborted'); }
                    case FileUploadStatus.Cancelled: { throw new Error('file upload cancelled'); }
                    case FileUploadStatus.Deleted: { throw new Error('file upload deleted'); }
                    case FileUploadStatus.Error: { throw new Error('file upload error'); }
                }
            }),
            first((event) => event instanceof FileUploadCompleteEvent),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
        // subscribe early with a replay just in case emissions come before we return
        results$.subscribe({
            error: (err) => console.error(err),
        });
        const acceptedFiles = this.uploadService.addToQueue(fileModel);
        this.uploadService.uploadFilesInTheQueue();
        if (acceptedFiles.length === 0) {
            throw new Error('file rejected by upload service');
        }
        return results$;
    }
}

function findDeep<T, R>(source: T[], search: (item: T) => R | undefined) {
    for (const item of source) {
        const result = search(item);
        if (result !== undefined) {
            return result;
        }
    }
    return undefined;
}

export function findPageById(batch: ScanningBatch, pageId: string) {
    return findDeep(batch.documents, (doc) => doc.pages.find((p) => p.id === pageId));
};

export function findPageByIndex(batch: ScanningBatch, pageIndex: number) {
    let i = 0;
    for (const document of batch.documents) {
        for (const page of document.pages) {
            if (i === pageIndex) {
                return page;
            }
            i++;
        }
    }
    return undefined;
}

function __throw(error: Error): never {
    throw error;
}

function optSignal<T>(initialValue: T | undefined = undefined) {
    return signal<T | undefined>(initialValue);
}

function isActive(sub: Subscription | undefined) {
    return sub?.closed === false;
}

function pickFiles() {
    return new Promise<FileList>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png';
        input.multiple = true;
        input.addEventListener('cancel', () => reject(new Error('File selection cancelled')));
        input.addEventListener('change', () => {
            if (input.files) {
                resolve(input.files);
            } else {
                reject(new Error('No files selected'));
            }
        });
        input.click();
    });
}

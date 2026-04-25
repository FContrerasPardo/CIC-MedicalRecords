/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { MatButtonModule } from '@angular/material/button';
import { BehaviorSubject, combineLatest, merge, Observable, of } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
    UPLOAD_MIDDLEWARE_SERVICE,
    UploadSuccessData,
    PendingDocument,
    isPendingDocument,
} from '@hxp/shared-hxp/services';
import { DeferredUploadMiddlewareService } from './services/deferred-upload-middleware.service';
import { DataColumnComponent, DataColumnListComponent, EmptyListComponent, FileSizePipe, TimeAgoPipe } from '@alfresco/adf-core';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { DocumentService, HxpNotificationService, HXP_DOCUMENT_DELETE_ACTION_SERVICE, UserResolverPipe } from '@alfresco/adf-hx-content-services/services';
import { OnInit, Component, ViewEncapsulation, inject, DestroyRef, signal } from '@angular/core';
import { WORKSPACE_HXP } from '@hxp/workspace-hxp/feature-flag';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { catchError, concatMap, filter, map, mergeMap, startWith, switchMap, take, tap, withLatestFrom } from 'rxjs/operators';
import { AttachFileDialogData, SelectionMode } from '@hxp/shared-hxp/form-widgets/feature-shell';
import { ContentTypeIconComponent, DeleteButtonActionService, HxpDocumentListComponent } from '@alfresco/adf-hx-content-services/ui';
import {
    HxpUploadService,
    UploadHxpButtonComponent,
    HxpUploadDragAreaComponent,
    HxpUploadingDialogComponent,
} from '@hxp/workspace-hxp/shared/upload-files/feature-shell';

export const CONTENT_REPOSITORY_DEFAULT_PATH = ROOT_DOCUMENT.sys_path as string;

@Component({
    selector: 'hxp-attach-file-dialog',
    templateUrl: './attach-file-dialog.component.html',
    styleUrls: ['./attach-file-dialog.component.scss'],
    host: { class: 'hxp-attach-file-dialog' },
    imports: [
        AsyncPipe,
        TimeAgoPipe,
        FileSizePipe,
        MatTabsModule,
        MatIconModule,
        TranslatePipe,
        MatDialogModule,
        MatButtonModule,
        UserResolverPipe,
        EmptyListComponent,
        DataColumnComponent,
        DataColumnListComponent,
        ContentTypeIconComponent,
        HxpDocumentListComponent,
        MatProgressSpinnerModule,
        UploadHxpButtonComponent,
        HxpUploadDragAreaComponent,
        HxpUploadingDialogComponent,
    ],
    providers: [
        {
            provide: HXP_DOCUMENT_DELETE_ACTION_SERVICE,
            useClass: DeleteButtonActionService,
        },
        HxpUploadService,
        DeferredUploadMiddlewareService,
        {
            provide: UPLOAD_MIDDLEWARE_SERVICE,
            useExisting: DeferredUploadMiddlewareService,
        },
    ],
    encapsulation: ViewEncapsulation.None,
})
export class AttachFileDialogComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly uploadService = inject(HxpUploadService);
    private readonly deferredMiddleware = inject(DeferredUploadMiddlewareService);
    private readonly documentService = inject(DocumentService);
    private readonly dialog = inject(MatDialogRef<AttachFileDialogComponent>);
    private readonly notificationService = inject(HxpNotificationService);
    private readonly featuresService = inject<IFeaturesService>(FeaturesServiceToken);
    private readonly isPendingDocFeatureEnabled = toSignal(
        this.featuresService.isOn$(WORKSPACE_HXP.FORMS_DEFERRED_DOC_CREATION),
        { initialValue: false }
    );

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.deferredMiddleware.discardUploads()
                .pipe(take(1))
                .subscribe({});
        });
    }

    data: AttachFileDialogData = inject(MAT_DIALOG_DATA);
    showDragAndDropPlaceholder = true;
    selectedTabIndex = 0;
    documentNavigationStack: Document[] = [];
    insideErrorMessage = '';

    displayedDocumentSubject$ = new BehaviorSubject<Document | null>(null);
    displayedDocument$ = this.displayedDocumentSubject$.asObservable();

    fetchDocumentCollectionSubject$ = new BehaviorSubject<Document[]>([]);
    fetchDocumentCollection$ = this.fetchDocumentCollectionSubject$.asObservable();

    protected readonly isLoadingFolderContent = signal(false);

    chosenDocuments$ = new BehaviorSubject<(Document | PendingDocument)[]>([]);

    private readonly isUploading$: Observable<boolean> = merge(
        this.uploadService.fileUploadStarting,
        this.uploadService.fileUploadComplete,
        this.uploadService.fileUploadError,
        this.uploadService.fileUploadAborted
    ).pipe(
        map(() => this.uploadService.isUploading()),
        startWith(false)
    );

    isAttachButtonDisabled$: Observable<boolean> = combineLatest([
        this.chosenDocuments$.pipe(
            map((chosenDocuments) => {
                return chosenDocuments.filter((document) =>
                    (this.isPendingDocFeatureEnabled() && isPendingDocument(document)) || !(document as Document).sys_isFolderish
                );
            }),
            map((chosenDocuments) => {
                const selectionMode = this.data.selectionMode;
                return (
                    (selectionMode === SelectionMode.single && chosenDocuments.length !== 1) ||
                    (selectionMode === SelectionMode.multiple && chosenDocuments.length === 0)
                );
            })
        ),
        this.deferredMiddleware.hasPendingUploads$,
        this.isUploading$,
    ]).pipe(
        map(([selectionDisabled, hasPendingUploads, uploading]) => {
            if (uploading) {
                return true;
            }
            if (this.isPendingDocFeatureEnabled() && hasPendingUploads) {
                return false;
            }
            return selectionDisabled;
        }),
        takeUntilDestroyed(this.destroyRef)
    );

    isContentEnabled = true;

    get isUploadTabSelected(): boolean {
        return this.selectedTabIndex === 1;
    }

    get isUploadEnabled(): boolean {
        return this.data?.isLocalUploadAvailable;
    }

    ngOnInit(): void {
        this.data.defaultDocumentPath$
            .pipe(
                mergeMap((defaultFolder) => {
                    return defaultFolder ? this.getDocumentByPath(defaultFolder as string) : of(null);
                }),
                catchError(() => {
                    this.notificationService.showError('ATTACH_FILE_DIALOG.FOLDER_DOES_NOT_EXIST');
                    this.close();

                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((document) => {
                if (!this.data.isContentUploadAvailable) {
                    this.isContentEnabled = false;

                    if (this.data.isLocalUploadAvailable) {
                        this.selectedTabIndex = 1;
                    }
                }

                if (document) {
                    this.checkDocumentPrimaryType(document);
                } else if (!this.insideErrorMessage) {
                    this.notificationService.showError('ATTACH_FILE_DIALOG.FOLDER_DOES_NOT_EXIST');
                    this.close();
                }
            });

        this.displayedDocument$
            .pipe(
                filter((document) => !!document),
                tap(() => {
                    this.isLoadingFolderContent.set(true);
                    this.fetchDocumentCollectionSubject$.next([]);
                }),
                switchMap((displayedDoc) =>
                    this.fetchChildren(displayedDoc).pipe(
                        map((documents) => ({ displayedDoc, documents })),
                        catchError(() => {
                            this.isLoadingFolderContent.set(false);
                            return of({ displayedDoc, documents: [] });
                        })
                    )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(({ displayedDoc, documents }) => {
                this.fetchDocumentCollectionSubject$.next(documents);
                this.updateNavigationStack(displayedDoc);
                this.isLoadingFolderContent.set(false);
            });

        merge(this.uploadService.fileUploadSuccess, this.documentService.documentDeleted$)
            .pipe(
                concatMap(() => {
                    const lastDocument = this.documentNavigationStack.at(-1);
                    return lastDocument ? this.getDocumentByPath(lastDocument.sys_path as string) : of(null);
                }),
                filter((document) => !!document),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((document) => {
                this.displayedDocumentSubject$.next({ ...document });
            });
    }

    onUploadStart(): void {
        this.showDragAndDropPlaceholder = false;
    }

    onSuccessUpload(uploadedFiles: UploadSuccessData<Document | PendingDocument>): void {
        const uploadedItem = uploadedFiles.middlewareResults;
        if (!uploadedItem) {
            return;
        }

        const resolvedItem: Document | PendingDocument =
            this.isPendingDocFeatureEnabled() && isPendingDocument(uploadedItem) ? uploadedItem : uploadedItem as Document;

        this.chosenDocuments$.pipe(take(1)).subscribe((chosenDocuments) => {
            if (this.data.selectionMode === SelectionMode.single) {
                this.chosenDocuments$.next([resolvedItem]);
            } else if (this.data.selectionMode === SelectionMode.multiple) {
                const combinedDocuments = [...chosenDocuments, resolvedItem];
                const uniqueDocuments = combinedDocuments.filter((item, index, array) => {
                    const itemId = this.getItemId(item);
                    return array.findIndex((d) => this.getItemId(d) === itemId) === index;
                });
                this.chosenDocuments$.next(uniqueDocuments);
            }
        });
    }

    private getItemId(item: Document | PendingDocument): string {
        if (this.isPendingDocFeatureEnabled() && isPendingDocument(item)) {
            return item.document.sys_id ?? '';
        }
        return (item as Document).sys_id ?? '';
    }

    onSelectedDocuments($event: Document[]): void {
        this.chosenDocuments$.next($event);
    }

    navigateForward(document: Document): void {
        if (document.sys_isFolderish) {
            this.displayedDocumentSubject$.next(document);
        }
    }

    navigateBack(document: Document): void {
        this.chosenDocuments$.next([]);
        this.displayedDocumentSubject$.next(document);
    }

    close(): void {
        this.dialog.close();
    }

    onAttachButtonClick(): void {
        if (this.isPendingDocFeatureEnabled()) {
            this.deferredMiddleware.flush().pipe(
                withLatestFrom(this.chosenDocuments$),
                takeUntilDestroyed(this.destroyRef)
            ).subscribe({
                next: ([results, chosenDocuments]) => {
                    const failedCount = results.filter((r) => !!r.failedFileName).length;

                    if (failedCount > 0) {
                        this.notificationService.showError('ATTACH_FILE_DIALOG.DOCUMENT_CREATION_FAILED', undefined, {
                            count: failedCount,
                        });
                    }

                    const flushedDocs = results
                        .map((r) => r.document)
                        .filter((doc): doc is Document | PendingDocument => doc !== null);

                    this.data.selectionSubject$.next([...chosenDocuments, ...flushedDocs]);
                    this.close();
                },
                error: () => {
                    this.notificationService.showError('ATTACH_FILE_DIALOG.DOCUMENT_CREATION_FAILED');
                    this.close();
                },
            });
        } else {
            this.chosenDocuments$.pipe(take(1)).subscribe((chosenDocuments) => {
                this.data.selectionSubject$.next(chosenDocuments);
                this.close();
            });
        }
    }

    onTabSelectionChange(tabIndex: number): void {
        this.selectedTabIndex = tabIndex;
    }

    private checkDocumentPrimaryType(document: Document | null): void {
        if (document) {
            if (document.sys_primaryType === ROOT_DOCUMENT.sys_primaryType) {
                document.sys_title = ROOT_DOCUMENT.sys_primaryType;
            }
            this.navigateForward(document);
        }
    }

    private getDocumentByPath(path: string): Observable<Document | null> {
        return this.documentService.getDocumentByPath(path).pipe(
            catchError((e) => {
                if (e.toString().includes('code 5')) {
                    this.notificationService.showError('ATTACH_FILE_DIALOG.CONTENT_SERVICE_UNAVAILABLE');
                } else if (e.toString().includes('code 403')) {
                    this.insideErrorMessage = 'ATTACH_FILE_DIALOG.FOLDER_ACCESS_DENIED';
                    return of(null);
                } else {
                    this.notificationService.showError('ATTACH_FILE_DIALOG.FOLDER_NAME_DOES_NOT_EXIST', undefined, {
                        folderName: path.split('/').pop(),
                    });
                }
                this.close();
                return of({ sys_primaryType: 'SysFolder' });
            }),
            takeUntilDestroyed(this.destroyRef)
        );
    }

    private fetchChildren(document: Document): Observable<Document[]> {
        return this.documentService.getAllChildren(document.sys_id || '').pipe(
            map((result) => {
                return result.documents;
            }),
            catchError((error) => {
                console.error(error);
                return of([]);
            }),
            takeUntilDestroyed(this.destroyRef)
        );
    }

    private updateNavigationStack(document: Document): void {
        const existingIndex = this.documentNavigationStack.findIndex((d) => d.sys_id === document.sys_id);
        if (existingIndex === -1) {
            this.documentNavigationStack.push(document);
        } else {
            this.documentNavigationStack.splice(existingIndex + 1);
        }
    }

}

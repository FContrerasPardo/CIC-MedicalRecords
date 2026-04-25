/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, switchMap, take, tap, map } from 'rxjs/operators';
import { copyNotificationMessages } from './copy-notification-messages.config';
import { copySnackBarTypes } from './copy-snack-bar-types.model';
import { Document } from '@hylandsoftware/hxcs-js-client';
import {
    DocumentService,
    DocumentType,
    HxpNotificationService,
    hasPermission,
    CopyStatus,
    DocumentPermissions,
    isDocumentParentFolder,
} from '@alfresco/adf-hx-content-services/services';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BreadcrumbData, BreadcrumbDataService, BreadcrumbEntry, BreadcrumbEntryTypes } from '../../../services/breadcrumb-data.service';
import { FolderBreadcrumbComponent } from '../../../components/folder-breadcrumb/folder-breadcrumb.component';
import { TreeSkeletonLoaderComponent } from '@alfresco/adf-hx-content-services/ui';
import { ScrollTrackerDirective } from '@hxp/workspace-hxp/content-services-extension/shared/util';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocumentCopyActionService } from '@hxp/workspace-hxp/shared/services';

export interface CopyDialogData {
    parentDocument: Document;
    documentToCopy: Document;
}

@Component({
    selector: 'hxp-document-copy-dialog',
    imports: [
        CommonModule,
        TranslatePipe,
        MatIconModule,
        MatInputModule,
        FolderBreadcrumbComponent,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        TreeSkeletonLoaderComponent,
        ScrollTrackerDirective,
    ],
    templateUrl: './document-copy-dialog.component.html',
    styleUrls: ['./document-copy-dialog.component.scss'],
    providers: [BreadcrumbDataService],
})
export class DocumentCopyDialogComponent implements OnInit {
    public copyDialogData: CopyDialogData = inject(MAT_DIALOG_DATA);
    private readonly formBuilder = inject(FormBuilder);
    private readonly breadcrumbDataService = inject(BreadcrumbDataService);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly documentService = inject(DocumentService);
    private readonly documentCopyActionService = inject(DocumentCopyActionService);

    readonly copyDocumentForm = this.formBuilder.group({
        copied_link: [''],
    });
    public readonly breadcrumbData$: Observable<BreadcrumbData | null>;

    protected isAvailable = false;
    protected isCopying = false;
    protected isLoading$ = this.breadcrumbDataService.isLoading$;

    private readonly copyDocument = this.copyDialogData.documentToCopy;
    private readonly folderSubject = new BehaviorSubject<BreadcrumbEntry>({ document: this.copyDocument, type: BreadcrumbEntryTypes.PARENT });
    private currentDocument: Document = this.copyDocument;
    private folder$ = this.folderSubject.asObservable();

    private readonly dialogRef = inject<MatDialogRef<DocumentCopyDialogComponent>>(MatDialogRef);

    constructor() {
        this.breadcrumbData$ = this.folder$.pipe(
            filter((folder) => !!folder),
            switchMap((breadcrumbEntry) =>
                this.breadcrumbDataService.getBreadcrumbData(breadcrumbEntry).pipe(
                    tap((breadcrumbData: BreadcrumbData) => {
                        this.currentDocument = breadcrumbData.currentFolder;
                        if (this.checkAvailability(breadcrumbData?.currentFolder)) {
                            breadcrumbEntry.document = breadcrumbData.currentFolder;
                        }
                    })
                )
            ),
            map((breadcrumbData) => this.breadcrumbDataService.filterSubfolders(breadcrumbData, this.copyDocument))
        );

        this.dialogRef
            .afterClosed()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: () => (this.isCopying = false),
            });
    }

    ngOnInit(): void {
        this.onSelectedFolder({ document: this.copyDocument, type: BreadcrumbEntryTypes.PARENT });
    }

    onSelectedFolder(breadcrumbEntry: BreadcrumbEntry) {
        this.breadcrumbDataService.resetPagination();
        this.folderSubject.next(breadcrumbEntry);
    }

    onCopy() {
        if (this.isAvailable) {
            this.folder$.pipe(take(1)).subscribe({
                // eslint-disable-next-line rxjs/no-nested-subscribe
                next: (breadcrumbEntry) => this.performCopyAction(breadcrumbEntry.document),
            });
        }
    }

    onScroll(): void {
        this.breadcrumbDataService.handleLoadMore().subscribe({
            next: (loadMore: boolean) => {
                if (loadMore) {
                    this.folderSubject.next({
                        document: this.currentDocument,
                        type: BreadcrumbEntryTypes.SELF,
                    });
                }
            },
            error: (err) => {
                console.error(err);
            },
        });
    }

    private performCopyAction(targetFolder: Document) {
        this.isCopying = true;
        this.documentCopyActionService.copy(this.copyDocument, targetFolder).subscribe({
            next: (document) => {
                this.displayNotificationMessage(document ? CopyStatus.SUCCESS : CopyStatus.ERROR);
            },
            error: () => {
                this.displayNotificationMessage(CopyStatus.ERROR);
                this.isCopying = false;
            },
            complete: () => {
                this.dialogRef.close();
                if (isDocumentParentFolder(this.copyDocument, targetFolder)) {
                    this.documentService.requestReload();
                }
            },
        });
    }

    private displayNotificationMessage(status: CopyStatus) {
        const fileTypeKey: DocumentType = this.copyDocument.sys_isFolderish ? 'FOLDER' : 'FILE';
        const messageKey = copyNotificationMessages[status][fileTypeKey];

        this.hxpNotificationService.openSnackBar(messageKey, copySnackBarTypes[status]);
    }

    private checkAvailability(folder: Document) {
        this.isAvailable = hasPermission(folder, DocumentPermissions.CREATE_CHILD);
        return this.isAvailable;
    }
}

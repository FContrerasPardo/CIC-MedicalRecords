/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { VersionDeleteDialogData } from '../configs/version-delete-dialog.interface';
import {
    DocumentRouterService,
    DocumentService,
    DocumentVersionsService,
    HxpNotificationService,
    VersionableDocument,
} from '@alfresco/adf-hx-content-services/services';
import { EMPTY, map, switchMap, take } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'hxp-version-delete-confirmation-dialog',
    imports: [MatDialogModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, TranslatePipe],
    templateUrl: './version-delete-confirmation-dialog.component.html',
    styleUrl: './version-delete-confirmation-dialog.component.scss',
})
export class VersionDeleteConfirmationDialogComponent {
    protected isDeleting = false;

    private readonly version: VersionableDocument;
    private readonly parentId: string;

    private readonly dialogData = inject<VersionDeleteDialogData>(MAT_DIALOG_DATA);
    private readonly dialogRef = inject<MatDialogRef<VersionDeleteConfirmationDialogComponent>>(MatDialogRef);
    private readonly documentVersionsService = inject(DocumentVersionsService);
    private readonly documentService = inject(DocumentService);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly documentRouterService = inject(DocumentRouterService);

    constructor() {
        this.version = this.dialogData.version;
        this.parentId = this.dialogData.parentId;
    }

    protected onDelete() {
        this.isDeleting = true;
        let success = false;
        this.documentVersionsService.deleteVersion(this.version).subscribe({
            next: () => {
                this.hxpNotificationService.showSuccess('MANAGE_VERSIONS.DELETE_DIALOG.NOTIFICATION.SUCCESS');
                success = true;
            },
            error: (error) => {
                console.error(error);
                this.hxpNotificationService.showError('MANAGE_VERSIONS.DELETE_DIALOG.NOTIFICATION.ERROR');
                this.isDeleting = false;
            },
            complete: () => {
                this.isDeleting = false;
                this.dialogRef.close();

                if (success) {
                    this.documentService.documentLoaded$
                        .pipe(
                            take(1),
                            switchMap((document) =>
                                document?.sys_id === this.version.sys_id ? this.documentService.getDocumentById(this.parentId).pipe(take(1)) : EMPTY
                            ),
                            map((parentDocument) => parentDocument)
                        )
                        // eslint-disable-next-line rxjs/no-nested-subscribe
                        .subscribe((parentDocument) => {
                            if (parentDocument) {
                                this.documentRouterService.navigateTo(parentDocument);
                            }
                        });
                }
            },
        });
    }
}

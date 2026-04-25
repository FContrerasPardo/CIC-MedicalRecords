/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { FormAttachWidgetDialogServiceConfig, SharedAttachFileDialogService } from '@hxp/shared-hxp/services';
import { AttachFileDialogComponent } from '../attach-file-dialog.component';
import { FileDownloadService } from '@alfresco/adf-hx-content-services/services';

@Injectable()
export class AttachFileDialogService extends SharedAttachFileDialogService {
    private readonly dialog = inject(MatDialog);
    private readonly fileDownloadService = inject(FileDownloadService);

    openDialog(data: FormAttachWidgetDialogServiceConfig): void {
        this.dialog.open(AttachFileDialogComponent, {
            data,
            height: '70%',
            width: '66%',
            maxWidth: '90vw',
        });
    }

    closeDialog(): void {
        this.dialog.closeAll();
    }

    downloadDocuments(documents: Document[]): void {
        this.fileDownloadService.downloadFile(documents);
    }
}

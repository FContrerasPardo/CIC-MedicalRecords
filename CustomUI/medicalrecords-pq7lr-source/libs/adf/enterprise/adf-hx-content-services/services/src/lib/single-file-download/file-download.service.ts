/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { downloadNotificationMessages } from './configs/download-notification-messages.config';
import { downloadSnackBarTypes } from './configs/download-snack-bar-types.model';
import { SingleFileDownloadService } from './single-file-download.service';
import { HxpNotificationService } from '../notification/hxp-notification.service';
import { DownloadStatus } from './models/download-status.enum';
import { IsSingleDocumentWithMainBlobService } from '../is-single-document-with-main-blob/is-single-document-with-main-blob.service';

@Injectable({ providedIn: 'root' })
export class FileDownloadService {
    private readonly singleFileDownloadService = inject(SingleFileDownloadService);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly isSingleDocumentWithMainBlobService = inject(IsSingleDocumentWithMainBlobService);

    downloadFile(hxpSingleFileDownload: Document[]) {
        if (this.isSingleDocumentWithMainBlobService.validate(hxpSingleFileDownload)) {
            this.singleFileDownloadService.download(hxpSingleFileDownload[0]).subscribe({
                next: (status) => {
                    this.displayNotificationMessage(status);
                },
                error: () => {
                    this.displayNotificationMessage(DownloadStatus.ERROR);
                },
            });
        }
    }

    private displayNotificationMessage(status: DownloadStatus) {
        this.hxpNotificationService.openSnackBar(downloadNotificationMessages[status], downloadSnackBarTypes[status]);
    }
}

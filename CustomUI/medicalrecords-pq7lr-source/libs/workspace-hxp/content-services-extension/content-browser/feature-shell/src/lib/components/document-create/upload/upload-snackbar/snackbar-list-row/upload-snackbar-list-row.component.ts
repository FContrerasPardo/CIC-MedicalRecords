/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { FileUploadStatus } from '@hxp/shared-hxp/services';
import { HxpFileUploadErrorPipe } from '@hxp/workspace-hxp/shared/upload-files/feature-shell';
import { MimeTypeIconComponent } from '@alfresco/adf-hx-content-services/icons';
import { NgIf, PercentPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { UploadContentModel, UploadManagerService } from '@hxp/workspace-hxp/content-services-extension/shared/upload/feature-shell';

@Component({
    selector: 'hxp-upload-snackbar-list-row',
    templateUrl: './upload-snackbar-list-row.component.html',
    styleUrls: ['./upload-snackbar-list-row.component.scss'],
    imports: [
        NgIf,
        MatIconModule,
        MatButtonModule,
        MatProgressBarModule,
        MatTooltipModule,
        MimeTypeIconComponent,
        PercentPipe,
        TranslatePipe,
        HxpFileUploadErrorPipe,
    ],
    encapsulation: ViewEncapsulation.None,
})
export class UploadSnackbarListRowComponent {
    @Input()
    upload?: UploadContentModel;

    private readonly uploadManagerService = inject(UploadManagerService);

    get mimeType(): string {
        return this.upload?.fileModel?.file?.type || 'default';
    }

    onCancel(): void {
        if (this.upload) {
            this.uploadManagerService.cancelUpload(this.upload);
        }
    }

    onRetry(): void {
        if (this.upload) {
            this.uploadManagerService.retryUpload(this.upload);
        }
    }

    showCancelledStatus(): boolean {
        if (!this.upload) {
            return false;
        }
        return this.isUploadError() || this.upload.fileModel.status === FileUploadStatus.Deleted;
    }

    canCancelUpload(): boolean {
        return this.isUploading();
    }

    isUploadError(): boolean {
        return (
            !this.uploadManagerService.isUploadCompleted(this.upload) &&
            (this.uploadManagerService.isUploadAborted(this.upload) ||
                this.uploadManagerService.isUploadErrored(this.upload) ||
                this.uploadManagerService.isUploadCanceled(this.upload))
        );
    }

    isUploading(): boolean {
        return !this.isUploadComplete() && !this.isUploadError();
    }

    isUploadComplete(): boolean {
        return this.uploadManagerService.isUploadCompleted(this.upload);
    }
}

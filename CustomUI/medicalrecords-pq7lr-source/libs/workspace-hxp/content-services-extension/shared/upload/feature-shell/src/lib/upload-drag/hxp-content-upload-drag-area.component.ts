/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileInfo } from '@alfresco/adf-core';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { HxpFileDraggableDirective, HxpUploadDragAreaComponent } from '@hxp/workspace-hxp/shared/upload-files/feature-shell';
import { UploadDialogService } from '../services/upload-dialog.service';

@Component({
    selector: 'hxp-content-upload-drag-area',
    templateUrl: './hxp-content-upload-drag-area.component.html',
    styleUrls: ['./hxp-content-upload-drag-area.component.scss'],
    host: { class: 'hxp-content-upload-drag-area' },
    encapsulation: ViewEncapsulation.None,
    imports: [HxpFileDraggableDirective],
})
export class ContentUploadDragAreaComponent extends HxpUploadDragAreaComponent {
    protected uploadDialogService = inject(UploadDialogService);

    uploadFiles(files: File[]): void {
        const filteredFiles = files
            .map((file: File) => this.createFileModel(file, this.rootFolderId, ((file as any).webkitRelativePath || '').replace(/\/[^/]*$/, '')))
            .filter(this.isFileAcceptable.bind(this))
            .filter(this.isFileSizeAcceptable.bind(this));

        this.uploadDialogService.uploadFiles(filteredFiles);
    }

    uploadFilesInfo(files: FileInfo[]): void {
        const filteredFiles = files
            .filter((fileInfo): fileInfo is Required<FileInfo> => !!fileInfo.file)
            .map((fileInfo) => this.createFileModel(fileInfo.file, this.rootFolderId, fileInfo.relativeFolder));

        this.uploadDialogService.uploadFiles(filteredFiles);
    }
}

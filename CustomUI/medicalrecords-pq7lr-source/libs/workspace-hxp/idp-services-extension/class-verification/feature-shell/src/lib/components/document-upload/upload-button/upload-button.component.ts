/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ChangeDetectionStrategy, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FileUtils } from '@alfresco/adf-core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hyland-idp-upload-document-button',
    templateUrl: './upload-button.component.html',
    styleUrls: ['./upload-button.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, TranslatePipe],
})
export class DocumentUploadButtonComponent implements OnChanges {
    @Input() acceptedFileExtensions: string[] = [];
    @Input() disabled = false;

    @Output() uploadDocuments = new EventEmitter<File[]>();

    inputFileAccept: string | undefined;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['acceptedFileExtensions'] && !this.inputFileAccept) {
            this.inputFileAccept = this.acceptedFileExtensions.map((ext) => `.${ext.trim()}`).join(',');
        }
    }

    onUploadDocuments(event: any): void {
        const eventFileList: FileList = event.target.files;
        if (eventFileList && eventFileList.length > 0) {
            this.uploadDocuments.emit(FileUtils.toFileArray(eventFileList));
        }
    }
}

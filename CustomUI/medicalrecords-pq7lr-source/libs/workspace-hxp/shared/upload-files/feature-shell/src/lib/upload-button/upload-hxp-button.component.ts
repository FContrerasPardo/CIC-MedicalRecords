/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileUtils } from '@alfresco/adf-core';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { UploadBase } from '../base-upload/upload-base';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'hxp-upload-button',
    templateUrl: './upload-hxp-button.component.html',
    styleUrls: ['./upload-hxp-button.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [NgIf, MatButtonModule, MatIconModule, TranslatePipe],
})
export class UploadHxpButtonComponent extends UploadBase {
    /** Allows/disallows upload folders (only for Chrome). */
    @Input()
    uploadFolders = false;

    /** Allows/disallows multiple files */
    @Input()
    multipleFiles = false;

    @Input()
    useAsMenuItem = false;

    /** Defines the text of the upload button. */
    @Input()
    staticTitle = '';

    /** Custom tooltip text. */
    @Input()
    tooltip = '';

    /** Custom added file. The upload button type will be 'button' instead of 'file' */
    @Input()
    file?: File;

    isButtonDisabled(): boolean | undefined {
        return this.disabled ?? undefined;
    }

    onFilesAdded($event: any): void {
        const files: File[] = FileUtils.toFileArray($event.currentTarget.files);

        this.uploadFiles(files);
        $event.target.value = '';
    }

    onDirectoryAdded($event: any): void {
        const files: File[] = FileUtils.toFileArray($event.currentTarget.files);
        this.uploadFiles(files);
        $event.target.value = '';
    }
}

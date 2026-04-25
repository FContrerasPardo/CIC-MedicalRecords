/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileModel } from '@hxp/shared-hxp/services';
import { HxpUploadService } from '../services/hxp-upload.service';

export class UploadFilesEvent {
    private isDefaultPrevented = false;

    constructor(public files: Array<FileModel>, private uploadService: HxpUploadService) {}

    get defaultPrevented() {
        return this.isDefaultPrevented;
    }

    preventDefault() {
        this.isDefaultPrevented = true;
    }

    pauseUpload() {
        this.preventDefault();
    }

    resumeUpload() {
        if (this.files && this.files.length > 0) {
            this.uploadService.addToQueue(...this.files);
            this.uploadService.uploadFilesInTheQueue();
        }
    }
}

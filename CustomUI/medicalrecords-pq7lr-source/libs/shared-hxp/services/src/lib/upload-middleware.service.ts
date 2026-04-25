/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileUploadOptions } from './model/file.model';
import { Document, Upload } from '@hylandsoftware/hxcs-js-client';
import { Injectable } from '@angular/core';
import { PendingDocument } from './model/pending-document.model';

export interface UploadSuccessData<T = any> {
    uploadedFile: Upload;
    uploadFileOptions: FileUploadOptions;
    middlewareResults?: T;
}

@Injectable()
export abstract class SharedUploadMiddlewareService {
    abstract onUploadFile(uploadFile: UploadSuccessData | null): Promise<Document | PendingDocument | null>;
}

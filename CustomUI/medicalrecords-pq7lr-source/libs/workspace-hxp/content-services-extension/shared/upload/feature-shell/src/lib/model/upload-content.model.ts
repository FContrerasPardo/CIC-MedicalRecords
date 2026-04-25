/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileModel } from '@hxp/shared-hxp/services';
import { UploadDocumentModel } from './upload-document.model';
import { UploadActionStrategy } from '../document-update-strategies/upload-action-strategy';

export interface UploadContentModel {
    fileModel: FileModel;
    documentModel: UploadDocumentModel;
    postFileUploadAction?: UploadActionStrategy;
}

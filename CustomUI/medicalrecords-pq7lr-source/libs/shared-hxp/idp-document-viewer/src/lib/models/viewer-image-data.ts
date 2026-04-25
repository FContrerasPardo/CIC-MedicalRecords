/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Observable } from 'rxjs';
import { ImageData } from './datasource';

export type ImageInfo = ImageData & {
    naturalWidth?: number;
    naturalHeight?: number;
};

export interface ViewerImageData {
    pageId: string;
    documentId: string;
    pageName: string;
    pageNumber: number;
    documentName: string;
    firstPageInDoc: boolean;
    lastPageInDoc: boolean;
    multiDocumentView: boolean;
    customClassToApply: string[];
    image$: Observable<ImageInfo>;
}

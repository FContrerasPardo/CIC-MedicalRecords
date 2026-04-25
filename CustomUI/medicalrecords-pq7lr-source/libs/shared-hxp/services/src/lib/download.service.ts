/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DownloadData {
    name: string;
    blob: Blob;
    title?: string;
}

@Injectable()
export abstract class SharedDownloadService {
    abstract downloadByDocumentId(id: string | undefined): Observable<DownloadData | null>;
    abstract downloadByDocumentPath(path: string | undefined): Observable<DownloadData | null>;
}

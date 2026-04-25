/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { DEFAULT_REPOSITORY_ID, DOWNLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { DownloadApi } from '@hylandsoftware/hxcs-js-client';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class BlobDownloadService {
    private readonly downloadApi = inject<DownloadApi>(DOWNLOAD_API_TOKEN);

    downloadBlob(documentId: string, property = 'sysfile_blob', repositoryId = DEFAULT_REPOSITORY_ID): Observable<Blob> {
        return from(this.downloadApi.downloadByIdAndXPath(documentId, property, false, repositoryId, { responseType: 'blob' })).pipe(
            map(({ data }) => data)
        );
    }
}

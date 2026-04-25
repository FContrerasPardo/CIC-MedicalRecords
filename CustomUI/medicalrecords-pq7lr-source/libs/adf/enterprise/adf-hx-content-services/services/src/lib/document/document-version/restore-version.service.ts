/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { VERSION_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { inject, Injectable } from '@angular/core';
import { VersionApi, Document } from '@hylandsoftware/hxcs-js-client';
import { from, map, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class RestoreDocumentVersionService {
    private readonly versionApi = inject<VersionApi>(VERSION_API_TOKEN);

    restore(versionId: string, repositoryId: string): Observable<Document> {
        return from(this.versionApi.restoreVersion(versionId, repositoryId)).pipe(
            map((response) => response.data)
        );
    }
}

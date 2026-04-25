/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { CheckInApi, Document } from '@hylandsoftware/hxcs-js-client';
import { CHECKIN_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { from, map, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CreateDocumentVersionService {
    private readonly checkInApi = inject<CheckInApi>(CHECKIN_API_TOKEN);

    checkin(documentId: string, minor: boolean, repositoryId: string): Observable<Document> {
        return from(this.checkInApi.checkin(documentId, minor, repositoryId)).pipe(
            map((response) => response.data)
        );
    }
}

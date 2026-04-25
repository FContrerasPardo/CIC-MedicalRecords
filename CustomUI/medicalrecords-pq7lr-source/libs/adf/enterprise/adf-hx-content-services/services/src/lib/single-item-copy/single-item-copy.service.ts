/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { CopyApi } from '@hylandsoftware/hxcs-js-client';
import { COPY_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { CopyStatus } from './models/copy-status.enum';
import { map, catchError } from 'rxjs/operators';
import { CopyResponse } from './models/copy-response.interface';

@Injectable({
    providedIn: 'root',
})
export class SingleItemCopyService {
    private readonly copyApi = inject<CopyApi>(COPY_API_TOKEN);

    copy(copyDocumentId: string, name: string, targetParentId: string): Observable<CopyResponse> {
        return from(this.copyApi.copy(copyDocumentId, 'default', { name, targetParentId })).pipe(
            map((response) => ({ document: response.data, status: CopyStatus.SUCCESS })),
            catchError(() => of({ document: undefined, status: CopyStatus.ERROR }))
        );
    }
}

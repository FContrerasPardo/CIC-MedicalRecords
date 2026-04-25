/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { MoveApi } from '@hylandsoftware/hxcs-js-client';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MoveStatus } from './models/move-status.enum';
import { MOVE_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { MoveResponse } from './models/move-response.interface';

@Injectable({
    providedIn: 'root',
})
export class SingleItemMoveService {
    private readonly moveApi = inject<MoveApi>(MOVE_API_TOKEN);

    move(moveDocumentId: string, targetParentId: string): Observable<MoveResponse> {
        return from(
            this.moveApi.move(moveDocumentId, 'default', {
                targetParentId,
            })
        ).pipe(
            map((response) => ({ document: response.data, status: MoveStatus.SUCCESS })),
            catchError(() => of({ document: undefined, status: MoveStatus.ERROR }))
        );
    }
}

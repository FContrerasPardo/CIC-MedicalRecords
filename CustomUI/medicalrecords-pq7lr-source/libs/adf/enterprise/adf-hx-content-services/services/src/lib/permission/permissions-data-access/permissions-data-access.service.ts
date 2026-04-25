/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { ACE } from '@hylandsoftware/hxcs-js-client';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HxpNotificationService } from '../../notification/hxp-notification.service';
import { DocumentService } from '../../document/document.service';
import { UserType } from '../models/user-type.enum';
import { getNotificationMessage } from '../utils/permissions-utils';

@Injectable({
    providedIn: 'root',
})
export class PermissionsDataAccessService {
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly documentService = inject(DocumentService);

    updateDocument(id: string, acl: ACE[], restoreType?: UserType): Observable<boolean> {
        return this.documentService.updateDocument(id, { sys_acl: acl }).pipe(
            map(() => {
                const message = getNotificationMessage(true, restoreType);
                this.hxpNotificationService.showSuccess(message);
                return true;
            }),
            catchError(() => {
                const message = getNotificationMessage(false, restoreType);
                this.hxpNotificationService.showError(message);
                return of(false);
            })
        );
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { IdpViewerEvent } from '@hyland/idp-document-viewer';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class IdpViewerEventBusService {
    private readonly subject = new Subject<IdpViewerEvent<object>>();
    readonly events$: Observable<IdpViewerEvent<object>> = this.subject.asObservable();

    emit(event: IdpViewerEvent<object>): void {
        this.subject.next(event);
    }
}

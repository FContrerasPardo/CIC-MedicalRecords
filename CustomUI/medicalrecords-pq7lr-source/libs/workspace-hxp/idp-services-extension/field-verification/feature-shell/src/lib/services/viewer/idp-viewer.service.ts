/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { IdpViewerEvent, IdpViewerEventTypes } from '@hyland/idp-document-viewer';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';
import { IdpViewerEventBusService } from './idp-viewer-event-bus.service';

type RedactionToggledEvent = IdpViewerEvent<{ showRedaction: boolean }>;
type PageSelectedEvent = IdpViewerEvent<{ pageNavInfo: { currentPageIndex: number } }>;

@Injectable()
export class IdpViewerService {
    private readonly viewerEventBus = inject(IdpViewerEventBusService);

    readonly showRedaction$: Observable<boolean> = this.viewerEventBus.events$.pipe(
        filter((event): event is RedactionToggledEvent => event.type === IdpViewerEventTypes.RedactionToggled),
        map((event) => event.data?.newValue?.showRedaction ?? false),
        startWith(false),
        distinctUntilChanged()
    );

    readonly currentPageIndex$: Observable<number> = this.viewerEventBus.events$.pipe(
        filter((event): event is PageSelectedEvent => event.type === IdpViewerEventTypes.PageSelected),
        map((event) => event.data?.newValue?.pageNavInfo?.currentPageIndex),
        filter((index): index is number => index !== undefined && index !== null),
        startWith(0),
        distinctUntilChanged()
    );
}

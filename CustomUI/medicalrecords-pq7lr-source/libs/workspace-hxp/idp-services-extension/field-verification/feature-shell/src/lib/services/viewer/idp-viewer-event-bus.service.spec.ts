/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { take, toArray } from 'rxjs';
import { IdpViewerEvent, IdpViewerEventTypes } from '@hyland/idp-document-viewer';
import { IdpViewerEventBusService } from './idp-viewer-event-bus.service';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

function makeEvent<T extends object>(type: string, newValue?: T): IdpViewerEvent<object> {
    return { type: type as IdpViewerEvent<object>['type'], timestamp: TIMESTAMP, data: { newValue, dataSourceRef: [] } };
}

describe('IdpViewerEventBusService', () => {
    let service: IdpViewerEventBusService;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [IdpViewerEventBusService] });
        service = TestBed.inject(IdpViewerEventBusService);
    });

    describe('events$', () => {
        it('relays an emitted event to subscribers', () => {
            const event = makeEvent(IdpViewerEventTypes.ZoomChanged, { zoomLevel: 1.5 });
            let result: IdpViewerEvent<object> | undefined;
            service.events$.pipe(take(1)).subscribe((v) => (result = v));

            service.emit(event);

            expect(result).toBe(event);
        });

        it('relays emitted events in order', () => {
            const first = makeEvent(IdpViewerEventTypes.ZoomChanged);
            const second = makeEvent(IdpViewerEventTypes.RedactionToggled, { showRedaction: true });
            let result: IdpViewerEvent<object>[] | undefined;
            service.events$.pipe(take(2), toArray()).subscribe((v) => (result = v));

            service.emit(first);
            service.emit(second);

            expect(result).toEqual([first, second]);
        });
    });
});

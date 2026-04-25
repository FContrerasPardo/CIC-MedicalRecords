/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { Subject, take, toArray } from 'rxjs';
import { IdpViewerEvent, IdpViewerEventTypes } from '@hyland/idp-document-viewer';
import { IdpViewerEventBusService } from './idp-viewer-event-bus.service';
import { IdpViewerService } from './idp-viewer.service';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

function makeEvent<T extends object>(type: string, newValue?: T): IdpViewerEvent<object> {
    return { type: type as IdpViewerEvent<object>['type'], timestamp: TIMESTAMP, data: { newValue, dataSourceRef: [] } };
}

describe('IdpViewerService', () => {
    let viewerService: IdpViewerService;
    let mockViewerEventBus: { events$: Subject<IdpViewerEvent<object>> };

    beforeEach(() => {
        mockViewerEventBus = { events$: new Subject<IdpViewerEvent<object>>() };

        TestBed.configureTestingModule({
            providers: [
                IdpViewerService,
                { provide: IdpViewerEventBusService, useValue: mockViewerEventBus },
            ],
        });

        viewerService = TestBed.inject(IdpViewerService);
    });

    describe('showRedaction$', () => {
        it('emits true when a RedactionToggled event sets showRedaction to true', () => {
            let result: boolean[] | undefined;
            viewerService.showRedaction$.pipe(take(2), toArray()).subscribe((v) => (result = v));

            mockViewerEventBus.events$.next(makeEvent(IdpViewerEventTypes.RedactionToggled, { showRedaction: true }));

            expect(result).toEqual([false, true]);
        });

        it('emits false when a RedactionToggled event sets showRedaction to false', () => {
            let result: boolean[] | undefined;
            viewerService.showRedaction$.pipe(take(3), toArray()).subscribe((v) => (result = v));

            mockViewerEventBus.events$.next(makeEvent(IdpViewerEventTypes.RedactionToggled, { showRedaction: true }));
            mockViewerEventBus.events$.next(makeEvent(IdpViewerEventTypes.RedactionToggled, { showRedaction: false }));

            expect(result).toEqual([false, true, false]);
        });

        it('ignores non-RedactionToggled events', () => {
            let result: boolean[] | undefined;
            viewerService.showRedaction$.pipe(take(1), toArray()).subscribe((v) => (result = v));

            mockViewerEventBus.events$.next(makeEvent(IdpViewerEventTypes.ZoomChanged));
            mockViewerEventBus.events$.next(makeEvent(IdpViewerEventTypes.PageSelected, { pageNavInfo: { currentPageIndex: 1 } }));

            expect(result).toEqual([false]);
        });
    });

    describe('currentPageIndex$', () => {
        it('emits the new page index when a PageSelected event arrives', () => {
            let result: number[] | undefined;
            viewerService.currentPageIndex$.pipe(take(2), toArray()).subscribe((v) => (result = v));

            mockViewerEventBus.events$.next(makeEvent(IdpViewerEventTypes.PageSelected, { pageNavInfo: { currentPageIndex: 3 } }));

            expect(result).toEqual([0, 3]);
        });

        it('ignores non-PageSelected events', () => {
            let result: number[] | undefined;
            viewerService.currentPageIndex$.pipe(take(1), toArray()).subscribe((v) => (result = v));

            mockViewerEventBus.events$.next(makeEvent(IdpViewerEventTypes.ZoomChanged));
            mockViewerEventBus.events$.next(makeEvent(IdpViewerEventTypes.RedactionToggled, { showRedaction: true }));

            expect(result).toEqual([0]);
        });
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, inject } from '@angular/core';
import { timer, of, Observable, race } from 'rxjs';
import { catchError, defaultIfEmpty, filter, map, switchMap, take } from 'rxjs/operators';
import { GovernanceRecord } from '../../../shared/definitions/governance-shared.interface';
import { RecordStatus } from '@alfresco/adf-hx-content-services/services';
import { GovernanceRecordService } from './governance-record.service';
import {
    INFINITE_RETAIN_UNTIL,
    RECORD_POLL_INTERVAL_MS,
    RECORD_POLL_TIMEOUT_MS,
    RETAIN_UNTIL_LOADING,
} from '../definitions/records.constants';

export interface PollResult {
    record: GovernanceRecord;
    timedOut: boolean;
}

@Injectable({ providedIn: 'root' })
export class RecordPollingService {
    private readonly api = inject(GovernanceRecordService);
    private readonly intervalMs = RECORD_POLL_INTERVAL_MS;
    private readonly maxMs = RECORD_POLL_TIMEOUT_MS;

    /**
     * Polls until the record's status becomes OnHold or timeout.
     */
    pollUntilOnHold(rec: GovernanceRecord): Observable<PollResult> {
        return this.pollUntil(
            rec,
            (latest) => latest.status === RecordStatus.OnHold,
            () => rec.status === RecordStatus.OnHold
        );
    }

    /**
     * Polls until retainUntil becomes a real (non-sentinel) date or timeout.
     */
    pollUntilRetainUntilValid(rec: GovernanceRecord): Observable<PollResult> {
        return this.pollUntil(
            rec,
            (latest) => this.isRealRetainUntil(latest.retainUntil),
            () => this.isRealRetainUntil(rec.retainUntil)
        );
    }

    /**
     * Generic polling utility:
     * - emits at t=0 and every intervalMs
     * - stops when conditionFn(latest) returns true (success) or when maxMs elapses (timeout)
     * - falls back to last snapshot on errors
     * - always returns { record, timedOut }
     */
    private pollUntil(
        rec: GovernanceRecord,
        conditionFn: (latest: GovernanceRecord) => boolean,
        alreadySatisfied: () => boolean
    ): Observable<PollResult> {
        const id = rec.id ?? '';
        const eds = rec.environmentDataSourceId ?? '';
        const cat = rec.categoryId ?? '';

        if (!id || !eds || !cat) {
            return of({ record: rec, timedOut: false });
        }

        if (alreadySatisfied()) {
            return of({ record: rec, timedOut: false });
        }

        const poll$ = timer(0, this.intervalMs).pipe(
            switchMap(() => this.api.getRecordById(id, eds, cat).pipe(catchError(() => of(rec)))),
            filter((latest) => conditionFn(latest)),
            take(1),
            switchMap((latest) => this.api.getRecordById(id, eds, cat).pipe(catchError(() => of(latest)))),
            defaultIfEmpty(rec),
            map((record) => ({ record, timedOut: false }))
        );

        const timeout$ = timer(this.maxMs).pipe(map(() => ({ record: { ...rec }, timedOut: true })));

        return race(poll$, timeout$);
    }

    private isRealRetainUntil(value?: string): boolean {
        return !!value && value !== RETAIN_UNTIL_LOADING && value !== INFINITE_RETAIN_UNTIL && !Number.isNaN(Date.parse(value));
    }
}

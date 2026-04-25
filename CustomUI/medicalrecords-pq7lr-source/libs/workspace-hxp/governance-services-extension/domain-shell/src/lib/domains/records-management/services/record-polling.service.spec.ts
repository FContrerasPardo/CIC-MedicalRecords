/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError, firstValueFrom } from 'rxjs';
import { RecordPollingService, PollResult } from './record-polling.service';
import { GovernanceRecordService } from './governance-record.service';
import { GovernanceRecord } from '../../../shared/definitions/governance-shared.interface';
import { RecordStatus } from '@alfresco/adf-hx-content-services/services';
import { RETAIN_UNTIL_LOADING } from '../definitions/records.constants';

type PollMethod = 'pollUntilOnHold' | 'pollUntilRetainUntilValid';

jest.mock('../definitions/records.constants', () => ({
    RECORD_POLL_INTERVAL_MS: 5000,
    RECORD_POLL_TIMEOUT_MS: 25000,
    RETAIN_UNTIL_LOADING: 'LOADING',
    INFINITE_RETAIN_UNTIL: '9999-01-01T00:00:00Z',
}));

describe('RecordPollingService', () => {
    let service: RecordPollingService;
    let api: { getRecordById: jest.Mock };

    const baseRec: GovernanceRecord = {
        id: 'R#001',
        environmentDataSourceId: 'EDS#ABC',
        categoryId: 'C#XYZ',
        status: RecordStatus.Ready,
        fileName: 'demo.doc',
    } as GovernanceRecord;

    const advance = async (ms: number) => {
        jest.advanceTimersByTime(ms);
        await Promise.resolve();
    };

    beforeEach(() => {
        jest.useFakeTimers();
        api = { getRecordById: jest.fn() };
        TestBed.configureTestingModule({
            providers: [RecordPollingService, { provide: GovernanceRecordService, useValue: api }],
        });
        service = TestBed.inject(RecordPollingService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    const scenarios: Array<{ method: PollMethod; name: string }> = [
        { method: 'pollUntilOnHold', name: 'OnHold condition (status -> OnHold)' },
        { method: 'pollUntilRetainUntilValid', name: 'retainUntil valid condition (retainUntil -> real date)' },
    ];

    for (const { method, name } of scenarios) {
        describe(name, () => {
            it('should return original immediately if id/eds/cat missing', async () => {
                const rec: GovernanceRecord = { id: '', environmentDataSourceId: '', categoryId: '' } as GovernanceRecord;

                const result = await firstValueFrom((service as any)[method](rec));
                expect(result).toEqual({ record: rec, timedOut: false });
                expect(api.getRecordById).not.toHaveBeenCalled();
            });

            it('should return original immediately when already satisfied', async () => {
                const recSatisfied: GovernanceRecord =
                    method === 'pollUntilOnHold'
                        ? ({ ...baseRec, status: RecordStatus.OnHold } as GovernanceRecord)
                        : ({ ...baseRec, retainUntil: '2025-12-12T00:00:00Z' } as GovernanceRecord);

                const result = await firstValueFrom((service as any)[method](recSatisfied));
                expect(result).toEqual({ record: recSatisfied, timedOut: false });
                expect(api.getRecordById).not.toHaveBeenCalled();
            });

            it('should poll until condition satisfied and return latest snapshot', async () => {
                if (method === 'pollUntilOnHold') {
                    const initial = { ...baseRec, status: RecordStatus.Ready } as GovernanceRecord;
                    const mid = { ...baseRec, status: RecordStatus.Ready, fileName: 'mid' } as GovernanceRecord;
                    const becameOnHold = { ...baseRec, status: RecordStatus.OnHold, fileName: 'became' } as GovernanceRecord;
                    const final = { ...baseRec, status: RecordStatus.OnHold, fileName: 'final' } as GovernanceRecord;

                    const seq = [of(initial), of(mid), of(becameOnHold), of(final)];
                    api.getRecordById.mockImplementation(() => {
                        const next = seq.shift();
                        if (!next) {throw new Error('Mock sequence exhausted');}
                        return next;
                    });

                    const promise = firstValueFrom<PollResult>((service as any)[method](initial));
                    await advance(0);
                    await advance(5000);
                    await advance(5000);

                    const result: PollResult = await promise;
                    expect(result.record).toEqual(final);
                    expect(result.timedOut).toBe(false);
                    expect(api.getRecordById).toHaveBeenCalledTimes(4);
                } else {
                    const initial = { ...baseRec, retainUntil: RETAIN_UNTIL_LOADING } as GovernanceRecord;
                    const mid = { ...baseRec, retainUntil: RETAIN_UNTIL_LOADING, fileName: 'mid' } as GovernanceRecord;
                    const becameValid = { ...baseRec, retainUntil: '2026-01-01T00:00:00Z', fileName: 'became' } as GovernanceRecord;
                    const final = { ...baseRec, retainUntil: '2026-01-01T00:00:00Z', fileName: 'final' } as GovernanceRecord;

                    const seq = [of(initial), of(mid), of(becameValid), of(final)];
                    api.getRecordById.mockImplementation(() => {
                        const next = seq.shift();
                        if (!next) {throw new Error('Mock sequence exhausted');}
                        return next;
                    });

                    const promise = firstValueFrom<PollResult>((service as any)[method](initial));
                    await advance(0);
                    await advance(5000);
                    await advance(5000);

                    const result: PollResult = await promise;
                    expect(result.record).toEqual(final);
                    expect(result.timedOut).toBe(false);
                    expect(api.getRecordById).toHaveBeenCalledTimes(4);
                }
            });

            it('should continue polling across errors and complete when condition satisfied', async () => {
                if (method === 'pollUntilOnHold') {
                    const initial = { ...baseRec, status: RecordStatus.Ready } as GovernanceRecord;
                    const ready = { ...baseRec, status: RecordStatus.Ready } as GovernanceRecord;
                    const onHold = { ...baseRec, status: RecordStatus.OnHold } as GovernanceRecord;
                    const final = { ...baseRec, status: RecordStatus.OnHold, fileName: 'final' } as GovernanceRecord;

                    const seq: any[] = [throwError(() => new Error('network')), of(ready), of(onHold), of(final)];
                    api.getRecordById.mockImplementation(() => {
                        const next = seq.shift();
                        if (!next) {throw new Error('Mock sequence exhausted');}
                        return next;
                    });

                    const promise = firstValueFrom<PollResult>((service as any)[method](initial));
                    await advance(0);
                    await advance(5000);
                    await advance(5000);

                    const result: PollResult = await promise;
                    expect(result.record).toEqual(final);
                    expect(result.timedOut).toBe(false);
                    expect(api.getRecordById).toHaveBeenCalledTimes(4);
                } else {
                    const initial = { ...baseRec, retainUntil: RETAIN_UNTIL_LOADING } as GovernanceRecord;
                    const mid = { ...baseRec, retainUntil: RETAIN_UNTIL_LOADING } as GovernanceRecord;
                    const becameValid = { ...baseRec, retainUntil: '2026-01-01T00:00:00Z' } as GovernanceRecord;
                    const final = { ...baseRec, retainUntil: '2026-01-01T00:00:00Z', fileName: 'final' } as GovernanceRecord;

                    const seq: any[] = [throwError(() => new Error('network')), of(mid), of(becameValid), of(final)];
                    api.getRecordById.mockImplementation(() => {
                        const next = seq.shift();
                        if (!next) {throw new Error('Mock sequence exhausted');}
                        return next;
                    });

                    const promise = firstValueFrom<PollResult>((service as any)[method](initial));
                    await advance(0);
                    await advance(5000);
                    await advance(5000);

                    const result: PollResult = await promise;
                    expect(result.record).toEqual(final);
                    expect(result.timedOut).toBe(false);
                    expect(api.getRecordById).toHaveBeenCalledTimes(4);
                }
            });

            it('should time out and return timedOut=true if condition never satisfied', async () => {
                if (method === 'pollUntilOnHold') {
                    const initial = { ...baseRec, status: RecordStatus.Ready } as GovernanceRecord;
                    api.getRecordById.mockReturnValue(of(initial));

                    const promise = firstValueFrom<PollResult>((service as any)[method](initial));
                    await advance(25000);

                    const result: PollResult = await promise;
                    expect(result.timedOut).toBe(true);
                    expect(result.record).toEqual(initial);
                } else {
                    const initial = { ...baseRec, retainUntil: RETAIN_UNTIL_LOADING } as GovernanceRecord;
                    api.getRecordById.mockReturnValue(of(initial));

                    const promise = firstValueFrom<PollResult>((service as any)[method](initial));
                    await advance(25000);

                    const result: PollResult = await promise;
                    expect(result.timedOut).toBe(true);
                    expect(result.record).toEqual(initial);
                }
            });
        });
    }
});

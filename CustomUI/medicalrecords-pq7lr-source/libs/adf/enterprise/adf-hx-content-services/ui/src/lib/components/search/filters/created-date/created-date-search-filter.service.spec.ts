/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { CreatedDateSearchFilterService } from './created-date-search-filter.service';
import { CreatedDateSearchFilterData } from './created-date-search-filter.data';
import { MatTooltipModule } from '@angular/material/tooltip';

describe('CreatedDateSearchFilterService', () => {
    let service: CreatedDateSearchFilterService;

    const fakeNowValue = new Date('2024-01-09T00:00:00Z').getTime();
    const defaultOptionsTestCases = [
        { label: 'LAST_7_DAYS', result: '2024-01-02T00:00:00Z' },
        { label: 'LAST_30_DAYS', result: '2023-12-10T00:00:00Z' },
        { label: 'LAST_6_MONTHS', result: '2023-07-09T00:00:00Z' },
        { label: 'LAST_YEAR', result: '2023-01-09T00:00:00Z' },
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatTooltipModule],
            providers: [CreatedDateSearchFilterService],
        });
        service = TestBed.inject(CreatedDateSearchFilterService);
    });

    for (const { label, result } of defaultOptionsTestCases) {
        it(`should return correct HXQL for default option ${label}`, () => {
            const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNowValue);
            const data = new CreatedDateSearchFilterData([{ label, date: label }]);
            const expected = `sys_created >= DATE '${result}'`;
            expect(service.toHXQL(data)).toEqual(expected);
            dateNowSpy.mockRestore();
        });
    }

    it('should return correct HXQL for custom date range with only after date', () => {
        const afterDate = new Date('2024-01-09');
        const data = new CreatedDateSearchFilterData([
            {
                label: '',
                afterDate,
                beforeDate: undefined,
            },
        ]);
        const expected = "sys_created >= DATE '2024-01-09T00:00:00Z'";
        expect(service.toHXQL(data)).toEqual(expected);
    });

    it('should return correct HXQL for custom date range with only before date', () => {
        const beforeDate = new Date('2024-01-10');
        const data = new CreatedDateSearchFilterData([
            {
                label: '',
                afterDate: undefined,
                beforeDate,
            },
        ]);
        const expected = "sys_created <= DATE '2024-01-10T00:00:00Z'";
        expect(service.toHXQL(data)).toEqual(expected);
    });

    it('should return correct HXQL for custom date range with both after and before dates', () => {
        const afterDate = new Date('2024-01-09');
        const beforeDate = new Date('2024-01-10');
        const data = new CreatedDateSearchFilterData([
            {
                label: '',
                afterDate,
                beforeDate,
            },
        ]);
        const expected = "sys_created >= DATE '2024-01-09T00:00:00Z' AND sys_created <= DATE '2024-01-10T00:00:00Z'";
        expect(service.toHXQL(data)).toEqual(expected);
    });
});

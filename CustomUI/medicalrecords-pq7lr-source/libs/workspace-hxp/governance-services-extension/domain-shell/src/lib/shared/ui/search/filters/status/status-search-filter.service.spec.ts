/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { StatusSearchFilterService } from './status-search-filter.service';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';
import { STATUS_OPTIONS } from './status-options.data';

describe('StatusSearchFilterService', () => {
    let service: StatusSearchFilterService;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [StatusSearchFilterService] });
        service = TestBed.inject(StatusSearchFilterService);
    });

    it('should return STATUS_OPTIONS as statuses', () => {
        const statuses = service.getStatuses();
        expect(statuses).toEqual(STATUS_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })));
    });

    it('toQueryParams should map selected items to status array', () => {
        const data: MultiSelectListSearchFilterData = new MultiSelectListSearchFilterData([
            { label: 'Ready', value: 'Ready' },
            { label: 'Unprocessed', value: 'Unprocessed' },
        ]);

        expect(service.toQueryParams(data)).toEqual({ status: ['Ready', 'Unprocessed'] });
    });

    describe('fromQueryParams', () => {
        it('should return undefined if status param is missing', () => {
            expect(service.fromQueryParams({})).toBeUndefined();
        });

        it('should return undefined for empty status array', () => {
            expect(service.fromQueryParams({ status: [] })).toBeUndefined();
        });

        it('should return undefined for non-matching status value', () => {
            expect(service.fromQueryParams({ status: ['NotAStatus'] })).toBeUndefined();
        });

        it('should return MultiSelectListSearchFilterData for matching status value', () => {
            const result = service.fromQueryParams({ status: ['Ready'] });
            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values[0].value).toBe('Ready');
        });

        it('should handle comma-separated string', () => {
            const result = service.fromQueryParams({ status: 'Ready,Incomplete' });
            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values.map((v) => v.value)).toContain('Ready');
            expect(result?.values.map((v) => v.value)).toContain('Incomplete');
        });
    });
});

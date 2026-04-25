/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { LegalCaseNameSearchFilterService } from './legal-case-name-search-filter.service';
import { MultiSelectListSearchFilterData } from '../base/multi-select-list-filter/multi-select-list-search-filter.data';

describe('LegalCaseNameSearchFilterService', () => {
    let service: LegalCaseNameSearchFilterService;

    const allLegalCases = [
        { label: 'Case A', value: 'case-a' },
        { label: 'Case B', value: 'case-b' },
        { label: 'Case C', value: 'case-c' },
    ];

    const dashboardLegalCases = [
        { id: 'case-a', category: 'Case A' },
        { id: 'case-b', category: 'Case B' },
        { id: 'case-c', category: 'Case C' },
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [LegalCaseNameSearchFilterService],
        });

        service = TestBed.inject(LegalCaseNameSearchFilterService);
    });

    it('should expose the expected query param key', () => {
        expect(service.QUERY_PARAM).toBe('legalCaseName');
    });

    describe('toQueryParams', () => {
        it('should return empty params when filter data is missing', () => {
            expect(service.toQueryParams(undefined as unknown as MultiSelectListSearchFilterData)).toEqual({});
        });

        it('should return empty params when filter has no selected values', () => {
            const data = new MultiSelectListSearchFilterData([]);
            expect(service.toQueryParams(data)).toEqual({});
        });

        it('should map selected values to the legalCaseName query param', () => {
            const data = new MultiSelectListSearchFilterData([
                { label: 'Case A', value: 'case-a' },
                { label: 'Case C', value: 'case-c' },
            ]);

            expect(service.toQueryParams(data)).toEqual({
                legalCaseName: ['case-a', 'case-c'],
            });
        });
    });

    describe('fromQueryParams', () => {
        it('should return undefined when query param is missing', () => {
            const result = service.fromQueryParams({}, allLegalCases);
            expect(result).toBeUndefined();
        });

        it('should return undefined when query param is an unsupported type', () => {
            const result = service.fromQueryParams({ legalCaseName: 123 }, allLegalCases);
            expect(result).toBeUndefined();
        });

        it('should build selected values from a comma-separated string', () => {
            const result = service.fromQueryParams({ legalCaseName: 'case-a,case-c' }, allLegalCases);

            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values).toEqual([
                { label: 'Case A', value: 'case-a' },
                { label: 'Case C', value: 'case-c' },
            ]);
        });

        it('should build selected values from an array value', () => {
            const result = service.fromQueryParams({ legalCaseName: ['case-b'] }, allLegalCases);

            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values).toEqual([{ label: 'Case B', value: 'case-b' }]);
        });

        it('should normalize { id, category } options from dashboard widgets', () => {
            const result = service.fromQueryParams({ legalCaseName: ['case-a', 'case-c'] }, dashboardLegalCases);

            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values).toEqual([
                { label: 'Case A', value: 'case-a' },
                { label: 'Case C', value: 'case-c' },
            ]);
        });

        it('should ignore unknown values and return only matched legal cases', () => {
            const result = service.fromQueryParams({ legalCaseName: 'case-a,unknown,case-c' }, allLegalCases);

            expect(result).toBeInstanceOf(MultiSelectListSearchFilterData);
            expect(result?.values).toEqual([
                { label: 'Case A', value: 'case-a' },
                { label: 'Case C', value: 'case-c' },
            ]);
        });

        it('should return undefined when no values match available legal cases', () => {
            const result = service.fromQueryParams({ legalCaseName: 'unknown' }, allLegalCases);
            expect(result).toBeUndefined();
        });

        it('should return undefined when legalCaseName is present but empty', () => {
            const result = service.fromQueryParams({ legalCaseName: '' }, allLegalCases);
            expect(result).toBeUndefined();
        });
    });
});

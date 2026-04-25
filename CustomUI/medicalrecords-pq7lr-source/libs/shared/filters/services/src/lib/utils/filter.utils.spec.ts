/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateCloudFilterType } from '@alfresco/adf-process-services-cloud';
import { findDateTranslationKey, getDateValue, filterNonEmptyValues } from './filter.utils';

describe('Filter Utils', () => {
    describe('findDateTranslationKey', () => {
        it('should find correct translation key for TODAY', () => {
            const result = findDateTranslationKey(DateCloudFilterType.TODAY);
            expect(result).toBe('FILTERS.DATE_FILTER.TODAY');
        });

        it('should find correct translation key for WEEK', () => {
            const result = findDateTranslationKey(DateCloudFilterType.WEEK);
            expect(result).toBe('FILTERS.DATE_FILTER.WEEK');
        });

        it('should find correct translation key for MONTH', () => {
            const result = findDateTranslationKey(DateCloudFilterType.MONTH);
            expect(result).toBe('FILTERS.DATE_FILTER.MONTH');
        });

        it('should find correct translation key for QUARTER', () => {
            const result = findDateTranslationKey(DateCloudFilterType.QUARTER);
            expect(result).toBe('FILTERS.DATE_FILTER.QUARTER');
        });

        it('should find correct translation key for YEAR', () => {
            const result = findDateTranslationKey(DateCloudFilterType.YEAR);
            expect(result).toBe('FILTERS.DATE_FILTER.YEAR');
        });

        it('should find correct translation key for RANGE', () => {
            const result = findDateTranslationKey(DateCloudFilterType.RANGE);
            expect(result).toBe('FILTERS.DATE_FILTER.RANGE');
        });

        it('should return UNKNOWN_DATE_OPTION for unrecognized date type', () => {
            const result = findDateTranslationKey('CUSTOM_TYPE' as any);
            expect(result).toBe('UNKNOWN_DATE_OPTION');
        });
    });

    describe('getDateValue', () => {
        it('should return null when dateType is null', () => {
            const result = getDateValue(null as any, '', '');
            expect(result).toBeNull();
        });

        it('should create date value with RANGE type and both dates', () => {
            const result = getDateValue(DateCloudFilterType.RANGE, '2025-10-06T00:00:00.000Z', '2025-10-07T23:59:59.999Z');

            expect(result?.selectedOption.value).toBe(DateCloudFilterType.RANGE);
            expect(result?.selectedOption.label).toBe('FILTERS.DATE_FILTER.RANGE');
            expect(result?.range?.from).toEqual(new Date('2025-10-06T00:00:00.000Z'));
            expect(result?.range?.to).toEqual(new Date('2025-10-07T23:59:59.999Z'));
        });

        it('should create date value with RANGE type but null range when dates are empty', () => {
            const result = getDateValue(DateCloudFilterType.RANGE, '', '');

            expect(result?.selectedOption.value).toBe(DateCloudFilterType.RANGE);
            expect(result?.range).toBeNull();
        });

        it('should create date value with RANGE and only from date', () => {
            const result = getDateValue(DateCloudFilterType.RANGE, '2025-10-06T00:00:00.000Z', '');

            expect(result?.range?.from).toEqual(new Date('2025-10-06T00:00:00.000Z'));
            expect(result?.range?.to).toBeNull();
        });

        it('should create date value with RANGE and only to date', () => {
            const result = getDateValue(DateCloudFilterType.RANGE, '', '2025-10-07T23:59:59.999Z');

            expect(result?.range?.from).toBeNull();
            expect(result?.range?.to).toEqual(new Date('2025-10-07T23:59:59.999Z'));
        });

        it('should create date value with TODAY type', () => {
            const result = getDateValue(DateCloudFilterType.TODAY, '', '');

            expect(result?.selectedOption.value).toBe(DateCloudFilterType.TODAY);
            expect(result?.selectedOption.label).toBe('FILTERS.DATE_FILTER.TODAY');
            expect(result?.range).toBeNull();
        });

        it('should create date value with WEEK type', () => {
            const result = getDateValue(DateCloudFilterType.WEEK, '', '');

            expect(result?.selectedOption.value).toBe(DateCloudFilterType.WEEK);
            expect(result?.selectedOption.label).toBe('FILTERS.DATE_FILTER.WEEK');
            expect(result?.range).toBeNull();
        });

        it('should create date value with MONTH type', () => {
            const result = getDateValue(DateCloudFilterType.MONTH, '', '');

            expect(result?.selectedOption.value).toBe(DateCloudFilterType.MONTH);
            expect(result?.selectedOption.label).toBe('FILTERS.DATE_FILTER.MONTH');
            expect(result?.range).toBeNull();
        });

        it('should create date value with QUARTER type', () => {
            const result = getDateValue(DateCloudFilterType.QUARTER, '', '');

            expect(result?.selectedOption.value).toBe(DateCloudFilterType.QUARTER);
            expect(result?.selectedOption.label).toBe('FILTERS.DATE_FILTER.QUARTER');
            expect(result?.range).toBeNull();
        });

        it('should create date value with YEAR type', () => {
            const result = getDateValue(DateCloudFilterType.YEAR, '', '');

            expect(result?.selectedOption.value).toBe(DateCloudFilterType.YEAR);
            expect(result?.selectedOption.label).toBe('FILTERS.DATE_FILTER.YEAR');
            expect(result?.range).toBeNull();
        });

        it('should return UNKNOWN_DATE_OPTION for unknown date type', () => {
            const result = getDateValue('UNKNOWN_TYPE' as any, '', '');

            expect(result?.selectedOption.label).toBe('UNKNOWN_DATE_OPTION');
            expect(result?.selectedOption.value).toBe('UNKNOWN_TYPE');
        });
    });

    describe('filterNonEmptyValues', () => {
        it('should filter out null values', () => {
            const input = { name: 'test', status: null, id: 123 };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({ name: 'test', id: 123 });
        });

        it('should filter out undefined values', () => {
            const input = { name: 'test', status: undefined, id: 123 };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({ name: 'test', id: 123 });
        });

        it('should filter out empty strings', () => {
            const input = { name: 'test', status: '', id: 123 };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({ name: 'test', id: 123 });
        });

        it('should filter out empty arrays', () => {
            const input = { name: 'test', tags: [], id: 123 };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({ name: 'test', id: 123 });
        });

        it('should keep non-empty arrays', () => {
            const input = { name: 'test', tags: ['tag1', 'tag2'], id: 123 };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({ name: 'test', tags: ['tag1', 'tag2'], id: 123 });
        });

        it('should keep numeric zero values', () => {
            const input = { name: 'test', count: 0, id: 123 };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({ name: 'test', count: 0, id: 123 });
        });

        it('should keep false boolean values', () => {
            const input = { name: 'test', active: false, id: 123 };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({ name: 'test', active: false, id: 123 });
        });

        it('should apply relaxed validation to specified keys', () => {
            const input = { name: 'test', createdDateFrom: '', createdDateTo: null, creationDateType: undefined };
            const result = filterNonEmptyValues(input, ['createdDateFrom', 'createdDateTo', 'creationDateType']);
            // Relaxed validation only filters null/undefined, not empty strings
            expect(result).toEqual({ name: 'test', createdDateFrom: '' });
        });

        it('should keep relaxed validation keys with valid values', () => {
            const input = { name: 'test', createdDateFrom: '2025-10-16', createdDateTo: '2025-10-17', creationDateType: 'RANGE' };
            const result = filterNonEmptyValues(input, ['createdDateFrom', 'createdDateTo', 'creationDateType']);
            expect(result).toEqual({
                name: 'test',
                createdDateFrom: '2025-10-16',
                createdDateTo: '2025-10-17',
                creationDateType: 'RANGE',
            });
        });

        it('should handle empty object', () => {
            const input = {};
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({});
        });

        it('should handle object with all empty values', () => {
            const input = { name: '', status: null, tags: [], id: undefined };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({});
        });

        it('should handle complex nested objects', () => {
            const input = { name: 'test', metadata: { key: 'value' }, count: 0, empty: '' };
            const result = filterNonEmptyValues(input);
            expect(result).toEqual({ name: 'test', metadata: { key: 'value' }, count: 0 });
        });
    });
});

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateCloudFilterType } from '@alfresco/adf-process-services-cloud';
import { createProjectNameFilter, createCreationDateFilter } from './application-release-filter-creators';
import { DateFilter } from '../filter/filter-models/date-filter.model';
import { StringFilter } from '../filter/filter-models/string-filter.model';

describe('ApplicationReleaseFilterCreators', () => {
    describe('createProjectNameFilter', () => {
        it('should create filter with value when defaultProjectName is provided', () => {
            const filter = createProjectNameFilter('test-project');

            expect(filter).toBeInstanceOf(StringFilter);
            expect(filter.name).toBe('projectName');
            expect(filter.translationKey).toBe('APPLICATION-RELEASES.PROPERTIES.PROJECT-NAME');
            expect(filter.value).toEqual(['test-project']);
            expect(filter.visible).toBe(true);
            expect(filter.allowEmpty).toBe(true);
        });

        it('should create filter with null value when defaultProjectName is empty', () => {
            const filter = createProjectNameFilter('');

            expect(filter.value).toBeNull();
            expect(filter.visible).toBe(true);
        });
    });

    describe('createCreationDateFilter', () => {
        it('should create filter with RANGE date value', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.RANGE, '2025-10-06T00:00:00.000Z', '2025-10-07T23:59:59.999Z');

            expect(filter).toBeInstanceOf(DateFilter);
            expect(filter.name).toBe('creationDate');
            expect(filter.translationKey).toBe('APPLICATION-RELEASES.PROPERTIES.CREATED');
            expect(filter.visible).toBe(true);
            expect(filter.allowEmpty).toBe(true);
            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.RANGE);
            expect(filter.value?.selectedOption.label).toBe('FILTERS.DATE_FILTER.RANGE');
            expect(filter.value?.range?.from).toEqual(new Date('2025-10-06T00:00:00.000Z'));
            expect(filter.value?.range?.to).toEqual(new Date('2025-10-07T23:59:59.999Z'));
        });

        it('should create filter with RANGE but null range when dates are empty', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.RANGE, '', '');

            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.RANGE);
            expect(filter.value?.range).toBeNull();
        });

        it('should create filter with RANGE and only from date', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.RANGE, '2025-10-06T00:00:00.000Z', '');

            expect(filter.value?.range?.from).toEqual(new Date('2025-10-06T00:00:00.000Z'));
            expect(filter.value?.range?.to).toBeNull();
        });

        it('should create filter with RANGE and only to date', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.RANGE, '', '2025-10-07T23:59:59.999Z');

            expect(filter.value?.range?.from).toBeNull();
            expect(filter.value?.range?.to).toEqual(new Date('2025-10-07T23:59:59.999Z'));
        });

        it('should create filter with TODAY date value', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.TODAY, '', '');

            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.TODAY);
            expect(filter.value?.selectedOption.label).toBe('FILTERS.DATE_FILTER.TODAY');
            expect(filter.value?.range).toBeNull();
        });

        it('should create filter with WEEK date value', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.WEEK, '', '');

            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.WEEK);
            expect(filter.value?.selectedOption.label).toBe('FILTERS.DATE_FILTER.WEEK');
            expect(filter.value?.range).toBeNull();
        });

        it('should create filter with MONTH date value', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.MONTH, '', '');

            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.MONTH);
            expect(filter.value?.selectedOption.label).toBe('FILTERS.DATE_FILTER.MONTH');
            expect(filter.value?.range).toBeNull();
        });

        it('should create filter with QUARTER date value', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.QUARTER, '', '');

            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.QUARTER);
            expect(filter.value?.selectedOption.label).toBe('FILTERS.DATE_FILTER.QUARTER');
            expect(filter.value?.range).toBeNull();
        });

        it('should create filter with YEAR date value', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.YEAR, '', '');

            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.YEAR);
            expect(filter.value?.selectedOption.label).toBe('FILTERS.DATE_FILTER.YEAR');
            expect(filter.value?.range).toBeNull();
        });

        it('should create filter with null value when dateType is null', () => {
            const filter = createCreationDateFilter(null as any, '', '');

            expect(filter.value).toBeNull();
            expect(filter.visible).toBe(true);
        });

        it('should return UNKNOWN_DATE_OPTION for unknown date type', () => {
            const filter = createCreationDateFilter('UNKNOWN_TYPE' as any, '', '');

            expect(filter.value?.selectedOption.label).toBe('UNKNOWN_DATE_OPTION');
            expect(filter.value?.selectedOption.value).toBe('UNKNOWN_TYPE');
        });
    });
});

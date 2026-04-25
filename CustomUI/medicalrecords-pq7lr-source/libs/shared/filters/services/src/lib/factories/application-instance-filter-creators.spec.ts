/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateCloudFilterType } from '@alfresco/adf-process-services-cloud';
import {
    createNameFilter,
    createCreationDateFilter,
    createApplicationStatusFilter,
    createEnvironmentFilter,
} from './application-instance-filter-creators';
import { DateFilter } from '../filter/filter-models/date-filter.model';
import { StringFilter } from '../filter/filter-models/string-filter.model';
import { RadioFilter } from '../filter/filter-models/radio-filter.model';
import { CheckboxFilter } from '../filter/filter-models/checkbox-filter.model';

describe('ApplicationInstanceFilterCreators', () => {
    describe('createNameFilter', () => {
        it('should create filter with value when defaultName is provided', () => {
            const filter = createNameFilter('test-app');

            expect(filter).toBeInstanceOf(StringFilter);
            expect(filter.name).toBe('name');
            expect(filter.translationKey).toBe('APPLICATION-INSTANCES-LIST.SEARCH.APP-NAME');
            expect(filter.value).toEqual(['test-app']);
            expect(filter.visible).toBe(true);
            expect(filter.allowEmpty).toBe(true);
        });

        it('should create filter with null value when defaultName is empty', () => {
            const filter = createNameFilter('');

            expect(filter.value).toBeNull();
            expect(filter.visible).toBe(true);
        });
    });

    describe('createCreationDateFilter', () => {
        it('should create filter with RANGE date value', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.RANGE, '2025-10-06T00:00:00.000Z', '2025-10-07T23:59:59.999Z');

            expect(filter).toBeInstanceOf(DateFilter);
            expect(filter.name).toBe('creationDate');
            expect(filter.translationKey).toBe('APPLICATION-INSTANCES-LIST.PROPERTIES.CREATED');
            expect(filter.visible).toBe(true);
            expect(filter.allowEmpty).toBe(true);
            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.RANGE);
            expect(filter.value?.selectedOption.label).toBe('FILTERS.DATE_FILTER.RANGE');
            expect(filter.value?.range?.from).toEqual(new Date('2025-10-06T00:00:00.000Z'));
            expect(filter.value?.range?.to).toEqual(new Date('2025-10-07T23:59:59.999Z'));
        });

        it('should create filter with TODAY date value', () => {
            const filter = createCreationDateFilter(DateCloudFilterType.TODAY, '', '');

            expect(filter.value?.selectedOption.value).toBe(DateCloudFilterType.TODAY);
            expect(filter.value?.selectedOption.label).toBe('FILTERS.DATE_FILTER.TODAY');
            expect(filter.value?.range).toBeNull();
        });

        it('should create filter with null value when dateType is null', () => {
            const filter = createCreationDateFilter(null as any, '', '');

            expect(filter.value).toBeNull();
            expect(filter.visible).toBe(true);
        });
    });

    describe('createApplicationStatusFilter', () => {
        const statusOptions = [
            { value: 'RUNNING', label: 'Running' },
            { value: 'STOPPED', label: 'Stopped' },
        ];

        it('should create filter with value when defaultStatus is provided', () => {
            const filter = createApplicationStatusFilter('RUNNING', statusOptions);

            expect(filter).toBeInstanceOf(RadioFilter);
            expect(filter.name).toBe('status');
            expect(filter.translationKey).toBe('APPLICATION-INSTANCES-LIST.PROPERTIES.DEPLOYMENT_STATUS');
            expect(filter.value).toEqual({ value: 'RUNNING', label: 'Running' });
            expect(filter.visible).toBe(true);
            expect(filter.allowEmpty).toBe(true);
            expect(filter.options).toEqual(statusOptions);
        });

        it('should create filter with null value when defaultStatus is empty', () => {
            const filter = createApplicationStatusFilter('', statusOptions);

            expect(filter.value).toBeNull();
            expect(filter.visible).toBe(true);
        });

        it('should create filter with null value when status not found in options', () => {
            const filter = createApplicationStatusFilter('UNKNOWN', statusOptions);

            expect(filter.value).toBeNull();
            expect(filter.visible).toBe(true);
        });
    });

    describe('createEnvironmentFilter', () => {
        const environmentOptions = [
            { value: 'env-1', label: 'Environment 1' },
            { value: 'env-2', label: 'Environment 2' },
            { value: 'env-3', label: 'Environment 3' },
        ];

        it('should create filter with values when defaultEnvironments is provided', () => {
            const filter = createEnvironmentFilter(['env-1', 'env-2'], environmentOptions);

            expect(filter).toBeInstanceOf(CheckboxFilter);
            expect(filter.name).toBe('environment');
            expect(filter.translationKey).toBe('APPLICATION-INSTANCES-LIST.PROPERTIES.ENVIRONMENT');
            expect(filter.value).toEqual([
                { value: 'env-1', label: 'Environment 1' },
                { value: 'env-2', label: 'Environment 2' },
            ]);
            expect(filter.visible).toBe(true);
            expect(filter.allowEmpty).toBe(true);
            expect(filter.options).toEqual(environmentOptions);
        });

        it('should create filter with null value when defaultEnvironments is empty', () => {
            const filter = createEnvironmentFilter([], environmentOptions);

            expect(filter.value).toBeNull();
            expect(filter.visible).toBe(true);
        });

        it('should create filter with null value when defaultEnvironments is null', () => {
            const filter = createEnvironmentFilter(null as any, environmentOptions);

            expect(filter.value).toBeNull();
            expect(filter.visible).toBe(true);
        });

        it('should only include environments that exist in options', () => {
            const filter = createEnvironmentFilter(['env-1', 'non-existent'], environmentOptions);

            expect(filter.value).toEqual([{ value: 'env-1', label: 'Environment 1' }]);
            expect(filter.visible).toBe(true);
        });
    });
});

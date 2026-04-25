/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateCloudFilterType } from '@alfresco/adf-process-services-cloud';

import { CheckboxFilter } from '../filter/filter-models/checkbox-filter.model';
import { DateFilter, DATE_OPTIONS } from '../filter/filter-models/date-filter.model';
import { RadioFilter } from '../filter/filter-models/radio-filter.model';
import { StringFilter } from '../filter/filter-models/string-filter.model';
import { Option } from '../filter/filter.model';
import { getDateValue } from '../utils/filter.utils';

export const ApplicationInstanceFilterKey = {
    NAME: 'name',
    CREATION_DATE: 'creationDate',
    STATUS: 'status',
    ENVIRONMENT: 'environment',
} as const;
export type ApplicationInstanceFilterKey = typeof ApplicationInstanceFilterKey[keyof typeof ApplicationInstanceFilterKey];

export function createNameFilter(defaultName: string): StringFilter {
    return new StringFilter({
        name: ApplicationInstanceFilterKey.NAME,
        translationKey: 'APPLICATION-INSTANCES-LIST.SEARCH.APP-NAME',
        value: defaultName ? [defaultName] : null,
        allowEmpty: true,
        visible: true,
    });
}

export function createCreationDateFilter(
    defaultCreationDateType: DateCloudFilterType,
    defaultCreationDateFrom: string,
    defaultCreationDateTo: string
): DateFilter {
    return new DateFilter({
        name: ApplicationInstanceFilterKey.CREATION_DATE,
        translationKey: 'APPLICATION-INSTANCES-LIST.PROPERTIES.CREATED',
        value: getDateValue(defaultCreationDateType, defaultCreationDateFrom, defaultCreationDateTo),
        options: DATE_OPTIONS,
        allowEmpty: true,
        visible: true,
    });
}

export function createApplicationStatusFilter(defaultStatus: string, statusOptions: Option[]): RadioFilter {
    const selectedOption = defaultStatus === undefined ? null : statusOptions.find((option) => option.value === defaultStatus) || null;

    return new RadioFilter({
        name: ApplicationInstanceFilterKey.STATUS,
        translationKey: 'APPLICATION-INSTANCES-LIST.PROPERTIES.DEPLOYMENT_STATUS',
        value: selectedOption,
        options: statusOptions,
        allowEmpty: true,
        visible: true,
    });
}

export function createEnvironmentFilter(defaultEnvironments: string[], environmentOptions: Option[]): CheckboxFilter {
    const selectedOptions = defaultEnvironments?.length ? environmentOptions.filter((option) => defaultEnvironments.includes(option.value)) : [];

    return new CheckboxFilter({
        name: ApplicationInstanceFilterKey.ENVIRONMENT,
        translationKey: 'APPLICATION-INSTANCES-LIST.PROPERTIES.ENVIRONMENT',
        value: selectedOptions.length > 0 ? selectedOptions : null,
        options: environmentOptions,
        allowEmpty: true,
        visible: true,
    });
}

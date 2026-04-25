/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateCloudFilterType } from '@alfresco/adf-process-services-cloud';
import { DateFilter, DATE_OPTIONS } from '../filter/filter-models/date-filter.model';
import { StringFilter } from '../filter/filter-models/string-filter.model';
import { getDateValue } from '../utils/filter.utils';

export const ApplicationReleaseFilterKey = {
    PROJECT_NAME: 'projectName',
    CREATION_DATE: 'creationDate',
} as const;
export type ApplicationReleaseFilterKey = typeof ApplicationReleaseFilterKey[keyof typeof ApplicationReleaseFilterKey];

export function createProjectNameFilter(defaultProjectName: string): StringFilter {
    return new StringFilter({
        name: ApplicationReleaseFilterKey.PROJECT_NAME,
        translationKey: 'APPLICATION-RELEASES.PROPERTIES.PROJECT-NAME',
        value: defaultProjectName ? [defaultProjectName] : null,
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
        name: ApplicationReleaseFilterKey.CREATION_DATE,
        translationKey: 'APPLICATION-RELEASES.PROPERTIES.CREATED',
        value: getDateValue(defaultCreationDateType, defaultCreationDateFrom, defaultCreationDateTo),
        options: DATE_OPTIONS,
        allowEmpty: true,
        visible: true,
    });
}

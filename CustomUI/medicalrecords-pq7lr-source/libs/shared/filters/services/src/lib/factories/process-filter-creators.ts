/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateCloudFilterType, IdentityUserModel } from '@alfresco/adf-process-services-cloud';
import { DATE_OPTIONS, DateFilter } from '../filter/filter-models/date-filter.model';
import { CheckboxFilter } from '../filter/filter-models/checkbox-filter.model';
import { UserFilter } from '../filter/filter-models/user-filter.model';
import { Option } from '../filter/filter.model';
import { RadioFilter } from '../filter/filter-models/radio-filter.model';
import { StringFilter } from '../filter/filter-models/string-filter.model';
import { getDateValue } from '../utils/filter.utils';

export const PROCESS_STATUS_OPTIONS: Option[] = [
    { value: 'RUNNING', label: 'FILTERS.PROCESS_STATUS_FILTER.RUNNING' },
    { value: 'SUSPENDED', label: 'FILTERS.PROCESS_STATUS_FILTER.SUSPENDED' },
    { value: 'CANCELLED', label: 'FILTERS.PROCESS_STATUS_FILTER.CANCELLED' },
    { value: 'COMPLETED', label: 'FILTERS.PROCESS_STATUS_FILTER.COMPLETED' },
];

export const ProcessFilterKey = {
    APP_NAME: 'appName',
    STATUSES: 'statuses',
    APP_VERSIONS: 'appVersions',
    PROCESS_DEFINITION_NAMES: 'processDefinitionNames',
    PROCESS_NAMES: 'processNames',
    PROCESS_INSTANCE_IDS: 'processInstanceIds',
    PARENT_IDS: 'parentIds',
    STARTED_BY_USERS: 'initiators',

    SUSPENDED_DATE: 'suspendedDateType',
    SUSPENDED_DATE_FROM: 'suspendedFrom',
    SUSPENDED_DATE_TO: 'suspendedTo',

    COMPLETED_DATE: 'completedDateType',
    COMPLETED_DATE_FROM: 'completedFrom',
    COMPLETED_DATE_TO: 'completedTo',

    STARTED_DATE: 'startedDateType',
    STARTED_DATE_FROM: 'startFrom',
    STARTED_DATE_TO: 'startTo',
} as const;
export type ProcessFilterKey = typeof ProcessFilterKey[keyof typeof ProcessFilterKey];

export function createProcessDefinitionNameFilter(
    defaultProcessDefinitionNames: string[],
    allProcessDefinitionNames: string[],
    priority?: number
): CheckboxFilter {
    return new CheckboxFilter({
        name: ProcessFilterKey.PROCESS_DEFINITION_NAMES,
        translationKey: 'FILTERS.LABELS.PROCESS.PROCESS_DEFINITION_NAME',
        value: defaultProcessDefinitionNames.map((name) => ({ value: name, label: name, checked: true })),
        options: allProcessDefinitionNames.map((name) => ({ label: name, value: name })),
        visible: defaultProcessDefinitionNames.length > 0,
        priority,
    });
}

export function createProcessNameFilter(defaultProcessNames: string[], priority?: number): StringFilter {
    return new StringFilter({
        name: ProcessFilterKey.PROCESS_NAMES,
        translationKey: 'FILTERS.LABELS.PROCESS.PROCESS_NAME',
        value: defaultProcessNames,
        visible: defaultProcessNames.length > 0,
        priority,
    });
}

export function createProcessInstanceIdFilter(defaultProcessInstanceIds: string[], priority?: number): StringFilter {
    return new StringFilter({
        name: ProcessFilterKey.PROCESS_INSTANCE_IDS,
        translationKey: 'FILTERS.LABELS.PROCESS.ID',
        value: defaultProcessInstanceIds,
        visible: defaultProcessInstanceIds.length > 0,
        priority,
    });
}

export function createParentIdFilter(defaultParentIds: string[], priority?: number): StringFilter {
    return new StringFilter({
        name: ProcessFilterKey.PARENT_IDS,
        translationKey: 'FILTERS.LABELS.PROCESS.PARENT_ID',
        value: defaultParentIds,
        visible: defaultParentIds.length > 0,
        priority,
    });
}

export function createAppVersionFilter(defaultAppVersions: string[], allAppVersions: string[], priority?: number): CheckboxFilter {
    return new CheckboxFilter({
        name: ProcessFilterKey.APP_VERSIONS,
        translationKey: 'FILTERS.LABELS.PROCESS.APP_VERSION',
        value: defaultAppVersions.map((version) => ({ value: version, label: version, checked: true })),
        options: allAppVersions.map((version) => ({ label: version, value: version })),
        visible: defaultAppVersions.length > 0,
        priority,
    });
}

export function createAppNameFilter(
    defaultAppName: { value: string; label: string },
    allAppNames: { value: string; label: string }[],
    priority: number = 1
): RadioFilter {
    return new RadioFilter({
        name: ProcessFilterKey.APP_NAME,
        translationKey: 'FILTERS.LABELS.PROCESS.APP_NAME',
        value: defaultAppName,
        options: allAppNames,
        allowEmpty: false,
        visible: !!defaultAppName,
        priority,
    });
}

export function createStartedByFilter(defaultStartedByUsers: IdentityUserModel[], appName: string, priority?: number): UserFilter {
    return new UserFilter({
        name: ProcessFilterKey.STARTED_BY_USERS,
        translationKey: 'FILTERS.LABELS.PROCESS.STARTED_BY',
        value: defaultStartedByUsers,
        appName: appName,
        visible: defaultStartedByUsers.length > 0,
        priority,
    });
}

export function createSuspendedDateFilter(
    defaultSuspendedDateType: DateCloudFilterType,
    defaultSuspendedDateFrom: string,
    defaultSuspendedDateTo: string,
    priority?: number
): DateFilter {
    return new DateFilter({
        name: ProcessFilterKey.SUSPENDED_DATE,
        translationKey: 'FILTERS.LABELS.PROCESS.SUSPENDED_DATE',
        value: getDateValue(defaultSuspendedDateType, defaultSuspendedDateFrom, defaultSuspendedDateTo),
        options: DATE_OPTIONS,
        visible: !!defaultSuspendedDateType,
        priority,
    });
}

export function createCompletedDateFilter(
    defaultCompletedDateType: DateCloudFilterType,
    defaultCompletedFrom: string,
    defaultCompletedTo: string,
    priority?: number
): DateFilter {
    return new DateFilter({
        name: ProcessFilterKey.COMPLETED_DATE,
        translationKey: 'FILTERS.LABELS.PROCESS.COMPLETED_DATE',
        value: getDateValue(defaultCompletedDateType, defaultCompletedFrom, defaultCompletedTo),
        options: DATE_OPTIONS,
        visible: !!defaultCompletedDateType,
        priority,
    });
}

export function createStartedDateFilter(
    defaultStartedDateType: DateCloudFilterType,
    defaultCreatedFrom: string,
    defaultCreatedTo: string,
    priority?: number
): DateFilter {
    return new DateFilter({
        name: ProcessFilterKey.STARTED_DATE,
        translationKey: 'FILTERS.LABELS.PROCESS.STARTED_DATE',
        value: getDateValue(defaultStartedDateType, defaultCreatedFrom, defaultCreatedTo),
        options: DATE_OPTIONS,
        visible: !!defaultStartedDateType,
        priority,
    });
}

export function createStatusFilter(defaultStatuses: string[], priority?: number): CheckboxFilter {
    return new CheckboxFilter({
        name: ProcessFilterKey.STATUSES,
        translationKey: 'FILTERS.LABELS.PROCESS.STATUS',
        value: defaultStatuses.map((status) => ({ value: status, label: findStatusTranslationKey(status), checked: true })),
        options: PROCESS_STATUS_OPTIONS,
        visible: defaultStatuses.length > 0,
        priority,
    });
}

function findStatusTranslationKey(statusValue: string) {
    return PROCESS_STATUS_OPTIONS.find((option) => option.value === statusValue)?.label || 'UNKNOWN_STATUS_OPTION';
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Option } from '../filter/filter.model';
import { StringFilter } from '../filter/filter-models/string-filter.model';
import { RadioFilter } from '../filter/filter-models/radio-filter.model';
import { DATE_OPTIONS, DateFilter } from '../filter/filter-models/date-filter.model';
import { DateCloudFilterType } from '@alfresco/adf-process-services-cloud';
import { getDateValue } from '../utils/filter.utils';

export const SERVICE_TASK_STATUS_OPTIONS: Option[] = [
    { value: 'STARTED', label: 'ADF_CLOUD_SERVICE_TASK_FILTERS.STATUS.STARTED' },
    { value: 'COMPLETED', label: 'ADF_CLOUD_SERVICE_TASK_FILTERS.STATUS.COMPLETED' },
    { value: 'CANCELLED', label: 'ADF_CLOUD_SERVICE_TASK_FILTERS.STATUS.CANCELLED' },
    { value: 'ERROR', label: 'ADF_CLOUD_SERVICE_TASK_FILTERS.STATUS.ERROR' },
];

export const ServiceTaskFilterKey = {
    APP_NAME: 'appName',
    PROCESS_INSTANCE_ID: 'processInstanceId',
    SERVICE_TASK_ID: 'serviceTaskId',
    SERVICE_TASK_ACTIVITY_NAME: 'activityName',
    STATUS: 'status',

    COMPLETED_DATE: 'completedDateType',
    COMPLETED_DATE_FROM: 'completedFrom',
    COMPLETED_DATE_TO: 'completedTo',

    STARTED_DATE: 'startedDateType',
    STARTED_DATE_FROM: 'startedFrom',
    STARTED_DATE_TO: 'startedTo',
} as const;
export type ServiceTaskFilterKey = typeof ServiceTaskFilterKey[keyof typeof ServiceTaskFilterKey];

export function createServiceTaskProcessInstanceIdFilter(processInstanceId: string | null, priority?: number): StringFilter {
    return new StringFilter({
        name: ServiceTaskFilterKey.PROCESS_INSTANCE_ID,
        translationKey: 'FILTERS.LABELS.SERVICE_TASK.PROCESS_INSTANCE_ID',
        value: processInstanceId ? [processInstanceId] : null,
        visible: !!processInstanceId,
        priority,
    });
}

export function createServiceTaskIdFilter(serviceTaskId: string | null, priority?: number): StringFilter {
    return new StringFilter({
        name: ServiceTaskFilterKey.SERVICE_TASK_ID,
        translationKey: 'FILTERS.LABELS.SERVICE_TASK.ID',
        value: serviceTaskId ? [serviceTaskId] : null,
        visible: !!serviceTaskId,
        priority,
    });
}

export function createServiceTaskActivityNameFilter(activityName: string | null, priority?: number): StringFilter {
    return new StringFilter({
        name: ServiceTaskFilterKey.SERVICE_TASK_ACTIVITY_NAME,
        translationKey: 'FILTERS.LABELS.SERVICE_TASK.ACTIVITY_NAME',
        value: activityName ? [activityName] : null,
        visible: !!activityName,
        priority,
    });
}

export function createServiceTaskStatusFilter(defaultStatus: string | null, priority?: number): RadioFilter {
    return new RadioFilter({
        name: ServiceTaskFilterKey.STATUS,
        translationKey: 'FILTERS.LABELS.SERVICE_TASK.STATUS',
        value: defaultStatus ? { label: findStatusTranslationKey(defaultStatus), value: defaultStatus } : null,
        options: SERVICE_TASK_STATUS_OPTIONS,
        visible: !!defaultStatus,
        priority,
    });
}

export function createServiceTaskStartedDateFilter(
    defaultStartedDateType: DateCloudFilterType,
    defaultStartedFrom: string,
    defaultStartedTo: string,
    priority?: number
): DateFilter {
    return new DateFilter({
        name: ServiceTaskFilterKey.STARTED_DATE,
        translationKey: 'FILTERS.LABELS.SERVICE_TASK.STARTED_DATE',
        value: getDateValue(defaultStartedDateType, defaultStartedFrom, defaultStartedTo),
        options: DATE_OPTIONS,
        visible: !!defaultStartedDateType,
        priority,
    });
}

export function createServiceTaskCompletedDateFilter(
    defaultCompletedDateType: DateCloudFilterType,
    defaultCompletedFrom: string,
    defaultCompletedTo: string,
    priority?: number
): DateFilter {
    return new DateFilter({
        name: ServiceTaskFilterKey.COMPLETED_DATE,
        translationKey: 'FILTERS.LABELS.SERVICE_TASK.COMPLETED_DATE',
        value: getDateValue(defaultCompletedDateType, defaultCompletedFrom, defaultCompletedTo),
        options: DATE_OPTIONS,
        visible: !!defaultCompletedDateType,
        priority,
    });
}

function findStatusTranslationKey(statusValue: string) {
    return SERVICE_TASK_STATUS_OPTIONS.find((option) => option.value === statusValue)?.label || 'UNKNOWN_STATUS_OPTION';
}

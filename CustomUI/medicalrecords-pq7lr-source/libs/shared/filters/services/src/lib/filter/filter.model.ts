/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdentityUserModel } from '@alfresco/adf-process-services-cloud';

export interface Option {
    label: string;
    value: string;
    checked?: boolean;
}

export interface ApplicationOption extends Option {
    hasStatusDeployed?: boolean;
}

export interface DateFilterRange {
    from: Date | null;
    to: Date | null;
}

export interface DateFilterValue {
    selectedOption: Option | null;
    range: DateFilterRange | null;
}

export const NumberFilterOperatorType = {
    EQUALS: 'EQUALS',
    NOT_EQUALS: 'NOT_EQUALS',
    GREATER_THAN: 'GREATER_THAN',
    GREATER_THAN_OR_EQUALS: 'GREATER_THAN_OR_EQUALS',
    LESS_THAN: 'LESS_THAN',
    LESS_THAN_OR_EQUALS: 'LESS_THAN_OR_EQUALS',
    BETWEEN: 'BETWEEN',
} as const;
export type NumberFilterOperatorType = typeof NumberFilterOperatorType[keyof typeof NumberFilterOperatorType];

export interface NumberFilterValue {
    value1: number | null;
    value2: number | null;
    operator: NumberFilterOperatorType;
}

export const FilterType = {
    STRING: 'string',
    NUMBER: 'number',
    DATE: 'date',
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    USER: 'user',
} as const;

export type FilterType = typeof FilterType[keyof typeof FilterType];

export interface Filter<T = string[] | NumberFilterValue | Option | Option[] | DateFilterValue | IdentityUserModel[]> {
    readonly type: FilterType;
    name: string;
    translationKey: string;
    description?: string;
    value: T | null;
    allowEmpty: boolean;
    visible: boolean;
    priority?: number;
    isValueEqualTo(other: Filter<T>): boolean;
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DateCloudFilterType } from '@alfresco/adf-process-services-cloud';
import { DateFilterValue, DATE_OPTIONS } from '../filter';

/**
 * Finds the translation key for a given date filter type.
 * @param dateValue - The date cloud filter type or custom string value
 * @returns The translation key label for the date value, or 'UNKNOWN_DATE_OPTION' if not found
 */
export function findDateTranslationKey(dateValue: DateCloudFilterType | string): string {
    return DATE_OPTIONS.find((option) => option.value === dateValue)?.label || 'UNKNOWN_DATE_OPTION';
}

/**
 * Creates a DateFilterValue object based on the provided date type and optional date range.
 * @param dateType - The type of date filter (TODAY, WEEK, MONTH, QUARTER, YEAR, RANGE)
 * @param dateFrom - The start date in ISO string format (used only for RANGE type)
 * @param dateTo - The end date in ISO string format (used only for RANGE type)
 * @returns A DateFilterValue object with selected option and optional range, or null if dateType is not provided
 */
export function getDateValue(dateType: DateCloudFilterType, dateFrom: string, dateTo: string): DateFilterValue | null {
    if (!dateType) {
        return null;
    }

    if (dateType === DateCloudFilterType.RANGE) {
        return {
            selectedOption: { label: findDateTranslationKey(dateType), value: dateType },
            range:
                dateFrom || dateTo
                    ? {
                          from: dateFrom ? new Date(dateFrom) : null,
                          to: dateTo ? new Date(dateTo) : null,
                      }
                    : null,
        };
    }

    return {
        selectedOption: { label: findDateTranslationKey(dateType), value: dateType },
        range: null,
    };
}

/**
 * Filters out empty values from a filter object for storage.
 * @param incomingFilter - The filter object to process
 * @param relaxedValidationKeys - Array of keys that only need to pass null/undefined check (typically date-related fields)
 * @returns A filtered object with only non-empty values
 *
 * Keys in relaxedValidationKeys are kept if they're not null/undefined.
 * Other keys are kept only if they're not null, undefined, empty string, or empty array.
 */
export function filterNonEmptyValues<T extends Record<string, any>>(incomingFilter: T, relaxedValidationKeys: string[] = []): Record<string, any> {
    return Object.entries(incomingFilter).reduce((acc, [key, value]) => {
        if (relaxedValidationKeys.includes(key)) {
            if (value !== null && value !== undefined) {
                acc[key] = value;
            }
        } else if (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { DateSearchFilterData, DateSearchFilterValue } from './date-search-filter.data';
import {
    endOfWeek,
    addMonths,
    addYears,
    addDays,
    startOfDay,
    endOfDay,
    addWeeks,
    startOfWeek,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
} from 'date-fns';

@Injectable({ providedIn: 'root' })
export class DateSearchFilterService {
    toQueryParams(data: DateSearchFilterData, fieldName: string): Record<string, any> {
        if (!data || !data.values?.length) {
            return {};
        }

        const date = data.values[0].date;

        let from: Date | undefined;
        let to: Date | undefined;

        switch (date) {
            case 'TOMORROW': {
                const d = addDays(new Date(), 1);
                from = startOfDay(d);
                to = endOfDay(d);
                break;
            }
            case 'NEXT_WEEK': {
                const d = addWeeks(new Date(), 1);
                from = startOfWeek(d);
                to = endOfWeek(d);
                break;
            }
            case 'NEXT_MONTH': {
                const d = addMonths(new Date(), 1);
                from = startOfMonth(d);
                to = endOfMonth(d);
                break;
            }
            case 'NEXT_YEAR': {
                const d = addYears(new Date(), 1);
                from = startOfYear(d);
                to = endOfYear(d);
                break;
            }
            default: {
                from = data.values[0].afterDate;
                to = data.values[0].beforeDate;
            }
        }

        if (from && to) {
            return { [`${fieldName}From`]: [from.toISOString()], [`${fieldName}To`]: [to.toISOString()] };
        } else if (from) {
            return { [`${fieldName}From`]: [from.toISOString()] };
        } else if (to) {
            return { [`${fieldName}To`]: [to.toISOString()] };
        }

        // Fallback: If neither 'from' nor 'to' dates are defined (e.g., in the default case with no custom dates)
        return {};
    }

    fromQueryParams(params: Record<string, any>, fieldName: string): DateSearchFilterData | undefined {
        const fromParam = params[`${fieldName}From`];
        const toParam = params[`${fieldName}To`];

        if (!fromParam && !toParam) {
            return undefined;
        }

        const from = fromParam ? new Date(fromParam) : undefined;
        const to = toParam ? new Date(toParam) : undefined;

        const today = new Date();

        const defaultRanges: Record<string, { from: Date; to: Date }> = {
            TOMORROW: { from: startOfDay(addDays(today, 1)), to: endOfDay(addDays(today, 1)) },
            NEXT_WEEK: { from: startOfWeek(addWeeks(today, 1)), to: endOfWeek(addWeeks(today, 1)) },
            NEXT_MONTH: { from: startOfMonth(addMonths(today, 1)), to: endOfMonth(addMonths(today, 1)) },
            NEXT_YEAR: { from: startOfYear(addYears(today, 1)), to: endOfYear(addYears(today, 1)) },
        };

        let defaultOption: string | undefined;
        for (const key of Object.keys(defaultRanges)) {
            const range = defaultRanges[key];
            if (from && to && from.getTime() === range.from.getTime() && to.getTime() === range.to.getTime()) {
                defaultOption = key;
                break;
            }
        }

        let label: string;
        let value: DateSearchFilterValue;

        if (defaultOption) {
            // Use translation key for default options
            switch (defaultOption) {
                case 'TOMORROW': {
                    label = 'GOVERNANCE.SEARCH.FILTERS.DATE.OPTIONS.TOMORROW';
                    break;
                }
                case 'NEXT_WEEK': {
                    label = 'GOVERNANCE.SEARCH.FILTERS.DATE.OPTIONS.NEXT_WEEK';
                    break;
                }
                case 'NEXT_MONTH': {
                    label = 'GOVERNANCE.SEARCH.FILTERS.DATE.OPTIONS.NEXT_MONTH';
                    break;
                }
                case 'NEXT_YEAR': {
                    label = 'GOVERNANCE.SEARCH.FILTERS.DATE.OPTIONS.NEXT_YEAR';
                    break;
                }
                default: {
                    label = defaultOption;
                }
            }
            value = { date: defaultOption, label };
        } else {
            // Custom date range: do NOT set the label here
            value = { afterDate: from, beforeDate: to, label: '' };
        }

        return new DateSearchFilterData([value]);
    }
}

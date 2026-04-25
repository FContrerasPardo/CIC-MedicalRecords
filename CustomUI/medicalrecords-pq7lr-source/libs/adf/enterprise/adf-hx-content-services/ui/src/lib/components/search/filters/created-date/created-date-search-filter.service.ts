/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { formatISO, startOfDay, startOfToday, sub } from 'date-fns';
import { SearchFilterService } from '@alfresco/adf-hx-content-services/services';
import { CreatedDateSearchFilterData } from './created-date-search-filter.data';

interface Duration {
    years?: number | undefined;
    months?: number | undefined;
    weeks?: number | undefined;
    days?: number | undefined;
    hours?: number | undefined;
    minutes?: number | undefined;
    seconds?: number | undefined;
}

@Injectable()
export class CreatedDateSearchFilterService implements SearchFilterService {
    public toHXQL(data: CreatedDateSearchFilterData): string {
        const valuesArray = data?.values;
        if (!valuesArray || valuesArray?.length === 0) {
            return '';
        }
        const createdDateValue = valuesArray[0];

        switch (createdDateValue.date) {
            case 'LAST_7_DAYS': {
                return this.formatLastPeriodToHXQL({ days: 7 });
            }
            case 'LAST_30_DAYS': {
                return this.formatLastPeriodToHXQL({ days: 30 });
            }
            case 'LAST_6_MONTHS': {
                return this.formatLastPeriodToHXQL({ months: 6 });
            }
            case 'LAST_YEAR': {
                return this.formatLastPeriodToHXQL({ years: 1 });
            }
            default: {
                const { afterDate, beforeDate } = createdDateValue;

                if (afterDate && beforeDate) {
                    const afterDateValue = this.formatCreatedDateToHXQL('after', startOfDay(afterDate));
                    const beforeDateValue = this.formatCreatedDateToHXQL('before', startOfDay(beforeDate));
                    return `${afterDateValue} AND ${beforeDateValue}`;
                } else if (afterDate && !beforeDate) {
                    return this.formatCreatedDateToHXQL('after', startOfDay(afterDate));
                } else if (!afterDate && beforeDate) {
                    return this.formatCreatedDateToHXQL('before', startOfDay(beforeDate));
                }
            }
        }

        return '';
    }

    private formatCreatedDateToHXQL(type: 'after' | 'before', date: Date) {
        const formattedDate = formatISO(date, { representation: 'complete' });
        return type === 'before' ? `sys_created <= DATE '${formattedDate}'` : `sys_created >= DATE '${formattedDate}'`;
    }

    private formatLastPeriodToHXQL(options: Duration) {
        const today = startOfToday();
        return this.formatCreatedDateToHXQL('after', sub(today, options));
    }
}

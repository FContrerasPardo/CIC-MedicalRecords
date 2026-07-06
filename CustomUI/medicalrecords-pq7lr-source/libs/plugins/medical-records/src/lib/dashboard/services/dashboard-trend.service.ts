import { Injectable } from '@angular/core';

import { forkJoin, map, Observable, of } from 'rxjs';

import {

    ComparisonPeriod,

    DashboardDateRange,

    DashboardWidgetConfig,

    TrendDirection,

} from '../definitions/dashboard-widget.model';

import { ContentQueryDataProvider } from '../providers/content-query-data.provider';

import { CONTENT_SAMPLE_MAX_ROWS } from '../providers/content-query.types';

import { ProcessQueryDataProvider } from '../providers/process-query-data.provider';

import { TABLE_EXPORT_MAX_ROWS } from '../utils/dashboard-table-export.util';

import { resolveWidgetDataSource } from '../utils/dashboard-data-source.util';

import { flattenTableRow } from '../mappers/dashboard-table.mapper';

import { inferFieldDescriptors } from '../mappers/dashboard-field-schema.mapper';

import {

    countRowsInDateRange,

    previousComparisonRange,

} from '../utils/dashboard-date-range.util';

import { countProcessInstancesInRange } from '../utils/dashboard-process-count.util';

import { DashboardContentLoadContextService } from './dashboard-content-load-context.service';

import { DashboardPeriodService } from './dashboard-period.service';



export interface DashboardTrendResult {

    direction: TrendDirection;

    value: string;

    label: string;

    positive: boolean;

}



/** Sample cap for period/trend counts — avoids downloading the full repository per widget. */

const TREND_SAMPLE_MAX_ROWS = CONTENT_SAMPLE_MAX_ROWS;



@Injectable({ providedIn: 'root' })

export class DashboardTrendService {

    constructor(

        private readonly contentQueryDataProvider: ContentQueryDataProvider,

        private readonly processQueryDataProvider: ProcessQueryDataProvider,

        private readonly contentLoadContext: DashboardContentLoadContextService,

        private readonly periodService: DashboardPeriodService

    ) {}



    resolveTrend(

        config: DashboardWidgetConfig,

        comparisonPeriod: ComparisonPeriod

    ): Observable<DashboardTrendResult | null> {

        if (comparisonPeriod === 'none') {

            return of(this.staticTrend(config));

        }



        const currentRange = this.periodService.dateRange;

        const previousRange = previousComparisonRange(currentRange);

        const dataSource = resolveWidgetDataSource(config);



        if (dataSource === 'content' && config.contentQuery) {

            return this.contentSampleRows(config).pipe(

                map((sample) => {

                    if (!sample) {

                        return this.staticTrend(config);

                    }

                    const { rows, dateField } = sample;

                    const current = countRowsInDateRange(rows, dateField, currentRange);

                    const previous = countRowsInDateRange(rows, dateField, previousRange);

                    return this.computeDelta(current, previous, comparisonPeriod);

                })

            );

        }



        return forkJoin({

            current: this.countInRange(config, currentRange),

            previous: this.countInRange(config, previousRange),

        }).pipe(

            map(({ current, previous }) => {

                if (current == null || previous == null) {

                    return this.staticTrend(config);

                }

                return this.computeDelta(current, previous, comparisonPeriod);

            })

        );

    }



    countInActiveRange(config: DashboardWidgetConfig): Observable<number | null> {

        const range = this.periodService.dateRange;

        const dataSource = resolveWidgetDataSource(config);



        if (dataSource === 'content' && config.contentQuery) {

            return this.contentSampleRows(config).pipe(

                map((sample) => {

                    if (!sample) {

                        return null;

                    }

                    return countRowsInDateRange(sample.rows, sample.dateField, range);

                })

            );

        }



        return this.countInRange(config, range);

    }



    private staticTrend(config: DashboardWidgetConfig): DashboardTrendResult | null {

        if (!config.trendDirection && !config.trendValue) {

            return null;

        }



        const direction = config.trendDirection ?? 'flat';

        return {

            direction,

            value: config.trendValue ?? '',

            label: config.trendLabel ?? '',

            positive: config.positive ?? direction !== 'down',

        };

    }



    private computeDelta(

        current: number,

        previous: number,

        comparisonPeriod: ComparisonPeriod

    ): DashboardTrendResult {

        const delta = current - previous;

        const direction: TrendDirection = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

        let value: string;

        if (previous > 0) {

            const pct = Math.abs((delta / previous) * 100);

            value = `${pct.toFixed(1)}%`;

        } else if (delta > 0) {

            value = `+${delta}`;

        } else if (delta < 0) {

            value = String(delta);

        } else {

            value = '0%';

        }

        const labelKey =

            comparisonPeriod === 'previous_month'

                ? 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_MONTH'

                : comparisonPeriod === 'previous_week'

                  ? 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_WEEK'

                  : 'MEDICAL_RECORDS.DASHBOARD.TREND_VS_PREV_PERIOD';



        return {

            direction,

            value,

            label: labelKey,

            positive: direction !== 'down',

        };

    }



    private contentSampleRows(

        config: DashboardWidgetConfig

    ): Observable<{ rows: Record<string, string>[]; dateField: string } | null> {

        return this.contentQueryDataProvider

            .fetchAll(config, TREND_SAMPLE_MAX_ROWS, this.contentLoadContext.resolveRequestOptions(config.id))

            .pipe(

                map((result) => {

                    const rows = result.documents.map((row) =>

                        flattenTableRow(row as Record<string, unknown>)

                    );

                    const dateField = this.guessContentDateField(rows, config);

                    if (!dateField) {

                        return null;

                    }

                    return { rows, dateField };

                })

            );

    }



    private countInRange(config: DashboardWidgetConfig, range: DashboardDateRange): Observable<number | null> {

        const dataSource = resolveWidgetDataSource(config);



        if (dataSource === 'process') {

            return this.processQueryDataProvider.fetchRowsCoveringDateRange(config, range, TABLE_EXPORT_MAX_ROWS).pipe(

                map((result) => {

                    if (result.error) {

                        return null;

                    }

                    return countProcessInstancesInRange(result.rows, range, config.processQuery);

                })

            );

        }



        return of(null);

    }



    private guessContentDateField(

        rows: Record<string, string>[],

        config: DashboardWidgetConfig

    ): string | null {

        const bindingField = config.bindings?.argumentField;

        const fields = inferFieldDescriptors(rows, config.bindings?.maxBuckets ?? 12);

        const bindingKind = fields.find((field) => field.key === bindingField)?.kind;

        if (bindingField && bindingKind === 'date' && rows.some((row) => row[bindingField])) {

            return bindingField;

        }



        const candidates = ['sys_created', 'sys_createdDate', 'cmis:creationDate', 'sys_modified', 'created'];

        for (const key of candidates) {

            if (rows.some((row) => row[key])) {

                return key;

            }

        }

        return null;

    }

}



export { filterRowsToDateRange } from '../utils/dashboard-date-range.util';


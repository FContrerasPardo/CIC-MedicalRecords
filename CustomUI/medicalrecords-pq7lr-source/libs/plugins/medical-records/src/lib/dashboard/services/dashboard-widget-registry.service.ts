import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import {
    DashboardChartWidgetData,
    DashboardFieldDescriptor,
    DashboardFieldKind,
    DashboardGaugeWidgetData,
    DashboardGaugeTone,
    DashboardMetricWidgetData,
    DashboardTableWidgetData,
    DashboardWidgetConfig,
    ValueFieldFormat,
} from '../definitions/dashboard-widget.model';
import { buildChartSeries } from '../mappers/dashboard-chart.mapper';
import {
    fallbackFieldsForSource,
    inferFieldDescriptors,
    mergeFieldDescriptors,
} from '../mappers/dashboard-field-schema.mapper';
import {
    aggregateNumericFieldValues,
    applyValueFieldFormat,
    isNumericFieldAggregation,
} from '../utils/dashboard-numeric-aggregation.util';
import { resolveChartConfig, resolveTableColumnKeys } from '../mappers/dashboard-widget-bindings.mapper';
import { discoverTableColumns, flattenTableRow } from '../mappers/dashboard-table.mapper';
import { ContentQueryDataProvider } from '../providers/content-query-data.provider';
import { ProcessQueryDataProvider } from '../providers/process-query-data.provider';
import {
    buildTableCsv,
    buildTableExportFilename,
    TABLE_EXPORT_MAX_ROWS,
} from '../utils/dashboard-table-export.util';
import { CONTENT_SAMPLE_MAX_ROWS } from '../providers/content-query.types';
import { resolveWidgetDataSource } from '../utils/dashboard-data-source.util';
import { classifyResolvedValues, resolveBoundFieldLabelValue } from '../utils/dashboard-json-field.util';
import { DashboardContentLoadContextService } from './dashboard-content-load-context.service';
import { DashboardPeriodService } from './dashboard-period.service';
import { DashboardTrendResult, DashboardTrendService, filterRowsToDateRange } from './dashboard-trend.service';

const CHART_MAX_ROWS = CONTENT_SAMPLE_MAX_ROWS;

@Injectable({ providedIn: 'root' })
export class DashboardWidgetRegistryService {
    readonly defaultChartLabels = ['12am', '4am', '8am', '12pm', '4pm', '8pm'];
    readonly defaultChartBars = [35, 25, 55, 45, 75, 85, 60, 95, 70, 50, 30, 20];

    readonly demoTableRows: Record<string, string>[] = [
        { id: 'demo-1', name: 'Sample row A', status: 'RUNNING', sourceField: 'exampleValue' },
        { id: 'demo-2', name: 'Sample row B', status: 'COMPLETED', sourceField: 'anotherValue' },
    ];

    constructor(
        private readonly contentQueryDataProvider: ContentQueryDataProvider,
        private readonly processQueryDataProvider: ProcessQueryDataProvider,
        private readonly trendService: DashboardTrendService,
        private readonly periodService: DashboardPeriodService,
        private readonly contentLoadContext: DashboardContentLoadContextService
    ) {}

    resolveMetric(config: DashboardWidgetConfig): Observable<DashboardMetricWidgetData> {
        const dataSource = resolveWidgetDataSource(config);
        const bindings = config.bindings;
        const wantsNumericField =
            isNumericFieldAggregation(bindings?.valueAggregation) && !!bindings?.valueField;
        const comparisonPeriod = config.comparisonPeriod ?? 'none';

        const base$ =
            dataSource === 'process' && !wantsNumericField
                ? this.trendService.countInActiveRange(config).pipe(
                      map((count) => ({
                          value: count != null ? String(count) : '—',
                          source: 'process' as const,
                          error: count == null ? ('process-period-unavailable' as string | undefined) : undefined,
                      })),
                      catchError(() =>
                          of({ value: config.demoValue ?? '—', source: 'demo' as const, error: 'process-query-failed' })
                      )
                  )
                : dataSource === 'content' && config.contentQuery && !wantsNumericField
                  ? config.id === 'metric-content-recent'
                      ? this.trendService
                            .countInActiveRange(config)
                            .pipe(
                                map((count) => ({
                                    value: count != null ? String(count) : '—',
                                    source: 'content' as const,
                                    error: count == null ? ('content-period-unavailable' as string | undefined) : undefined,
                                })),
                                catchError(() =>
                                    of({
                                        value: config.demoValue ?? '—',
                                        source: 'demo' as const,
                                        error: 'content-query-failed',
                                    })
                                )
                            )
                      : this.contentQueryDataProvider.fetch(config, undefined, 0, this.contentOptions(config)).pipe(
                            map((result) => ({
                                value: String(result.totalCount),
                                source: 'content' as const,
                                error: undefined as string | undefined,
                            })),
                            catchError(() =>
                                of({ value: config.demoValue ?? '—', source: 'demo' as const, error: 'content-query-failed' })
                            )
                        )
                  : wantsNumericField && dataSource !== 'demo'
                    ? this.fetchRowsForChart(config, dataSource).pipe(
                          map((rows) => ({
                              value: String(
                                  this.aggregateBoundField(
                                      rows,
                                      bindings!.valueField!,
                                      bindings!.valueFieldPath,
                                      bindings!.valueAggregation!,
                                      bindings!.valueFieldFormat
                                  )
                              ),
                              source: dataSource,
                              error: undefined as string | undefined,
                          })),
                          catchError(() =>
                              of({
                                  value: config.demoValue ?? '—',
                                  source: 'demo' as const,
                                  error: `${dataSource}-query-failed`,
                              })
                          )
                      )
                    : of({ value: config.demoValue ?? '—', source: 'demo' as const, error: undefined as string | undefined });

        return base$.pipe(
            switchMap((base) =>
                this.trendService.resolveTrend(config, comparisonPeriod).pipe(
                    map((trend) => this.buildMetricData(config, base.value, base.source, base.error, trend))
                )
            )
        );
    }

    resolveGauge(config: DashboardWidgetConfig): Observable<DashboardGaugeWidgetData> {
        const min = config.gaugeMin ?? 0;
        const max = config.gaugeMax ?? 100;
        const target = config.gaugeTarget;
        const unit = config.gaugeUnit ?? '';

        if (config.gaugeMode === 'ratio') {
            return this.resolveGaugeRatio(config).pipe(
                map(({ value, source, error }) =>
                    this.buildGaugeData(value, min, max, target, unit, source, error)
                )
            );
        }

        return this.resolveMetricNumeric(config).pipe(
            map(({ value, source, error }) => this.buildGaugeData(value, min, max, target, unit, source, error))
        );
    }

    private buildGaugeData(
        value: number,
        min: number,
        max: number,
        target: number | undefined,
        unit: string,
        source: DashboardWidgetConfig['dataSource'],
        error?: string
    ): DashboardGaugeWidgetData {
        const span = max - min;
        const percentage = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
        const displayValue = Number.isInteger(value) ? `${value}${unit}` : `${value.toFixed(1)}${unit}`;

        return {
            value,
            displayValue,
            percentage,
            min,
            max,
            target,
            unit,
            loading: false,
            error,
            source: source ?? 'demo',
            tone: this.gaugeTone(value, target, min, max),
        };
    }

    private resolveGaugeRatio(
        config: DashboardWidgetConfig
    ): Observable<{ value: number; source: DashboardWidgetConfig['dataSource']; error?: string }> {
        const dataSource = resolveWidgetDataSource(config);
        if (dataSource !== 'process') {
            const demo = this.parseNumericDemo(config.demoValue);
            return of({ value: demo, source: 'demo' as const });
        }

        const denominatorConfig: DashboardWidgetConfig = {
            ...config,
            processQuery: {
                ...config.processQuery,
                status: ['RUNNING', 'COMPLETED', 'SUSPENDED'],
            },
        };
        const numeratorConfig: DashboardWidgetConfig = {
            ...config,
            processQuery: {
                ...config.processQuery,
                status: ['COMPLETED'],
            },
        };

        return forkJoin({
            denominator: this.trendService.countInActiveRange(denominatorConfig),
            numerator: this.trendService.countInActiveRange(numeratorConfig),
        }).pipe(
            map(({ denominator, numerator }) => {
                const denomCount = denominator ?? 0;
                const numCount = numerator ?? 0;
                const ratio = denomCount > 0 ? (numCount / denomCount) * 100 : 0;
                return { value: Math.round(ratio * 10) / 10, source: 'process' as const };
            }),
            catchError(() =>
                of({ value: this.parseNumericDemo(config.demoValue), source: 'demo' as const, error: 'process-query-failed' })
            )
        );
    }

    private buildMetricData(
        config: DashboardWidgetConfig,
        value: string,
        source: DashboardWidgetConfig['dataSource'],
        error?: string,
        trend?: DashboardTrendResult | null
    ): DashboardMetricWidgetData {
        const useTrend = trend && (config.comparisonPeriod !== 'none' || config.trendDirection || config.trendValue);
        return {
            value,
            helper: useTrend ? undefined : config.helper,
            positive: useTrend ? trend!.positive : config.positive,
            trendDirection: useTrend ? trend!.direction : config.trendDirection,
            trendValue: useTrend ? trend!.value : config.trendValue,
            trendLabel: useTrend ? trend!.label : config.trendLabel,
            helperTooltip: config.helperTooltip,
            loading: false,
            error,
            source: source ?? 'demo',
        };
    }

    private resolveMetricNumeric(
        config: DashboardWidgetConfig
    ): Observable<{ value: number; source: DashboardWidgetConfig['dataSource']; error?: string }> {
        const dataSource = resolveWidgetDataSource(config);
        const bindings = config.bindings;
        const wantsNumericField =
            isNumericFieldAggregation(bindings?.valueAggregation) && !!bindings?.valueField;

        if (dataSource === 'process' && !wantsNumericField) {
            return this.trendService.countInActiveRange(config).pipe(
                map((count) => ({
                    value: count ?? 0,
                    source: 'process' as const,
                    error: count == null ? 'process-period-unavailable' : undefined,
                })),
                catchError(() => of({ value: this.parseNumericDemo(config.demoValue), source: 'demo' as const, error: 'process-query-failed' }))
            );
        }

        if (dataSource === 'content' && config.contentQuery && !wantsNumericField) {
            return this.contentQueryDataProvider.fetch(config, undefined, 0, this.contentOptions(config)).pipe(
                map((result) => ({ value: result.totalCount, source: 'content' as const })),
                catchError(() => of({ value: this.parseNumericDemo(config.demoValue), source: 'demo' as const, error: 'content-query-failed' }))
            );
        }

        if (wantsNumericField && dataSource !== 'demo') {
            return this.fetchRowsForChart(config, dataSource).pipe(
                map((rows) => {
                    const fields = inferFieldDescriptors(rows, config.bindings?.maxBuckets ?? 12);
                    const scopedRows = this.scopeRowsToDateRange(rows, dataSource, fields, config);
                    return {
                        value: this.aggregateBoundField(
                            scopedRows,
                            bindings!.valueField!,
                            bindings!.valueFieldPath,
                            bindings!.valueAggregation!,
                            bindings!.valueFieldFormat
                        ),
                        source: dataSource,
                    };
                }),
                catchError(() => of({ value: this.parseNumericDemo(config.demoValue), source: 'demo' as const, error: `${dataSource}-query-failed` }))
            );
        }

        return of({ value: this.parseNumericDemo(config.demoValue), source: 'demo' as const });
    }

    private parseNumericDemo(raw?: string): number {
        if (!raw?.trim()) {
            return 0;
        }
        const parsed = Number.parseFloat(raw.replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    private gaugeTone(value: number, target: number | undefined, min: number, max: number): DashboardGaugeTone {
        if (target == null) {
            const mid = min + (max - min) * 0.5;
            return value >= mid ? 'high' : 'low';
        }
        if (value >= target) {
            return 'high';
        }
        const warnThreshold = min + (target - min) * 0.85;
        return value >= warnThreshold ? 'medium' : 'low';
    }

    resolveChart(config: DashboardWidgetConfig): Observable<DashboardChartWidgetData> {
        const dataSource = resolveWidgetDataSource(config);
        const chart = resolveChartConfig(config);
        const xField = chart.xField;
        const seriesField = config.bindings?.seriesField;

        if (dataSource === 'demo' || !xField) {
            return of(this.demoChartData('demo', config));
        }

        return this.fetchRowsForChart(config, dataSource).pipe(
            map((rows) => {
                const fields = mergeFieldDescriptors(
                    inferFieldDescriptors(rows, chart.maxBuckets ?? 12),
                    fallbackFieldsForSource(dataSource)
                );
                const scopedRows = this.scopeRowsToDateRange(rows, dataSource, fields, config);
                const xKind = this.resolveChartXKind(
                    scopedRows,
                    xField,
                    config,
                    fields,
                    chart
                );
                const series = buildChartSeries(scopedRows, xField, xKind, chart, seriesField, {
                    dropAllZeroBuckets: xKind === 'date',
                });

                if (!series.labels.length) {
                    return this.emptyChartData(dataSource, 'chart-no-data');
                }

                return {
                    labels: series.labels,
                    bars: series.bars,
                    values: series.values,
                    series: series.series,
                    loading: false,
                    source: dataSource,
                };
            }),
            catchError(() => of(this.emptyChartData(dataSource, 'chart-query-failed')))
        );
    }

    discoverFields(config: DashboardWidgetConfig): Observable<DashboardFieldDescriptor[]> {
        const dataSource = resolveWidgetDataSource(config);
        const maxBuckets = config.bindings?.maxBuckets ?? config.chart?.maxBuckets ?? 12;
        const fallback = fallbackFieldsForSource(dataSource);

        if (dataSource === 'demo') {
            const rows = this.demoTableRows;
            return of(mergeFieldDescriptors(inferFieldDescriptors(rows, maxBuckets), fallback));
        }

        return this.fetchRowsForChart(config, dataSource).pipe(
            map((rows) => {
                const inferred = inferFieldDescriptors(rows, maxBuckets);
                return inferred.length ? mergeFieldDescriptors(inferred, fallback) : fallback;
            }),
            catchError(() => of(fallback))
        );
    }

    resolveTable(config: DashboardWidgetConfig, skipCount = 0): Observable<DashboardTableWidgetData> {
        const dataSource = resolveWidgetDataSource(config);
        const preferredColumns = resolveTableColumnKeys(config);

        if (dataSource === 'process') {
            return this.processQueryDataProvider.fetchRows(config, undefined, skipCount).pipe(
                map((result) => ({
                    ...this.buildTableData(result.rows, result.totalCount, preferredColumns, 'process'),
                    error: result.error,
                })),
                catchError(() => this.demoTableFallback(config, preferredColumns, 'process-query-failed'))
            );
        }

        if (dataSource === 'content' && config.contentQuery) {
            return this.contentQueryDataProvider.fetch(config, undefined, skipCount, this.contentOptions(config)).pipe(
                map((result) => this.buildTableData(result.documents, result.totalCount, preferredColumns, 'content')),
                catchError(() => this.demoTableFallback(config, preferredColumns, 'content-query-failed'))
            );
        }

        return of(this.buildTableData(this.demoTableRows, this.demoTableRows.length, preferredColumns, 'demo'));
    }

    exportTable(config: DashboardWidgetConfig): Observable<{ csv: string; filename: string; rowCount: number }> {
        const dataSource = resolveWidgetDataSource(config);
        const preferredColumns = resolveTableColumnKeys(config);

        if (dataSource === 'process') {
            return this.processQueryDataProvider.fetchAllRows(config, TABLE_EXPORT_MAX_ROWS).pipe(
                map((result) => this.buildExportPayload(result.rows, preferredColumns, config, result.totalCount)),
                catchError(() =>
                    of(this.buildExportPayload(this.demoTableRows, preferredColumns, config, this.demoTableRows.length))
                )
            );
        }

        if (dataSource === 'content' && config.contentQuery) {
            return this.contentQueryDataProvider.fetchAll(config, TABLE_EXPORT_MAX_ROWS, this.contentOptions(config)).pipe(
                map((result) =>
                    this.buildExportPayload(
                        result.documents as Array<Record<string, unknown>>,
                        preferredColumns,
                        config,
                        result.totalCount
                    )
                ),
                catchError(() =>
                    of(this.buildExportPayload(this.demoTableRows, preferredColumns, config, this.demoTableRows.length))
                )
            );
        }

        return of(this.buildExportPayload(this.demoTableRows, preferredColumns, config, this.demoTableRows.length));
    }

    private buildExportPayload(
        rawRows: Array<Record<string, unknown>>,
        preferredColumns: string[],
        config: DashboardWidgetConfig,
        totalCount: number
    ): { csv: string; filename: string; rowCount: number } {
        const rows = rawRows.map((row) => flattenTableRow(row));
        const columns = discoverTableColumns(rows, preferredColumns);
        const title = config.title ?? config.id ?? 'report';
        return {
            csv: buildTableCsv(columns, rows),
            filename: buildTableExportFilename(title),
            rowCount: Math.min(rows.length, totalCount),
        };
    }

    private fetchRowsForChart(
        config: DashboardWidgetConfig,
        dataSource: 'content' | 'process'
    ): Observable<Record<string, string>[]> {
        if (dataSource === 'process') {
            const range = this.periodService.dateRange;
            return this.processQueryDataProvider.fetchRowsCoveringDateRange(config, range, CHART_MAX_ROWS).pipe(
                switchMap((result) => {
                    if (result.error) {
                        return throwError(() => new Error(result.error));
                    }

                    return of(result.rows.map((row) => flattenTableRow(row)));
                })
            );
        }

        return this.contentQueryDataProvider.fetchAll(config, CHART_MAX_ROWS, this.contentOptions(config)).pipe(
            map((result) => result.documents.map((row) => flattenTableRow(row as Record<string, unknown>)))
        );
    }

    private emptyChartData(source: DashboardChartWidgetData['source'], error: string): DashboardChartWidgetData {
        return {
            labels: [],
            bars: [],
            values: [],
            loading: false,
            error,
            source,
        };
    }

    private demoChartData(
        source: DashboardChartWidgetData['source'],
        config?: DashboardWidgetConfig,
        error?: string
    ): DashboardChartWidgetData {
        const maxBuckets = config ? (resolveChartConfig(config).maxBuckets ?? 12) : 12;
        const values = this.defaultChartBars.slice(0, maxBuckets);
        const labels = values.map((_, index) => this.defaultChartLabels[index % this.defaultChartLabels.length] ?? String(index + 1));
        return {
            labels,
            bars: values,
            values,
            loading: false,
            error,
            source,
        };
    }

    private buildTableData(
        rawRows: Array<Record<string, unknown>>,
        totalCount: number,
        preferredColumns: string[],
        source: DashboardTableWidgetData['source']
    ): DashboardTableWidgetData {
        const rows = rawRows.map((row) => flattenTableRow(row));
        return {
            rows,
            columns: discoverTableColumns(rows, preferredColumns),
            totalCount,
            loading: false,
            source,
        };
    }

    private demoTableFallback(
        config: DashboardWidgetConfig,
        preferredColumns: string[],
        error: string
    ): Observable<DashboardTableWidgetData> {
        void config;
        return of({
            ...this.buildTableData(this.demoTableRows, this.demoTableRows.length, preferredColumns, 'demo'),
            error,
        });
    }


    private contentOptions(config: DashboardWidgetConfig) {
        return this.contentLoadContext.resolveRequestOptions(config.id);
    }

    private scopeRowsToDateRange(
        rows: Record<string, string>[],
        dataSource: 'content' | 'process',
        fields: DashboardFieldDescriptor[],
        config: DashboardWidgetConfig
    ): Record<string, string>[] {
        const range = this.periodService.dateRange;
        if (dataSource === 'process') {
            return filterRowsToDateRange(rows, 'startDate', range);
        }

        const bindingField = config.bindings?.argumentField;
        const bindingKind = fields.find((field) => field.key === bindingField)?.kind;
        const dateField =
            bindingKind === 'date' && bindingField
                ? bindingField
                : fields.find((field) => field.kind === 'date')?.key ??
                  ['sys_created', 'sys_createdDate', 'cmis:creationDate', 'sys_modified', 'created'].find((key) =>
                      rows.some((row) => row[key])
                  );

        return dateField ? filterRowsToDateRange(rows, dateField, range) : rows;
    }

    private resolveChartXKind(
        rows: Record<string, string>[],
        xField: string,
        config: DashboardWidgetConfig,
        fields: DashboardFieldDescriptor[],
        chart: ReturnType<typeof resolveChartConfig>
    ): DashboardFieldKind {
        if (chart.dateBucket) {
            return 'date';
        }

        const argumentField = config.bindings?.argumentField ?? chart.xField;
        if (argumentField && /date|time|created|modified|started|ended/i.test(argumentField)) {
            return 'date';
        }

        return this.inferBoundFieldKind(
            rows,
            xField,
            config.bindings?.argumentFieldPath,
            fields,
            chart.maxBuckets ?? 12
        );
    }

    private inferBoundFieldKind(
        rows: Record<string, string>[],
        fieldKey: string,
        fieldPath: string | undefined,
        fields: DashboardFieldDescriptor[],
        maxBuckets: number
    ): DashboardFieldKind {
        const descriptor = fields.find((field) => field.key === fieldKey);
        if (descriptor?.kind === 'json') {
            const resolved = rows.map((row) => resolveBoundFieldLabelValue(row, fieldKey, fieldPath));
            return classifyResolvedValues(resolved, fieldKey, maxBuckets);
        }
        return descriptor?.kind ?? 'category';
    }

    private aggregateBoundField(
        rows: Record<string, string>[],
        fieldKey: string,
        fieldPath: string | undefined,
        aggregation: string,
        format?: ValueFieldFormat
    ): number {
        if (isNumericFieldAggregation(aggregation)) {
            const raw = aggregateNumericFieldValues(rows, fieldKey, fieldPath, aggregation);
            return applyValueFieldFormat(raw, format);
        }
        return 0;
    }
}

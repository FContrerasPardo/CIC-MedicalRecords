import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { DashboardChartWidgetData, DashboardMetricWidgetData, DashboardWidgetConfig } from '../definitions/dashboard-widget.model';
import { ContentQueryDataProvider } from '../providers/content-query-data.provider';

@Injectable({ providedIn: 'root' })
export class DashboardWidgetRegistryService {
    readonly defaultChartBars = [35, 25, 55, 45, 75, 85, 60, 95, 70, 50, 30, 20];

    constructor(private readonly contentQueryDataProvider: ContentQueryDataProvider) {}

    resolveMetric(config: DashboardWidgetConfig): Observable<DashboardMetricWidgetData> {
        if (!config.contentQuery) {
            return of({
                value: config.demoValue ?? '—',
                helper: config.helperKey,
                positive: config.positive,
                loading: false,
                source: 'demo',
            });
        }

        return this.contentQueryDataProvider.fetch(config).pipe(
            map((result) => ({
                value: String(result.totalCount),
                helper: config.helperKey,
                positive: true,
                loading: false,
                source: 'content' as const,
            })),
            catchError(() =>
                of({
                    value: config.demoValue ?? '—',
                    helper: config.helperKey,
                    positive: config.positive,
                    loading: false,
                    error: 'content-query-failed',
                    source: 'demo' as const,
                })
            )
        );
    }

    resolveChart(config: DashboardWidgetConfig): Observable<DashboardChartWidgetData> {
        void config;
        return of({
            bars: this.defaultChartBars,
            loading: false,
            source: 'demo',
        });
    }
}

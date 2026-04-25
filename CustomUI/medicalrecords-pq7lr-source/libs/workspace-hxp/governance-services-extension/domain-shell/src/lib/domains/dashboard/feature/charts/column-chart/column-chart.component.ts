/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, effect, inject, input, viewChild } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
    ActiveElement,
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    ChartConfiguration,
    ChartEvent,
    ChartOptions,
    InteractionItem,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { WidgetCategoryMetric } from '../../../definitions/dashboard.interface';
import { DEFAULT_STATUS_COLOR } from '../../../definitions/dashboard.constants';
import { ColumnChartDataService } from '../../../services/column-chart-data.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RecordStatus } from '@alfresco/adf-hx-content-services/services';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
Chart.register(CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend);

@Component({
    selector: 'hxp-cicgov-column-chart',
    imports: [MatIconModule, MatButtonModule, BaseChartDirective, TranslatePipe],
    templateUrl: './column-chart.component.html',
    styleUrl: './column-chart.component.scss',
})
export class HxpCicGovColumnChartComponent {
    data = input<WidgetCategoryMetric[]>([]);
    primaryColor = input<string>(DEFAULT_STATUS_COLOR);
    tooltipLabel = input<string>('');
    edsId = input<string>('');
    status = input<string>('');
    navigationEnabled = input(true);
    navigationRoute = input<string>('/governance/records');
    navigationIdQueryParam = input<string>('categoryId');
    navigationQueryParamOverrides = input<Record<string, string | null | undefined> | null>(null);

    stackedCategoryChart = viewChild(BaseChartDirective);

    currentPage = 0;
    totalPages = 0;
    preparedData: WidgetCategoryMetric[] = [];

    readonly RECORD_STATUS = RecordStatus;

    private readonly desktopPageSize = 7;
    private readonly mobilePageSize = 3;
    private readonly mobileBreakpoint = '(max-width: 1024px)';
    private pageSize = this.desktopPageSize;
    private readonly translate = inject(TranslateService);
    private readonly breakpointObserver = inject(BreakpointObserver);
    private readonly chartDataService = inject(ColumnChartDataService);
    private readonly router = inject(Router);

    chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
    chartOptions: ChartOptions<'bar'> = {
        ...this.chartDataService.createChartOptions(this.translate.instant.bind(this.translate)),
        onClick: async (event, activeElements, chart) => {
            if (!this.navigationEnabled()) {
                return;
            }

            const resolvedActiveElements = this.resolveActiveElements(event, activeElements, chart, true);
            if (resolvedActiveElements.length > 0) {
                const clickedIndex = resolvedActiveElements[0].index;
                const start = this.currentPage * this.pageSize;
                const clickedItem = this.preparedData[start + clickedIndex];
                const hasValidSelection = !!clickedItem?.id && !!clickedItem.category?.trim();

                if (hasValidSelection) {
                    await this.navigateToPage(clickedItem);
                }
            }
        },
        onHover: (event, activeElements, chart) => {
            if (!event.native || !(event.native.target instanceof HTMLElement)) {
                return;
            }

            const target = event.native.target;
            if (!this.navigationEnabled()) {
                target.style.cursor = 'default';
                return;
            }

            const resolvedActiveElements = this.resolveActiveElements(event, activeElements, chart, false);
            target.style.cursor = resolvedActiveElements.length > 0 ? 'pointer' : 'default';
        },
    };

    constructor() {
        this.breakpointObserver
            .observe(this.mobileBreakpoint)
            .pipe(takeUntilDestroyed())
            .subscribe((state) => {
                const nextPageSize = state.matches ? this.mobilePageSize : this.desktopPageSize;
                if (nextPageSize === this.pageSize) {
                    return;
                }

                this.pageSize = nextPageSize;
                if (this.data()?.length) {
                    this.processData(false);
                }
            });

        effect(() => {
            const incoming = this.data();
            const color = this.primaryColor();

            if (incoming && color) {
                this.processData();
            }
        });
    }

    processData(resetPagination = true): void {
        const rawData = this.data() ?? [];

        this.preparedData = [...rawData];
        this.totalPages = Math.max(1, Math.ceil(this.preparedData.length / this.pageSize));
        this.currentPage = resetPagination ? 0 : Math.min(this.currentPage, this.totalPages - 1);

        this.updateDisplayedData();
    }

    updateDisplayedData(): void {
        const start = this.currentPage * this.pageSize;
        const slice = this.preparedData.slice(start, start + this.pageSize);
        this.updateXAxisTicks();

        this.chartData = this.chartDataService.createChartData(
            slice,
            this.pageSize,
            this.primaryColor(),
            this.tooltipLabel(),
            this.translate.instant.bind(this.translate)
        );

        const maxTotal = Math.max(...slice.map((data) => data.total ?? 0), 100);
        const yScale = this.chartOptions.scales?.['y'];
        if (yScale) {
            yScale.ticks = {
                ...yScale.ticks,
                stepSize: this.chartDataService.calculateYAxisInterval(maxTotal),
            };
            yScale.max = this.chartDataService.calculateYAxisMax(maxTotal);
        }

        this.stackedCategoryChart()?.update();
    }

    nextPage(): void {
        if (this.currentPage + 1 < this.totalPages) {
            this.currentPage++;
            this.updateDisplayedData();
        }
    }

    prevPage(): void {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.updateDisplayedData();
        }
    }

    chartAriaLabel(): string {
        const visibleMetrics = this.preparedData.slice(this.currentPage * this.pageSize, this.currentPage * this.pageSize + this.pageSize);
        const valuesSummary = visibleMetrics.map((metric) => `${metric.category}: ${metric.total}`).join(', ');

        const label = this.tooltipLabel().trim();
        const pageSummary =
            this.totalPages > 1
                ? ` ${this.translate.instant('GOVERNANCE.DASHBOARD.CHART_PAGE_SUMMARY', {
                      page: this.currentPage + 1,
                      total: this.totalPages,
                  })}.`
                : '';

        if (!valuesSummary) {
            return label;
        }

        return label ? `${label}. ${valuesSummary}.${pageSummary}`.trim() : `${valuesSummary}.${pageSummary}`.trim();
    }

    private async navigateToPage(category: WidgetCategoryMetric | null): Promise<void> {
        if (category) {
            const baseQueryParams = this.navigationQueryParamOverrides() ?? {
                eds: this.edsId(),
                status: this.status(),
            };

            await this.router.navigate([this.navigationRoute()], {
                queryParams: this.buildQueryParams(category.id, baseQueryParams),
            });
        }
    }

    private buildQueryParams(id: string, baseQueryParams: Record<string, string | null | undefined>): Record<string, string> {
        return Object.fromEntries(
            Object.entries({
                ...baseQueryParams,
                [this.navigationIdQueryParam()]: id,
            }).filter(([, value]) => typeof value === 'string' && value.length > 0)
        ) as Record<string, string>;
    }

    private resolveActiveElements(
        event: ChartEvent,
        activeElements: ActiveElement[],
        chart: Chart,
        intersect: boolean
    ): ActiveElement[] | InteractionItem[] {
        if (activeElements.length > 0) {
            return activeElements;
        }

        if (!event.native) {
            return [];
        }

        return chart.getElementsAtEventForMode(event.native, 'nearest', { intersect }, true);
    }

    private updateXAxisTicks(): void {
        const xScale = this.chartOptions.scales?.['x'];
        if (!xScale) {
            return;
        }

        xScale.ticks = {
            ...xScale.ticks,
            autoSkip: this.pageSize !== this.desktopPageSize,
            autoSkipPadding: 12,
            maxTicksLimit: this.pageSize,
        };
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { ChartConfiguration, ChartOptions, ChartDataset, TooltipItem, Scale } from 'chart.js';
import { TranslateFn, WidgetCategoryMetric } from '../definitions/dashboard.interface';

@Injectable({ providedIn: 'root' })
export class ColumnChartDataService {
    private static readonly SECONDARY_COLOR = '#D8D8DA';
    private static readonly BAR_THICKNESS = 35;
    private static readonly LABEL_MAX_LENGTH = 6;

    createChartOptions(translate: TranslateFn): ChartOptions<'bar'> {
        return {
            responsive: true,
            maintainAspectRatio: false,
            scales: this.getScalesConfig(),
            plugins: this.getPluginsConfig(translate),
        };
    }

    createChartData(
        preparedData: WidgetCategoryMetric[],
        pageSize: number,
        primaryColor: string,
        tooltipLabel: string,
        translate: TranslateFn
    ): ChartConfiguration<'bar'>['data'] {
        const pageData = this.padPageData(preparedData, pageSize);

        return {
            labels: pageData.map((data) => data.category ?? ''),
            datasets: [
                {
                    label: tooltipLabel,
                    stack: tooltipLabel,
                    barThickness: ColumnChartDataService.BAR_THICKNESS,
                    data: pageData.map((d) => d.value ?? 0),
                    backgroundColor: primaryColor,
                },
                {
                    label: translate('GOVERNANCE.DASHBOARD.TOTAL'),
                    stack: tooltipLabel,
                    barThickness: ColumnChartDataService.BAR_THICKNESS,
                    data: pageData.map((data) => Math.max(0, (data.total ?? 0) - (data.value ?? 0))),
                    backgroundColor: ColumnChartDataService.SECONDARY_COLOR,
                },
            ],
        };
    }

    calculateYAxisInterval(max: number): number {
        if (max <= 0) {
            return 1;
        }
        const raw = max / 6;
        const pow = Math.pow(10, Math.floor(Math.log10(raw)));
        return Math.ceil(raw / pow) * pow;
    }

    calculateYAxisMax(max: number): number {
        const interval = this.calculateYAxisInterval(max);
        return Math.ceil(max / interval) * interval + interval;
    }

    private getScalesConfig(): ChartOptions<'bar'>['scales'] {
        return {
            x: {
                stacked: true,
                grid: { display: false },
                ticks: {
                    maxRotation: 0,
                    minRotation: 0,
                    autoSkip: false,
                    callback: (function (serviceRef) {
                        return function (value: string | number) {
                            return serviceRef.truncateXAxisLabel(value, this);
                        };
                    })(this),
                },
            },
            y: {
                stacked: true,
                beginAtZero: true,
                max: undefined,
                ticks: { stepSize: 0 },
            },
        };
    }

    private truncateXAxisLabel(value: string | number, scale: Scale): string {
        const label = scale.getLabelForValue(Number(value));
        const maxLength = ColumnChartDataService.LABEL_MAX_LENGTH;
        return label.length > maxLength ? label.slice(0, maxLength) + '…' : label;
    }

    private getPluginsConfig(translate: TranslateFn): ChartOptions<'bar'>['plugins'] {
        return {
            tooltip: {
                callbacks: {
                    title: (items) => items[0]?.label || '',
                    label: (context) => this.getTooltipLabel(context, translate),
                },
            },
            legend: { display: false },
        };
    }

    private getTooltipLabel(context: TooltipItem<'bar'>, translate: TranslateFn): string {
        const datasetLabel: string = context.dataset.label || '';
        const dataIndex: number = context.dataIndex;
        const value: number = Number(context.parsed.y) || 0;
        const datasets: Array<ChartDataset<'bar', number[]>> = context.chart.data.datasets as Array<ChartDataset<'bar', number[]>>;
        let total = value;
        if (datasets?.length > 1) {
            const valueVal = Number(datasets[0].data?.[dataIndex]) || 0;
            const otherVal = Number(datasets[1].data?.[dataIndex]) || 0;
            total = valueVal + otherVal;
        }

        const totalLabel = translate('GOVERNANCE.DASHBOARD.TOTAL');
        if (datasetLabel === totalLabel) {
            return `${translate('GOVERNANCE.DASHBOARD.TOTAL_RECORDS')}: ${total.toLocaleString()}`;
        }

        if (!total || total === value) {
            return `${datasetLabel}: ${value.toLocaleString()}`;
        }

        const percent = Math.round((value / total) * 100);
        return `${datasetLabel}: ${percent}% (${value.toLocaleString()})`;
    }

    private padPageData(data: WidgetCategoryMetric[], targetLength: number): WidgetCategoryMetric[] {
        if (data.length > targetLength) {
            data.length = targetLength;
        }
        const paddingCount = targetLength - data.length;
        if (paddingCount > 0) {
            data.push(...Array.from({ length: paddingCount }, () => ({ id: '', category: '', value: 0, total: 0 })));
        }
        return data;
    }
}

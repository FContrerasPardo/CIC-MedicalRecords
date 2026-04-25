/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { WidgetCategoryMetric } from '../definitions/dashboard.interface';
import { ColumnChartDataService } from './column-chart-data.service';
import { ChartOptions } from 'chart.js';

describe('ColumnChartDataService', () => {
    let service: ColumnChartDataService;
    const translate = (key: string) => key;

    beforeEach(() => {
        service = new ColumnChartDataService();
    });

    describe('createChartOptions', () => {
        it('should create chart options with stacked axes and tooltip callbacks', () => {
            const options = service.createChartOptions(translate) as ChartOptions<'bar'>;

            expect(options.responsive).toBe(true);
            expect(options.maintainAspectRatio).toBe(false);

            expect(options.scales?.['x']?.stacked).toBe(true);
            expect(options.scales?.['y']?.stacked).toBe(true);

            expect(options.plugins?.legend?.display).toBe(false);
            expect(options.plugins?.tooltip?.callbacks?.label).toBeDefined();
            expect(options.plugins?.tooltip?.callbacks?.title).toBeDefined();
        });

        it('should truncate long x-axis labels to 6 characters plus ellipsis', () => {
            const options = service.createChartOptions(translate) as ChartOptions<'bar'>;
            const tickCallback = options.scales?.['x']?.ticks?.callback as unknown;

            expect(tickCallback).toBeDefined();

            const fakeScale = {
                getLabelForValue: (value: number) => (value === 0 ? 'Short' : 'VeryLongLabel'),
            };

            const callbackFn = tickCallback as (this: any, value: number) => string;

            const shortResult = callbackFn.call(fakeScale, 0);
            const longResult = callbackFn.call(fakeScale, 1);

            expect(shortResult).toBe('Short');
            expect(longResult).toBe('VeryLo…');
        });

        it('should show the category name as the tooltip title', () => {
            const options = service.createChartOptions(translate) as ChartOptions<'bar'>;
            const tooltipTitleCallback = options.plugins?.tooltip?.callbacks?.title as ((items: any[]) => string) | undefined;

            expect(tooltipTitleCallback).toBeDefined();

            const result = (tooltipTitleCallback as any)([{ label: 'Cat A' }]);
            expect(result).toBe('Cat A');
        });

        it('should format non-total series as percent when value is a subset of total', () => {
            const options = service.createChartOptions(translate) as ChartOptions<'bar'>;
            const labelCb = options.plugins?.tooltip?.callbacks?.label as ((ctx: any) => string) | undefined;

            expect(labelCb).toBeDefined();

            const datasets = [
                { label: 'Value', data: [40] },
                { label: 'GOVERNANCE.DASHBOARD.TOTAL', data: [60] },
            ];

            const ctx = {
                dataset: datasets[0],
                dataIndex: 0,
                parsed: { y: 40 },
                chart: { data: { datasets } },
            };

            const result = (labelCb as (ctx: any) => string)(ctx);

            expect(result).toBe('Value: 40% (40)');
        });

        it('should format non-total series as plain value when total equals value', () => {
            const options = service.createChartOptions(translate) as ChartOptions<'bar'>;
            const labelCb = options.plugins?.tooltip?.callbacks?.label as ((ctx: any) => string) | undefined;

            expect(labelCb).toBeDefined();

            const datasets = [
                { label: 'Value', data: [40] },
                { label: 'GOVERNANCE.DASHBOARD.TOTAL', data: [0] },
            ];

            const ctx = {
                dataset: datasets[0],
                dataIndex: 0,
                parsed: { y: 40 },
                chart: { data: { datasets } },
            };

            const result = (labelCb as (ctx: any) => string)(ctx);

            expect(result).toBe('Value: 40');
        });

        it('should show total records text for TOTAL series', () => {
            const options = service.createChartOptions(translate) as ChartOptions<'bar'>;
            const labelCb = options.plugins?.tooltip?.callbacks?.label as ((ctx: any) => string) | undefined;

            expect(labelCb).toBeDefined();

            const datasets = [
                { label: 'Value', data: [60] },
                { label: 'GOVERNANCE.DASHBOARD.TOTAL', data: [40] },
            ];

            const ctx = {
                dataset: datasets[1],
                dataIndex: 0,
                parsed: { y: 40 },
                chart: { data: { datasets } },
            };

            const result = (labelCb as (ctx: any) => string)(ctx);

            expect(result).toBe('GOVERNANCE.DASHBOARD.TOTAL_RECORDS: 100');
        });
    });

    describe('createChartData', () => {
        const primaryColor = '#123456';

        it('should pad chart labels and series to the requested page size', () => {
            const preparedData: WidgetCategoryMetric[] = [
                { id: 'A', category: 'A', value: 10, total: 30 },
                { id: 'B', category: 'B', value: 5, total: 20 },
            ];

            const pageSize = 5;
            const tooltipLabel = 'My Value';

            const data = service.createChartData(preparedData, pageSize, primaryColor, tooltipLabel, translate);

            expect(data.labels).toEqual(['A', 'B', '', '', '']);
            expect(data.labels?.length).toBe(pageSize);

            const [valueDataset, totalDataset] = data.datasets;

            expect(valueDataset.label).toBe(tooltipLabel);
            expect(valueDataset.data).toEqual([10, 5, 0, 0, 0]);
            expect(valueDataset.backgroundColor).toBe(primaryColor);

            expect(totalDataset.label).toBe('GOVERNANCE.DASHBOARD.TOTAL');
            expect(totalDataset.data).toEqual([20, 15, 0, 0, 0]);
            expect(totalDataset.backgroundColor).toBe('#D8D8DA');
        });

        it('should cap the page to the requested size when more data is provided', () => {
            const preparedData: WidgetCategoryMetric[] = [
                { id: 'A', category: 'A', value: 1, total: 1 },
                { id: 'B', category: 'B', value: 2, total: 2 },
                { id: 'C', category: 'C', value: 3, total: 3 },
            ];

            const data = service.createChartData(preparedData, 2, primaryColor, 'Value', translate);

            expect(data.labels).toEqual(['A', 'B']);
            const [valueDataset] = data.datasets;
            expect(valueDataset.data).toEqual([1, 2]);
        });

        it('should avoid negative remaining totals when value exceeds total', () => {
            const preparedData: WidgetCategoryMetric[] = [{ id: 'A', category: 'A', value: 50, total: 30 }];

            const data = service.createChartData(preparedData, 1, primaryColor, 'Value', translate);

            const [, totalDataset] = data.datasets;
            expect(totalDataset.data).toEqual([0]);
        });

        it('should keep bar thickness consistent across both datasets', () => {
            const preparedData: WidgetCategoryMetric[] = [{ id: 'A', category: 'A', value: 10, total: 20 }];

            const data = service.createChartData(preparedData, 1, primaryColor, 'Value', translate);

            const [valueDataset, totalDataset] = data.datasets as any[];
            expect(valueDataset.barThickness).toBe(35);
            expect(totalDataset.barThickness).toBe(35);
        });
    });

    describe('Y-axis calculations', () => {
        it('should calculate a non-zero interval even when max is zero or negative', () => {
            expect(service.calculateYAxisInterval(0)).toBe(1);
            expect(service.calculateYAxisInterval(-10)).toBe(1);
        });

        it('should calculate a rounded interval based on the max value', () => {
            const interval = service.calculateYAxisInterval(95);
            expect(interval).toBe(20);
        });

        it('should return the next multiple of interval above max plus one extra interval', () => {
            const result = service.calculateYAxisMax(95);
            expect(result).toBe(120);
        });
    });
});

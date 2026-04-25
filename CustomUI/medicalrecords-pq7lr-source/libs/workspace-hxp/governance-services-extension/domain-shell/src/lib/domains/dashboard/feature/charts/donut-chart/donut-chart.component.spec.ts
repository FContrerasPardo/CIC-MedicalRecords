/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HxpCicGovDonutChartComponent } from './donut-chart.component';
import { RecordHealthStatusItem } from '../../../definitions/dashboard.interface';
import { TooltipItem } from 'chart.js';
import { STATUS_LABEL_MAP } from '../../../../../shared/ui/search/filters/status/status-options.data';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';

jest.mock('ng2-charts', () => {
    const angularCore = jest.requireActual('@angular/core');
    @angularCore.Directive({
        selector: 'canvas[baseChart]',
    })
    class MockBaseChartDirective {
        @angularCore.Input() data: unknown;
        @angularCore.Input() type: unknown;
        @angularCore.Input() options: unknown;
        @angularCore.Input() plugins: unknown;
        update = jest.fn();
    }

    return {
        BaseChartDirective: MockBaseChartDirective,
    };
});

describe('HxpCicGovDonutChartComponent', () => {
    let fixture: ComponentFixture<HxpCicGovDonutChartComponent>;
    let component: HxpCicGovDonutChartComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HxpCicGovDonutChartComponent, NoopTranslateModule],
        });

        fixture = TestBed.createComponent(HxpCicGovDonutChartComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    function setInputs(values: Partial<{ data: RecordHealthStatusItem[]; heading: string; edsId?: string; queryParams?: Record<string, string> }>) {
        for (const key of Object.keys(values) as Array<keyof typeof values>) {
            const value = values[key];
            if (value) {
                fixture.componentRef.setInput(key, value);
            }
        }

        fixture.detectChanges();
    }

    it('should pass accessibility checks', async () => {
        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual([]);
    });

    it('should build chartData from input data', () => {
        const inputData: RecordHealthStatusItem[] = [
            { label: 'Under Retention', value: 80, color: '#1111ff' } as RecordHealthStatusItem,
            { label: 'Ready', value: 20, color: '#22aa88' } as RecordHealthStatusItem,
        ];

        setInputs({ data: inputData });

        const { labels, datasets } = component.chartData;
        expect(labels).toEqual(['Under Retention', 'Ready']);

        expect(datasets.length).toBe(1);
        const dataset = datasets[0];

        expect(dataset.data).toEqual([80, 20]);
        expect(dataset.backgroundColor).toEqual(['#1111ff', '#22aa88']);
        expect(dataset.borderColor).toBe('#FFFFFF');
        expect(dataset.borderWidth).toBe(2);
        expect(dataset.hoverOffset).toBe(0);
    });

    it('should format tooltip label with percentage and value', () => {
        const inputData: RecordHealthStatusItem[] = [
            { label: 'Under Retention', value: 60, color: '#1111ff' } as RecordHealthStatusItem,
            { label: 'Ready', value: 40, color: '#22aa88' } as RecordHealthStatusItem,
        ];

        setInputs({ data: inputData });

        const plugins = component.chartOptions?.plugins;
        expect(plugins).toBeDefined();

        const tooltip = plugins?.tooltip;
        expect(tooltip).toBeDefined();

        const callbacks = tooltip?.callbacks;
        expect(callbacks).toBeDefined();
        const labelCallback = callbacks && (callbacks.label as (ctx: TooltipItem<'doughnut'>) => string);

        const ctx = {
            label: 'Under Retention',
            parsed: 60,
            chart: { data: component.chartData },
        };

        let result: string | undefined;
        if (typeof labelCallback === 'function') {
            result = labelCallback(ctx as TooltipItem<'doughnut'>);
        }

        expect(result).toBe('Under Retention: 60% (60)');
    });

    it('should navigate with selected category and status when a donut segment is clicked', async () => {
        const inputData: RecordHealthStatusItem[] = [{ label: 'Under Retention', value: 80, color: '#1111ff' } as RecordHealthStatusItem];

        setInputs({
            data: inputData,
            edsId: 'EDS-123',
            queryParams: { eds: 'EDS-123', categoryId: 'C#2' },
        });

        const router = { navigate: jest.fn() };
        (component as any).router = router;

        const activeElements = [{ index: 0 }] as any;
        const chartMock = {
            data: {
                labels: ['Under Retention'],
            },
        } as any;

        component.chartOptions?.onClick?.({} as any, activeElements, chartMock);
        const expectedStatusKey = Object.entries(STATUS_LABEL_MAP).find(([, value]) => value === 'Under Retention')?.[0] ?? 'UnderRetention';

        expect(router.navigate).toHaveBeenCalledWith(['/governance/records'], {
            queryParams: {
                eds: 'EDS-123',
                categoryId: 'C#2',
                status: expectedStatusKey,
            },
        });
    });
});

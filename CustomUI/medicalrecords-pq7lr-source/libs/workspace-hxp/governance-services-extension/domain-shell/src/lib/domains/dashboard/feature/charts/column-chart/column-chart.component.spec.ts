/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HxpCicGovColumnChartComponent } from './column-chart.component';
import { WidgetCategoryMetric } from '../../../definitions/dashboard.interface';
import { ColumnChartDataService } from '../../../services/column-chart-data.service';
import { TranslateService } from '@ngx-translate/core';
import { ChartConfiguration, LinearScaleOptions } from 'chart.js';
import { of, Subject } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { provideRouter } from '@angular/router';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

jest.mock('ng2-charts', () => {
    const angularCore = jest.requireActual('@angular/core');
    @angularCore.Directive({
        selector: 'canvas[baseChart]',
    })
    class MockBaseChartDirective {
        @angularCore.Input() data: any;
        @angularCore.Input() options: any;
        @angularCore.Input() type: any;
        update = jest.fn();
    }

    return {
        BaseChartDirective: MockBaseChartDirective,
    };
});

describe('HxpCicGovColumnChartComponent', () => {
    let component: HxpCicGovColumnChartComponent;
    let fixture: ComponentFixture<HxpCicGovColumnChartComponent>;
    let mockChartDataService: jest.Mocked<ColumnChartDataService>;
    let breakpointState$: Subject<{ matches: boolean; breakpoints: Record<string, boolean> }>;
    let breakpointObserverMock: { observe: jest.Mock };
    let translateServiceMock: {
        instant: (key: string, params?: { page?: number; total?: number }) => string;
        get: (key: string) => any;
        onTranslationChange: Subject<any>;
        onLangChange: Subject<any>;
        onFallbackLangChange: Subject<any>;
    };

    const mockData: WidgetCategoryMetric[] = [
        { category: 'A', total: 10 } as WidgetCategoryMetric,
        { category: 'B', total: 30 } as WidgetCategoryMetric,
        { category: 'C', total: 20 } as WidgetCategoryMetric,
    ];

    beforeEach(() => {
        const baseChartOptions: ChartConfiguration<'bar'>['options'] = {
            responsive: true,
            scales: {
                y: {
                    ticks: {},
                    max: 0,
                },
            },
        };

        mockChartDataService = {
            createChartOptions: jest.fn().mockReturnValue(baseChartOptions),
            createChartData: jest.fn().mockReturnValue({
                labels: [],
                datasets: [],
            }),
            calculateYAxisInterval: jest.fn().mockReturnValue(10),
            calculateYAxisMax: jest.fn().mockReturnValue(100),
        } as unknown as jest.Mocked<ColumnChartDataService>;

        breakpointState$ = new Subject<{ matches: boolean; breakpoints: Record<string, boolean> }>();
        breakpointObserverMock = {
            observe: jest.fn().mockReturnValue(breakpointState$.asObservable()),
        };

        translateServiceMock = {
            instant: (key: string, params?: { page?: number; total?: number }) =>
                key === 'GOVERNANCE.DASHBOARD.CHART_PAGE_SUMMARY' ? `Page ${params?.page} of ${params?.total}` : key,
            get: (key: string) => of(key),
            onTranslationChange: new Subject(),
            onLangChange: new Subject(),
            onFallbackLangChange: new Subject(),
        };

        TestBed.configureTestingModule({
            imports: [HxpCicGovColumnChartComponent, MatIconTestingModule],
            providers: [
                provideRouter([]),
                { provide: ColumnChartDataService, useValue: mockChartDataService },
                { provide: TranslateService, useValue: translateServiceMock },
                { provide: BreakpointObserver, useValue: breakpointObserverMock },
            ],
        });

        fixture = TestBed.createComponent(HxpCicGovColumnChartComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    function setInputs(
        values: Partial<{
            data: WidgetCategoryMetric[];
            primaryColor: string;
            tooltipLabel: string;
            edsId: string;
            status: string;
            navigationEnabled: boolean;
            navigationRoute: string;
            navigationIdQueryParam: string;
            navigationQueryParamOverrides: Record<string, string | null | undefined> | null;
        }>
    ) {
        for (const [key, value] of Object.entries(values)) {
            if (value !== undefined) {
                fixture.componentRef.setInput(key as keyof typeof values, value);
            }
        }
        fixture.detectChanges();
    }

    it('should pass accessibility checks', async () => {
        setInputs({
            data: mockData,
            primaryColor: '#123456',
            tooltipLabel: 'Under Retention',
        });

        component.processData();
        fixture.detectChanges();

        const res = await a11yReport(fixture.nativeElement);

        expect(res?.violations).toEqual([]);
    });

    it('should expose a descriptive aria-label for the visible chart data', () => {
        setInputs({
            data: mockData,
            primaryColor: '#123456',
            tooltipLabel: 'Under Retention',
        });

        component.processData();

        expect(component.chartAriaLabel()).toBe('Under Retention. A: 10, B: 30, C: 20.');
    });

    it('should translate the paginated aria-label summary', () => {
        const pagedData: WidgetCategoryMetric[] = Array.from({ length: 8 }, (_, index) => ({
            category: `Category ${index + 1}`,
            total: index + 1,
        })) as WidgetCategoryMetric[];

        setInputs({
            data: pagedData,
            primaryColor: '#123456',
            tooltipLabel: 'Under Retention',
        });

        component.processData();

        expect(component.chartAriaLabel()).toContain('Page 1 of 2');
    });

    it('should process data and keep original order', () => {
        setInputs({
            data: mockData,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
        });

        component.processData();

        // No sorting anymore: keep original order [10, 30, 20]
        expect(component.preparedData.map((d) => d.total)).toEqual([10, 30, 20]);
        expect(component.totalPages).toBe(1);
        expect(mockChartDataService.createChartData).toHaveBeenCalled();
    });

    it('should update pagination and call updateDisplayedData on next/prev page', () => {
        const bigData: WidgetCategoryMetric[] = [...Array.from({ length: 15 }).keys()].map((index) => ({
            id: `id-${index}`,
            category: `Cat ${index}`,
            total: index,
            value: index,
        }));

        setInputs({
            data: bigData,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
        });

        const updateSpy = jest.spyOn(component, 'updateDisplayedData');
        component.processData();

        expect(component.totalPages).toBeGreaterThan(1);
        expect(component.currentPage).toBe(0);
        expect(updateSpy).toHaveBeenCalledTimes(1);

        component.nextPage();
        expect(component.currentPage).toBe(1);
        expect(updateSpy).toHaveBeenCalledTimes(2);

        component.prevPage();
        expect(component.currentPage).toBe(0);
        expect(updateSpy).toHaveBeenCalledTimes(3);
    });

    it('should react to input changes via effect and call processData', async () => {
        const processSpy = jest.spyOn(component, 'processData');

        setInputs({
            data: mockData,
            primaryColor: '#abcdef',
        });

        await fixture.whenStable();

        expect(processSpy).toHaveBeenCalled();
    });

    it('should switch to mobile page size and reprocess data on breakpoint change', () => {
        setInputs({
            data: mockData,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
        });

        const processSpy = jest.spyOn(component, 'processData');
        processSpy.mockClear();

        breakpointState$.next({ matches: true, breakpoints: {} });

        expect((component as any).pageSize).toBe(3);
        expect(processSpy).toHaveBeenCalledWith(false);
    });

    it('should configure y-axis using ColumnChartDataService values', () => {
        setInputs({
            data: mockData,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
        });

        component.processData();

        expect(mockChartDataService.calculateYAxisInterval).toHaveBeenCalled();
        expect(mockChartDataService.calculateYAxisMax).toHaveBeenCalled();

        const yScale = component.chartOptions.scales?.['y'] as LinearScaleOptions;

        expect(yScale.max).toBe(100);
        expect(yScale.ticks.stepSize).toBe(10);
    });

    it('should navigate to records page with correct query params when bar is clicked', async () => {
        const data = [
            { id: 'id-a', category: 'A', total: 10, value: 6 },
            { id: 'id-b', category: 'B', total: 30, value: 12 }, // <- will be clicked
            { id: 'id-c', category: 'C', total: 20, value: 9 },
        ] as any;

        setInputs({
            data,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
            edsId: 'EDS-123',
            status: 'Ready',
        });

        const router = { navigate: jest.fn().mockResolvedValue(true) };
        (component as any).router = router;

        component.processData();

        const activeElements = [{ index: 1 }] as any;

        await component.chartOptions.onClick?.({} as any, activeElements, {} as any);

        expect(router.navigate).toHaveBeenCalledWith(['/governance/records'], {
            queryParams: {
                eds: 'EDS-123',
                categoryId: 'id-b',
                status: 'Ready',
            },
        });
    });

    it('should navigate when clicked bar total equals value', async () => {
        const data = [
            { id: 'id-a', category: 'A', total: 10, value: 10 }, // <- will be clicked
            { id: 'id-b', category: 'B', total: 30, value: 12 },
            { id: 'id-c', category: 'C', total: 20, value: 9 },
        ] as any;

        setInputs({
            data,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
            edsId: 'EDS-123',
            status: 'Ready',
        });

        const router = { navigate: jest.fn().mockResolvedValue(true) };
        (component as any).router = router;

        component.processData();

        const activeElements = [{ index: 0 }] as any;
        await component.chartOptions.onClick?.({} as any, activeElements, {} as any);

        expect(router.navigate).toHaveBeenCalledWith(['/governance/records'], {
            queryParams: {
                eds: 'EDS-123',
                categoryId: 'id-a',
                status: 'Ready',
            },
        });
    });

    it('should not navigate when clicked bar is missing a valid category id pair', async () => {
        const metricSeries = [
            { id: 'id-a', category: '', total: 10, value: 4 }, // <- will be clicked
            { id: 'id-b', category: 'B', total: 30, value: 12 },
            { id: 'id-c', category: 'C', total: 20, value: 9 },
        ] as any;

        setInputs({
            data: metricSeries,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
            edsId: 'EDS-123',
            status: 'Ready',
        });

        const router = { navigate: jest.fn().mockResolvedValue(true) };
        (component as any).router = router;

        component.processData();

        const activeElements = [{ index: 0 }] as any;
        await component.chartOptions.onClick?.({} as any, activeElements, {} as any);

        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when navigation is disabled', async () => {
        const metricSeries = [
            { id: 'id-a', category: 'A', total: 10, value: 4 },
            { id: 'id-b', category: 'B', total: 30, value: 12 },
        ] as any;

        setInputs({
            data: metricSeries,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
            edsId: 'EDS-123',
            status: 'OnHold',
            navigationEnabled: false,
        });

        const router = { navigate: jest.fn().mockResolvedValue(true) };
        (component as any).router = router;

        component.processData();

        const activeElements = [{ index: 0 }] as any;
        await component.chartOptions.onClick?.({} as any, activeElements, {} as any);

        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate using a custom route and id query param when configured', async () => {
        const metricSeries = [
            { id: 'legal-case-1', category: 'Case A', total: 10, value: 4 },
            { id: 'legal-case-2', category: 'Case B', total: 30, value: 12 },
        ] as any;

        setInputs({
            data: metricSeries,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
            navigationRoute: '/governance/legal-holds',
            navigationIdQueryParam: 'legalCaseId',
            navigationQueryParamOverrides: {},
        });

        const router = { navigate: jest.fn().mockResolvedValue(true) };
        (component as any).router = router;

        component.processData();

        const activeElements = [{ index: 1 }] as any;
        await component.chartOptions.onClick?.({} as any, activeElements, {} as any);

        expect(router.navigate).toHaveBeenCalledWith(['/governance/legal-holds'], {
            queryParams: {
                legalCaseId: 'legal-case-2',
            },
        });
    });

    it('should fall back to chart hit testing when active elements are empty', async () => {
        const metricSeries = [
            { id: 'legal-case-1', category: 'Case A', total: 10, value: 4 },
            { id: 'legal-case-2', category: 'Case B', total: 30, value: 12 },
        ] as any;

        setInputs({
            data: metricSeries,
            primaryColor: '#123456',
            tooltipLabel: 'tooltip',
            navigationRoute: '/governance/legal-holds',
            navigationIdQueryParam: 'legalCaseId',
            navigationQueryParamOverrides: {},
        });

        const router = { navigate: jest.fn().mockResolvedValue(true) };
        (component as any).router = router;

        component.processData();

        const chart = {
            getElementsAtEventForMode: jest.fn().mockReturnValue([{ index: 0 }]),
        };

        await component.chartOptions.onClick?.({ native: {} } as any, [], chart as any);

        expect(chart.getElementsAtEventForMode).toHaveBeenCalledWith({}, 'nearest', { intersect: true }, true);
        expect(router.navigate).toHaveBeenCalledWith(['/governance/legal-holds'], {
            queryParams: {
                legalCaseId: 'legal-case-1',
            },
        });
    });

    it('should ignore hover events without an HTML target', () => {
        expect(() => component.chartOptions.onHover?.({ native: undefined } as any, [], {} as any)).not.toThrow();
        expect(() => component.chartOptions.onHover?.({ native: { target: null } } as any, [], {} as any)).not.toThrow();
    });
});

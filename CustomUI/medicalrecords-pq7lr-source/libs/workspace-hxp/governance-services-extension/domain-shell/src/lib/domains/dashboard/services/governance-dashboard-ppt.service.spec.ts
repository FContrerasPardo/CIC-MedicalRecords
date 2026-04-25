/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { GovernanceDashboardPptService } from './governance-dashboard-ppt.service';
import {
    ALL_WIDGET_IDS,
    DEFAULT_STATUS_COLOR,
    STATUS_COLOR_MAP,
    WIDGET_ID,
    WIDGET_STATUS_MAP,
    WidgetId,
} from '../definitions/dashboard.constants';
import { WidgetDataMap } from '../definitions/dashboard.interface';
import { PPT_I18N } from '../definitions/dashboard-ppt-translations.constants';
import pptxgen from 'pptxgenjs';

const mockSlide = () => ({
    addText: jest.fn(),
    addShape: jest.fn(),
    addChart: jest.fn(),
    addTable: jest.fn(),
    addImage: jest.fn(),
});

jest.mock('pptxgenjs', () => {
    const PptxGenMock = jest.fn().mockImplementation(() => {
        const slides: any[] = [];
        const pptx = {
            addSlide: jest.fn(() => {
                const s = mockSlide();
                slides.push(s);
                return s;
            }),
            writeFile: jest.fn(() => Promise.resolve()),
            ShapeType: { rect: 'rect', roundRect: 'roundRect' },
            ChartType: { doughnut: 'doughnut', bar: 'bar' },
            _layout: { width: 13.333, height: 7.5 },
            __slides: slides,
        };
        return pptx;
    });

    return { __esModule: true, default: PptxGenMock };
});

describe('GovernanceDashboardPptService', () => {
    let service: GovernanceDashboardPptService;

    const t = (key: string) => `t:${key}`;

    const translateMock: Partial<TranslateService> = {
        get: jest.fn((keys: string[] | string) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            return of(Object.fromEntries(arr.map((k) => [k, t(k)])));
        }),
    };

    const buildInput = (snapshot: Partial<WidgetDataMap>, widgetOrder: WidgetId[] = ALL_WIDGET_IDS as WidgetId[]) => ({
        snapshot,
        widgetOrder,
        fileName: 'Governance_Dashboard.pptx',
    });

    beforeEach(() => {
        jest.clearAllMocks();

        TestBed.configureTestingModule({
            providers: [GovernanceDashboardPptService, { provide: TranslateService, useValue: translateMock }],
        });

        service = TestBed.inject(GovernanceDashboardPptService);
    });

    it('should create an intro slide and export the PPT file', async () => {
        const toLocaleDateStringSpy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('01/01/2026');

        try {
            await service.generateDashboardPpt(buildInput({}));

            expect(pptxgen).toHaveBeenCalledTimes(1);

            const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;

            expect(pptxInstance.addSlide).toHaveBeenCalledTimes(1);
            expect(pptxInstance.writeFile).toHaveBeenCalledWith({ fileName: 'Governance_Dashboard.pptx' });

            const introSlide = pptxInstance.addSlide.mock.results[0].value;

            expect(introSlide.addImage).toHaveBeenCalledWith(
                expect.objectContaining({
                    path: 'assets/ppt/cover-hyland.png',
                    x: 0,
                    y: 0,
                })
            );

            expect(introSlide.addText).toHaveBeenCalledWith(
                t(PPT_I18N.INTRO.TITLE),
                expect.objectContaining({ fontSize: 34, bold: true, color: 'FFFFFF' })
            );

            expect(introSlide.addText).toHaveBeenCalledWith(
                t(PPT_I18N.INTRO.PRODUCT_LINE),
                expect.objectContaining({ fontSize: 16, color: 'FFFFFF' })
            );

            expect(introSlide.addText).toHaveBeenCalledWith(
                '01/01/2026',
                expect.objectContaining({ fontSize: 14, color: '6B6B6B' })
            );
        } finally {
            toLocaleDateStringSpy.mockRestore();
        }
    });

    it('should add a record health slide when record health data exists', async () => {
        const snapshot: Partial<WidgetDataMap> = {
            [WIDGET_ID.RecordHealth]: {
                total: 100,
                breakdown: [
                    { status: 'Active' as any, value: 60 },
                    { status: 'Ready' as any, value: 40 },
                ],
            } as any,
        };

        await service.generateDashboardPpt(buildInput(snapshot, [WIDGET_ID.RecordHealth]));

        const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;

        expect(pptxInstance.addSlide).toHaveBeenCalledTimes(2);

        const rhSlide = pptxInstance.addSlide.mock.results[1].value;

        expect(rhSlide.addText).toHaveBeenCalledWith(
            t(PPT_I18N.RECORD_HEALTH.TITLE),
            expect.objectContaining({ fontSize: 28, bold: true })
        );

        expect(rhSlide.addChart).toHaveBeenCalledWith(
            pptxInstance.ChartType.doughnut,
            expect.any(Array),
            expect.objectContaining({ holeSize: 65, showLegend: false })
        );
    });

    it('should derive total from breakdown when total is missing', async () => {
        const snapshot: Partial<WidgetDataMap> = {
            [WIDGET_ID.RecordHealth]: {
                breakdown: [
                    { status: 'Active' as any, value: 10 },
                    { status: 'Ready' as any, value: 5 },
                ],
            } as any,
        };

        await service.generateDashboardPpt(buildInput(snapshot, [WIDGET_ID.RecordHealth]));

        const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;
        const rhSlide = pptxInstance.addSlide.mock.results[1].value;

        expect(rhSlide.addText).toHaveBeenCalledWith(
            (15).toLocaleString(),
            expect.objectContaining({ fontSize: 38, bold: true })
        );
    });

    it('should add a category slide with table and stacked bar chart when widget series exists', async () => {
        const snapshot: Partial<WidgetDataMap> = {
            [WIDGET_ID.ActiveRetention]: {
                series: [
                    { category: 'Cat A', total: 10, value: 6 },
                    { category: 'Cat B', total: 20, value: 12 },
                ],
            } as any,
        };

        await service.generateDashboardPpt(buildInput(snapshot, [WIDGET_ID.ActiveRetention]));

        const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;

        expect(pptxInstance.addSlide).toHaveBeenCalledTimes(2);

        const slide = pptxInstance.addSlide.mock.results[1].value;

        expect(slide.addText).toHaveBeenCalledWith(
            t(PPT_I18N.WIDGETS.ACTIVE_RETENTION.TITLE),
            expect.objectContaining({ fontSize: 28, bold: true })
        );

        expect(slide.addTable).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({ w: 5.1, colW: [2.9, 0.9, 1.3] })
        );

        expect(slide.addChart).toHaveBeenCalledWith(
            pptxInstance.ChartType.bar,
            expect.any(Array),
            expect.objectContaining({ barGrouping: 'stacked', barDir: 'col' })
        );
    });

    it('should render legal hold table without total column and with Legal Case Name header', async () => {
        const snapshot: Partial<WidgetDataMap> = {
            [WIDGET_ID.LegalHoldSummary]: {
                series: [{ id: 'LH-1', category: 'Case A', total: 5, value: 5 }],
            } as any,
        };

        await service.generateDashboardPpt(buildInput(snapshot, [WIDGET_ID.LegalHoldSummary]));

        const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;
        const slide = pptxInstance.addSlide.mock.results[1].value;

        const tableCall = (slide.addTable as jest.Mock).mock.calls[0];
        expect(tableCall).toBeTruthy();

        const tableRows = tableCall[0] as any[];
        const tableOptions = tableCall[1];

        expect(tableRows[0][0]).toEqual(expect.objectContaining({ text: t(PPT_I18N.COMMON.TABLE.LEGAL_CASE_NAME) }));
        expect(tableOptions).toEqual(expect.objectContaining({ colW: [3.6, 1.5] }));

        const barCall = (slide.addChart as jest.Mock).mock.calls.find((call) => call[0] === pptxInstance.ChartType.bar);
        expect(barCall).toBeTruthy();
        expect(barCall?.[1]).toHaveLength(1);

        const expectedPrimary = (STATUS_COLOR_MAP as any)[(WIDGET_STATUS_MAP as any)[WIDGET_ID.LegalHoldSummary]] ?? DEFAULT_STATUS_COLOR;
        expect(barCall?.[2]).toEqual(expect.objectContaining({ chartColors: [expectedPrimary] }));

        expect(slide.addText).not.toHaveBeenCalledWith(t(PPT_I18N.COMMON.LEGEND.TOTAL), expect.any(Object));
    });

    it('should apply widget primary status color for category bar series and neutral for remainder', async () => {
        const widgetId = WIDGET_ID.ActiveRetention;

        const snapshot: Partial<WidgetDataMap> = {
            [widgetId]: {
                series: [{ category: 'Cat A', total: 10, value: 6 }],
            } as any,
        };

        await service.generateDashboardPpt(buildInput(snapshot, [widgetId]));

        const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;
        const slide = pptxInstance.addSlide.mock.results[1].value;

        const expectedPrimary = (STATUS_COLOR_MAP as any)[(WIDGET_STATUS_MAP as any)[widgetId]] ?? DEFAULT_STATUS_COLOR;

        const barCall = (slide.addChart as jest.Mock).mock.calls.find((c) => c[0] === pptxInstance.ChartType.bar);
        expect(barCall).toBeTruthy();

        const options = barCall?.[2];
        expect(options.chartColors[0]).toBe(expectedPrimary);
        expect(options.chartColors[1]).toBe('D0D0D0');
    });

    it('should not add widget slides when snapshot contains no widget data', async () => {
        await service.generateDashboardPpt(buildInput({}));

        const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;

        expect(pptxInstance.addSlide).toHaveBeenCalledTimes(1); // intro only
    });

    it('should not create a slide for a category widget when series is empty', async () => {
        const snapshot: Partial<WidgetDataMap> = {
            [WIDGET_ID.ActiveRetention]: { series: [] } as any,
        };

        await service.generateDashboardPpt(buildInput(snapshot, [WIDGET_ID.ActiveRetention]));

        const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;

        expect(pptxInstance.addSlide).toHaveBeenCalledTimes(1); // intro only
    });

    it('should respect widgetOrder when generating slides', async () => {
        const snapshot: Partial<WidgetDataMap> = {
            [WIDGET_ID.ActiveRetention]: { series: [{ category: 'Cat', total: 10, value: 4 }] } as any,
            [WIDGET_ID.DispositionTracker]: { series: [{ category: 'Cat', total: 10, value: 1 }] } as any,
        };

        const customOrder: WidgetId[] = [WIDGET_ID.DispositionTracker, WIDGET_ID.ActiveRetention];

        await service.generateDashboardPpt({ snapshot, widgetOrder: customOrder, fileName: 'Governance_Dashboard.pptx' });

        const pptxInstance = (pptxgen as unknown as jest.Mock).mock.results[0].value;

        expect(pptxInstance.addSlide).toHaveBeenCalledTimes(3);

        const firstWidgetSlide = pptxInstance.addSlide.mock.results[1].value;
        const secondWidgetSlide = pptxInstance.addSlide.mock.results[2].value;

        expect(firstWidgetSlide.addText).toHaveBeenCalledWith(
            t(PPT_I18N.WIDGETS.DISPOSITION_TRACKER.TITLE),
            expect.objectContaining({ fontSize: 28, bold: true })
        );

        expect(secondWidgetSlide.addText).toHaveBeenCalledWith(
            t(PPT_I18N.WIDGETS.ACTIVE_RETENTION.TITLE),
            expect.objectContaining({ fontSize: 28, bold: true })
        );
    });

    it('should request ppt translation keys via TranslateService.get()', async () => {
        await service.generateDashboardPpt(buildInput({}));

        expect((translateMock.get as jest.Mock)).toHaveBeenCalledTimes(1);

        const keysArg = (translateMock.get as jest.Mock).mock.calls[0][0];
        expect(Array.isArray(keysArg)).toBe(true);

        expect(keysArg).toEqual(
            expect.arrayContaining([
                PPT_I18N.INTRO.TITLE,
                PPT_I18N.RECORD_HEALTH.TITLE,
                PPT_I18N.COMMON.CATEGORY_OVERVIEW,
                PPT_I18N.WIDGETS.ACTIVE_RETENTION.TITLE,
                PPT_I18N.COMMON.TABLE.LEGAL_CASE_NAME,
            ])
        );
    });
});

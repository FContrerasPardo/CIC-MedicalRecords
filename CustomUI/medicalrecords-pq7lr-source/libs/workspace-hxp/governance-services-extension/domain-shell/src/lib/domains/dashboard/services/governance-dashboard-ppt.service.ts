/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, inject } from '@angular/core';
import pptxgen from 'pptxgenjs';
import { firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DEFAULT_STATUS_COLOR, STATUS_COLOR_MAP, WIDGET_ID, WIDGET_STATUS_MAP, WidgetId } from '../definitions/dashboard.constants';
import { GovernanceDashboardPptExportInput, PptStrings, RecordHealthData, WidgetCategoryData } from '../definitions/dashboard.interface';
import { PPT_I18N } from '../definitions/dashboard-ppt-translations.constants';

@Injectable({ providedIn: 'root' })
export class GovernanceDashboardPptService {
    private readonly translate = inject(TranslateService);

    async generateDashboardPpt(input: GovernanceDashboardPptExportInput): Promise<void> {
        const { snapshot, widgetOrder, fileName = 'Governance_Dashboard.pptx' } = input;

        const pptx = new pptxgen();
        const pptText = await this.loadPptTranslations();

        this.addIntroSlide(pptx, pptText);

        for (const widgetId of widgetOrder) {
            const data = snapshot[widgetId];
            if (!data) {
                continue;
            }

            if (widgetId === WIDGET_ID.RecordHealth) {
                this.addRecordHealthSlide(pptx, data as RecordHealthData, pptText);
                continue;
            }

            const params = this.getCategorySlideParams(widgetId, data as WidgetCategoryData, pptText);
            if (!params) {
                continue;
            }

            this.addCategoryStatusSlide(pptx, params, pptText);
        }

        await pptx.writeFile({ fileName });
    }

    private addIntroSlide(pptx: pptxgen, pptText: PptStrings): void {
        const slide = pptx.addSlide();

        const { w, h } = this.getSlideSize(pptx);

        slide.addImage({
            path: 'assets/ppt/cover-hyland.png',
            x: 0,
            y: 0,
            w,
            h,
        });

        slide.addText(pptText[PPT_I18N.INTRO.TITLE], {
            x: 0.9,
            y: 2.2,
            w: 11.5,
            h: 0.7,
            fontSize: 34,
            bold: true,
            color: 'FFFFFF',
        });

        slide.addText(pptText[PPT_I18N.INTRO.PRODUCT_LINE], {
            x: 0.9,
            y: 3.0,
            w: 11.5,
            h: 0.4,
            fontSize: 16,
            color: 'FFFFFF',
        });

        const today = new Date().toLocaleDateString();
        slide.addText(today, {
            x: 0.9,
            y: 5.2,
            w: 4,
            h: 0.3,
            fontSize: 14,
            color: '6B6B6B',
        });
    }

    private addRecordHealthSlide(pptx: pptxgen, rh: RecordHealthData, pptText: PptStrings): void {
        const slide = pptx.addSlide();

        const total = rh.total ?? rh.breakdown.reduce((sum, item) => sum + (item.value ?? 0), 0);

        const breakdown = rh.breakdown.map((item) => {
            const value = item.value ?? 0;
            const percent = total > 0 ? Math.round((value / total) * 100) : 0;
            const label = item.label ?? (item.status as string).replaceAll(/([A-Z])/g, ' $1').trim();
            return { ...item, label, value, percent };
        });

        const labels = breakdown.map((b) => b.label);
        const values = breakdown.map((b) => b.value);
        const chartColors = breakdown.map((b) => this.getStatusColor(b.status));

        slide.addText(pptText[PPT_I18N.RECORD_HEALTH.TITLE], {
            x: 0.5,
            y: 0.3,
            w: 6,
            h: 0.5,
            fontSize: 28,
            bold: true,
            color: '000000',
        });

        slide.addText(pptText[PPT_I18N.RECORD_HEALTH.SUB_TITLE], {
            x: 0.5,
            y: 0.8,
            w: 6,
            h: 0.4,
            fontSize: 14,
            color: '666666',
        });

        slide.addText(pptText[PPT_I18N.RECORD_HEALTH.TOTAL_RECORDS], {
            x: 0.5,
            y: 1.4,
            w: 3.2,
            h: 0.4,
            fontSize: 16,
            bold: true,
        });

        slide.addText(total.toLocaleString(), {
            x: 0.5,
            y: 1.7,
            w: 3.2,
            h: 0.9,
            fontSize: 38,
            bold: true,
            color: '4B3FF6',
        });

        slide.addText(pptText[PPT_I18N.RECORD_HEALTH.RECORDS_BY_STATUS], {
            x: 0.5,
            y: 2.6,
            w: 3.5,
            h: 0.4,
            fontSize: 16,
            bold: true,
        });

        const legendX = 0.5;
        const legendYStart = 3.25;
        const rowHeight = 0.38;

        breakdown.forEach((item, idx) => {
            const y = legendYStart + idx * rowHeight;

            slide.addShape(pptx.ShapeType.rect, {
                x: legendX,
                y,
                w: 0.25,
                h: 0.25,
                fill: { color: chartColors[idx] },
                line: { color: 'FFFFFF', width: 0 },
            });

            slide.addText(`${item.label} – ${item.value.toLocaleString()} (${item.percent}%)`, {
                x: legendX + 0.35,
                y: y - 0.02,
                w: 4,
                h: 0.4,
                fontSize: 14,
                color: '444444',
            });
        });

        const donutChartData = [
            {
                name: pptText[PPT_I18N.RECORD_HEALTH.DONUT_SERIES_LABEL],
                labels,
                values,
            },
        ];

        slide.addChart(pptx.ChartType.doughnut, donutChartData, {
            x: 6,
            y: 1.1,
            w: 3.9,
            h: 3.9,
            chartColors,
            holeSize: 65,
            showPercent: true,
            showValue: false,
            showLabel: false,
            dataLabelColor: 'FFFFFF',
            dataLabelFontSize: 11,
            dataLabelPosition: 'ctr',
            showLegend: false,
            plotArea: { fill: { color: 'FFFFFF' } },
            dataNoEffects: true,
        });
    }

    private addCategoryStatusSlide(
        pptx: pptxgen,
        params: {
            widgetId: WidgetId;
            TITLE: string;
            SUB_TITLE: string;
            CAPTION: string;
            VALUE_LABEL: string;
            data: WidgetCategoryData;
        },
        pptText: PptStrings
    ): void {
        const { widgetId, TITLE, SUB_TITLE, CAPTION, VALUE_LABEL, data } = params;
        const isLegalHold = widgetId === WIDGET_ID.LegalHoldSummary;

        // PPT table/chart intentionally shows only the first 10 rows for readability.
        const series = (data.series ?? []).slice(0, 10);
        if (series.length === 0) {
            return;
        }

        const slide = pptx.addSlide();

        const primaryColor = STATUS_COLOR_MAP[WIDGET_STATUS_MAP[widgetId]] ?? DEFAULT_STATUS_COLOR;
        const otherColor = 'D0D0D0';

        slide.addText(TITLE, {
            x: 0.5,
            y: 0.3,
            w: 6.5,
            h: 0.5,
            fontSize: 28,
            bold: true,
            color: '000000',
        });

        slide.addText(SUB_TITLE, {
            x: 0.5,
            y: 0.8,
            w: 6.5,
            h: 0.4,
            fontSize: 14,
            color: '666666',
        });

        slide.addText(pptText[PPT_I18N.COMMON.CATEGORY_OVERVIEW], {
            x: 0.5,
            y: 1.15,
            w: 4.5,
            h: 0.4,
            fontSize: 16,
            bold: true,
        });

        slide.addText(CAPTION, {
            x: 0.5,
            y: 1.45,
            w: 4.5,
            h: 0.3,
            fontSize: 10,
            color: '888888',
            italic: true,
        });

        const tableRows: any[] = isLegalHold
            ? [
                  [
                      { text: pptText[PPT_I18N.COMMON.TABLE.LEGAL_CASE_NAME], options: { bold: true } },
                      { text: VALUE_LABEL, options: { bold: true } },
                  ],
              ]
            : [
                  [
                      { text: pptText[PPT_I18N.COMMON.TABLE.CATEGORY], options: { bold: true } },
                      { text: pptText[PPT_I18N.COMMON.TABLE.TOTAL_RECORDS], options: { bold: true } },
                      { text: VALUE_LABEL, options: { bold: true } },
                  ],
              ];

        series.forEach((s) => {
            if (isLegalHold) {
                tableRows.push([s.category, s.value.toLocaleString()]);
            } else {
                tableRows.push([s.category, s.total.toLocaleString(), s.value.toLocaleString()]);
            }
        });

        slide.addTable(tableRows, {
            x: 0.5,
            y: 1.7,
            w: 5.1,
            colW: isLegalHold ? [3.6, 1.5] : [2.9, 0.9, 1.3],
            fontSize: 11,
            align: 'left',
            valign: 'middle',
            border: { type: 'none', pt: 0, color: 'FFFFFF' },
            rowH: 0.3,
        });

        const categories = series.map((s) => s.category);
        const valueSeries = series.map((s) => Number(s.value ?? 0));
        const otherSeries = series.map((s) => Math.max(0, Number(s.total ?? 0) - Number(s.value ?? 0)));
        const includeOtherSeries = !isLegalHold || otherSeries.some((value) => value > 0);

        const padded = this.padChartCategories(
            categories,
            includeOtherSeries ? [valueSeries, otherSeries] : [valueSeries],
            6
        );
        const [paddedValueSeries, paddedOtherSeries = []] = padded.seriesValues;

        const barChartData = [{ name: VALUE_LABEL, labels: padded.labels, values: paddedValueSeries }];
        if (includeOtherSeries) {
            barChartData.push({ name: pptText[PPT_I18N.COMMON.LEGEND.TOTAL], labels: padded.labels, values: paddedOtherSeries });
        }

        const barGapWidthPct = 30;
        const rotate = categories.length > 1 ? -45 : 0;

        slide.addChart(pptx.ChartType.bar, barChartData, {
            x: 5.7,
            y: 0.9,
            w: 4,
            h: 3.5,
            chartColors: includeOtherSeries ? [primaryColor, otherColor] : [primaryColor],
            barGrouping: 'stacked',
            barDir: 'col',
            showLegend: false,
            barGapWidthPct,
            catAxisLabelRotate: rotate,
            catAxisLabelFontSize: 9,
            valAxisLabelFontSize: 9,
            dataNoEffects: true,
        });

        const legendY = 4.7;

        if (includeOtherSeries) {
            slide.addShape(pptx.ShapeType.rect, {
                x: 5.9,
                y: legendY,
                w: 0.25,
                h: 0.25,
                fill: { color: otherColor },
                line: { color: 'FFFFFF', width: 0 },
            });

            slide.addText(pptText[PPT_I18N.COMMON.LEGEND.TOTAL], {
                x: 6.2,
                y: legendY - 0.02,
                w: 2,
                h: 0.3,
                fontSize: 12,
                color: '444444',
            });
        }

        slide.addShape(pptx.ShapeType.rect, {
            x: includeOtherSeries ? 8.2 : 5.9,
            y: legendY,
            w: 0.25,
            h: 0.25,
            fill: { color: primaryColor },
            line: { color: 'FFFFFF', width: 0 },
        });

        slide.addText(VALUE_LABEL, {
            x: includeOtherSeries ? 8.5 : 6.2,
            y: legendY - 0.02,
            w: 2,
            h: 0.3,
            fontSize: 12,
            color: '444444',
        });
    }

    private getCategorySlideParams(
        widgetId: WidgetId,
        data: WidgetCategoryData,
        pptText: PptStrings
    ): {
        widgetId: WidgetId;
        TITLE: string;
        SUB_TITLE: string;
        CAPTION: string;
        VALUE_LABEL: string;
        data: WidgetCategoryData;
    } | null {
        switch (widgetId) {
            case WIDGET_ID.ActiveRetention: {
                return {
                    widgetId,
                    TITLE: pptText[PPT_I18N.WIDGETS.ACTIVE_RETENTION.TITLE],
                    SUB_TITLE: pptText[PPT_I18N.WIDGETS.ACTIVE_RETENTION.SUB_TITLE],
                    CAPTION: pptText[PPT_I18N.WIDGETS.ACTIVE_RETENTION.CAPTION],
                    VALUE_LABEL: pptText[PPT_I18N.WIDGETS.ACTIVE_RETENTION.VALUE_LABEL],
                    data,
                };
            }

            case WIDGET_ID.MissingProperties: {
                return {
                    widgetId,
                    TITLE: pptText[PPT_I18N.WIDGETS.MISSING_PROPERTIES.TITLE],
                    SUB_TITLE: pptText[PPT_I18N.WIDGETS.MISSING_PROPERTIES.SUB_TITLE],
                    CAPTION: pptText[PPT_I18N.WIDGETS.MISSING_PROPERTIES.CAPTION],
                    VALUE_LABEL: pptText[PPT_I18N.WIDGETS.MISSING_PROPERTIES.VALUE_LABEL],
                    data,
                };
            }

            case WIDGET_ID.CutoffTracker: {
                return {
                    widgetId,
                    TITLE: pptText[PPT_I18N.WIDGETS.CUTOFF_TRACKER.TITLE],
                    SUB_TITLE: pptText[PPT_I18N.WIDGETS.CUTOFF_TRACKER.SUB_TITLE],
                    CAPTION: pptText[PPT_I18N.WIDGETS.CUTOFF_TRACKER.CAPTION],
                    VALUE_LABEL: pptText[PPT_I18N.WIDGETS.CUTOFF_TRACKER.VALUE_LABEL],
                    data,
                };
            }

            case WIDGET_ID.DispositionTracker: {
                return {
                    widgetId,
                    TITLE: pptText[PPT_I18N.WIDGETS.DISPOSITION_TRACKER.TITLE],
                    SUB_TITLE: pptText[PPT_I18N.WIDGETS.DISPOSITION_TRACKER.SUB_TITLE],
                    CAPTION: pptText[PPT_I18N.WIDGETS.DISPOSITION_TRACKER.CAPTION],
                    VALUE_LABEL: pptText[PPT_I18N.WIDGETS.DISPOSITION_TRACKER.VALUE_LABEL],
                    data,
                };
            }

            case WIDGET_ID.LegalHoldSummary: {
                return {
                    widgetId,
                    TITLE: pptText[PPT_I18N.WIDGETS.LEGAL_HOLD_SUMMARY.TITLE],
                    SUB_TITLE: pptText[PPT_I18N.WIDGETS.LEGAL_HOLD_SUMMARY.SUB_TITLE],
                    CAPTION: pptText[PPT_I18N.WIDGETS.LEGAL_HOLD_SUMMARY.CAPTION],
                    VALUE_LABEL: pptText[PPT_I18N.WIDGETS.LEGAL_HOLD_SUMMARY.VALUE_LABEL],
                    data,
                };
            }

            default: {
                return null;
            }
        }
    }

    private async loadPptTranslations(): Promise<PptStrings> {
        const k = PPT_I18N;

        const keys = [
            k.INTRO.TITLE,
            k.INTRO.REPORTING_DATE,
            k.INTRO.PRODUCT_LINE,

            k.RECORD_HEALTH.TITLE,
            k.RECORD_HEALTH.SUB_TITLE,
            k.RECORD_HEALTH.TOTAL_RECORDS,
            k.RECORD_HEALTH.RECORDS_BY_STATUS,
            k.RECORD_HEALTH.DONUT_SERIES_LABEL,

            k.COMMON.CATEGORY_OVERVIEW,
            k.COMMON.TABLE.CATEGORY,
            k.COMMON.TABLE.TOTAL_RECORDS,
            k.COMMON.TABLE.LEGAL_CASE_NAME,
            k.COMMON.LEGEND.TOTAL,

            k.WIDGETS.ACTIVE_RETENTION.TITLE,
            k.WIDGETS.ACTIVE_RETENTION.SUB_TITLE,
            k.WIDGETS.ACTIVE_RETENTION.CAPTION,
            k.WIDGETS.ACTIVE_RETENTION.VALUE_LABEL,

            k.WIDGETS.MISSING_PROPERTIES.TITLE,
            k.WIDGETS.MISSING_PROPERTIES.SUB_TITLE,
            k.WIDGETS.MISSING_PROPERTIES.CAPTION,
            k.WIDGETS.MISSING_PROPERTIES.VALUE_LABEL,

            k.WIDGETS.CUTOFF_TRACKER.TITLE,
            k.WIDGETS.CUTOFF_TRACKER.SUB_TITLE,
            k.WIDGETS.CUTOFF_TRACKER.CAPTION,
            k.WIDGETS.CUTOFF_TRACKER.VALUE_LABEL,

            k.WIDGETS.DISPOSITION_TRACKER.TITLE,
            k.WIDGETS.DISPOSITION_TRACKER.SUB_TITLE,
            k.WIDGETS.DISPOSITION_TRACKER.CAPTION,
            k.WIDGETS.DISPOSITION_TRACKER.VALUE_LABEL,

            k.WIDGETS.LEGAL_HOLD_SUMMARY.TITLE,
            k.WIDGETS.LEGAL_HOLD_SUMMARY.SUB_TITLE,
            k.WIDGETS.LEGAL_HOLD_SUMMARY.CAPTION,
            k.WIDGETS.LEGAL_HOLD_SUMMARY.VALUE_LABEL,
        ];

        return firstValueFrom(this.translate.get(keys));
    }

    private getStatusColor(status: string | undefined): string {
        if (!status) {
            return DEFAULT_STATUS_COLOR;
        }
        return (STATUS_COLOR_MAP as Record<string, string>)[status] ?? DEFAULT_STATUS_COLOR;
    }

    private getSlideSize(pptx: pptxgen): { w: number; h: number } {
        const pptxWithInternals = pptx as unknown as {
            _layout?: { width?: number; height?: number };
            _presLayout?: { width?: number; height?: number };
        };

        const layoutWidth = pptxWithInternals._layout?.width ?? pptxWithInternals._presLayout?.width;
        const layoutHeight = pptxWithInternals._layout?.height ?? pptxWithInternals._presLayout?.height;

        if (typeof layoutWidth === 'number' && typeof layoutHeight === 'number') {
            return { w: layoutWidth, h: layoutHeight };
        }

        return { w: 13.333, h: 7.5 };
    }

    private padChartCategories(labels: string[], seriesValues: number[][], minSlots = 6): { labels: string[]; seriesValues: number[][] } {
        if (labels.length >= minSlots) {
            return { labels, seriesValues };
        }

        const padTotal = minSlots - labels.length;
        const padLeft = Math.floor(padTotal / 2);
        const padRight = padTotal - padLeft;

        const paddedLabels = [...Array.from({ length: padLeft }, () => ''), ...labels, ...Array.from({ length: padRight }, () => '')];

        const paddedSeriesValues = seriesValues.map((vals) => [
            ...Array.from({ length: padLeft }, () => 0),
            ...vals,
            ...Array.from({ length: padRight }, () => 0),
        ]);

        return { labels: paddedLabels, seriesValues: paddedSeriesValues };
    }
}

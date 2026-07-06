import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
    DashboardContainerLayoutMode,
    DashboardLinkTargetType,
    DashboardSeriesPresetId,
    DashboardWidgetConfig,
    ChartHeadlineAggregation,
} from '../../definitions/dashboard-widget.model';
import { HYLAND_BRAND, SERIES_STYLE_PRESETS } from '../../utils/dashboard-theme.util';
import {
    columnsToLegacySpan,
    resolveWidgetColumnSpan,
    showCardSizeControl,
    spanOptionsForLayoutMode,
    spanOptionsForSection,
} from '../../utils/dashboard-widget-span.util';
import { DashboardBuilderDataBindingComponent } from '../dashboard-builder-data-binding/dashboard-builder-data-binding.component';
import { SeriesStyleBgPipe } from '../../pipes/series-style-bg.pipe';

@Component({
    selector: 'medical-records-dashboard-builder-appearance-panel',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        DashboardBuilderDataBindingComponent,
        SeriesStyleBgPipe,
    ],
    templateUrl: './dashboard-builder-appearance-panel.component.html',
    styleUrls: ['./dashboard-builder-appearance-panel.component.scss'],
})
export class DashboardBuilderAppearancePanelComponent {
    @Input({ required: true }) widget!: DashboardWidgetConfig;
    @Input() containerLayoutMode?: DashboardContainerLayoutMode;
    @Input() bindingScope = 'modal';
    @Output() widgetPatch = new EventEmitter<Partial<DashboardWidgetConfig>>();

    readonly linkTargetTypes: DashboardLinkTargetType[] = ['route', 'external'];
    readonly gradientPresets: DashboardSeriesPresetId[] = [
        'hyland-purple-wave',
        'hyland-teal',
        'hyland-purple-solid',
        'hyland-blue-solid',
        'custom',
    ];

    get isChartWidget(): boolean {
        return this.widget.type === 'chart';
    }

    get isLinkCardWidget(): boolean {
        return this.widget.type === 'link-card';
    }

    get isTaskWidget(): boolean {
        return this.widget.type === 'task-status-summary' || this.widget.type === 'task-recent-list';
    }

    get showCardSizeControl(): boolean {
        return showCardSizeControl(this.widget, this.containerLayoutMode);
    }

    get cardSpanOptions() {
        return this.containerLayoutMode
            ? spanOptionsForLayoutMode(this.containerLayoutMode)
            : spanOptionsForSection(this.widget.section);
    }

    get selectedCardSpan(): number {
        return resolveWidgetColumnSpan(this.widget, this.containerLayoutMode);
    }

    get linkOptions() {
        return this.widget.linkCardOptions ?? {};
    }

    get taskOptions() {
        return this.widget.taskWidgetOptions ?? {};
    }

    patch(patch: Partial<DashboardWidgetConfig>): void {
        this.widgetPatch.emit(patch);
    }

    onCardSpanChange(span: number): void {
        const rowSpan = this.widget.gridRowSpan ?? (this.widget.type === 'chart' ? 5 : 4);
        const canvasRect = this.widget.canvasRect
            ? { ...this.widget.canvasRect, colSpan: span }
            : { col: 1, row: 1, colSpan: span, rowSpan };
        this.patch({
            gridColumnSpan: span,
            span: columnsToLegacySpan(span, this.widget.section),
            canvasRect,
        });
    }

    onRowSpanChange(rowSpan: number): void {
        const colSpan = resolveWidgetColumnSpan(this.widget, this.containerLayoutMode);
        const canvasRect = this.widget.canvasRect
            ? { ...this.widget.canvasRect, rowSpan }
            : { col: 1, row: 1, colSpan, rowSpan };
        this.patch({
            gridRowSpan: rowSpan,
            canvasRect,
        });
    }

    onCardHeightChange(height: number | null): void {
        this.patch({ cardHeightPx: height && height > 0 ? height : undefined });
    }

    get selectedRowSpan(): number {
        return this.widget.gridRowSpan ?? (this.widget.type === 'chart' ? 5 : 4);
    }

    patchLinkOptions(patch: Partial<typeof this.linkOptions>): void {
        this.patch({ linkCardOptions: { ...this.linkOptions, ...patch } });
    }

    patchTaskOptions(patch: Partial<typeof this.taskOptions>): void {
        this.patch({ taskWidgetOptions: { ...this.taskOptions, ...patch } });
    }

    chartPreset(): DashboardSeriesPresetId {
        return (this.widget.chartSeriesStyle?.presetId as DashboardSeriesPresetId) ?? 'hyland-purple-wave';
    }

    selectChartPreset(presetId: DashboardSeriesPresetId): void {
        if (presetId === 'custom') {
            this.patch({
                chartSeriesStyle: {
                    mode: 'gradient',
                    presetId: 'custom',
                    gradientStops: this.widget.chartSeriesStyle?.gradientStops ?? [
                        { color: HYLAND_BRAND.purple, position: 0 },
                        { color: HYLAND_BRAND.blue, position: 55 },
                        { color: HYLAND_BRAND.teal, position: 100 },
                    ],
                },
            });
            return;
        }
        this.patch({ chartSeriesStyle: { ...SERIES_STYLE_PRESETS[presetId] } });
    }

    updateChartStop(index: number, color: string): void {
        const stops = [...(this.widget.chartSeriesStyle?.gradientStops ?? [])];
        if (!stops[index]) {
            return;
        }
        stops[index] = { ...stops[index], color };
        this.patch({
            chartSeriesStyle: { mode: 'gradient', presetId: 'custom', gradientStops: stops },
        });
    }

    clearChartSeriesOverride(): void {
        this.patch({ chartSeriesStyle: undefined });
    }

    patchChartHeadline(patch: { show?: boolean; label?: string; aggregation?: ChartHeadlineAggregation }): void {
        this.patch({
            chartHeadline: {
                ...this.widget.chartHeadline,
                ...patch,
            },
        });
    }

    presetLabelKey(presetId: DashboardSeriesPresetId): string {
        return `MEDICAL_RECORDS.THEME.PRESET_${presetId.replace(/-/g, '_').toUpperCase()}`;
    }

    showHelperFields(): boolean {
        if (this.widget.type === 'process-list') {
            return this.widget.processListOptions?.showSubtitle !== false;
        }
        return true;
    }
}
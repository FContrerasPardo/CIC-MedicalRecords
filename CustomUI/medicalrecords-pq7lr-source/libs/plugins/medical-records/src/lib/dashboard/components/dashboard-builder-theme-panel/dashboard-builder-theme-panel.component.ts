import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
    DashboardSeriesPresetId,
    DashboardSeriesStyle,
    DashboardThemeConfig,
} from '../../definitions/dashboard-widget.model';
import { SeriesStyleBgPipe } from '../../pipes/series-style-bg.pipe';
import { HYLAND_BRAND, SERIES_STYLE_PRESETS } from '../../utils/dashboard-theme.util';

@Component({
    selector: 'medical-records-dashboard-builder-theme-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, SeriesStyleBgPipe],
    templateUrl: './dashboard-builder-theme-panel.component.html',
    styleUrls: ['./dashboard-builder-theme-panel.component.scss'],
})
export class DashboardBuilderThemePanelComponent {
    @Input({ required: true }) theme!: DashboardThemeConfig;
    @Output() themeChange = new EventEmitter<Partial<DashboardThemeConfig>>();

    expanded = false;

    readonly accentSwatches = [
        { key: 'purple', color: HYLAND_BRAND.purple, labelKey: 'MEDICAL_RECORDS.THEME.ACCENT_PURPLE' },
        { key: 'blue', color: HYLAND_BRAND.blue, labelKey: 'MEDICAL_RECORDS.THEME.ACCENT_BLUE' },
        { key: 'teal', color: HYLAND_BRAND.teal, labelKey: 'MEDICAL_RECORDS.THEME.ACCENT_TEAL' },
        { key: 'darkBlue', color: HYLAND_BRAND.darkBlue, labelKey: 'MEDICAL_RECORDS.THEME.ACCENT_DARK_BLUE' },
    ];

    readonly gradientPresets: DashboardSeriesPresetId[] = [
        'hyland-purple-wave',
        'hyland-teal',
        'hyland-purple-solid',
        'hyland-blue-solid',
        'custom',
    ];

    toggleExpanded(): void {
        this.expanded = !this.expanded;
    }

    selectAccent(color: string): void {
        this.themeChange.emit({ primaryAccent: color });
    }

    selectPreset(presetId: DashboardSeriesPresetId): void {
        if (presetId === 'custom') {
            this.themeChange.emit({
                defaultSeriesStyle: {
                    mode: 'gradient',
                    presetId: 'custom',
                    gradientStops: this.theme.defaultSeriesStyle.gradientStops ?? [
                        { color: HYLAND_BRAND.purple, position: 0 },
                        { color: HYLAND_BRAND.blue, position: 55 },
                        { color: HYLAND_BRAND.teal, position: 100 },
                    ],
                },
            });
            return;
        }

        const preset = SERIES_STYLE_PRESETS[presetId];
        this.themeChange.emit({ defaultSeriesStyle: { ...preset } });
    }

    currentPreset(): DashboardSeriesPresetId {
        return (this.theme.defaultSeriesStyle.presetId as DashboardSeriesPresetId) ?? 'hyland-purple-wave';
    }

    updateGradientStop(index: number, color: string): void {
        const stops = [...(this.theme.defaultSeriesStyle.gradientStops ?? [])];
        if (!stops[index]) {
            return;
        }
        stops[index] = { ...stops[index], color };
        this.themeChange.emit({
            defaultSeriesStyle: {
                mode: 'gradient',
                presetId: 'custom',
                gradientStops: stops,
            },
        });
    }

    presetLabelKey(presetId: DashboardSeriesPresetId): string {
        return `MEDICAL_RECORDS.THEME.PRESET_${presetId.replace(/-/g, '_').toUpperCase()}`;
    }

    previewStyle(): DashboardSeriesStyle {
        return this.theme.defaultSeriesStyle;
    }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DashboardLayoutState, DashboardSeriesStyle, DashboardThemeConfig } from '../definitions/dashboard-widget.model';
import {
    applyThemeToElement,
    mergeSeriesStyle,
    resolveTheme,
    resolveWidgetSeriesStyle,
    seriesStyleToCssBackground,
} from '../utils/dashboard-theme.util';

@Injectable({ providedIn: 'root' })
export class DashboardThemeService {
    private readonly themeSubject = new BehaviorSubject<DashboardThemeConfig>(resolveTheme());

    readonly theme$ = this.themeSubject.asObservable();

    get theme(): DashboardThemeConfig {
        return this.themeSubject.value;
    }

    setThemeFromLayout(layout: DashboardLayoutState): void {
        this.themeSubject.next(resolveTheme(layout.theme));
    }

    patchTheme(patch: Partial<DashboardThemeConfig>): void {
        const current = this.theme;
        this.themeSubject.next(
            resolveTheme({
                ...current,
                ...patch,
                brand: { ...current.brand, ...patch.brand },
                statusColors: { ...current.statusColors, ...patch.statusColors },
                defaultSeriesStyle: patch.defaultSeriesStyle
                    ? mergeSeriesStyle(current.defaultSeriesStyle, patch.defaultSeriesStyle)
                    : current.defaultSeriesStyle,
            })
        );
    }

    applyToHost(element: HTMLElement | null | undefined): void {
        if (!element) {
            return;
        }
        applyThemeToElement(element, this.theme);
    }

    resolveSeriesStyle(widgetStyle?: DashboardSeriesStyle): DashboardSeriesStyle {
        return resolveWidgetSeriesStyle(this.theme, widgetStyle);
    }

    seriesBackground(widgetStyle?: DashboardSeriesStyle, direction = '180deg'): string {
        return seriesStyleToCssBackground(this.resolveSeriesStyle(widgetStyle), direction);
    }

    statusColor(key: string): string {
        const normalized = key.trim();
        return (
            this.theme.statusColors?.[normalized] ??
            this.theme.statusColors?.[normalized.toUpperCase()] ??
            this.theme.primaryAccent
        );
    }
}

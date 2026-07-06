import { Pipe, PipeTransform } from '@angular/core';
import { DashboardSeriesStyle } from '../definitions/dashboard-widget.model';
import { seriesStyleToCssBackground } from '../utils/dashboard-theme.util';

@Pipe({ name: 'seriesStyleBg', standalone: true })
export class SeriesStyleBgPipe implements PipeTransform {
    transform(style: DashboardSeriesStyle | undefined | null, direction = '180deg'): string {
        if (!style) {
            return seriesStyleToCssBackground({ mode: 'gradient', gradientStops: [] });
        }
        return seriesStyleToCssBackground(style, direction);
    }
}

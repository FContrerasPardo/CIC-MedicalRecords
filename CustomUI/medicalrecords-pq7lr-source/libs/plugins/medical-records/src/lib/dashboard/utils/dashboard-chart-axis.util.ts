import { ChartDateBucket } from '../definitions/dashboard-widget.model';

/** Build evenly spaced Y-axis tick values from 0 to max (inclusive). */
export function buildYAxisTicks(max: number, tickCount = 5): number[] {
    const safeMax = max > 0 ? max : 1;
    const niceMax = niceCeil(safeMax);
    const step = niceStep(niceMax, tickCount - 1);
    const ticks: number[] = [];
    for (let value = 0; value <= niceMax + step * 0.001; value += step) {
        ticks.push(Math.round(value * 1000) / 1000);
    }
    if (ticks[ticks.length - 1] < niceMax) {
        ticks.push(niceMax);
    }
    return ticks;
}

export function resolveChartScaleMax(values: number[], configuredMax?: number): number {
    const dataMax = values.length ? Math.max(...values) : 0;
    if (configuredMax != null && configuredMax > 0) {
        return Math.max(configuredMax, dataMax);
    }
    return dataMax > 0 ? niceCeil(dataMax) : 1;
}

export function valueToPlotPercent(value: number, scaleMax: number): number {
    if (scaleMax <= 0) {
        return 0;
    }
    return Math.min(100, Math.max(0, (value / scaleMax) * 100));
}

export function formatChartXLabel(
    label: string,
    mode: 'auto' | 'full' = 'auto',
    dateBucket?: ChartDateBucket,
    labelCount = 12
): string {
    if (mode === 'full') {
        return label;
    }

    const trimmed = label.trim();

    if (dateBucket === 'month') {
        const monthMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
        if (monthMatch) {
            const date = new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
            return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(date);
        }
    }

    if (dateBucket === 'week') {
        const weekStart = parseIsoDate(trimmed);
        if (weekStart) {
            return formatWeekRange(weekStart);
        }
    }

    if (dateBucket === 'hour') {
        const parsed = Date.parse(trimmed);
        if (Number.isFinite(parsed)) {
            return new Intl.DateTimeFormat(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            }).format(new Date(parsed));
        }
    }

    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(parsed));
    }

    return shortenCategoryLabel(trimmed, labelCount);
}

export function formatChartTick(value: number): string {
    if (Number.isInteger(value)) {
        return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function parseIsoDate(label: string): Date | null {
    const dayMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(label);
    if (!dayMatch) {
        return null;
    }

    const date = new Date(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3]));
    return Number.isFinite(date.getTime()) ? date : null;
}

function formatWeekRange(weekStart: Date): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    return `${fmt.format(weekStart)} – ${fmt.format(weekEnd)}`;
}

const UUID_PATTERN =
    /^([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shortenCategoryLabel(label: string, _labelCount: number): string {
    const uuidMatch = UUID_PATTERN.exec(label);
    if (uuidMatch) {
        return uuidMatch[1];
    }

    const maxLength = 14;
    if (label.length <= maxLength) {
        return label;
    }

    return `${label.slice(0, 13)}…`;
}

function niceCeil(value: number): number {
    if (value <= 1) {
        return 1;
    }
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return niceNormalized * magnitude;
}

function niceStep(max: number, divisions: number): number {
    if (divisions <= 0) {
        return max;
    }
    return niceCeil(max / divisions);
}

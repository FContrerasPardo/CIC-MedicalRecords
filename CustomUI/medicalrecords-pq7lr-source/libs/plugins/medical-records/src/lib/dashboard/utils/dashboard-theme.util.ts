import {
    DashboardColorStop,
    DashboardSeriesPresetId,
    DashboardSeriesStyle,
    DashboardThemeConfig,
} from '../definitions/dashboard-widget.model';

export const HYLAND_BRAND = {
    teal: '#13EAC1',
    purple: '#6E33FF',
    purpleLight: '#D3A7FF',
    purpleDeep: '#5A2FD9',
    purpleMid: '#8855FF',
    blue: '#52A1FF',
    yellow: '#F1CB61',
    darkBlue: '#191F5E',
    gray: '#F4F6FE',
} as const;

export const DEFAULT_SERIES_PALETTE = [
    HYLAND_BRAND.purple,
    HYLAND_BRAND.purpleMid,
    HYLAND_BRAND.blue,
    HYLAND_BRAND.teal,
    HYLAND_BRAND.purpleLight,
    HYLAND_BRAND.purpleDeep,
];

export const DEFAULT_PROCESS_STATUS_COLORS: Record<string, string> = {
    RUNNING: HYLAND_BRAND.blue,
    SUSPENDED: HYLAND_BRAND.yellow,
    COMPLETED: HYLAND_BRAND.teal,
    CANCELLED: HYLAND_BRAND.purpleLight,
};

export const DEFAULT_STATUS_COLORS: Record<string, string> = {
    ...DEFAULT_PROCESS_STATUS_COLORS,
    CREATED: HYLAND_BRAND.teal,
    ASSIGNED: HYLAND_BRAND.purple,
    pending: HYLAND_BRAND.teal,
    analysis: HYLAND_BRAND.purple,
    resolved: HYLAND_BRAND.purpleDeep,
    closed: HYLAND_BRAND.purpleLight,
};

export const DEFAULT_GRADIENT_STOPS: DashboardColorStop[] = [
    { color: HYLAND_BRAND.purpleDeep, position: 0 },
    { color: HYLAND_BRAND.purple, position: 40 },
    { color: HYLAND_BRAND.blue, position: 72 },
    { color: HYLAND_BRAND.teal, position: 100 },
];

export const DEFAULT_DASHBOARD_THEME: DashboardThemeConfig = {
    brand: { ...HYLAND_BRAND },
    primaryAccent: HYLAND_BRAND.purple,
    defaultSeriesStyle: {
        mode: 'gradient',
        presetId: 'hyland-purple-wave',
        gradientStops: [...DEFAULT_GRADIENT_STOPS],
    },
    seriesPalette: [...DEFAULT_SERIES_PALETTE],
    statusColors: { ...DEFAULT_STATUS_COLORS },
};

export const SERIES_STYLE_PRESETS: Record<
    Exclude<DashboardSeriesPresetId, 'custom'>,
    DashboardSeriesStyle
> = {
    'hyland-purple-wave': {
        mode: 'gradient',
        presetId: 'hyland-purple-wave',
        gradientStops: [...DEFAULT_GRADIENT_STOPS],
    },
    'hyland-teal': {
        mode: 'gradient',
        presetId: 'hyland-teal',
        gradientStops: [
            { color: HYLAND_BRAND.teal, position: 0 },
            { color: '#70F0D8', position: 100 },
        ],
    },
    'hyland-purple-solid': {
        mode: 'solid',
        presetId: 'hyland-purple-solid',
        color: HYLAND_BRAND.purple,
    },
    'hyland-blue-solid': {
        mode: 'solid',
        presetId: 'hyland-blue-solid',
        color: HYLAND_BRAND.blue,
    },
};

const LEGACY_ACCENT_COLORS = new Set(['#005eb8', '#004a93', '#0068cc', '#00478d', '#003d79', '#003d78', '#004e9b']);

function isLegacyAccent(color?: string | null): boolean {
    if (!color) {
        return true;
    }
    return LEGACY_ACCENT_COLORS.has(color.trim().toLowerCase());
}

function hasLegacySeriesPalette(palette?: string[]): boolean {
    return (palette ?? []).some((color) => isLegacyAccent(color));
}

function migrateLegacyTheme(theme: DashboardThemeConfig): DashboardThemeConfig {
    const needsAccentMigration = isLegacyAccent(theme.primaryAccent);

    const style = theme.defaultSeriesStyle;
    const needsStyleMigration =
        !style?.presetId ||
        style.presetId === 'hyland-blue-solid' ||
        (style.mode === 'solid' && isLegacyAccent(style.color)) ||
        hasLegacySeriesPalette(theme.seriesPalette);

    if (!needsAccentMigration && !needsStyleMigration) {
        return theme;
    }

    return {
        ...theme,
        primaryAccent: needsAccentMigration ? HYLAND_BRAND.purple : theme.primaryAccent,
        defaultSeriesStyle: needsStyleMigration
            ? { ...SERIES_STYLE_PRESETS['hyland-purple-wave'] }
            : theme.defaultSeriesStyle,
        seriesPalette: needsStyleMigration ? [...DEFAULT_SERIES_PALETTE] : theme.seriesPalette,
    };
}

export function resolveTheme(theme?: DashboardThemeConfig | null): DashboardThemeConfig {
    if (!theme) {
        return structuredClone(DEFAULT_DASHBOARD_THEME);
    }

    const migrated = migrateLegacyTheme(theme);

    return {
        brand: { ...DEFAULT_DASHBOARD_THEME.brand, ...migrated.brand },
        primaryAccent: migrated.primaryAccent ?? DEFAULT_DASHBOARD_THEME.primaryAccent,
        defaultSeriesStyle: mergeSeriesStyle(DEFAULT_DASHBOARD_THEME.defaultSeriesStyle, migrated.defaultSeriesStyle),
        seriesPalette: migrated.seriesPalette?.length ? [...migrated.seriesPalette] : [...DEFAULT_SERIES_PALETTE],
        statusColors: { ...DEFAULT_STATUS_COLORS, ...migrated.statusColors },
    };
}

export function mergeSeriesStyle(
    base: DashboardSeriesStyle,
    override?: DashboardSeriesStyle
): DashboardSeriesStyle {
    if (!override) {
        return { ...base, gradientStops: base.gradientStops ? [...base.gradientStops] : undefined };
    }

    if (override.presetId && override.presetId !== 'custom' && SERIES_STYLE_PRESETS[override.presetId]) {
        return { ...SERIES_STYLE_PRESETS[override.presetId] };
    }

    return {
        mode: override.mode ?? base.mode,
        color: override.color ?? base.color,
        presetId: override.presetId ?? base.presetId,
        gradientStops: override.gradientStops?.length
            ? override.gradientStops.map((stop) => ({ ...stop }))
            : base.gradientStops
              ? base.gradientStops.map((stop) => ({ ...stop }))
              : undefined,
    };
}

export function resolveWidgetSeriesStyle(
    theme: DashboardThemeConfig,
    widgetStyle?: DashboardSeriesStyle
): DashboardSeriesStyle {
    if (!widgetStyle) {
        return mergeSeriesStyle(theme.defaultSeriesStyle);
    }
    return mergeSeriesStyle(theme.defaultSeriesStyle, widgetStyle);
}

export function seriesStyleToCssBackground(style: DashboardSeriesStyle, direction = '180deg'): string {
    if (style.mode === 'solid' && style.color) {
        return style.color;
    }

    const stops = style.gradientStops?.length ? style.gradientStops : DEFAULT_GRADIENT_STOPS;
    const parts = stops
        .map((stop) => {
            const pos = stop.position ?? 0;
            return `${stop.color} ${pos}%`;
        })
        .join(', ');

    return `linear-gradient(${direction}, ${parts})`;
}

export function paletteColorAt(palette: string[], index: number): string {
    if (!palette.length) {
        return HYLAND_BRAND.purple;
    }
    return palette[index % palette.length];
}

export const PROCESS_STATUS_SERIES_ORDER = ['RUNNING', 'SUSPENDED', 'COMPLETED', 'CANCELLED'] as const;

export function sortProcessStatusSeriesKeys(keys: string[]): string[] {
    return [...keys].sort((left, right) => {
        const leftIndex = PROCESS_STATUS_SERIES_ORDER.indexOf(left.toUpperCase() as (typeof PROCESS_STATUS_SERIES_ORDER)[number]);
        const rightIndex = PROCESS_STATUS_SERIES_ORDER.indexOf(right.toUpperCase() as (typeof PROCESS_STATUS_SERIES_ORDER)[number]);
        if (leftIndex === -1 && rightIndex === -1) {
            return left.localeCompare(right);
        }
        if (leftIndex === -1) {
            return 1;
        }
        if (rightIndex === -1) {
            return -1;
        }
        return leftIndex - rightIndex;
    });
}

export function themeToCssVariables(theme: DashboardThemeConfig): Record<string, string> {
    const seriesBg = seriesStyleToCssBackground(theme.defaultSeriesStyle);
    const brand = theme.brand;
    const accent = theme.primaryAccent;

    return {
        '--dash-brand-teal': brand.teal,
        '--dash-brand-purple': brand.purple,
        '--dash-brand-purple-light': (brand as { purpleLight?: string }).purpleLight ?? HYLAND_BRAND.purpleLight,
        '--dash-brand-purple-deep': (brand as { purpleDeep?: string }).purpleDeep ?? HYLAND_BRAND.purpleDeep,
        '--dash-brand-purple-mid': (brand as { purpleMid?: string }).purpleMid ?? HYLAND_BRAND.purpleMid,
        '--dash-brand-blue': brand.blue,
        '--dash-brand-yellow': brand.yellow,
        '--dash-brand-dark-blue': brand.darkBlue,
        '--dash-brand-gray': brand.gray,
        '--dash-accent': accent,
        '--dash-accent-soft': `${accent}1a`,
        '--dash-accent-muted': `${accent}14`,
        '--dash-series-gradient': seriesBg,
        '--dash-series-gradient-h': seriesStyleToCssBackground(theme.defaultSeriesStyle, '90deg'),
        '--dash-card-blob-gradient': `radial-gradient(circle at center, ${brand.purple} 0%, ${brand.blue} 48%, transparent 72%)`,
        '--dash-card-surface-gradient': `linear-gradient(135deg, #ffffff 0%, ${brand.gray} 100%)`,
        '--dash-series-color-0': theme.seriesPalette[0] ?? brand.purple,
        '--dash-series-color-1': theme.seriesPalette[1] ?? HYLAND_BRAND.purpleMid,
        '--dash-series-color-2': theme.seriesPalette[2] ?? brand.blue,
        '--dash-series-color-3': theme.seriesPalette[3] ?? brand.teal,
        '--dash-on-surface': brand.darkBlue,
        '--dash-surface': '#ffffff',
        '--dash-surface-muted': brand.gray,
    };
}

export function applyThemeToElement(element: HTMLElement, theme: DashboardThemeConfig): void {
    const vars = themeToCssVariables(theme);
    for (const [key, value] of Object.entries(vars)) {
        element.style.setProperty(key, value);
    }
}

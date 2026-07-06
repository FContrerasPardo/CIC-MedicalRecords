import {
    ChartAggregation,
    DashboardChartConfig,
    DashboardWidgetConfig,
    DashboardWidgetDataBindings,
    ValueAggregation,
} from '../definitions/dashboard-widget.model';
import { isLikelyContentFieldKey, resolveWidgetDataSource } from '../utils/dashboard-data-source.util';

function resolveChartYAggregation(
    valueAggregation?: ValueAggregation,
    valueField?: string
): ChartAggregation {
    if (valueAggregation === 'count' || !valueAggregation) {
        return 'count';
    }
    if (valueAggregation === 'sum') {
        return 'sum';
    }
    return valueField ? 'sum' : 'count';
}

export function resolveChartConfig(config: DashboardWidgetConfig): DashboardChartConfig {
    const bindings = config.bindings;

    if (bindings?.argumentField) {
        return {
            xField: bindings.argumentField,
            xFieldPath: bindings.argumentFieldPath,
            yAggregation: resolveChartYAggregation(bindings.valueAggregation, bindings.valueField),
            yField: bindings.valueField,
            yFieldPath: bindings.valueFieldPath,
            seriesFieldPath: bindings.seriesFieldPath,
            dateBucket: bindings.dateBucket,
            maxBuckets: bindings.maxBuckets ?? 12,
        };
    }

    return config.chart ?? {};
}

export function resolveTableColumnKeys(config: DashboardWidgetConfig): string[] | undefined {
    if (config.bindings?.columnFields !== undefined) {
        return [...config.bindings.columnFields];
    }

    if (!config.tableColumnKeys?.trim()) {
        return undefined;
    }

    const keys = config.tableColumnKeys
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);

    return filterLegacyTableColumnKeys(keys, config);
}

function filterLegacyTableColumnKeys(keys: string[], config: DashboardWidgetConfig): string[] | undefined {
    const source = resolveWidgetDataSource(config);
    if (source === 'process') {
        const filtered = keys.filter((key) => !isLikelyContentFieldKey(key));
        return filtered.length ? filtered : undefined;
    }

    if (source === 'content') {
        const filtered = keys.filter(
            (key) => !['startDate', 'businessKey', 'parentId', 'processDefinitionKey', 'processDefinitionName'].includes(key)
        );
        return filtered.length ? filtered : undefined;
    }

    return keys.length ? keys : undefined;
}

export function mergeBindingsPatch(
    current: DashboardWidgetDataBindings | undefined,
    patch: Partial<DashboardWidgetDataBindings>
): DashboardWidgetDataBindings {
    return { ...current, ...patch };
}

export function chartConfigToBindings(chart?: DashboardChartConfig): DashboardWidgetDataBindings | undefined {
    if (!chart?.xField) {
        return undefined;
    }

    return {
        argumentField: chart.xField,
        argumentFieldPath: chart.xFieldPath,
        valueAggregation: chart.yAggregation,
        valueField: chart.yField,
        valueFieldPath: chart.yFieldPath,
        seriesFieldPath: chart.seriesFieldPath,
        dateBucket: chart.dateBucket,
        maxBuckets: chart.maxBuckets,
    };
}

export function syncLegacyChartFromBindings(config: DashboardWidgetConfig): DashboardWidgetConfig {
    const normalized = sanitizeProcessChartBindings(config);
    const chart = resolveChartConfig(normalized);
    const tableColumns = resolveTableColumnKeys(normalized);
    const tableColumnKeys = tableColumns?.join(', ') ?? '';

    return {
        ...normalized,
        chart: chart.xField ? chart : undefined,
        tableColumnKeys,
    };
}

function sanitizeProcessChartBindings(config: DashboardWidgetConfig): DashboardWidgetConfig {
    if (resolveWidgetDataSource(config) !== 'process' || config.type !== 'chart') {
        return config;
    }

    const bindings = config.bindings ?? {};
    const needsArgumentReset =
        !bindings.argumentField || isLikelyContentFieldKey(bindings.argumentField);
    const needsValueReset = !!bindings.valueField && isLikelyContentFieldKey(bindings.valueField);
    const needsSeriesReset = !!bindings.seriesField && isLikelyContentFieldKey(bindings.seriesField);

    if (!needsArgumentReset && !needsValueReset && !needsSeriesReset) {
        return config;
    }

    return {
        ...config,
        bindings: {
            ...bindings,
            ...(needsArgumentReset
                ? {
                      argumentField: 'startDate',
                      valueAggregation: bindings.valueAggregation ?? 'count',
                      dateBucket: bindings.dateBucket ?? 'day',
                      maxBuckets: bindings.maxBuckets ?? 12,
                  }
                : {}),
            ...(needsValueReset ? { valueField: undefined, valueAggregation: 'count' } : {}),
            ...(needsSeriesReset ? { seriesField: undefined } : {}),
        },
    };
}

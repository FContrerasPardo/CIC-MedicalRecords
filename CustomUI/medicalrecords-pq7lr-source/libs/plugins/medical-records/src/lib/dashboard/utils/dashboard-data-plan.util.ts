import { resolveProcessDefinitionKeys } from '../definitions/dashboard-process-catalog';
import { DashboardWidgetConfig } from '../definitions/dashboard-widget.model';
import { resolveWidgetDataSource } from './dashboard-data-source.util';
import { ACTIVE_PROCESS_STATUSES, providerRequiredVariables } from './dashboard-provider-group.util';

/**
 * Data planner (pure). Every widget in the layout declares what process data it needs (process
 * definitions, statuses, process variables by name); the planner unifies those needs into ONE
 * process query covering all of them, and tells which rows need which variables. Widgets then take
 * their slice of the shared dataset instead of querying on their own.
 */

export const VARIABLE_PREFIX = 'var_';

export interface WidgetDataNeed {
    widgetId: string;
    /** Process definition names as sent to the Query service (original case, sorted). */
    definitions: string[];
    /** Upper-cased statuses; null = all statuses. */
    statuses: string[] | null;
    /** Process variables read by the widget, by name. */
    variables: string[];
    /** The widget asked for every variable (legacy `includeProcessVariables` without fields). */
    allVariables: boolean;
}

export interface DataPlan {
    /** Changes whenever any need changes; executions are cached per signature and date range. */
    signature: string;
    definitions: string[];
    statuses: string[] | null;
    needs: WidgetDataNeed[];
}

function normalizedStatuses(statuses: readonly string[] | null | undefined): string[] | null {
    const values = [...new Set((statuses ?? []).map((status) => String(status).trim().toUpperCase()).filter(Boolean))].sort();
    return values.length ? values : null;
}

function bindingVariableNames(config: DashboardWidgetConfig): string[] {
    const bindings = config.bindings ?? {};
    const chart = config.chart ?? {};
    const fields = [
        bindings.argumentField,
        bindings.valueField,
        bindings.seriesField,
        ...(bindings.columnFields ?? []),
        chart.xField,
        chart.yField,
        ...(config.tableColumnKeys ?? '').split(','),
    ];
    return fields
        .map((field) => String(field ?? '').trim())
        .filter((field) => field.startsWith(VARIABLE_PREFIX))
        .map((field) => field.slice(VARIABLE_PREFIX.length));
}

/** What one widget needs from the process Query service; null when it does not read process data. */
export function needForWidget(config: DashboardWidgetConfig | null | undefined): WidgetDataNeed | null {
    if (!config?.id) {
        return null;
    }
    if (config.type === 'provider-cards') {
        const options = config.providerCardsOptions ?? {};
        const processQuery = { processDefinitionKey: 'medical-records', metricScope: 'root' as const, ...config.processQuery };
        const statuses = options.statuses?.filter(Boolean).length ? options.statuses : ACTIVE_PROCESS_STATUSES;
        return {
            widgetId: config.id,
            definitions: [...resolveProcessDefinitionKeys(processQuery)].sort(),
            statuses: normalizedStatuses(statuses),
            variables: providerRequiredVariables(options),
            allVariables: false,
        };
    }
    if (config.type === 'process-list') {
        // Open tasks belong to active medical-records roots; their variables come from the plan.
        const configured = config.processListOptions?.variables?.map((name) => name.trim()).filter(Boolean);
        return {
            widgetId: config.id,
            definitions: [...resolveProcessDefinitionKeys({ processDefinitionKey: 'medical-records', metricScope: 'root' })].sort(),
            statuses: ['RUNNING', 'SUSPENDED'],
            variables: [...new Set(configured?.length ? configured : PROCESS_LIST_DEFAULT_VARIABLES)].sort(),
            allVariables: false,
        };
    }
    if (resolveWidgetDataSource(config) !== 'process' || !['metric', 'gauge', 'chart', 'table'].includes(config.type)) {
        return null;
    }
    const processQuery = config.processQuery ?? {};
    const variables = [...new Set(bindingVariableNames(config))].sort();
    return {
        widgetId: config.id,
        definitions: [...resolveProcessDefinitionKeys(processQuery)].sort(),
        statuses: normalizedStatuses(processQuery.status),
        variables,
        allVariables: !!processQuery.includeProcessVariables && variables.length === 0,
    };
}

/** One process query covering every need: union of definitions and statuses (null = all). */
export function buildDataPlan(widgets: ReadonlyArray<DashboardWidgetConfig>): DataPlan | null {
    const needs = widgets.map((widget) => needForWidget(widget)).filter((need): need is WidgetDataNeed => !!need);
    if (!needs.length) {
        return null;
    }
    needs.sort((a, b) => a.widgetId.localeCompare(b.widgetId));
    const definitions = [...new Set(needs.flatMap((need) => need.definitions))].sort();
    const statuses = needs.some((need) => need.statuses === null)
        ? null
        : [...new Set(needs.flatMap((need) => need.statuses ?? []))].sort();
    return { signature: JSON.stringify({ definitions, statuses, needs }), definitions, statuses, needs };
}

/**
 * True when the plan's dataset can answer the need: either the plan was built for exactly this
 * widget configuration, or the need reads no variables and is a subset of the plan (definitions and
 * statuses) - e.g. the derived "completed" query of a ratio gauge.
 */
export function planCoversNeed(plan: DataPlan | null | undefined, need: WidgetDataNeed | null): boolean {
    if (!plan || !need) {
        return false;
    }
    const planned = plan.needs.find((entry) => entry.widgetId === need.widgetId);
    if (planned && JSON.stringify(planned) === JSON.stringify(need)) {
        return true;
    }
    if (need.allVariables || need.variables.length) {
        return false;
    }
    const definitions = plan.definitions.map((name) => name.toLowerCase());
    if (!need.definitions.every((name) => definitions.includes(name.toLowerCase()))) {
        return false;
    }
    if (plan.statuses === null) {
        return true;
    }
    return need.statuses !== null && need.statuses.every((status) => plan.statuses?.includes(status));
}

/**
 * Process variables the open-tasks list reads from each task's root process (title/subtitle from the
 * IDP batchState, account id, and the agent results shown as validation steps). Overridable per
 * widget with `processListOptions.variables`.
 */
export const PROCESS_LIST_DEFAULT_VARIABLES: readonly string[] = [
    'accountId',
    'batchState',
    'codingIntegrityResult',
    'complianceAlertResult',
    'financialVarianceResult',
    'medicalAccountId',
];

function rowDefinition(row: Record<string, unknown>): string {
    return String(row['processDefinitionName'] ?? '').trim().toLowerCase();
}

/** True when the row belongs to the need (definition and status). */
export function rowMatchesNeed(row: Record<string, unknown>, need: Pick<WidgetDataNeed, 'definitions' | 'statuses'>): boolean {
    const definition = rowDefinition(row);
    if (definition && !need.definitions.some((name) => name.toLowerCase() === definition)) {
        return false;
    }
    if (need.statuses) {
        return need.statuses.includes(String(row['status'] ?? '').toUpperCase());
    }
    return true;
}

/** The widget's slice of the shared dataset. */
export function rowsForNeed(
    rows: ReadonlyArray<Record<string, unknown>>,
    need: Pick<WidgetDataNeed, 'definitions' | 'statuses'>
): Array<Record<string, unknown>> {
    return rows.filter((row) => rowMatchesNeed(row, need));
}

export interface VariableTarget {
    /** Variable names to fetch for this instance; empty with `all` = every variable. */
    names: string[];
    all: boolean;
}

/**
 * Which instances need which variables: only rows matched by a widget that reads variables, newest
 * first, capped at `limit`. Rows nobody reads variables from are never enriched.
 */
export function planVariableTargets(
    rows: ReadonlyArray<Record<string, unknown>>,
    plan: DataPlan,
    limit: number
): Map<string, VariableTarget> {
    const variableNeeds = plan.needs.filter((need) => need.allVariables || need.variables.length > 0);
    const targets = new Map<string, VariableTarget>();
    if (!variableNeeds.length) {
        return targets;
    }
    for (const row of rows) {
        const id = String(row['id'] ?? '');
        if (!id) {
            continue;
        }
        const names = new Set<string>();
        let all = false;
        for (const need of variableNeeds) {
            if (rowMatchesNeed(row, need)) {
                need.variables.forEach((name) => names.add(name));
                all = all || need.allVariables;
            }
        }
        if (all || names.size) {
            targets.set(id, { names: [...names].sort(), all });
            if (targets.size >= limit) {
                break;
            }
        }
    }
    return targets;
}

/** Keeps only the requested `var_*` columns of an enriched row (all of them when `all`). */
export function keepRequestedVariables(row: Record<string, unknown>, target: VariableTarget): Record<string, unknown> {
    if (target.all) {
        return row;
    }
    const wanted = new Set(target.names.map((name) => VARIABLE_PREFIX + name));
    return Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith(VARIABLE_PREFIX) || wanted.has(key)));
}

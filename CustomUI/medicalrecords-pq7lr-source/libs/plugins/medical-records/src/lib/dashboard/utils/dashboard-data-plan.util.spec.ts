import { DashboardWidgetConfig } from '../definitions/dashboard-widget.model';
import {
    buildDataPlan,
    keepRequestedVariables,
    needForWidget,
    planCoversNeed,
    planVariableTargets,
    rowsForNeed,
} from './dashboard-data-plan.util';

const kpi = (id: string, status: string[] | undefined, tree = false): DashboardWidgetConfig =>
    ({
        id,
        type: 'metric',
        section: 'metrics',
        dataSource: 'process',
        title: id,
        processQuery: { processDefinitionKey: 'medical-records', metricScope: tree ? 'tree' : 'root', status },
    }) as DashboardWidgetConfig;

const providers: DashboardWidgetConfig = {
    id: 'providers',
    type: 'provider-cards',
    section: 'insights',
    title: 'Providers',
    providerCardsOptions: { idpVariable: 'batchState', summaryVariable: 'accountSummary', kpis: ['running'] },
} as DashboardWidgetConfig;

describe('dashboard data plan', () => {
    it('describes each widget need with named variables', () => {
        expect(needForWidget(providers)).toEqual({
            widgetId: 'providers',
            definitions: ['Process_1777481415500'],
            queryNames: ['Radicación', 'medical-records'],
            statuses: ['RUNNING', 'SUSPENDED'],
            variables: ['accountSummary', 'batchState'],
            allVariables: false,
        });
        expect(needForWidget(kpi('total', undefined))?.statuses).toBeNull();
        expect(needForWidget({ id: 'x', type: 'link-card', section: 'insights', title: 'x' } as DashboardWidgetConfig)).toBeNull();
    });

    it('unifies all widgets into one query (union of definitions and statuses)', () => {
        const plan = buildDataPlan([kpi('done', ['COMPLETED']), kpi('active', ['RUNNING', 'SUSPENDED']), providers]);
        // Legacy configs store the root by name: the plan uses the canonical key and queries every known name.
        expect(plan?.definitions).toEqual(['Process_1777481415500']);
        expect(plan?.queryNames).toEqual(['Radicación', 'medical-records']);
        expect(plan?.statuses).toEqual(['COMPLETED', 'RUNNING', 'SUSPENDED']);
        expect(buildDataPlan([kpi('done', ['COMPLETED']), kpi('total', undefined)])?.statuses).toBeNull();
    });

    it('serves planned widgets and variable-free subsets of the plan', () => {
        const plan = buildDataPlan([kpi('done', ['COMPLETED']), kpi('active', ['RUNNING', 'SUSPENDED'])]);
        expect(planCoversNeed(plan, needForWidget(kpi('done', ['COMPLETED'])))).toBe(true);
        // Derived query (e.g. a gauge numerator) inside the plan's statuses and definitions.
        expect(planCoversNeed(plan, needForWidget(kpi('other', ['RUNNING'])))).toBe(true);
        expect(planCoversNeed(plan, needForWidget(kpi('done', ['CANCELLED'])))).toBe(false);
        expect(planCoversNeed(plan, needForWidget(kpi('tree', ['COMPLETED'], true)))).toBe(false);
        // A widget reading variables is only served when planned with that exact configuration.
        expect(planCoversNeed(plan, needForWidget(providers))).toBe(false);
    });

    it('plans the variables of the open-tasks list', () => {
        const need = needForWidget({ id: 'tasks', type: 'process-list', section: 'tasks', title: 'Tasks' } as DashboardWidgetConfig);
        expect(need?.statuses).toEqual(['RUNNING', 'SUSPENDED']);
        expect(need?.variables).toContain('batchState');
        expect(need?.variables).not.toContain('caseJSON');
    });

    it('enriches only the rows a variable-reading widget needs', () => {
        const plan = buildDataPlan([kpi('done', ['COMPLETED']), providers]);
        const rows = [
            { id: 'a', status: 'RUNNING', processDefinitionName: 'medical-records' },
            { id: 'b', status: 'COMPLETED', processDefinitionName: 'medical-records' },
            { id: 'c', status: 'SUSPENDED', processDefinitionName: 'medical-records' },
        ];
        const targets = planVariableTargets(rows, plan!, 100);
        expect([...targets.keys()]).toEqual(['a', 'c']);
        expect(targets.get('a')).toEqual({ names: ['accountSummary', 'batchState'], all: false });
        expect(planVariableTargets(rows, plan!, 1).size).toBe(1);
        expect(rowsForNeed(rows, needForWidget(kpi('done', ['COMPLETED']))!).map((row) => row.id)).toEqual(['b']);
    });

    it('keeps only the requested variables of an enriched row', () => {
        const row = { id: 'a', var_batchState: '{}', var_caseJSON: '{"big":true}', var_accountSummary: '{}' };
        expect(keepRequestedVariables(row, { names: ['batchState'], all: false })).toEqual({ id: 'a', var_batchState: '{}' });
    });
});

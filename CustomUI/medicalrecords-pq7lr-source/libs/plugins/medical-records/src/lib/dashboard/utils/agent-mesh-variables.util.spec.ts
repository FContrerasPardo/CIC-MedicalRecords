import {
    agentStageProcessing,
    agentStageWaitingWithoutResults,
    isEmptyVariableValue,
    mergeProcessVariables,
    openTasks,
    reachedAutomateStage,
    selectLatestChildInstance,
} from './agent-mesh-variables.util';

describe('agent-mesh-variables.util', () => {
    describe('selectLatestChildInstance', () => {
        it('picks the most recent AgentMesh child and ignores other called processes', () => {
            const children = [
                { id: 'child-a', processDefinitionName: 'AgentMesh', status: 'COMPLETED', startDate: '2026-01-01T10:00:00Z' },
                { id: 'child-b', processDefinitionName: 'Document AI Process', status: 'RUNNING', startDate: '2026-01-03T10:00:00Z' },
                { id: 'child-c', processDefinitionName: 'AgentMesh', status: 'RUNNING', startDate: '2026-01-02T10:00:00Z' },
            ];
            expect(selectLatestChildInstance(children)?.id).toBe('child-c');
        });

        it('matches by definition key or BPMN id, case-insensitive', () => {
            expect(selectLatestChildInstance([{ id: 'k', processDefinitionKey: 'AGENTMESH-HK5KB' }])?.id).toBe('k');
            expect(selectLatestChildInstance([{ id: 'p', processDefinitionKey: 'Process_1777579089863' }])?.id).toBe('p');
        });

        it('returns null without a matching child with id', () => {
            expect(selectLatestChildInstance([])).toBeNull();
            expect(selectLatestChildInstance([{ processDefinitionName: 'AgentMesh' }])).toBeNull();
            expect(selectLatestChildInstance([{ id: 'x', processDefinitionName: 'initialize-batch' }])).toBeNull();
        });
    });

    describe('isEmptyVariableValue', () => {
        it('treats null, blank text and empty JSON as empty', () => {
            expect(isEmptyVariableValue(null)).toBe(true);
            expect(isEmptyVariableValue(undefined)).toBe(true);
            expect(isEmptyVariableValue('  ')).toBe(true);
            expect(isEmptyVariableValue('{}')).toBe(true);
            expect(isEmptyVariableValue([])).toBe(true);
            expect(isEmptyVariableValue({})).toBe(true);
        });

        it('keeps data, false and zero', () => {
            expect(isEmptyVariableValue({ findings: [] })).toBe(false);
            expect(isEmptyVariableValue('{"a":1}')).toBe(false);
            expect(isEmptyVariableValue(false)).toBe(false);
            expect(isEmptyVariableValue(0)).toBe(false);
        });
    });

    describe('mergeProcessVariables', () => {
        it('keeps root values and records their origin', () => {
            const merged = mergeProcessVariables({ codingIntegrityResult: { score: 1 } }, { codingIntegrityResult: { score: 2 } });
            expect(merged.variables['codingIntegrityResult']).toEqual({ score: 1 });
            expect(merged.origins['codingIntegrityResult']).toBe('root');
        });

        it('fills missing or empty root values from the child', () => {
            const merged = mergeProcessVariables(
                { batchState: { documents: [] }, unifiedWidgetPayloadText: '' },
                { unifiedWidgetPayloadText: '{"agents":[]}', complianceAlertResult: { findings: [] }, batchState: { other: true } }
            );
            expect(merged.variables['unifiedWidgetPayloadText']).toBe('{"agents":[]}');
            expect(merged.origins['unifiedWidgetPayloadText']).toBe('child');
            expect(merged.origins['complianceAlertResult']).toBe('child');
            expect(merged.variables['batchState']).toEqual({ documents: [] });
            expect(merged.origins['batchState']).toBe('root');
        });

        it('ignores empty child values and missing inputs', () => {
            const merged = mergeProcessVariables(null, { financialVarianceResult: null, agentRulesWidget: [] });
            expect(merged.variables).toEqual({});
            expect(mergeProcessVariables({ a: 1 }, undefined).variables).toEqual({ a: 1 });
        });
    });

    describe('openTasks', () => {
        it('keeps tasks that are not completed, cancelled or deleted', () => {
            const tasks = [
                { id: 't1', name: 'Validate Rules', status: 'COMPLETED' },
                { id: 't2', name: 'Analisys', status: 'ASSIGNED' },
                { id: 't3', name: 'Other', status: 'CANCELLED' },
                { name: 'No id', status: 'CREATED' },
            ];
            expect(openTasks(tasks).map((task) => task.id)).toEqual(['t2']);
        });
    });

    describe('reachedAutomateStage', () => {
        it('raises the stage to agent analysis once AgentMesh started', () => {
            expect(reachedAutomateStage('2_INTAKE', true)).toBe('4_AGENTS');
            expect(reachedAutomateStage(null, true)).toBe('4_AGENTS');
        });

        it('never lowers the stage and does nothing without AgentMesh', () => {
            expect(reachedAutomateStage('5_AUDIT', true)).toBe('5_AUDIT');
            expect(reachedAutomateStage('2_INTAKE', false)).toBe('2_INTAKE');
        });
    });

    describe('agent stage processing rule', () => {
        it('is processing while no agent answered and AgentMesh does not wait for the analyst', () => {
            expect(agentStageProcessing({ stage: '4_AGENTS', agentsAnswered: 0, agentMeshTaskOpen: false })).toBe(true);
        });

        it('stops processing when any agent answered', () => {
            expect(agentStageProcessing({ stage: '4_AGENTS', agentsAnswered: 1, agentMeshTaskOpen: false })).toBe(false);
        });

        it('stops processing when AgentMesh has an open user task, with the waiting notice', () => {
            const input = { stage: '4_AGENTS' as const, agentsAnswered: 0, agentMeshTaskOpen: true };
            expect(agentStageProcessing(input)).toBe(false);
            expect(agentStageWaitingWithoutResults(input)).toBe(true);
        });

        it('shows no notice once results are readable or outside the agent stage', () => {
            expect(agentStageWaitingWithoutResults({ stage: '4_AGENTS', agentsAnswered: 2, agentMeshTaskOpen: true })).toBe(false);
            expect(agentStageWaitingWithoutResults({ stage: '5_AUDIT', agentsAnswered: 0, agentMeshTaskOpen: true })).toBe(false);
            expect(agentStageProcessing({ stage: '2_INTAKE', agentsAnswered: 0, agentMeshTaskOpen: false })).toBe(false);
        });
    });
});

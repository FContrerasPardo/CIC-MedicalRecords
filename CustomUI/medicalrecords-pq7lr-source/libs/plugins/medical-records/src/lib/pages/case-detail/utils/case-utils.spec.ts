import { buildCaseQueryParams, pickKnown, readCaseRouteContext } from './case-navigation.util';
import { countByState, deriveValidationMap, hasValue, isPatientCaseTask, VALIDATION_STEP_ORDER } from './case-validation-map.util';

describe('case navigation', () => {
    it('prefers the root process instance and carries task and target', () => {
        const params = buildCaseQueryParams(
            { taskId: 't1', processInstanceId: 'sub', rootProcessInstanceId: 'root', taskProcessName: 'app' },
            { tab: 'summary', subTab: 'score' }
        );
        expect(params).toEqual({ processInstanceId: 'root', taskId: 't1', taskProcessName: 'app', tab: 'summary', sub: 'score' });
    });

    it('omits missing values and round-trips through the reader', () => {
        const params = buildCaseQueryParams({ taskId: 't1' });
        expect(params).toEqual({ taskId: 't1' });
        const context = readCaseRouteContext((key) => params[key] ?? null);
        expect(context.taskId).toBe('t1');
        expect(context.processInstanceId).toBeNull();
        expect(context.target).toBeNull();
    });

    it('ignores unknown tabs', () => {
        expect(pickKnown('documents', ['summary', 'documents'] as const)).toBe('documents');
        expect(pickKnown('nope', ['summary', 'documents'] as const)).toBeNull();
    });
});

describe('validation map', () => {
    it('keeps the process order', () => {
        const keys = deriveValidationMap({ taskType: 'intake', variables: {} }).map((step) => step.key);
        expect(keys).toEqual([...VALIDATION_STEP_ORDER]);
    });

    it('marks agent steps executed only when their variable has content', () => {
        const steps = deriveValidationMap({
            taskType: 'validateRules',
            variables: { complianceAlertResult: '{"a":1}', codingIntegrityResult: '{}', financialVarianceResult: null },
        });
        const state = (key: string) => steps.find((step) => step.key === key)?.state;
        expect(state('compliance')).toBe('executed');
        expect(state('medicalReport')).toBe('pending');
        expect(state('consolidation')).toBe('pending');
    });

    it('infers eligibility from the task stage and flags it as inferred', () => {
        const analysis = deriveValidationMap({ taskType: 'analysis', variables: {} }).find((step) => step.key === 'eligibility');
        expect(analysis).toEqual(expect.objectContaining({ state: 'executed', source: 'inferred' }));
        const intake = deriveValidationMap({ taskType: 'intake', variables: {} }).find((step) => step.key === 'eligibility');
        expect(intake?.state).toBe('pending');
    });

    it('blocks readiness on rejected documents (real) and otherwise stays a demo placeholder', () => {
        const blocked = deriveValidationMap({ taskType: 'intake', variables: { batchState: '{"hasRejectedDocuments":true}' } }).find((s) => s.key === 'readiness');
        expect(blocked).toEqual(expect.objectContaining({ state: 'blocking', source: 'real' }));
        const none = deriveValidationMap({ taskType: 'intake', variables: { batchState: 'not json' } }).find((s) => s.key === 'readiness');
        expect(none).toEqual(expect.objectContaining({ state: 'pending', source: 'demo' }));
    });

    it('counts states and detects patient tasks', () => {
        const steps = deriveValidationMap({ taskType: 'analysis', variables: { complianceAlertResult: { x: 1 } } });
        expect(countByState(steps)).toEqual({ executed: 2, pending: 3, blocking: 0 });
        expect(isPatientCaseTask('unknown')).toBe(false);
        expect(isPatientCaseTask('intake')).toBe(true);
        expect(hasValue('  ')).toBe(false);
    });
});

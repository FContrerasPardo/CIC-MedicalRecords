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
    it('follows the Automate flow order', () => {
        const keys = deriveValidationMap({ taskType: 'intake', variables: {} }).map((step) => step.key);
        expect(keys).toEqual([...VALIDATION_STEP_ORDER]);
        expect(keys[0]).toBe('documents');
    });

    it('opens the documents section from the documentary checklist', () => {
        const documents = deriveValidationMap({ taskType: 'intake', variables: {} })[0];
        expect(documents.target).toEqual({ tab: 'documents' });
        expect(documents.state).toBe('pending');
    });

    it('infers checklist and rules from the stage of the open task', () => {
        const state = (taskType: 'intake' | 'validateRules' | 'analysis', key: string) =>
            deriveValidationMap({ taskType, variables: {} }).find((step) => step.key === key)?.state;
        expect(state('validateRules', 'documents')).toBe('executed');
        expect(state('validateRules', 'rules')).toBe('pending');
        expect(state('analysis', 'rules')).toBe('executed');
    });

    it('blocks the checklist while documents need review or were rejected', () => {
        const rejected = deriveValidationMap({ taskType: 'analysis', variables: { batchState: '{"hasRejectedDocuments":true}' } })[0];
        expect(rejected.state).toBe('blocking');
        expect(rejected.source).toBe('real');
        const review = deriveValidationMap({
            taskType: 'intake',
            variables: { batchState: { documents: [{ extractionReviewStatus: 'ReviewRequired' }] } },
        })[0];
        expect(review.state).toBe('blocking');
    });

    it('marks agent steps executed only when their result has content', () => {
        const steps = deriveValidationMap({
            taskType: 'analysis',
            variables: { complianceAlertResult: '{"a":1}', codingIntegrityResult: '{}', financialVarianceResult: null },
        });
        const state = (key: string) => steps.find((step) => step.key === key)?.state;
        expect(state('compliance')).toBe('executed');
        expect(state('coding')).toBe('pending');
        expect(state('financial')).toBe('pending');
        expect(countByState(steps)).toEqual({ executed: 3, pending: 2, blocking: 0 });
        expect(isPatientCaseTask('unknown')).toBe(false);
        expect(hasValue('  ')).toBe(false);
    });
});

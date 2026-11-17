import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';
import { buildListEntries, resolveCaseKey } from './case-grouping.util';

// Synthetic data only.
const task = (id: string, taskType: ProcessAttentionItem['taskType'], reference: ProcessAttentionItem['nativeReference'], title = 'Synthetic Patient A'): ProcessAttentionItem => ({
    id,
    icon: 'task',
    tone: 'blue',
    title,
    subtitle: '',
    meta: '',
    taskName: id,
    taskType,
    taskStatus: 'CREATED',
    processVariables: {},
    nativeReference: reference,
});

describe('case grouping', () => {
    it('groups tasks of the same root process even when the names differ', () => {
        const entries = buildListEntries([
            task('t-analysis', 'analysis', { rootProcessInstanceId: 'root-1' }, 'Synthetic Patient A'),
            task('t-intake', 'intake', { rootProcessInstanceId: 'root-1' }, 'Synthetic Pacient A'),
            task('t-other', 'intake', { rootProcessInstanceId: 'root-2' }, 'Synthetic Patient A'),
        ]);
        expect(entries.length).toBe(2);
        const first = entries[0];
        expect(first.kind).toBe('case');
        if (first.kind === 'case') {
            expect(first.group.items.map((item) => item.id)).toEqual(['t-intake', 't-analysis']);
            expect(first.group.primary.id).toBe('t-analysis');
            expect(first.group.stage).toBe('analysis');
        }
    });

    it('keeps non-patient tasks as individual entries in their original position', () => {
        const entries = buildListEntries([
            task('x1', 'unknown', { rootProcessInstanceId: 'root-1' }),
            task('t1', 'intake', { rootProcessInstanceId: 'root-1' }),
            task('x2', 'unknown', { rootProcessInstanceId: 'root-1' }),
        ]);
        expect(entries.map((entry) => entry.kind)).toEqual(['task', 'case', 'task']);
    });

    it('falls back to account variable, process instance and task id', () => {
        const withAccount = task('a', 'intake', {});
        withAccount.processVariables = { accountId: 'ACC-1' };
        expect(resolveCaseKey(withAccount)).toBe('account:ACC-1');
        expect(resolveCaseKey(task('b', 'intake', { processInstanceId: 'p-9' }))).toBe('process:p-9');
        expect(resolveCaseKey(task('c', 'intake', {}))).toBe('task:c');
    });
});

import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';
import { buildDistributionCells } from './operations-distribution-band.util';

function item(overrides: Partial<ProcessAttentionItem>): ProcessAttentionItem {
    return {
        id: 'task',
        icon: 'task',
        tone: 'blue',
        title: 'Account',
        subtitle: '',
        meta: '',
        taskName: 'Task',
        taskType: 'intake',
        taskStatus: 'CREATED',
        processVariables: {},
        nativeReference: {},
        ...overrides,
    } as ProcessAttentionItem;
}

describe('buildDistributionCells', () => {
    it('returns zeros for an empty queue', () => {
        const cells = buildDistributionCells([]);

        expect(cells.map((cell) => cell.key)).toEqual(['open', 'unassigned', 'assigned', 'critical', 'intake', 'rules', 'analysis']);
        expect(cells.every((cell) => cell.value === 0)).toBe(true);
    });

    it('counts open tasks by status, criticality and type', () => {
        const cells = buildDistributionCells([
            item({ id: '1', taskStatus: 'CREATED', taskType: 'intake' }),
            item({ id: '2', taskStatus: 'ASSIGNED', taskType: 'validateRules', tone: 'red' }),
            item({ id: '3', taskStatus: 'ASSIGNED', taskType: 'analysis', tone: 'red' }),
            item({ id: '4', taskStatus: 'CREATED', taskType: 'unknown' }),
        ]);
        const value = (key: string) => cells.find((cell) => cell.key === key)?.value;

        expect(value('open')).toBe(4);
        expect(value('unassigned')).toBe(2);
        expect(value('assigned')).toBe(2);
        expect(value('critical')).toBe(2);
        expect(value('intake')).toBe(1);
        expect(value('rules')).toBe(1);
        expect(value('analysis')).toBe(1);
    });
});

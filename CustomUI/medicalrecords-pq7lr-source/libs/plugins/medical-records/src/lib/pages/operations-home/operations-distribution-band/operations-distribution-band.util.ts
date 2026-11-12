import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';

export interface DistributionCell {
    key: string;
    labelKey: string;
    value: number;
    tone?: 'critical';
}

/** Counts derived from the open tasks the dashboard widgets already load. */
export function buildDistributionCells(items: ProcessAttentionItem[]): DistributionCell[] {
    const count = (predicate: (item: ProcessAttentionItem) => boolean): number => items.filter(predicate).length;
    return [
        { key: 'open', labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.DISTRIBUTION.OPEN', value: items.length },
        {
            key: 'unassigned',
            labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.DISTRIBUTION.UNASSIGNED',
            value: count((item) => item.taskStatus === 'CREATED'),
        },
        {
            key: 'assigned',
            labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.DISTRIBUTION.ASSIGNED',
            value: count((item) => item.taskStatus === 'ASSIGNED'),
        },
        {
            key: 'critical',
            labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.DISTRIBUTION.CRITICAL',
            value: count((item) => item.tone === 'red'),
            tone: 'critical',
        },
        {
            key: 'intake',
            labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.DISTRIBUTION.INTAKE',
            value: count((item) => item.taskType === 'intake'),
        },
        {
            key: 'rules',
            labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.DISTRIBUTION.RULES',
            value: count((item) => item.taskType === 'validateRules'),
        },
        {
            key: 'analysis',
            labelKey: 'MEDICAL_RECORDS.OPERATIONS_HOME.DISTRIBUTION.ANALYSIS',
            value: count((item) => item.taskType === 'analysis'),
        },
    ];
}

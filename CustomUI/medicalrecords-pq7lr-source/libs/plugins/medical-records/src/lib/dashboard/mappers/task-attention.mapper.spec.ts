import { mapTaskToAttentionItem, matchesMedicalRecordsTask } from '../mappers/task-attention.mapper';

describe('mapTaskToAttentionItem', () => {
    it('maps batchState and task metadata into an attention item with task navigation', () => {
        const item = mapTaskToAttentionItem(
            {
                id: 'task-123',
                name: 'Intake Review',
                status: 'ASSIGNED',
                processInstanceId: 'sub-proc-1',
                rootProcessInstanceId: 'root-proc-99',
                processDefinitionKey: 'medical-records',
                createdDate: '2026-06-01T10:00:00.000Z',
                assignee: 'demo.user',
            },
            {
                batchState: JSON.stringify({
                    documents: [
                        {
                            id: 'doc-1',
                            name: 'Invoice.pdf',
                            fields: [
                                { name: 'Patient Name', value: 'Maria Daniela Martinez' },
                                { name: 'Insurance Plan', value: 'ARS Primera' },
                            ],
                            extractionReviewStatus: 'ReviewRequired',
                        },
                    ],
                }),
                accountId: 'ACC-2026-8901',
            },
            'medical-records-app'
        );

        expect(item.title).toContain('Maria Daniela Martinez');
        expect(item.subtitle).toContain('Intake Review');
        expect(item.subtitle).toContain('ARS Primera');
        expect(item.subtitle).toContain('ACC-2026-8901');
        expect(item.nativeReference.taskId).toBe('task-123');
        expect(item.nativeReference.taskProcessName).toBe('medical-records-app');
        expect(item.nativeReference.processInstanceId).toBe('root-proc-99');
        expect(item.taskType).toBe('intake');
        expect(item.taskStatus).toBe('ASSIGNED');
        expect(item.tone).toBe('red');
    });

    it('falls back to task name when batchState is missing', () => {
        const item = mapTaskToAttentionItem(
            {
                id: 'task-999',
                name: 'Analysis Task',
                status: 'CREATED',
                processInstanceId: 'proc-1',
                processDefinitionKey: 'medical-records',
            },
            {},
            'medical-records-app'
        );

        expect(item.title).toContain('Analysis Task');
        expect(item.subtitle).toContain('Analysis Task');
        expect(item.icon).toBe('pending_actions');
        expect(item.nativeReference.processInstanceId).toBe('proc-1');
    });
});

describe('matchesMedicalRecordsTask', () => {
    const rootIds = new Set(['root-proc-1']);

    it('accepts medical-records tasks and subprocess tasks linked to a medical-records root', () => {
        expect(matchesMedicalRecordsTask({ id: '1', processDefinitionKey: 'medical-records' }, rootIds)).toBe(true);
        expect(
            matchesMedicalRecordsTask(
                { id: '2', processDefinitionKey: 'AgentMesh', rootProcessInstanceId: 'root-proc-1' },
                rootIds
            )
        ).toBe(true);
        expect(matchesMedicalRecordsTask({ id: '3', processDefinitionKey: 'other-process' }, rootIds)).toBe(false);
    });
});

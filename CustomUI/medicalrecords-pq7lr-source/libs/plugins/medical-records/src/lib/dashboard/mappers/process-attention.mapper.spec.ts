import { mapProcessToAttentionItem } from '../mappers/process-attention.mapper';

describe('mapProcessToAttentionItem', () => {
    it('maps batchState variables into an attention item', () => {
        const item = mapProcessToAttentionItem(
            { id: 'proc-123', name: 'Medical intake', status: 'RUNNING', processDefinitionKey: 'medical-records' },
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
            }
        );

        expect(item.title).toContain('Maria Daniela Martinez');
        expect(item.subtitle).toContain('ARS Primera');
        expect(item.nativeReference.processInstanceId).toBe('proc-123');
        expect(item.tone).toBe('red');
    });

    it('falls back to process metadata when batchState is missing', () => {
        const item = mapProcessToAttentionItem(
            { id: 'proc-999', name: 'Medical intake', status: 'SUSPENDED', processDefinitionKey: 'medical-records', startDate: '2026-06-01T10:00:00.000Z' },
            {}
        );

        expect(item.title).toContain('Medical intake');
        expect(item.subtitle).toContain('Active medical-records process instance');
        expect(item.icon).toBe('pause_circle');
    });
});

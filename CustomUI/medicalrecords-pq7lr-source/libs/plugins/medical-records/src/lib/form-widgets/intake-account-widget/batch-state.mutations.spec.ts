import {
    isDocumentReviewPending,
    markAllPendingReviewsComplete,
    markDocumentReviewComplete,
} from './batch-state.mutations';
import { BatchStateSource } from './batch-state.model';

const objectionDocumentId = 'c3b4c618-0d62-49a3-9650-1a18ea944002';

function buildFixtureBatchState(): BatchStateSource {
    return {
        extractionStatus: 'ReviewRequired',
        documents: [
            {
                id: 'doc-complete',
                name: 'Invoice',
                extractionReviewStatus: 'ReviewNotRequired',
                fields: [{ name: 'Record', value: '1', extractionReviewStatus: 'ReviewNotRequired' }],
            },
            {
                id: objectionDocumentId,
                name: 'Formulario de Objeciones',
                className: 'Formulario de Objeciones Auditoría Médica',
                extractionReviewStatus: 'ReviewRequired',
                fields: [
                    { name: 'No. Autorización', value: '9089941', extractionReviewStatus: 'ReviewRequired' },
                    { name: 'Valor Total Glosado', value: '$4260.47', extractionReviewStatus: 'ReviewRequired' },
                ],
                tables: [],
            },
        ],
    };
}

describe('batch-state.mutations', () => {
    it('detects review pending at document and field level', () => {
        const batchState = buildFixtureBatchState();
        const pending = batchState.documents?.[1];

        expect(pending && isDocumentReviewPending(pending)).toBe(true);
    });

    it('markAllPendingReviewsComplete clears all pending documents and batch extractionStatus', () => {
        const next = markAllPendingReviewsComplete(buildFixtureBatchState());
        const objection = next.documents?.find((document) => document.id === objectionDocumentId);

        expect(next.extractionStatus).toBe('Extracted');
        expect(objection?.extractionReviewStatus).toBe('ReviewNotRequired');
        expect(objection?.fields?.every((field) => field.extractionReviewStatus === 'ReviewNotRequired')).toBe(true);
        expect((next.documents ?? []).some(isDocumentReviewPending)).toBe(false);
    });

    it('markDocumentReviewComplete syncs batch extractionStatus for a single document', () => {
        const next = markDocumentReviewComplete(buildFixtureBatchState(), objectionDocumentId);

        expect(next.extractionStatus).toBe('Extracted');
        expect((next.documents ?? []).some(isDocumentReviewPending)).toBe(false);
    });
});

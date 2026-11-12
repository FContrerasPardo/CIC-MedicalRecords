import { IntakeAccountDocumentItemViewModel } from '../../form-widgets/intake-account-widget/intake-account-view.model';
import { BatchStateCaseDetailProvider, toCaseDocument } from './batch-state-case-detail.provider';

const item = (overrides: Partial<IntakeAccountDocumentItemViewModel>): IntakeAccountDocumentItemViewModel => ({
    id: 'd1',
    name: 'report.pdf',
    className: 'Medical report',
    repositoryNodeId: 'node-1',
    mimeType: 'application/pdf',
    contentFileReferenceIndex: 2,
    sourcePageIndex: 0,
    status: 'Complete',
    classificationStatus: 'Classified',
    extractionStatus: 'Extracted',
    classificationConfidence: 90,
    extractionReviewStatus: null,
    separationReviewStatus: null,
    extractedHighlights: [],
    tone: 'success',
    viewLabel: 'View document',
    ...overrides,
});

describe('batchState case documents', () => {
    it('keeps node id and mime type so the viewer can download the file', () => {
        const doc = toCaseDocument(item({}));
        expect(doc.nodeId).toBe('node-1');
        expect(doc.mimeType).toBe('application/pdf');
        expect(doc.classification).toBe('attached');
        expect(doc.referenceKey).toBe('Ref 2 · p. 1');
    });

    it('marks documents without a repository reference as not previewable', () => {
        const doc = toCaseDocument(item({ repositoryNodeId: null, mimeType: null, contentFileReferenceIndex: null, sourcePageIndex: null }));
        expect(doc.nodeId).toBeNull();
        expect(doc.classification).toBe('transcribed');
        expect(doc.referenceKey).toBe('—');
    });

    it('falls back to the demo case when there is no batchState', () => {
        const detail = new BatchStateCaseDetailProvider(null).getCase();
        expect(detail.documents.every((doc) => !doc.nodeId)).toBe(true);
    });
});

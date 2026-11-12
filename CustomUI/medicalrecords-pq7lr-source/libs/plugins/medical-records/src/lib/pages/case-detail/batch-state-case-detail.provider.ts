import { BatchStateSource } from '../../form-widgets/intake-account-widget/batch-state.model';
import { mapBatchStateToIntakeAccountViewModel } from '../../form-widgets/intake-account-widget/batch-state.mapper';
import { IntakeAccountDocumentItemViewModel } from '../../form-widgets/intake-account-widget/intake-account-view.model';
import { CaseDetailDataProvider, MockCaseDetailDataProvider } from './case-detail-data.provider';
import { CaseDetail, CaseDocument } from './case-detail.model';

/** Maps one batchState document (already resolved by the intake mapper) to a case document row. */
export function toCaseDocument(item: IntakeAccountDocumentItemViewModel): CaseDocument {
    const reference: string[] = [];
    if (item.contentFileReferenceIndex !== null) {
        reference.push(`Ref ${item.contentFileReferenceIndex}`);
    }
    if (item.sourcePageIndex !== null) {
        reference.push(`p. ${item.sourcePageIndex + 1}`);
    }

    return {
        categoryKey: item.className,
        name: item.name,
        classification: item.repositoryNodeId ? 'attached' : 'transcribed',
        classificationKey: item.status,
        date: null,
        originKey: item.extractionStatus,
        referenceKey: reference.join(' · ') || '—',
        nodeId: item.repositoryNodeId,
        mimeType: item.mimeType,
    };
}

/** Accepts the object or the JSON string Automate may deliver. */
export function parseBatchState(value: unknown): BatchStateSource | null {
    if (!value) {
        return null;
    }
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as BatchStateSource;
        } catch {
            return null;
        }
    }
    return typeof value === 'object' ? (value as BatchStateSource) : null;
}

export function mapBatchStateToCaseDocuments(batchState: BatchStateSource): CaseDocument[] {
    return mapBatchStateToIntakeAccountViewModel(batchState, null).documents.map(toCaseDocument);
}

/**
 * Real documents from the task's batchState; every other section is still the demo mock
 * until its Automate variable is wired. Only the first patient cluster is listed in v1.
 */
export class BatchStateCaseDetailProvider implements CaseDetailDataProvider {
    constructor(private readonly batchState: BatchStateSource | null) {}

    getCase(): CaseDetail {
        const base = new MockCaseDetailDataProvider().getCase();
        if (!this.batchState) {
            return base;
        }
        return { ...base, documentsNoticeKey: undefined, documents: mapBatchStateToCaseDocuments(this.batchState) };
    }
}

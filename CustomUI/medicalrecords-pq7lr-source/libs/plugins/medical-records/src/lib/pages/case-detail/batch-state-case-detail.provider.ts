import { BatchStateSource } from '../../form-widgets/intake-account-widget/batch-state.model';
import { buildDocumentItemsFor, mapBatchStateToIntakeAccountViewModel } from '../../form-widgets/intake-account-widget/batch-state.mapper';
import { IntakeAccountDocumentItemViewModel } from '../../form-widgets/intake-account-widget/intake-account-view.model';
import { CaseDetailDataProvider, MockCaseDetailDataProvider } from './case-detail-data.provider';
import { CaseDetail, CaseDocument } from './case-detail.model';
import { CaseInvoiceOption } from './utils/case-invoice.util';

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

/**
 * Documents of the account: those of one customer invoice (the invoice and its supporting
 * documents, as grouped by the IDP account mapping) or, without a selection, the intake view.
 */
export function mapBatchStateToCaseDocuments(batchState: BatchStateSource, documentIds: readonly string[] | null = null): CaseDocument[] {
    const items = documentIds ? buildDocumentItemsFor(batchState, documentIds) : mapBatchStateToIntakeAccountViewModel(batchState, null).documents;
    return items.map(toCaseDocument);
}

/**
 * Real documents from the task's batchState; every other section is still the demo mock
 * until its Automate variable is wired. The account may bring several customer invoices (one per
 * patient); the selected invoice decides the patient and documents shown.
 */
export class BatchStateCaseDetailProvider implements CaseDetailDataProvider {
    constructor(
        private readonly batchState: BatchStateSource | null,
        private readonly invoice: CaseInvoiceOption | null = null
    ) {}

    getCase(): CaseDetail {
        const base = new MockCaseDetailDataProvider().getCase();
        if (!this.batchState) {
            return base;
        }
        return {
            ...base,
            patientName: this.invoice?.patientName ?? base.patientName,
            documentsNoticeKey: undefined,
            documents: mapBatchStateToCaseDocuments(this.batchState, this.invoice?.documentIds ?? null),
        };
    }
}

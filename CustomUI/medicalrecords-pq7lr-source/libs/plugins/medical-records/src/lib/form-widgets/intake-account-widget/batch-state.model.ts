export type IdpBatchStageStatus = 'Awaiting' | 'Separated' | 'Classified' | 'Extracted' | 'ReviewRequired';

export type IdpReviewStatus = 'ReviewRequired' | 'ReviewNotRequired';

export interface BatchStateContentFileReference {
    sys_id: string;
    [key: string]: unknown;
}

export interface BatchStateField {
    id?: string;
    name?: string;
    value?: string | number | boolean | null;
    extractionConfidence?: number;
    extractionReviewStatus?: IdpReviewStatus;
    [key: string]: unknown;
}

export interface BatchStateTableCell {
    recordName?: string;
    name?: string;
    value?: string | number | boolean | null;
    [key: string]: unknown;
}

export interface BatchStateTableRow {
    records?: BatchStateTableCell[];
    [key: string]: unknown;
}

export interface BatchStateTable {
    id?: string;
    name?: string;
    records?: BatchStateTableRow[];
    extractionConfidence?: number;
    reviewStatus?: string;
    [key: string]: unknown;
}

export interface BatchStateDocumentPage {
    contentFileReferenceIndex?: number;
    sourcePageIndex?: number;
    [key: string]: unknown;
}

export interface BatchStateDocument {
    id: string;
    name: string;
    className?: string;
    classificationConfidence?: number;
    classificationReviewStatus?: IdpReviewStatus;
    extractionReviewStatus?: IdpReviewStatus;
    separationReviewStatus?: IdpReviewStatus;
    markAsRejected?: boolean;
    pages?: BatchStateDocumentPage[];
    fields?: BatchStateField[];
    tables?: BatchStateTable[];
    createdAt?: string;
    receivedAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface BatchStateSource {
    documents?: BatchStateDocument[];
    fields?: BatchStateField[];
    tables?: BatchStateTable[];
    extractionStatus?: IdpBatchStageStatus;
    separationStatus?: IdpBatchStageStatus;
    classificationStatus?: IdpBatchStageStatus;
    hasRejectedDocuments?: boolean;
    contentFileReferences?: BatchStateContentFileReference[];
    [key: string]: unknown;
}

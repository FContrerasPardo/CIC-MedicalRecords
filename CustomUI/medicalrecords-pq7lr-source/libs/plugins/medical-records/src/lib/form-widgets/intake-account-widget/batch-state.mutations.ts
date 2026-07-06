import {
    getPatientClusterSnapshots,
    INTAKE_PATIENT_FIELD_ALIASES,
    PatientClusterSnapshot,
} from './batch-state.mapper';
import {
    BatchStateDocument,
    BatchStateField,
    BatchStateSource,
    BatchStateTable,
    IdpReviewStatus,
} from './batch-state.model';

const SERVICE_TABLE_NAME = 'Tabla de Servicios facturados';
const REVIEW_NOT_REQUIRED: IdpReviewStatus = 'ReviewNotRequired';

function cloneBatchState(batchState: BatchStateSource): BatchStateSource {
    return JSON.parse(JSON.stringify(batchState)) as BatchStateSource;
}

function normalizeKey(value: unknown): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toUpperCase();
}

function findFieldByAliases(fields: BatchStateField[] | undefined, aliases: readonly string[]): BatchStateField | null {
    if (!fields?.length) {
        return null;
    }

    const normalizedAliases = aliases.map(normalizeKey);
    return fields.find((field) => normalizedAliases.includes(normalizeKey(field.name || field.id))) ?? null;
}

function setFieldValueByAliases(
    fields: BatchStateField[] | undefined,
    aliases: readonly string[],
    value: string
): BatchStateField[] {
    const nextFields = [...(fields ?? [])];
    const existing = findFieldByAliases(nextFields, aliases);

    if (existing) {
        existing.value = value;
        return nextFields;
    }

    nextFields.push({
        id: aliases[0],
        name: aliases[0],
        value,
    });

    return nextFields;
}

function getClusterSnapshot(clusters: PatientClusterSnapshot[], clusterKey: string): PatientClusterSnapshot | null {
    return clusters.find((cluster) => cluster.key === clusterKey) ?? null;
}

function getDocumentsForCluster(batchState: BatchStateSource, cluster: PatientClusterSnapshot): BatchStateDocument[] {
    const documents = batchState.documents ?? [];
    const ids = new Set(cluster.documentIds);
    return documents.filter((document) => ids.has(document.id));
}

function applyPatientNameToDocument(document: BatchStateDocument, canonicalName: string): void {
    document.fields = setFieldValueByAliases(document.fields, INTAKE_PATIENT_FIELD_ALIASES.patientName, canonicalName);

    const tables = document.tables ?? [];
    for (const table of tables) {
        if (normalizeKey(table.name) !== normalizeKey(SERVICE_TABLE_NAME)) {
            continue;
        }

        for (const row of table.records ?? []) {
            for (const cell of row.records ?? []) {
                const cellKey = normalizeKey(cell.recordName ?? cell.name);
                if (cellKey === 'PACIENTE') {
                    cell.value = canonicalName;
                }
            }
        }
    }
}

function applyPatientIdentityToDocument(
    document: BatchStateDocument,
    patientId: string | null,
    mrn: string | null
): void {
    if (patientId) {
        document.fields = setFieldValueByAliases(document.fields, INTAKE_PATIENT_FIELD_ALIASES.patientId, patientId);
    }

    if (mrn) {
        document.fields = setFieldValueByAliases(document.fields, INTAKE_PATIENT_FIELD_ALIASES.mrn, mrn);
    }
}

function markDocumentReviewFieldsComplete(document: BatchStateDocument): void {
    document.extractionReviewStatus = REVIEW_NOT_REQUIRED;
    document.classificationReviewStatus = REVIEW_NOT_REQUIRED;
    document.separationReviewStatus = REVIEW_NOT_REQUIRED;

    document.fields = (document.fields ?? []).map((field) => ({
        ...field,
        extractionReviewStatus: REVIEW_NOT_REQUIRED,
    }));

    document.tables = (document.tables ?? []).map((table) => markTableReviewComplete(table));
}

function markTableReviewComplete(table: BatchStateTable): BatchStateTable {
    return {
        ...table,
        reviewStatus: REVIEW_NOT_REQUIRED,
        records: (table.records ?? []).map((row) => ({
            ...row,
            records: (row.records ?? []).map((cell) => ({
                ...cell,
                extractionReviewStatus: REVIEW_NOT_REQUIRED,
            })),
        })),
    };
}

export function isDocumentReviewPending(document: BatchStateDocument): boolean {
    if (document.markAsRejected) {
        return false;
    }

    return document.classificationReviewStatus === 'ReviewRequired'
        || document.extractionReviewStatus === 'ReviewRequired'
        || document.separationReviewStatus === 'ReviewRequired'
        || (document.fields ?? []).some((field) => field.extractionReviewStatus === 'ReviewRequired')
        || (document.tables ?? []).some((table) => table.reviewStatus === 'ReviewRequired');
}

function hasExtractedDocumentContent(batchState: BatchStateSource): boolean {
    return (batchState.documents ?? []).some(
        (document) => (document.fields?.length ?? 0) > 0 || (document.tables?.length ?? 0) > 0
    );
}

function syncBatchReviewStatus(batchState: BatchStateSource): void {
    const hasPendingDocumentReview = (batchState.documents ?? []).some(isDocumentReviewPending);

    if (hasPendingDocumentReview) {
        if (hasExtractedDocumentContent(batchState)) {
            batchState.extractionStatus = 'ReviewRequired';
        }
        return;
    }

    if (batchState.extractionStatus === 'ReviewRequired') {
        batchState.extractionStatus = hasExtractedDocumentContent(batchState) ? 'Extracted' : batchState.extractionStatus;
    }
}

export function applyCanonicalPatientName(
    batchState: BatchStateSource,
    clusterKey: string,
    canonicalName: string
): BatchStateSource {
    const trimmedName = canonicalName.trim();
    if (!trimmedName) {
        return batchState;
    }

    const next = cloneBatchState(batchState);
    const cluster = getClusterSnapshot(getPatientClusterSnapshots(next), clusterKey);
    if (!cluster) {
        return batchState;
    }

    for (const document of getDocumentsForCluster(next, cluster)) {
        applyPatientNameToDocument(document, trimmedName);
    }

    return next;
}

export function markDocumentReviewComplete(batchState: BatchStateSource, documentId: string): BatchStateSource {
    const next = cloneBatchState(batchState);
    const document = (next.documents ?? []).find((entry) => entry.id === documentId);

    if (!document) {
        return batchState;
    }

    markDocumentReviewFieldsComplete(document);
    syncBatchReviewStatus(next);
    return next;
}

export function markServiceReviewComplete(batchState: BatchStateSource, serviceId: string): BatchStateSource {
    const match = /^(.+)-service-(\d+)$/.exec(serviceId);
    if (!match) {
        return batchState;
    }

    const [, documentId] = match;
    return markDocumentReviewComplete(batchState, documentId);
}

export function mergePatientClusters(
    batchState: BatchStateSource,
    targetKey: string,
    sourceKey: string
): BatchStateSource {
    if (!targetKey || !sourceKey || targetKey === sourceKey) {
        return batchState;
    }

    const next = cloneBatchState(batchState);
    const clusters = getPatientClusterSnapshots(next);
    const target = getClusterSnapshot(clusters, targetKey);
    const source = getClusterSnapshot(clusters, sourceKey);

    if (!target || !source) {
        return batchState;
    }

    for (const document of getDocumentsForCluster(next, source)) {
        applyPatientIdentityToDocument(document, target.patientId, target.mrn);
    }

    return next;
}

export function markAllPendingReviewsComplete(batchState: BatchStateSource): BatchStateSource {
    const next = cloneBatchState(batchState);

    for (const document of next.documents ?? []) {
        if (isDocumentReviewPending(document)) {
            markDocumentReviewFieldsComplete(document);
        }
    }

    syncBatchReviewStatus(next);
    return next;
}

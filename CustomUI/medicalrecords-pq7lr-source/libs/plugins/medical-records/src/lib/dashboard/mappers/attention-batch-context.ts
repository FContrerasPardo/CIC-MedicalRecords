import { BatchStateField, BatchStateSource } from '../../form-widgets/intake-account-widget/batch-state.model';

const PATIENT_FIELD_NAMES = ['patientname', 'patient name', 'nombre paciente', 'nombre del paciente'];
const INSURER_FIELD_NAMES = ['insuranceplan', 'insurance plan', 'insurer', 'aseguradora', 'plan'];

export interface BatchAttentionContext {
    patientName: string | null;
    insurer: string | null;
    reviewRequired: boolean;
}

export function extractBatchContext(raw: unknown): BatchAttentionContext {
    const batchState = parseBatchState(raw);
    if (!batchState) {
        return { patientName: null, insurer: null, reviewRequired: false };
    }

    const documents = batchState.documents ?? [];
    const fields = [...(batchState.fields ?? []), ...documents.flatMap((document) => document.fields ?? [])];

    return {
        patientName: findFieldValue(fields, PATIENT_FIELD_NAMES),
        insurer: findFieldValue(fields, INSURER_FIELD_NAMES),
        reviewRequired: documents.some(
            (document) =>
                document.extractionReviewStatus === 'ReviewRequired' ||
                document.classificationReviewStatus === 'ReviewRequired' ||
                document.separationReviewStatus === 'ReviewRequired'
        ),
    };
}

function parseBatchState(raw: unknown): BatchStateSource | null {
    if (!raw) {
        return null;
    }

    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as BatchStateSource;
        } catch {
            return null;
        }
    }

    if (typeof raw === 'object') {
        return raw as BatchStateSource;
    }

    return null;
}

function findFieldValue(fields: BatchStateField[], candidates: string[]): string | null {
    for (const field of fields) {
        const label = stringify(field.name)?.toLowerCase() ?? '';
        if (candidates.some((candidate) => label.includes(candidate))) {
            const value = stringify(field.value);
            if (value) {
                return value;
            }
        }
    }

    return null;
}

export function stringify(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    const normalized = String(value).trim();
    return normalized || undefined;
}

export function shortId(value: string): string {
    return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

export function formatStartedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

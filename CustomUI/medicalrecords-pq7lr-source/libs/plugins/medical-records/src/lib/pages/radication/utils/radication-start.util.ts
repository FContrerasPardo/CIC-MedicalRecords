import { activeProcessMapping, ProcessMapping, processRoleOf } from '../../../dashboard/definitions/process-mapping';

/**
 * Contract of the "Document Upload" start form of the `medical-records` process
 * (`document-upload-tricp`). Field IDs come from the Automate export; `MedRecNum` and `Email`
 * were added in Automate (required, read only) and are filled by the radication page.
 * The account always goes to our ARS, so the payer is not asked.
 */
export const RADICATION_START_FORM = {
    /** Label for the technical view only: the root is chosen by the process mapping (key first). */
    processName: 'medical-records',
    formKey: 'form-dff85f23-5d64-4f3c-944d-d0762d52e4c7',
    fields: {
        radicationNumber: 'MedRecNum',
        email: 'Email',
        documents: 'Attachfile0ou9kk',
        /**
         * Optional hidden text field mapped to the process input `language` (as CIC-Fin's start form):
         * the agents answer in the UI language. Sent only when the deployed form declares it.
         */
        language: 'Text0aiukv',
    },
    /** Destination folder of the form's upload field (same as the native "Attach file"). */
    uploadFolderPath: '/MedRec/Temp',
    /** Content type of the form's upload field. */
    contentType: 'SysFile',
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const RADICATION_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const RADICATION_ACCEPTED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff'] as const;

export type RadicationUploadStatus = 'uploading' | 'uploaded' | 'error';

/** A document of the account: a local file uploaded through the native upload service, or a repository document. */
export interface RadicationUploadItem {
    name: string;
    /** Bytes; `null` for repository documents picked in the native dialog. */
    size: number | null;
    source: 'local' | 'repository';
    status: RadicationUploadStatus;
}

export interface RadicationDraft {
    providerName: string;
    email: string;
    uploads: readonly RadicationUploadItem[];
}

export type RadicationIssue =
    | 'PROVIDER_REQUIRED'
    | 'EMAIL_INVALID'
    | 'DOCUMENTS_REQUIRED'
    | 'FILE_TYPE'
    | 'FILE_SIZE'
    | 'FILE_DUPLICATE'
    | 'UPLOADS_PENDING'
    | 'UPLOADS_FAILED';

export function isValidEmail(value: string | null | undefined): boolean {
    return EMAIL_PATTERN.test((value ?? '').trim());
}

export function fileExtension(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Local files accepted before they are queued for upload (same filter as CIC-Fin's `accept`). */
export function isAcceptedLocalFile(file: { name: string; size: number }): boolean {
    return (RADICATION_ACCEPTED_EXTENSIONS as readonly string[]).includes(fileExtension(file.name)) && file.size <= RADICATION_MAX_FILE_BYTES;
}

/** Problems that block the radication; empty when it can be sent. */
export function validateRadicationDraft(draft: RadicationDraft): RadicationIssue[] {
    const issues: RadicationIssue[] = [];
    if (!draft.providerName.trim()) {
        issues.push('PROVIDER_REQUIRED');
    }
    if (!isValidEmail(draft.email)) {
        issues.push('EMAIL_INVALID');
    }
    if (!draft.uploads.length) {
        issues.push('DOCUMENTS_REQUIRED');
    }
    const local = draft.uploads.filter((upload) => upload.source === 'local');
    if (local.some((upload) => !(RADICATION_ACCEPTED_EXTENSIONS as readonly string[]).includes(fileExtension(upload.name)))) {
        issues.push('FILE_TYPE');
    }
    if (local.some((upload) => (upload.size ?? 0) > RADICATION_MAX_FILE_BYTES)) {
        issues.push('FILE_SIZE');
    }
    const names = draft.uploads.map((upload) => upload.name.toLowerCase());
    if (new Set(names).size !== names.length) {
        issues.push('FILE_DUPLICATE');
    }
    if (draft.uploads.some((upload) => upload.status === 'uploading')) {
        issues.push('UPLOADS_PENDING');
    }
    if (draft.uploads.some((upload) => upload.status === 'error')) {
        issues.push('UPLOADS_FAILED');
    }
    return issues;
}

/** Process instance name: radication number and provider (no patient data). */
export function radicationProcessName(radicationNumber: string, providerName: string): string {
    return [radicationNumber, providerName.trim()].filter(Boolean).join(' · ').slice(0, 255);
}

/** Same shape as ADF's `ProcessWithFormPayloadCloud` (used by its start-process component). */
export interface RadicationStartPayload {
    processName: string;
    processDefinitionKey: string;
    variables: Record<string, unknown>;
    outcome?: string;
    values: Record<string, unknown>;
}

export function buildRadicationStartPayload(input: {
    processDefinitionKey: string;
    radicationNumber: string;
    providerName: string;
    email: string;
    documents: readonly unknown[];
    outcome: string | null;
    /** UI language; omitted when null (the deployed form has no `language` field). */
    language?: string | null;
}): RadicationStartPayload {
    const payload: RadicationStartPayload = {
        processName: radicationProcessName(input.radicationNumber, input.providerName),
        processDefinitionKey: input.processDefinitionKey,
        variables: {},
        values: {
            [RADICATION_START_FORM.fields.radicationNumber]: input.radicationNumber,
            [RADICATION_START_FORM.fields.email]: input.email.trim(),
            [RADICATION_START_FORM.fields.documents]: [...input.documents],
        },
    };
    if (input.language) {
        payload.values[RADICATION_START_FORM.fields.language] = input.language;
    }
    if (input.outcome) {
        payload.outcome = input.outcome;
    }
    return payload;
}

/**
 * First custom outcome declared by the deployed start form (the form service rejects an unknown
 * one). `null` when the form only has the default outcome, which needs no value.
 */
export function resolveStartOutcome(form: unknown, depth = 0): string | null {
    if (depth > 6 || !form || typeof form !== 'object') {
        return null;
    }
    const record = form as Record<string, unknown>;
    const outcomes = record['outcomes'];
    if (Array.isArray(outcomes)) {
        const named = outcomes.filter(
            (outcome): outcome is { name: string; isSystem?: boolean } =>
                !!outcome && typeof outcome === 'object' && typeof (outcome as { name?: unknown }).name === 'string'
        );
        const chosen = named.find((outcome) => !outcome.isSystem) ?? named[0];
        if (chosen?.name) {
            return chosen.name;
        }
    }
    for (const key of ['formRepresentation', 'formDefinition', 'data', 'json']) {
        const nested = resolveStartOutcome(record[key], depth + 1);
        if (nested) {
            return nested;
        }
    }
    return null;
}

const RADICATION_START_ERROR_CODES: readonly RadicationStartErrorCode[] = ['DEFINITION_NOT_FOUND', 'FIELDS_MISSING', 'FORM_VALIDATION', 'UPLOAD_FAILED', 'UNKNOWN'];

/** Short, user-facing reason for a failed start; the detail from Automate is shown next to it. */
export type RadicationStartErrorCode = 'DEFINITION_NOT_FOUND' | 'FIELDS_MISSING' | 'FORM_VALIDATION' | 'UPLOAD_FAILED' | 'UNKNOWN';

export function classifyStartError(error: unknown): RadicationStartErrorCode {
    const known = (error as { code?: unknown } | null)?.code;
    if (error instanceof Error && typeof known === 'string' && RADICATION_START_ERROR_CODES.includes(known as RadicationStartErrorCode)) {
        return known as RadicationStartErrorCode;
    }
    const response = error as { error?: unknown; message?: unknown } | null;
    const raw = response?.error ?? response?.message ?? error;
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
    if (text.includes('radication-definition-not-found')) {
        return 'DEFINITION_NOT_FOUND';
    }
    if (text.includes('radication-upload-failed') || text.includes('upload-folder-not-found')) {
        return 'UPLOAD_FAILED';
    }
    if (text.includes('form-validation') || text.includes('required-outcome') || text.includes('An outcome is required')) {
        return 'FORM_VALIDATION';
    }
    return 'UNKNOWN';
}

export interface RadicationDefinitionCandidate {
    key?: string | null;
    name?: string | null;
    formKey?: string | null;
    version?: number | string | null;
}

/** Why a deployed definition was (not) chosen for the radication; shown in the technical view. */
export type RadicationDefinitionVerdict = 'CHOSEN' | 'OLDER_VERSION' | 'NAME_ONLY' | 'SUBPROCESS' | 'OTHER_PROCESS' | 'NO_START_FORM';

export interface RadicationDefinitionSelection<T extends RadicationDefinitionCandidate> {
    /** The root process of the mapping, latest version; `null` when it is not deployed (never another process). */
    definition: T | null;
    /** How the chosen definition matched: its name, its key, or nothing. */
    matchedBy: 'name' | 'key' | null;
    /** One verdict per deployed definition, in the order received. */
    candidates: Array<{ name: string; key: string; version: number; formKey: string; verdict: RadicationDefinitionVerdict }>;
}

const trimmed = (value: unknown): string => (value === null || value === undefined ? '' : String(value).trim());
const versionOf = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Process started by the radication: ALWAYS the root process of the central mapping
 * (`dashboard/definitions/process-mapping.ts`), latest version. The definition KEY is tried first
 * (`Process_1777481415500`, stable while Automate shows another name such as «Radicación»); the
 * names are a fallback used only when no deployed definition matches by key. Subprocesses of the
 * mapping are excluded explicitly and there is no fallback by form key: several definitions share
 * the start form, so "the first" or "the latest with that form" could start "Document AI Process".
 * Without a match the definition is `null` and nothing is started.
 */
export function selectRadicationDefinition<T extends RadicationDefinitionCandidate>(
    definitions: readonly (T | null | undefined)[] | null | undefined,
    mapping: ProcessMapping = activeProcessMapping()
): RadicationDefinitionSelection<T> {
    const rows = (definitions ?? [])
        .filter((candidate): candidate is T => !!candidate && typeof candidate === 'object')
        .map((candidate) => {
            const name = trimmed(candidate.name);
            const key = trimmed(candidate.key);
            const formKey = trimmed(candidate.formKey);
            const match = processRoleOf({ key, name }, mapping);
            let verdict: RadicationDefinitionVerdict;
            if (match && match.role !== 'root') {
                verdict = 'SUBPROCESS';
            } else if (!match) {
                verdict = 'OTHER_PROCESS';
            } else {
                verdict = formKey ? 'OLDER_VERSION' : 'NO_START_FORM';
            }
            return { candidate, name, key, formKey, version: versionOf(candidate.version), matchedBy: match?.matchedBy ?? null, verdict: verdict as RadicationDefinitionVerdict };
        });
    const eligible = rows.filter((row) => row.verdict === 'OLDER_VERSION');
    // Key first: name-only matches count only when no deployed root matches by key.
    const byKey = eligible.filter((row) => row.matchedBy === 'key');
    const pool = byKey.length ? byKey : eligible;
    let chosen: (typeof rows)[number] | null = null;
    for (const row of pool) {
        if (!chosen || row.version > chosen.version) {
            chosen = row;
        }
    }
    if (byKey.length) {
        eligible.filter((row) => row.matchedBy === 'name').forEach((row) => (row.verdict = 'NAME_ONLY'));
    }
    if (chosen) {
        chosen.verdict = 'CHOSEN';
    }
    return {
        definition: chosen?.candidate ?? null,
        matchedBy: chosen?.matchedBy ?? null,
        candidates: rows.map(({ name, key, version, formKey, verdict }) => ({ name, key, version, formKey, verdict })),
    };
}

/** The `medical-records` definition to start, or `null` (see `selectRadicationDefinition`). */
export function pickRadicationDefinition<T extends RadicationDefinitionCandidate>(definitions: readonly (T | null | undefined)[] | null | undefined): T | null {
    return selectRadicationDefinition(definitions).definition;
}

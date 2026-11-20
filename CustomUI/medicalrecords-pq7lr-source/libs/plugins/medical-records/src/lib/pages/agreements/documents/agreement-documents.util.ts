/**
 * Contract and annexes of an agreement: the files are uploaded to
 * `/MedRec/Appdata/Agreements/<agreementId>/Contract/` with the native attach dialog and referenced
 * in `agreement.json` → `documents.contractFiles` (node id, type and validity). Pure module.
 */

export type AgreementDocumentType = 'CONTRACT' | 'ANNEX' | 'TARIFF_ANNEX' | 'OTHER';

export const AGREEMENT_DOCUMENT_TYPES: readonly AgreementDocumentType[] = ['CONTRACT', 'ANNEX', 'TARIFF_ANNEX', 'OTHER'];

export interface AgreementContractFile {
    /** Repository node id; empty for a document only declared in `agreement.json`. */
    documentId: string;
    name: string;
    type: AgreementDocumentType;
    validFrom: string;
    validTo: string;
    mimeType: string;
    addedAt: string;
    /** Declared in the template (`primaryDocument` / `relatedFiles`) without a repository node. */
    declared?: boolean;
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value).trim();
}

function type(value: unknown): AgreementDocumentType {
    const upper = text(value).toUpperCase() as AgreementDocumentType;
    return AGREEMENT_DOCUMENT_TYPES.includes(upper) ? upper : 'OTHER';
}

/** Uploaded files plus the contract and annexes declared in the template (without a node). */
export function agreementContractFiles(agreement: unknown): AgreementContractFile[] {
    const documents = record(record(agreement)['documents']);
    const uploaded = (Array.isArray(documents['contractFiles']) ? documents['contractFiles'] : [])
        .map((raw) => {
            const item = record(raw);
            return {
                documentId: text(item['documentId']),
                name: text(item['name']),
                type: type(item['type']),
                validFrom: text(item['validFrom']),
                validTo: text(item['validTo']),
                mimeType: text(item['mimeType']),
                addedAt: text(item['addedAt']),
            };
        })
        .filter((file) => !!file.documentId);
    const declared: AgreementContractFile[] = [];
    const primary = record(documents['primaryDocument']);
    if (text(primary['title'])) {
        declared.push({
            documentId: text(primary['repositoryNodeId']),
            name: text(primary['title']),
            type: 'CONTRACT',
            validFrom: '',
            validTo: text(primary['expiresAt']),
            mimeType: text(primary['mimeType']),
            addedAt: '',
            declared: true,
        });
    }
    for (const raw of Array.isArray(documents['relatedFiles']) ? documents['relatedFiles'] : []) {
        const item = record(raw);
        if (text(item['title'])) {
            declared.push({
                documentId: '',
                name: text(item['title']),
                type: /tarif/i.test(text(item['title'])) ? 'TARIFF_ANNEX' : 'ANNEX',
                validFrom: text(item['updatedAt']),
                validTo: '',
                mimeType: '',
                addedAt: '',
                declared: true,
            });
        }
    }
    return [...uploaded, ...declared];
}

/** A copy of `agreement.json` with the new files appended to `documents.contractFiles` (no duplicate node ids). */
export function withContractFiles(agreement: Record<string, unknown>, files: readonly AgreementContractFile[]): Record<string, unknown> {
    const documents = record(agreement['documents']);
    const current = Array.isArray(documents['contractFiles']) ? (documents['contractFiles'] as Array<Record<string, unknown>>) : [];
    const ids = new Set(current.map((item) => text(item['documentId'])));
    const added = files
        .filter((file) => {
            if (!file.documentId || ids.has(file.documentId)) {
                return false;
            }
            ids.add(file.documentId);
            return true;
        })
        .map(({ documentId, name, type: kind, validFrom, validTo, mimeType, addedAt }) => ({ documentId, name, type: kind, validFrom, validTo, mimeType, addedAt }));
    return { ...agreement, documents: { ...documents, contractFiles: [...current, ...added] } };
}

/** A copy without one uploaded file (the repository node is not deleted). */
export function withoutContractFile(agreement: Record<string, unknown>, documentId: string): Record<string, unknown> {
    const documents = record(agreement['documents']);
    const current = Array.isArray(documents['contractFiles']) ? (documents['contractFiles'] as Array<Record<string, unknown>>) : [];
    return { ...agreement, documents: { ...documents, contractFiles: current.filter((item) => text(item['documentId']) !== documentId) } };
}

/** Validity of a file at a date: `valid`, `expired`, `upcoming` or `unknown` (no dates). */
export function contractFileValidity(file: Pick<AgreementContractFile, 'validFrom' | 'validTo'>, today = new Date()): 'valid' | 'expired' | 'upcoming' | 'unknown' {
    const day = today.toISOString().slice(0, 10);
    if (!file.validFrom && !file.validTo) {
        return 'unknown';
    }
    if (file.validTo && file.validTo < day) {
        return 'expired';
    }
    if (file.validFrom && file.validFrom > day) {
        return 'upcoming';
    }
    return 'valid';
}

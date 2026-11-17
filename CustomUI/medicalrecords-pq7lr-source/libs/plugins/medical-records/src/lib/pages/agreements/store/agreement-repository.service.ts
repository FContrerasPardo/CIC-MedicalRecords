import { inject, Injectable } from '@angular/core';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { BlobDownloadService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom } from 'rxjs';
import {
    AGREEMENT_FILE_KINDS,
    AGREEMENT_FILE_NAMES,
    agreementAliases,
    agreementFilePath,
    agreementFolderPath,
    AgreementFileKind,
    AgreementFileSource,
    AgreementIndexEntry,
    AgreementResolution,
    AgreementsIndex,
    AGREEMENTS_INDEX_FILE_NAME,
    AGREEMENTS_INDEX_PATH,
    AGREEMENTS_ROOT_PATH,
    APPDATA_ROOT_PATH,
    duplicateAgreementFiles,
    indexEntryFromAgreement,
    isUsableAgreementFile,
    JsonObject,
    LEGACY_CHECKLIST_PATH,
    LEGACY_POLICY_PATH,
    parseAgreementsIndex,
    parseJsonObject,
    resolveAgreementForProvider,
    serializeAgreementJson,
    upsertIndexEntry,
} from './agreement-store.util';
import { agreementTemplateFile, templateAgreementsIndex } from './agreement-templates';

export interface AgreementFileLoadResult {
    agreementId: string;
    kind: AgreementFileKind;
    /** What is shown and used: the Appdata file, or the bundled template when it is absent or unreadable. */
    content: JsonObject;
    source: AgreementFileSource;
    /** Path of the content shown (the agreement file, or the legacy global file when it was used). */
    path: string;
    /** The agreement's own file in Appdata (also when unreadable: saving then replaces it); null when absent. */
    documentId: string | null;
    modifiedAt: string | null;
    /** The content came from the legacy global file (`/Checklists`, `/Policies`), read-only fallback. */
    legacy: boolean;
}

export interface AgreementsIndexLoadResult {
    index: AgreementsIndex;
    source: AgreementFileSource;
    path: string;
    documentId: string | null;
    modifiedAt: string | null;
}

export type AgreementFiles = Record<AgreementFileKind, AgreementFileLoadResult>;

export interface AgreementRulesResolution extends AgreementResolution {
    checklist: AgreementFileLoadResult;
    policy: AgreementFileLoadResult;
}

const LEGACY_PATHS: Partial<Record<AgreementFileKind, string>> = {
    documentationChecklist: LEGACY_CHECKLIST_PATH,
    preanalysisPolicy: LEGACY_POLICY_PATH,
};

/**
 * Generic Appdata repository for the agreements (`/MedRec/Appdata/Agreements/...`): one JSON file
 * per rule document, read and written with DocumentService and UploadApi like the checklist and the
 * policy repositories. Folders are created on the first write.
 */
@Injectable({ providedIn: 'root' })
export class AgreementRepositoryService {
    private readonly documentService = inject(DocumentService);
    private readonly blobDownloadService = inject(BlobDownloadService);
    private readonly uploadApi = inject<UploadApi>(UPLOAD_API_TOKEN);

    readonly indexPath = AGREEMENTS_INDEX_PATH;

    async loadIndex(): Promise<AgreementsIndexLoadResult> {
        const seed = templateAgreementsIndex();
        const base = { path: AGREEMENTS_INDEX_PATH };
        const document = await this.tryGetByPath(AGREEMENTS_INDEX_PATH);
        if (!document?.sys_id) {
            return { ...base, index: seed, source: 'default', documentId: null, modifiedAt: null };
        }
        const documentId = document.sys_id;
        const modifiedAt = document.sys_modified ?? null;
        const index = parseAgreementsIndex(await this.readText(documentId));
        return index
            ? { ...base, index, source: 'appdata', documentId, modifiedAt }
            : { ...base, index: seed, source: 'invalid', documentId, modifiedAt };
    }

    /**
     * One file of an agreement. With `legacyFallback` (consumers only), a missing checklist or policy
     * is read from the old global file before falling back to the bundled template.
     */
    async loadFile(agreementId: string, kind: AgreementFileKind, options: { legacyFallback?: boolean } = {}): Promise<AgreementFileLoadResult> {
        const path = agreementFilePath(agreementId, kind);
        const template = (source: AgreementFileSource, documentId: string | null, modifiedAt: string | null): AgreementFileLoadResult => ({
            agreementId,
            kind,
            content: agreementTemplateFile(agreementId, kind),
            source,
            path,
            documentId,
            modifiedAt,
            legacy: false,
        });
        const document = await this.tryGetByPath(path);
        if (document?.sys_id) {
            const content = parseJsonObject(await this.readText(document.sys_id));
            const modifiedAt = document.sys_modified ?? null;
            return content && isUsableAgreementFile(kind, content)
                ? { agreementId, kind, content, source: 'appdata', path, documentId: document.sys_id, modifiedAt, legacy: false }
                : template('invalid', document.sys_id, modifiedAt);
        }
        const legacyPath = options.legacyFallback ? LEGACY_PATHS[kind] : undefined;
        if (legacyPath) {
            const legacy = await this.tryGetByPath(legacyPath);
            const content = legacy?.sys_id ? parseJsonObject(await this.readText(legacy.sys_id)) : null;
            if (legacy?.sys_id && content && isUsableAgreementFile(kind, content)) {
                return { agreementId, kind, content, source: 'appdata', path: legacyPath, documentId: null, modifiedAt: legacy.sys_modified ?? null, legacy: true };
            }
        }
        return template('default', null, null);
    }

    async loadAgreement(agreementId: string): Promise<AgreementFiles> {
        const results = await Promise.all(AGREEMENT_FILE_KINDS.map((kind) => this.loadFile(agreementId, kind)));
        return Object.fromEntries(results.map((result) => [result.kind, result])) as AgreementFiles;
    }

    /**
     * The agreement of an account by the provider name (normalized match against the index and the
     * aliases of `agreement.json`), with its checklist and policy. No match: the default agreement;
     * no agreement at all: the bundled template of the default agreement.
     */
    async resolveRulesForProvider(providerName: string | null | undefined): Promise<AgreementRulesResolution> {
        let entries: AgreementIndexEntry[] = [];
        try {
            entries = (await this.loadIndex()).index.agreements;
        } catch {
            entries = templateAgreementsIndex().agreements;
        }
        const aliases: Record<string, string[]> = {};
        for (const entry of entries) {
            aliases[entry.agreementId] = agreementAliases(agreementTemplateFile(entry.agreementId, 'agreement'));
        }
        let resolution = resolveAgreementForProvider(entries, providerName, aliases);
        if (!resolution.matched && providerName) {
            // Aliases edited in Appdata: read the agreement files only when the index alone did not match.
            const loaded = await Promise.all(entries.map((entry) => this.loadFile(entry.agreementId, 'agreement').catch(() => null)));
            loaded.forEach((file, position) => {
                if (file?.source === 'appdata') {
                    aliases[entries[position].agreementId] = agreementAliases(file.content);
                }
            });
            resolution = resolveAgreementForProvider(entries, providerName, aliases);
        }
        const agreementId = resolution.entry?.agreementId ?? templateAgreementsIndex().agreements[0]?.agreementId ?? 'centro-medico-latam';
        const [checklist, policy] = await Promise.all([
            this.loadFile(agreementId, 'documentationChecklist', { legacyFallback: true }),
            this.loadFile(agreementId, 'preanalysisPolicy', { legacyFallback: true }),
        ]);
        return { ...resolution, checklist, policy };
    }

    /** Writes one file of an agreement (creating the folders when missing). Returns the file id. */
    async saveFile(agreementId: string, kind: AgreementFileKind, content: JsonObject, documentId: string | null): Promise<string> {
        return this.writeJson(agreementFolderPath(agreementId), AGREEMENT_FILE_NAMES[kind], serializeAgreementJson(content), documentId);
    }

    async saveIndex(index: AgreementsIndex, documentId: string | null): Promise<string> {
        return this.writeJson(AGREEMENTS_ROOT_PATH, AGREEMENTS_INDEX_FILE_NAME, serializeAgreementJson(index), documentId);
    }

    /** Updates the index entry of an agreement from its `agreement.json` (provider, payer, status, date). */
    async syncIndexEntry(agreementId: string, agreement: JsonObject, current: AgreementsIndexLoadResult): Promise<void> {
        const now = new Date();
        const index = upsertIndexEntry(current.index, indexEntryFromAgreement(agreementId, agreement, now.toISOString()), now);
        await this.saveIndex(index, current.documentId);
    }

    /** Writes the bundled template of every file not yet in Appdata (absent or unreadable) and registers the agreement in the index. */
    async createFromTemplate(agreementId: string, files: AgreementFiles, index: AgreementsIndexLoadResult): Promise<void> {
        for (const kind of AGREEMENT_FILE_KINDS) {
            const file = files[kind];
            if (file.source !== 'appdata' || file.legacy) {
                await this.saveFile(agreementId, kind, agreementTemplateFile(agreementId, kind), file.documentId);
            }
        }
        const agreement = files.agreement.source === 'appdata' ? files.agreement.content : agreementTemplateFile(agreementId, 'agreement');
        await this.syncIndexEntry(agreementId, agreement, index);
    }

    /** A new agreement with the rules of an existing one (the files shown for it). */
    async duplicate(files: AgreementFiles, target: { agreementId: string; providerName: string }, index: AgreementsIndexLoadResult): Promise<void> {
        const source = Object.fromEntries(AGREEMENT_FILE_KINDS.map((kind) => [kind, files[kind].content])) as Record<AgreementFileKind, JsonObject>;
        const copy = duplicateAgreementFiles(source, target);
        for (const kind of AGREEMENT_FILE_KINDS) {
            const content = copy[kind];
            if (content) {
                const existing = await this.tryGetByPath(agreementFilePath(target.agreementId, kind));
                await this.saveFile(target.agreementId, kind, content, existing?.sys_id ?? null);
            }
        }
        await this.syncIndexEntry(target.agreementId, copy.agreement ?? {}, index);
    }

    private async readText(documentId: string): Promise<string | null> {
        try {
            const blob = await firstValueFrom(this.blobDownloadService.downloadBlob(documentId));
            return await blob.text();
        } catch {
            return null;
        }
    }

    private async writeJson(folderPath: string, fileName: string, payload: string, documentId: string | null): Promise<string> {
        const uploadId = await this.upload(fileName, payload);
        if (documentId) {
            await firstValueFrom(this.documentService.updateDocument(documentId, { sysfile_blob: { uploadId } }));
            return documentId;
        }
        const folderId = await this.ensureFolder(folderPath);
        const created = await firstValueFrom(
            this.documentService.createDocument({
                sys_parentId: folderId,
                sys_name: fileName,
                sys_title: fileName,
                sys_primaryType: 'SysFile',
                sysfile_blob: { uploadId },
            })
        );
        if (!created.sys_id) {
            throw new Error('agreement-file-create-failed');
        }
        return created.sys_id;
    }

    /** Creates each missing folder under `/MedRec/Appdata` (which must exist). */
    private async ensureFolder(path: string): Promise<string> {
        const appdata = await this.tryGetByPath(APPDATA_ROOT_PATH);
        if (!appdata?.sys_id) {
            throw new Error('appdata-folder-not-found');
        }
        let parentId = appdata.sys_id;
        let current = APPDATA_ROOT_PATH;
        for (const segment of path.slice(APPDATA_ROOT_PATH.length).split('/').filter((part) => !!part)) {
            current = `${current}/${segment}`;
            const existing = await this.tryGetByPath(current);
            if (existing?.sys_id) {
                parentId = existing.sys_id;
                continue;
            }
            const folder = await firstValueFrom(
                this.documentService.createDocument({ sys_parentId: parentId, sys_name: segment, sys_title: segment, sys_primaryType: 'SysFolder' })
            );
            if (!folder.sys_id) {
                throw new Error('agreement-folder-create-failed');
            }
            parentId = folder.sys_id;
        }
        return parentId;
    }

    private async tryGetByPath(path: string): Promise<Document | null> {
        try {
            return (await firstValueFrom(this.documentService.getDocumentByPath(path))) ?? null;
        } catch {
            return null;
        }
    }

    private async upload(fileName: string, payload: string): Promise<string> {
        const response = await this.uploadApi.upload(
            undefined,
            undefined,
            undefined,
            undefined,
            fileName,
            undefined,
            'application/json',
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        const uploadId = response?.data?.id;
        if (!uploadId) {
            throw new Error('agreement-upload-failed');
        }
        return uploadId;
    }
}

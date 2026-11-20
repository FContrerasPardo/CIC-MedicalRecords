import { inject, Injectable } from '@angular/core';
import { IdentityUserService } from '@alfresco/adf-core';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { BlobDownloadService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom } from 'rxjs';
import { DashboardDiagnosticsService } from '../../../dashboard/services/dashboard-diagnostics.service';
import { AiChangeMeta, AiHistoryEvent, appendAiHistoryToContent, stampTemplateCreation, syncAiSettingsLanguageVersion } from '../ai-rules/agreement-ai-settings.util';
import { AGREEMENT_CONTENT_LANGUAGES, AgreementContentLanguage, localizeAgreementContent, resolveLocalizedSource, syncAgreementLanguageVersion } from './agreement-locale.util';
import {
    AGREEMENT_FILE_CONSUMERS,
    AGREEMENT_FILE_KINDS,
    AGREEMENT_FILE_NAMES,
    agreementContractFolderPath,
    agreementFileName,
    agreementFileVersion,
    cloneJson,
    agreementAliases,
    agreementPayer,
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
import { migrateDemoValues } from './agreement-demo-migration.util';
import { agreementTemplateFile, templateAgreementsIndex, templateTranslations } from './agreement-templates';

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
    /** Language version requested (UI language); null for the consumers, which read the base file. */
    language?: AgreementContentLanguage | null;
    /** The content shown is the language version (`<name>.<lang>.json`). */
    localized?: boolean;
    /** The language version in Appdata (null when absent): saving updates it. */
    variantDocumentId?: string | null;
    /** The base exists in Appdata but has no version in the requested language: the base is shown. */
    missingLanguage?: boolean;
    /** The base file exists in Appdata (readable). */
    baseInAppdata?: boolean;
    /** Version of the base file when it differs from the language version shown (saved later in another language). */
    baseVersion?: string | null;
    /** The saved file (base or language version) holds values of an older demo template: they are shown migrated, not saved. */
    demoMigrated?: boolean;
}

export interface AgreementsIndexLoadResult {
    index: AgreementsIndex;
    source: AgreementFileSource;
    path: string;
    documentId: string | null;
    modifiedAt: string | null;
    /** The saved index holds values of an older demo template: they are shown migrated, not saved. */
    demoMigrated?: boolean;
}

/** What the sidebar shows of an agreement, read from its `agreement.json` (language version or base). */
export interface AgreementSummary {
    payer: string;
    demoMigrated: boolean;
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
    private readonly diagnostics = inject(DashboardDiagnosticsService);
    private readonly identityUserService = inject(IdentityUserService, { optional: true });

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
        const parsed = parseAgreementsIndex(await this.readText(documentId));
        const migration = parsed ? migrateDemoValues(parsed) : null;
        const index = migration?.value ?? null;
        return index
            ? { ...base, index, source: 'appdata', documentId, modifiedAt, demoMigrated: !!migration?.changed }
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
            const migration = migrateDemoValues(parseJsonObject(await this.readText(document.sys_id)));
            const content = migration.value;
            const modifiedAt = document.sys_modified ?? null;
            return content && isUsableAgreementFile(kind, content)
                ? { agreementId, kind, content, source: 'appdata', path, documentId: document.sys_id, modifiedAt, legacy: false, demoMigrated: migration.changed }
                : template('invalid', document.sys_id, modifiedAt);
        }
        const legacyPath = options.legacyFallback ? LEGACY_PATHS[kind] : undefined;
        if (legacyPath) {
            const legacy = await this.tryGetByPath(legacyPath);
            const content = legacy?.sys_id ? migrateDemoValues(parseJsonObject(await this.readText(legacy.sys_id))).value : null;
            if (legacy?.sys_id && content && isUsableAgreementFile(kind, content)) {
                return { agreementId, kind, content, source: 'appdata', path: legacyPath, documentId: null, modifiedAt: legacy.sys_modified ?? null, legacy: true };
            }
        }
        return template('default', null, null);
    }

    /**
     * One file of an agreement in a language (the page). Order: the language version
     * (`<name>.<lang>.json`); else the base file, flagged `missingLanguage`; else the bundled template
     * in that language (`default`). `documentId` is always the base file's id.
     */
    async loadLocalizedFile(agreementId: string, kind: AgreementFileKind, language: AgreementContentLanguage): Promise<AgreementFileLoadResult> {
        const [base, variant] = await Promise.all([this.loadFile(agreementId, kind), this.tryGetByPath(agreementFilePath(agreementId, kind, language))]);
        const extra = { language, localized: false, variantDocumentId: variant?.sys_id ?? null, missingLanguage: false, baseVersion: null, baseInAppdata: base.source === 'appdata' && !base.legacy };
        const migration = migrateDemoValues(variant?.sys_id ? parseJsonObject(await this.readText(variant.sys_id)) : null);
        const content = migration.value;
        const usable = !!content && isUsableAgreementFile(kind, content);
        const pick = resolveLocalizedSource(usable ? 'usable' : variant?.sys_id ? 'unusable' : 'absent', extra.baseInAppdata);
        if (pick === 'variant' && content) {
            const baseVersion = extra.baseInAppdata ? agreementFileVersion(kind, base.content) : '';
            return {
                ...base,
                ...extra,
                content,
                source: 'appdata',
                path: agreementFilePath(agreementId, kind, language),
                modifiedAt: variant?.sys_modified ?? null,
                localized: true,
                baseVersion: baseVersion && baseVersion !== agreementFileVersion(kind, content) ? baseVersion : null,
                demoMigrated: !!base.demoMigrated || migration.changed,
            };
        }
        if (pick === 'base') {
            return { ...base, ...extra, missingLanguage: true };
        }
        return { ...base, ...extra, content: agreementTemplateFile(agreementId, kind, language) };
    }

    /** Every file of an agreement: in a language for the page, or the base files. */
    async loadAgreement(agreementId: string, language?: AgreementContentLanguage | null): Promise<AgreementFiles> {
        const results = await Promise.all(
            AGREEMENT_FILE_KINDS.map((kind) => (language ? this.loadLocalizedFile(agreementId, kind, language) : this.loadFile(agreementId, kind)))
        );
        const files = Object.fromEntries(results.map((result) => [result.kind, result])) as AgreementFiles;
        this.recordDiagnostics(agreementId, files);
        return files;
    }

    /**
     * Saves a file edited on the page: the version of its language (`<name>.<lang>.json`) and the base
     * file the agents read, so they always use the last saved rules. Without a language, only the base.
     */
    async saveAgreementFile(file: AgreementFileLoadResult, content: JsonObject): Promise<void> {
        if (file.language) {
            await this.writeJson(agreementFolderPath(file.agreementId), agreementFileName(file.kind, file.language), serializeAgreementJson(content), file.variantDocumentId ?? null);
        }
        await this.saveFile(file.agreementId, file.kind, content, file.legacy ? null : file.documentId);
        if ((file.kind === 'agreement' || file.kind === 'aiSettings') && file.language) {
            await this.syncAgreementLanguageVersions(file.agreementId, file.kind, content, file.language);
        }
    }

    /** Who is changing the rules, for the AI rules history: the signed-in user's name; null when unknown («Current user»). */
    currentUserName(): string | null {
        try {
            const user = this.identityUserService?.getCurrentUserInfo();
            const name = [user?.firstName, user?.lastName].filter((part) => !!part && String(part).trim()).join(' ').trim();
            return name || user?.username || null;
        } catch {
            return null;
        }
    }

    /** Date, time and user of a change logged in the AI rules history. */
    changeMeta(now = new Date()): AiChangeMeta {
        return { at: now.toISOString(), user: this.currentUserName() };
    }

    /**
     * Appends events to the AI rules history of an agreement (`ai-settings.json`, base and language
     * versions). Only when the file is already saved: logging never creates it. Returns whether it wrote.
     */
    async appendAiHistory(agreementId: string, events: readonly AiHistoryEvent[], language: AgreementContentLanguage): Promise<boolean> {
        if (!events.length) {
            return false;
        }
        const file = await this.loadLocalizedFile(agreementId, 'aiSettings', language);
        if (!file.baseInAppdata) {
            return false;
        }
        await this.saveAgreementFile(file, appendAiHistoryToContent(file.content, events));
        return true;
    }

    /**
     * `agreement.json` holds data that is the same in every language (contacts, contract files, the
     * Knowledge Discovery link…), and `ai-settings.json` only has texts per language (switches,
     * thresholds and history are shared): after a save, the other existing language versions get that
     * data too, so it persists whatever the UI language when the page is reloaded.
     */
    private async syncAgreementLanguageVersions(agreementId: string, kind: 'agreement' | 'aiSettings', saved: JsonObject, from: AgreementContentLanguage): Promise<void> {
        for (const language of AGREEMENT_CONTENT_LANGUAGES.filter((item) => item !== from)) {
            const existing = await this.tryGetByPath(agreementFilePath(agreementId, kind, language));
            if (!existing?.sys_id) {
                continue;
            }
            const current = parseJsonObject(await this.readText(existing.sys_id));
            const usable = !!current && isUsableAgreementFile(kind, current);
            const next =
                current && usable
                    ? kind === 'agreement'
                        ? syncAgreementLanguageVersion(current, saved, from, language, templateTranslations())
                        : syncAiSettingsLanguageVersion(current, saved)
                    : localizeAgreementContent(cloneJson(saved), language, templateTranslations());
            await this.writeJson(agreementFolderPath(agreementId), agreementFileName(kind, language), serializeAgreementJson(next), existing.sys_id);
        }
    }

    /** Creates the missing language version of a file from what is shown (base texts translated with the template dictionary). */
    async createLanguageVersion(file: AgreementFileLoadResult, language: AgreementContentLanguage): Promise<void> {
        const content = localizeAgreementContent(cloneJson(file.content), language, templateTranslations());
        const existing = await this.tryGetByPath(agreementFilePath(file.agreementId, file.kind, language));
        await this.writeJson(agreementFolderPath(file.agreementId), agreementFileName(file.kind, language), serializeAgreementJson(content), existing?.sys_id ?? null);
    }

    /**
     * What the sidebar shows of each agreement, from its `agreement.json` (language version, else the
     * base; migrated like the page). Agreements without a readable file in Appdata are left out: the
     * index entry is used for them.
     */
    async loadAgreementSummaries(agreementIds: readonly string[], language: AgreementContentLanguage): Promise<Record<string, AgreementSummary>> {
        const files = await Promise.all(agreementIds.map((agreementId) => this.loadLocalizedFile(agreementId, 'agreement', language).catch(() => null)));
        const summaries: Record<string, AgreementSummary> = {};
        for (const file of files) {
            if (file?.source === 'appdata') {
                summaries[file.agreementId] = { payer: agreementPayer(file.content), demoMigrated: !!file.demoMigrated };
            }
        }
        return summaries;
    }

    /**
     * «Update the agreement files»: rewrites every saved file of the agreement (base and language
     * versions) that still holds values of an older demo template, and its index entry (also the
     * other entries with old values). Only run on the user's request. Returns the files rewritten.
     */
    async applyDemoMigration(agreementId: string): Promise<number> {
        let rewritten = 0;
        let agreement: JsonObject | null = null;
        for (const kind of AGREEMENT_FILE_KINDS) {
            for (const language of [null, ...AGREEMENT_CONTENT_LANGUAGES]) {
                const document = await this.tryGetByPath(agreementFilePath(agreementId, kind, language));
                if (!document?.sys_id) {
                    continue;
                }
                const migration = migrateDemoValues(parseJsonObject(await this.readText(document.sys_id)));
                if (!migration.value) {
                    continue;
                }
                if (kind === 'agreement' && !language) {
                    agreement = migration.value;
                }
                if (migration.changed) {
                    await this.writeJson(agreementFolderPath(agreementId), agreementFileName(kind, language), serializeAgreementJson(migration.value), document.sys_id);
                    rewritten++;
                }
            }
        }
        const index = await this.loadIndex();
        if (agreement && isUsableAgreementFile('agreement', agreement)) {
            await this.syncIndexEntry(agreementId, agreement, index);
            rewritten++;
        } else if (index.demoMigrated) {
            await this.saveIndex(index.index, index.documentId);
            rewritten++;
        }
        return rewritten;
    }

    /** Creates (when missing) the contract folder of an agreement and returns its path. */
    async ensureContractFolder(agreementId: string): Promise<string> {
        const path = agreementContractFolderPath(agreementId);
        await this.ensureFolder(path);
        return path;
    }

    /** One entry per agreement file in the floating technical view (path, origin, version, language, reader). */
    private recordDiagnostics(agreementId: string, files: AgreementFiles): void {
        for (const kind of AGREEMENT_FILE_KINDS) {
            const file = files[kind];
            const consumer = AGREEMENT_FILE_CONSUMERS[kind];
            this.diagnostics.record({
                kind: 'agreements',
                key: `agreement-file:${agreementId}:${kind}`,
                label: `${AGREEMENT_FILE_NAMES[kind]} · ${file.source}${file.legacy ? ' (legacy)' : ''} · v${agreementFileVersion(kind, file.content) || '—'}${
                    file.language ? ` · ${file.localized ? file.language : `${file.language} → base`}` : ''
                } · ${consumer.agent}${consumer.variable ? ` (${consumer.variable})` : ''}`,
                durationMs: 0,
                tables: [
                    {
                        title: `${agreementId} / ${AGREEMENT_FILE_NAMES[kind]}`,
                        columns: ['Path', 'Read by', 'Origin', 'Version', 'Language', 'Modified'],
                        rows: [
                            [
                                file.path,
                                `${consumer.agent}${consumer.variable ? ` · ${consumer.variable}` : ''}`,
                                file.legacy ? 'legacy' : file.source,
                                agreementFileVersion(kind, file.content) || '—',
                                file.language ? (file.localized ? file.language : `${file.language} (missing: base shown)`) : 'base',
                                file.modifiedAt ?? '—',
                            ],
                        ],
                    },
                ],
            });
        }
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
    async createFromTemplate(agreementId: string, files: AgreementFiles, index: AgreementsIndexLoadResult, languages: readonly AgreementContentLanguage[] = []): Promise<void> {
        // The AI rules history starts with «AI profile created from template», dated now and signed by the user.
        const meta = this.changeMeta();
        const fromTemplate = (kind: AgreementFileKind, language?: AgreementContentLanguage): JsonObject => {
            const content = agreementTemplateFile(agreementId, kind, language);
            return kind === 'aiSettings' ? stampTemplateCreation(content, meta) : content;
        };
        for (const kind of AGREEMENT_FILE_KINDS) {
            const file = files[kind];
            const baseMissing = file.legacy || !(file.baseInAppdata ?? file.source === 'appdata');
            const base = baseMissing ? fromTemplate(kind) : null;
            if (base) {
                await this.saveFile(agreementId, kind, base, file.legacy ? null : file.documentId);
            }
            for (const language of languages) {
                const existing = await this.tryGetByPath(agreementFilePath(agreementId, kind, language));
                if (existing?.sys_id) {
                    continue;
                }
                // Base already in Appdata (maybe edited): its texts translated; otherwise the template of that language.
                const content = base
                    ? fromTemplate(kind, language)
                    : localizeAgreementContent(cloneJson(file.localized ? await this.baseContent(agreementId, kind) : file.content), language, templateTranslations());
                await this.writeJson(agreementFolderPath(agreementId), agreementFileName(kind, language), serializeAgreementJson(content), null);
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

    private async baseContent(agreementId: string, kind: AgreementFileKind): Promise<JsonObject> {
        return (await this.loadFile(agreementId, kind)).content;
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

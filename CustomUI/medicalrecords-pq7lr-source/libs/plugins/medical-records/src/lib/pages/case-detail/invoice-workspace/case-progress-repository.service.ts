import { inject, Injectable } from '@angular/core';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { BlobDownloadService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom } from 'rxjs';
import { DashboardDiagnosticsService } from '../../../dashboard/services/dashboard-diagnostics.service';
import {
    CASE_PROGRESS_FILE_NAME,
    CaseFolderResolution,
    caseProgressFilePath,
    contentReferenceIds,
    findCaseFolderInSources,
    patientFolderFromDocument,
} from '../utils/case-folder.util';
import { CaseProgress, parseCaseProgress, serializeCaseProgress } from '../utils/case-progress.util';

/** How long a list row reuses the progress it read (the workspace clears it when it saves). */
const PEEK_TTL_MS = 60_000;

export interface CaseProgressLoad {
    folder: CaseFolderResolution;
    /** Null when the file does not exist yet or cannot be read (it is then replaced on save). */
    progress: CaseProgress | null;
    documentId: string | null;
    /** The file exists but is not a valid progress file. */
    invalid: boolean;
}

/**
 * Reads and writes `case-progress.json` in the patient folder of the batch (the folder IDP creates
 * under `/MedRec/Patients`), with DocumentService and UploadApi like the Appdata repositories of the
 * plugin: create when missing, replace the content otherwise. The folder is never created here: if
 * it cannot be resolved, the caller keeps the progress in memory.
 */
@Injectable({ providedIn: 'root' })
export class CaseProgressRepositoryService {
    private readonly documentService = inject(DocumentService);
    private readonly blobDownloadService = inject(BlobDownloadService);
    private readonly uploadApi = inject<UploadApi>(UPLOAD_API_TOKEN);
    private readonly diagnostics = inject(DashboardDiagnosticsService);

    /** Read-only progress per process for the Control Center rows, shared for a short time. */
    private readonly peekCache = new Map<string, { at: number; value: Promise<CaseProgress | null> }>();
    /**
     * Writes per process, chained in call order. Reads wait for them, so a case reopened (or a
     * Control Center row read) right after leaving the workspace never gets the previous content.
     */
    private readonly writes = new Map<string, Promise<unknown>>();
    /** Document id of each progress file once known, so chained first writes do not create it twice. */
    private readonly documentIds = new Map<string, string>();

    /**
     * Progress of an account for a list row (no write, never creates the file): resolves the batch
     * folder and reads case-progress.json, cached per process for PEEK_TTL_MS; null when missing.
     */
    peekProgress(variables: Record<string, unknown>, batchState: unknown, processInstanceId: string | null, options: { fresh?: boolean } = {}): Promise<CaseProgress | null> {
        if (!processInstanceId) {
            return Promise.resolve(null);
        }
        const cached = this.peekCache.get(processInstanceId);
        if (!options.fresh && cached && Date.now() - cached.at < PEEK_TTL_MS) {
            return cached.value;
        }
        const value = (async () => {
            try {
                const folder = await this.resolveFolder(variables, batchState, processInstanceId);
                return folder ? (await this.load(folder, processInstanceId)).progress : null;
            } catch {
                return null;
            }
        })();
        this.peekCache.set(processInstanceId, { at: Date.now(), value });
        return value;
    }

    /** Variables and batchState first (no request); then the parent of the batch content files. */
    async resolveFolder(variables: Record<string, unknown>, batchState: unknown, processInstanceId: string | null): Promise<CaseFolderResolution | null> {
        const started = Date.now();
        const inline = findCaseFolderInSources(variables, batchState);
        if (inline) {
            this.trace(processInstanceId, 'folder', `found in ${inline.source} (${inline.hint})`, started, undefined, inline.folderPath);
            return inline;
        }
        const ids = contentReferenceIds(batchState ?? variables['batchState']);
        for (const id of ids) {
            const document = await this.tryGetById(id);
            const folderPath = patientFolderFromDocument(document);
            if (folderPath) {
                const resolution: CaseFolderResolution = { folderPath, source: 'repository', hint: `contentFileReferences sys_id ${id.slice(0, 8)}…` };
                this.trace(processInstanceId, 'folder', `found from the content file parent`, started, undefined, folderPath);
                return resolution;
            }
        }
        this.trace(processInstanceId, 'folder', `not resolved (${ids.length} content reference(s) checked)`, started, 'patient folder not found: progress kept in memory');
        return null;
    }

    async load(folder: CaseFolderResolution, processInstanceId: string | null): Promise<CaseProgressLoad> {
        await this.pendingWrites(processInstanceId);
        const started = Date.now();
        const path = caseProgressFilePath(folder.folderPath);
        const document = await this.tryGetByPath(path);
        if (!document?.sys_id) {
            this.trace(processInstanceId, 'read', `GET ${path} · not created yet`, started, undefined, folder.folderPath);
            return { folder, progress: null, documentId: null, invalid: false };
        }
        this.documentIds.set(path, document.sys_id);
        const progress = parseCaseProgress(await this.readText(document.sys_id));
        this.trace(
            processInstanceId,
            'read',
            `GET ${path} · ${progress ? `stage ${progress.currentStage}, ${progress.registrations.length} registration(s)` : 'invalid content'}`,
            started,
            progress ? undefined : 'case-progress.json is not a valid progress file; it will be replaced on save',
            folder.folderPath
        );
        return { folder, progress, documentId: document.sys_id, invalid: !progress };
    }

    /**
     * Creates the file in the patient folder or replaces its content; returns the document id.
     * Writes of one process run one at a time, in call order, with the content given at call time.
     */
    save(folder: CaseFolderResolution, progress: CaseProgress, documentId: string | null, processInstanceId: string | null): Promise<string> {
        const key = processInstanceId ?? 'form';
        const previous = this.writes.get(key) ?? Promise.resolve();
        const run = previous.catch(() => undefined).then(() => this.write(folder, progress, documentId, processInstanceId));
        this.writes.set(key, run);
        const clear = (): void => {
            if (this.writes.get(key) === run) {
                this.writes.delete(key);
            }
        };
        run.then(clear, clear);
        return run;
    }

    /** Waits until the writes requested so far for the process have finished (ok or not). */
    async pendingWrites(processInstanceId: string | null): Promise<void> {
        const pending = this.writes.get(processInstanceId ?? 'form');
        if (pending) {
            await pending.catch(() => undefined);
        }
    }

    private async write(folder: CaseFolderResolution, progress: CaseProgress, documentId: string | null, processInstanceId: string | null): Promise<string> {
        const started = Date.now();
        const path = caseProgressFilePath(folder.folderPath);
        try {
            const uploadId = await this.upload(serializeCaseProgress(progress));
            let id = documentId ?? this.documentIds.get(path) ?? null;
            if (id) {
                await firstValueFrom(this.documentService.updateDocument(id, { sysfile_blob: { uploadId } }));
            } else {
                const parent = await this.tryGetByPath(folder.folderPath);
                if (!parent?.sys_id) {
                    throw new Error('patient-folder-not-found');
                }
                const created = await firstValueFrom(
                    this.documentService.createDocument({
                        sys_parentId: parent.sys_id,
                        sys_name: CASE_PROGRESS_FILE_NAME,
                        sys_title: CASE_PROGRESS_FILE_NAME,
                        sys_primaryType: 'SysFile',
                        sysfile_blob: { uploadId },
                    })
                );
                if (!created.sys_id) {
                    throw new Error('case-progress-create-failed');
                }
                id = created.sys_id;
            }
            this.documentIds.set(path, id);
            this.trace(processInstanceId, 'write', `${documentId ? 'PUT' : 'POST'} ${path} · stage ${progress.currentStage}`, started, undefined, folder.folderPath);
            if (processInstanceId) {
                this.peekCache.delete(processInstanceId);
            }
            return id;
        } catch (error) {
            this.trace(processInstanceId, 'write', `${documentId ? 'PUT' : 'POST'} ${path}`, started, error instanceof Error ? error.message : 'write failed', folder.folderPath);
            throw error;
        }
    }

    private trace(processInstanceId: string | null, step: 'folder' | 'read' | 'write', summary: string, started: number, error?: string, folderPath?: string): void {
        this.diagnostics.record({
            kind: 'process-variables',
            key: `case-progress-${step}:${processInstanceId ?? 'form'}`,
            label: `case · progress ${step} · ${summary}`,
            durationMs: Date.now() - started,
            error,
            tables: folderPath ? [{ title: 'Case progress file', columns: ['folder', 'file'], rows: [[folderPath, CASE_PROGRESS_FILE_NAME]] }] : undefined,
        });
    }

    private async readText(documentId: string): Promise<string | null> {
        try {
            const blob = await firstValueFrom(this.blobDownloadService.downloadBlob(documentId));
            return await blob.text();
        } catch {
            return null;
        }
    }

    private async tryGetByPath(path: string): Promise<Document | null> {
        try {
            return (await firstValueFrom(this.documentService.getDocumentByPath(path))) ?? null;
        } catch {
            return null;
        }
    }

    private async tryGetById(id: string): Promise<Document | null> {
        try {
            return (await firstValueFrom(this.documentService.getDocumentById(id))) ?? null;
        } catch {
            return null;
        }
    }

    private async upload(payload: string): Promise<string> {
        const response = await this.uploadApi.upload(
            undefined,
            undefined,
            undefined,
            undefined,
            CASE_PROGRESS_FILE_NAME,
            undefined,
            'application/json',
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        const uploadId = response?.data?.id;
        if (!uploadId) {
            throw new Error('case-progress-upload-failed');
        }
        return uploadId;
    }
}

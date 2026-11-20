import { inject, Injectable } from '@angular/core';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { BlobDownloadService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { APPDATA_ROOT_PATH } from '../../pages/agreements/store/agreement-store.util';
import {
    buildKnowledgeDiscoveryPlaceConfig,
    KNOWLEDGE_DISCOVERY_FOLDER_NAME,
    KNOWLEDGE_DISCOVERY_FOLDER_PATH,
    KnowledgeDiscoveryLink,
    KnowledgeDiscoveryPlaceConfig,
    knowledgeDiscoveryPlaceFileName,
    knowledgeDiscoveryPlacePath,
    parseKnowledgeDiscoveryPlaceConfig,
    serializeKnowledgeDiscoveryPlaceConfig,
    validateKnowledgeDiscoveryInput,
} from './knowledge-discovery-place.util';

export interface KnowledgeDiscoveryPlaceState {
    status: 'loading' | 'ready' | 'error';
    /** The place file (null when absent or unreadable). */
    config: KnowledgeDiscoveryPlaceConfig | null;
}

function statusOf(error: unknown): number | undefined {
    const response = error as { status?: number; response?: { status?: number } } | null;
    return response?.response?.status ?? response?.status;
}

/**
 * Appdata repository of the Knowledge Discovery link of each place
 * (`/MedRec/Appdata/KnowledgeDiscovery/<placeId>.json`), read and written with DocumentService and
 * UploadApi like the agreement files; the folder is created on the first save. Each place is loaded
 * once and shared, so every launcher of the same place (a button and a floating card) shows the same
 * state after a save.
 *
 * The audit assistant keeps its own read-only link (`/MedRec/Appdata/config.json`,
 * `KnowledgeDiscoveryConfigService`, CIC-Fin contract); it can move to the place `case.audit` with
 * that file as fallback when the launcher is added there.
 */
@Injectable({ providedIn: 'root' })
export class KnowledgeDiscoveryPlaceService {
    private readonly documentService = inject(DocumentService);
    private readonly blobDownloadService = inject(BlobDownloadService);
    private readonly uploadApi = inject<UploadApi>(UPLOAD_API_TOKEN);
    private readonly states = new Map<string, BehaviorSubject<KnowledgeDiscoveryPlaceState>>();

    /** State of a place; loaded on the first request. */
    watch(placeId: string): Observable<KnowledgeDiscoveryPlaceState> {
        const known = this.states.has(placeId);
        const state = this.subject(placeId);
        if (!known) {
            void this.refresh(placeId);
        }
        return state.asObservable();
    }

    async refresh(placeId: string): Promise<void> {
        const state = this.subject(placeId);
        state.next({ status: 'loading', config: state.value.config });
        try {
            const document = await this.findPlaceDocument(placeId);
            const config = document?.sys_id ? parseKnowledgeDiscoveryPlaceConfig(await this.readText(document.sys_id)) : null;
            state.next({ status: 'ready', config });
        } catch {
            state.next({ status: 'error', config: null });
        }
    }

    /** Saves the link of a place (an empty URL clears it). Rejects non-https URLs. */
    async save(placeId: string, input: Partial<KnowledgeDiscoveryLink>): Promise<KnowledgeDiscoveryPlaceConfig> {
        const fileName = knowledgeDiscoveryPlaceFileName(placeId);
        if (!fileName) {
            throw new Error('PLACE_INVALID');
        }
        const error = validateKnowledgeDiscoveryInput(input);
        if (error) {
            throw new Error(error);
        }
        const config = buildKnowledgeDiscoveryPlaceConfig(input);
        const payload = serializeKnowledgeDiscoveryPlaceConfig(placeId, config);
        const existing = await this.findPlaceDocument(placeId).catch(() => null);
        const uploadId = await this.upload(fileName, payload);
        if (existing?.sys_id) {
            await firstValueFrom(this.documentService.updateDocument(existing.sys_id, { sysfile_blob: { uploadId } }));
        } else {
            const folderId = await this.ensureFolder();
            const created = await firstValueFrom(
                this.documentService.createDocument({ sys_parentId: folderId, sys_name: fileName, sys_title: fileName, sys_primaryType: 'SysFile', sysfile_blob: { uploadId } })
            );
            if (!created.sys_id) {
                throw new Error('SAVE_FAILED');
            }
        }
        this.subject(placeId).next({ status: 'ready', config });
        return config;
    }

    private subject(placeId: string): BehaviorSubject<KnowledgeDiscoveryPlaceState> {
        let state = this.states.get(placeId);
        if (!state) {
            state = new BehaviorSubject<KnowledgeDiscoveryPlaceState>({ status: 'loading', config: null });
            this.states.set(placeId, state);
        }
        return state;
    }

    /** The place file; null when the place id is invalid or the file is missing (404). Other errors are rethrown. */
    private async findPlaceDocument(placeId: string): Promise<Document | null> {
        const path = knowledgeDiscoveryPlacePath(placeId);
        if (!path) {
            return null;
        }
        try {
            const document = (await firstValueFrom(this.documentService.getDocumentByPath(path))) ?? null;
            return document?.sys_primaryType === 'SysFolder' ? null : document;
        } catch (error) {
            if (statusOf(error) === 404) {
                return null;
            }
            throw error;
        }
    }

    private async readText(documentId: string): Promise<string> {
        const blob = await firstValueFrom(this.blobDownloadService.downloadBlob(documentId));
        return blob.text();
    }

    /** `/MedRec/Appdata/KnowledgeDiscovery`, created when missing (`/MedRec/Appdata` must exist). */
    private async ensureFolder(): Promise<string> {
        const folder = await this.tryGetByPath(KNOWLEDGE_DISCOVERY_FOLDER_PATH);
        if (folder?.sys_id) {
            return folder.sys_id;
        }
        const appdata = await this.tryGetByPath(APPDATA_ROOT_PATH);
        if (!appdata?.sys_id) {
            throw new Error('FOLDER_UNAVAILABLE');
        }
        const created = await firstValueFrom(
            this.documentService.createDocument({
                sys_parentId: appdata.sys_id,
                sys_name: KNOWLEDGE_DISCOVERY_FOLDER_NAME,
                sys_title: KNOWLEDGE_DISCOVERY_FOLDER_NAME,
                sys_primaryType: 'SysFolder',
            })
        );
        if (!created.sys_id) {
            throw new Error('FOLDER_UNAVAILABLE');
        }
        return created.sys_id;
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
            throw new Error('SAVE_FAILED');
        }
        return uploadId;
    }
}

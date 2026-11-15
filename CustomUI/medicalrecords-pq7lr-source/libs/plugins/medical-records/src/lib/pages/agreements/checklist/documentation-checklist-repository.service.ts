import { inject, Injectable } from '@angular/core';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { BlobDownloadService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom } from 'rxjs';
import {
    DEFAULT_DOCUMENTATION_CHECKLIST,
    DocumentationChecklist,
    parseDocumentationChecklist,
    serializeDocumentationChecklist,
} from './documentation-checklist.util';

export const APPDATA_FOLDER_PATH = '/MedRec/Appdata';
export const CHECKLISTS_FOLDER_NAME = 'Checklists';
export const DOCUMENTATION_CHECKLIST_FILE_NAME = 'documentation-checklist.json';

/** `appdata`: read from the file; `default`: no file yet, demo seed shown; `invalid`: file unreadable. */
export type ChecklistSource = 'appdata' | 'default' | 'invalid';

export interface ChecklistLoadResult {
    checklist: DocumentationChecklist;
    source: ChecklistSource;
    documentId: string | null;
    modifiedAt: string | null;
}

/**
 * Reads and publishes the documentary checklist in Appdata
 * (`/MedRec/Appdata/Checklists/documentation-checklist.json`), the same way dashboard layouts
 * are stored. The file replaces the `documentationRules` process variable as the editable source.
 */
@Injectable({ providedIn: 'root' })
export class DocumentationChecklistRepositoryService {
    private readonly documentService = inject(DocumentService);
    private readonly blobDownloadService = inject(BlobDownloadService);
    private readonly uploadApi = inject<UploadApi>(UPLOAD_API_TOKEN);

    readonly filePath = `${APPDATA_FOLDER_PATH}/${CHECKLISTS_FOLDER_NAME}/${DOCUMENTATION_CHECKLIST_FILE_NAME}`;

    async load(): Promise<ChecklistLoadResult> {
        const document = await this.tryGetByPath(this.filePath);
        if (!document?.sys_id) {
            return { checklist: DEFAULT_DOCUMENTATION_CHECKLIST, source: 'default', documentId: null, modifiedAt: null };
        }
        const modifiedAt = document.sys_modified ?? null;
        try {
            const blob = await firstValueFrom(this.blobDownloadService.downloadBlob(document.sys_id));
            const checklist = parseDocumentationChecklist(await blob.text());
            return checklist
                ? { checklist, source: 'appdata', documentId: document.sys_id, modifiedAt }
                : { checklist: DEFAULT_DOCUMENTATION_CHECKLIST, source: 'invalid', documentId: document.sys_id, modifiedAt };
        } catch {
            return { checklist: DEFAULT_DOCUMENTATION_CHECKLIST, source: 'invalid', documentId: document.sys_id, modifiedAt };
        }
    }

    /** Creates the folder and file when missing, otherwise replaces the file content. */
    async publish(checklist: DocumentationChecklist, documentId: string | null): Promise<string> {
        const uploadId = await this.upload(serializeDocumentationChecklist(checklist));
        if (documentId) {
            await firstValueFrom(this.documentService.updateDocument(documentId, { sysfile_blob: { uploadId } }));
            return documentId;
        }
        const folderId = await this.ensureChecklistsFolder();
        const created = await firstValueFrom(
            this.documentService.createDocument({
                sys_parentId: folderId,
                sys_name: DOCUMENTATION_CHECKLIST_FILE_NAME,
                sys_title: DOCUMENTATION_CHECKLIST_FILE_NAME,
                sys_primaryType: 'SysFile',
                sysfile_blob: { uploadId },
            })
        );
        if (!created.sys_id) {
            throw new Error('checklist-create-failed');
        }
        return created.sys_id;
    }

    private async ensureChecklistsFolder(): Promise<string> {
        const existing = await this.tryGetByPath(`${APPDATA_FOLDER_PATH}/${CHECKLISTS_FOLDER_NAME}`);
        if (existing?.sys_id) {
            return existing.sys_id;
        }
        const appdata = await this.tryGetByPath(APPDATA_FOLDER_PATH);
        if (!appdata?.sys_id) {
            throw new Error('appdata-folder-not-found');
        }
        const folder = await firstValueFrom(
            this.documentService.createDocument({
                sys_parentId: appdata.sys_id,
                sys_name: CHECKLISTS_FOLDER_NAME,
                sys_title: CHECKLISTS_FOLDER_NAME,
                sys_primaryType: 'SysFolder',
            })
        );
        if (!folder.sys_id) {
            throw new Error('checklist-folder-create-failed');
        }
        return folder.sys_id;
    }

    private async tryGetByPath(path: string): Promise<Document | null> {
        try {
            return (await firstValueFrom(this.documentService.getDocumentByPath(path))) ?? null;
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
            DOCUMENTATION_CHECKLIST_FILE_NAME,
            undefined,
            'application/json',
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        const uploadId = response?.data?.id;
        if (!uploadId) {
            throw new Error('checklist-upload-failed');
        }
        return uploadId;
    }
}

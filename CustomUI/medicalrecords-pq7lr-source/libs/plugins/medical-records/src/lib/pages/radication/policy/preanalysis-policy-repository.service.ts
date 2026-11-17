import { inject, Injectable } from '@angular/core';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { BlobDownloadService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom } from 'rxjs';
import { APPDATA_FOLDER_PATH } from '../../agreements/checklist/documentation-checklist-repository.service';
import { parsePreanalysisPolicy, PreanalysisPolicy } from '../utils/radication-policy.util';
import * as policyModule from './default-preanalysis-policy.json';

/** Bundled copy; bundlers expose it as `default`, jest (no esModuleInterop) as the module itself. */
const BUNDLED_POLICY: unknown = (policyModule as { default?: unknown }).default ?? policyModule;

export const POLICIES_FOLDER_NAME = 'Policies';
export const PREANALYSIS_POLICY_FILE_NAME = 'preanalysis-policy.json';
export const PREANALYSIS_POLICY_PATH = `${APPDATA_FOLDER_PATH}/${POLICIES_FOLDER_NAME}/${PREANALYSIS_POLICY_FILE_NAME}`;

/** `appdata`: read from the file; `default`: no file, bundled copy; `invalid`: file unreadable, bundled copy. */
export type PolicySource = 'appdata' | 'default' | 'invalid';

export interface PolicyLoadResult {
    policy: PreanalysisPolicy | null;
    source: PolicySource;
    /** The whole policy document shown (Appdata file or bundled copy), for the editor. */
    document: unknown;
    /** The Appdata file, also when it is unreadable (saving then replaces it). */
    documentId: string | null;
    modifiedAt: string | null;
}

/**
 * Reads and saves the agent's pre-analysis policy in Appdata (`/MedRec/Appdata/Policies/preanalysis-policy.json`)
 * the same way the documentary checklist is stored; falls back to the bundled copy of
 * `docs/automate/policies/preanalysis-policy.json` when the file is absent or unreadable.
 */
@Injectable({ providedIn: 'root' })
export class PreanalysisPolicyRepositoryService {
    private readonly documentService = inject(DocumentService);
    private readonly blobDownloadService = inject(BlobDownloadService);
    private readonly uploadApi = inject<UploadApi>(UPLOAD_API_TOKEN);

    readonly filePath = PREANALYSIS_POLICY_PATH;

    /** The bundled template (a fresh copy each time). */
    bundledDocument(): unknown {
        return structuredClone(BUNDLED_POLICY);
    }

    async load(): Promise<PolicyLoadResult> {
        const fallback = parsePreanalysisPolicy(BUNDLED_POLICY);
        const document = await this.tryGetByPath(this.filePath);
        if (!document?.sys_id) {
            return { policy: fallback, source: 'default', document: this.bundledDocument(), documentId: null, modifiedAt: null };
        }
        const documentId = document.sys_id;
        const modifiedAt = document.sys_modified ?? null;
        const invalid: PolicyLoadResult = { policy: fallback, source: 'invalid', document: this.bundledDocument(), documentId, modifiedAt };
        try {
            const blob = await firstValueFrom(this.blobDownloadService.downloadBlob(documentId));
            const content = await blob.text();
            const policy = parsePreanalysisPolicy(content);
            return policy ? { policy, source: 'appdata', document: JSON.parse(content), documentId, modifiedAt } : invalid;
        } catch {
            return invalid;
        }
    }

    /** Creates the folder and file when missing, otherwise replaces the file content. Returns the file id. */
    async save(content: string, documentId: string | null): Promise<string> {
        const uploadId = await this.upload(content);
        if (documentId) {
            await firstValueFrom(this.documentService.updateDocument(documentId, { sysfile_blob: { uploadId } }));
            return documentId;
        }
        const folderId = await this.ensurePoliciesFolder();
        const created = await firstValueFrom(
            this.documentService.createDocument({
                sys_parentId: folderId,
                sys_name: PREANALYSIS_POLICY_FILE_NAME,
                sys_title: PREANALYSIS_POLICY_FILE_NAME,
                sys_primaryType: 'SysFile',
                sysfile_blob: { uploadId },
            })
        );
        if (!created.sys_id) {
            throw new Error('policy-create-failed');
        }
        return created.sys_id;
    }

    private async ensurePoliciesFolder(): Promise<string> {
        const existing = await this.tryGetByPath(`${APPDATA_FOLDER_PATH}/${POLICIES_FOLDER_NAME}`);
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
                sys_name: POLICIES_FOLDER_NAME,
                sys_title: POLICIES_FOLDER_NAME,
                sys_primaryType: 'SysFolder',
            })
        );
        if (!folder.sys_id) {
            throw new Error('policy-folder-create-failed');
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
            PREANALYSIS_POLICY_FILE_NAME,
            undefined,
            'application/json',
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );
        const uploadId = response?.data?.id;
        if (!uploadId) {
            throw new Error('policy-upload-failed');
        }
        return uploadId;
    }
}

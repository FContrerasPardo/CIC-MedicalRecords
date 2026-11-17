import { inject, Injectable } from '@angular/core';
import { BlobDownloadService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom } from 'rxjs';
import { APPDATA_FOLDER_PATH } from '../../agreements/checklist/documentation-checklist-repository.service';
import { KnowledgeDiscoveryState, parseKnowledgeDiscoveryConfig } from './audit-assistant.util';

/** Shared app config in Appdata, same contract as CIC-Fin's `/FS Lending/appData/config.json`. */
export const KNOWLEDGE_DISCOVERY_CONFIG_PATH = `${APPDATA_FOLDER_PATH}/config.json`;

function statusOf(error: unknown): number | undefined {
    const response = error as { status?: number; response?: { status?: number } } | null;
    return response?.response?.status ?? response?.status;
}

/**
 * Read-only port of CIC-Fin's `KnowledgeDiscoveryLinkService.load()`: reads the KD agent URL from
 * `/MedRec/Appdata/config.json` (`knowledgeDiscovery.url`). Only a missing file (404) means
 * "not configured"; permission, network or blob errors are rethrown so the UI shows an error.
 */
@Injectable({ providedIn: 'root' })
export class KnowledgeDiscoveryConfigService {
    private readonly documentService = inject(DocumentService);
    private readonly blobDownloadService = inject(BlobDownloadService);

    readonly filePath = KNOWLEDGE_DISCOVERY_CONFIG_PATH;

    async load(): Promise<KnowledgeDiscoveryState> {
        let document: Document | null;
        try {
            document = (await firstValueFrom(this.documentService.getDocumentByPath(this.filePath))) ?? null;
        } catch (error) {
            if (statusOf(error) === 404) {
                return { status: 'not-configured' };
            }
            throw error;
        }
        if (!document?.sys_id) {
            return { status: 'not-configured' };
        }
        if (document.sys_primaryType === 'SysFolder') {
            return { status: 'invalid' };
        }
        const blob = await firstValueFrom(this.blobDownloadService.downloadBlob(document.sys_id));
        return parseKnowledgeDiscoveryConfig(await blob.text());
    }
}

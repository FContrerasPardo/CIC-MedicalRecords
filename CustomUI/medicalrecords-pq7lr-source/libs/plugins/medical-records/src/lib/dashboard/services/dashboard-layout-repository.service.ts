import { inject, Injectable } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { BlobDownloadService, DocumentService } from '@alfresco/adf-hx-content-services/services';
import { Document, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom } from 'rxjs';
import {
    APP_CONFIG_DASHBOARDS_FOLDER_ID,
    DEFAULT_DASHBOARDS_FOLDER_ID,
    DEFAULT_DASHBOARDS_FOLDER_PATH,
    resolveDashboardsFolderId,
} from '../config/dashboard-layout-storage.config';
import { DashboardLayoutState } from '../definitions/dashboard-widget.model';
import {
    DEFAULT_LAYOUT_FILE_NAME,
    isLayoutDocumentCandidate,
    normalizeLayoutFileName,
    parseLayoutDocumentEnvelope,
    serializeLayoutDocumentBlob,
} from '../mappers/dashboard-layout-document.mapper';
import { DashboardLayoutPersistenceProvider } from './dashboard-layout-persistence.interface';

export interface DashboardLayoutDocumentRef {
    id: string;
    title: string;
    modifiedAt?: string | null;
}

export type DashboardLayoutFolderSource = 'configured' | 'default' | 'path' | 'unknown';

export interface DashboardLayoutFolderListing {
    folderId: string | null;
    folderSource: DashboardLayoutFolderSource;
    totalChildren: number;
    documents: DashboardLayoutDocumentRef[];
    latestDocument: DashboardLayoutDocumentRef | null;
}

export interface DashboardLayoutDocumentLoadResult {
    layout: DashboardLayoutState;
    savedAt?: string;
    layoutKey?: string;
}

export interface DashboardLayoutSaveDocumentOptions {
    fileName?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardLayoutRepositoryService implements DashboardLayoutPersistenceProvider {
    private readonly documentService = inject(DocumentService);
    private readonly blobDownloadService = inject(BlobDownloadService);
    private readonly uploadApi = inject<UploadApi>(UPLOAD_API_TOKEN);
    private readonly appConfigService = inject(AppConfigService);

    private dashboardsFolderIdCache: string | null | undefined;

    async loadLayout(documentId: string): Promise<DashboardLayoutState | null> {
        const loaded = await this.loadLayoutDocument(documentId);
        return loaded?.layout ?? null;
    }

    async loadLayoutDocument(documentId: string): Promise<DashboardLayoutDocumentLoadResult | null> {
        if (!documentId) {
            return null;
        }

        try {
            // Resolve metadata first so blob download follows the latest document revision.
            await firstValueFrom(this.documentService.getDocumentById(documentId));
            const blob = await firstValueFrom(this.blobDownloadService.downloadBlob(documentId));
            const raw = await blob.text();
            const envelope = parseLayoutDocumentEnvelope(raw);
            if (!envelope?.layout) {
                return null;
            }
            return {
                layout: envelope.layout,
                savedAt: envelope.savedAt || undefined,
                layoutKey: envelope.layoutKey,
            };
        } catch {
            return null;
        }
    }

    async getDashboardsFolderId(): Promise<string | null> {
        return this.resolveDashboardsFolderId();
    }

    async saveLayout(
        documentId: string,
        layout: DashboardLayoutState,
        options?: DashboardLayoutSaveDocumentOptions
    ): Promise<void> {
        const normalizedName = options?.fileName?.trim()
            ? normalizeLayoutFileName(options.fileName)
            : undefined;
        const uploadId = await this.uploadLayoutBlob(layout, normalizedName);
        const update: Record<string, unknown> = {
            sysfile_blob: { uploadId },
        };
        if (normalizedName) {
            update.sys_name = normalizedName;
            update.sys_title = normalizedName;
        }
        await firstValueFrom(this.documentService.updateDocument(documentId, update));
    }

    async findLatestLayoutDocument(): Promise<DashboardLayoutDocumentRef | null> {
        const listing = await this.getLayoutFolderListing();
        return listing.latestDocument;
    }

    /** @deprecated Use findLatestLayoutDocument — kept for interface compatibility. */
    async findDefaultLayoutDocument(): Promise<DashboardLayoutDocumentRef | null> {
        return this.findLatestLayoutDocument();
    }

    async createDefaultLayoutDocument(layout: DashboardLayoutState): Promise<DashboardLayoutDocumentRef> {
        return this.createLayoutDocument(layout, DEFAULT_LAYOUT_FILE_NAME);
    }

    async copyLayoutDocument(
        sourceDocumentId: string,
        newFileName: string
    ): Promise<DashboardLayoutDocumentRef> {
        const loaded = await this.loadLayoutDocument(sourceDocumentId);
        if (!loaded?.layout) {
            throw new Error('dashboard-layout-copy-source-not-found');
        }

        return this.createLayoutDocument(loaded.layout, newFileName);
    }

    async createLayoutDocument(
        layout: DashboardLayoutState,
        fileName: string
    ): Promise<DashboardLayoutDocumentRef> {
        const folderId = await this.resolveDashboardsFolderId();
        if (!folderId) {
            throw new Error('dashboard-layout-folder-not-found');
        }

        const normalizedName = normalizeLayoutFileName(fileName);
        const uploadId = await this.uploadLayoutBlob(layout, normalizedName);
        const created = await firstValueFrom(
            this.documentService.createDocument({
                sys_parentId: folderId,
                sys_name: normalizedName,
                sys_title: normalizedName,
                sys_primaryType: 'SysFile',
                sysfile_blob: { uploadId },
            })
        );

        if (!created.sys_id) {
            throw new Error('dashboard-layout-create-failed');
        }

        return {
            id: created.sys_id,
            title: created.sys_title ?? created.sys_name ?? normalizedName,
        };
    }

    async listLayoutDocuments(): Promise<DashboardLayoutDocumentRef[]> {
        const listing = await this.getLayoutFolderListing();
        return listing.documents;
    }

    async getLayoutFolderListing(): Promise<DashboardLayoutFolderListing> {
        const configuredId = resolveDashboardsFolderId(this.appConfigService);
        const explicitConfiguredId = this.appConfigService.get<string>(APP_CONFIG_DASHBOARDS_FOLDER_ID);
        let folderId: string | null = null;
        let folderSource: DashboardLayoutFolderSource = 'unknown';

        if (configuredId && (await this.folderExists(configuredId))) {
            folderId = configuredId;
            folderSource = explicitConfiguredId ? 'configured' : 'default';
        } else if (DEFAULT_DASHBOARDS_FOLDER_ID && (await this.folderExists(DEFAULT_DASHBOARDS_FOLDER_ID))) {
            folderId = DEFAULT_DASHBOARDS_FOLDER_ID;
            folderSource = 'default';
        }

        if (!folderId) {
            const byPath = await this.tryResolveFolderByPath(DEFAULT_DASHBOARDS_FOLDER_PATH);
            if (byPath) {
                folderId = byPath;
                folderSource = 'path';
            } else {
                return {
                    folderId: null,
                    folderSource: 'unknown',
                    totalChildren: 0,
                    documents: [],
                    latestDocument: null,
                };
            }
        }

        let fetched = await this.fetchFolderDocuments(folderId);
        let documents = this.mapLayoutDocumentRefs(fetched.documents);

        if (fetched.totalCount === 0 && documents.length === 0 && folderSource !== 'path') {
            const pathFolderId = await this.tryResolveFolderByPath(DEFAULT_DASHBOARDS_FOLDER_PATH);
            if (pathFolderId && pathFolderId !== folderId) {
                const pathFetched = await this.fetchFolderDocuments(pathFolderId);
                if (pathFetched.totalCount > 0) {
                    folderId = pathFolderId;
                    folderSource = 'path';
                    fetched = pathFetched;
                    documents = this.mapLayoutDocumentRefs(fetched.documents);
                }
            }
        }

        return {
            folderId,
            folderSource,
            totalChildren: fetched.totalCount,
            documents,
            latestDocument: this.pickLatestLayoutDocument(documents),
        };
    }

    async resolveDashboardsFolderId(forceRefresh = false): Promise<string | null> {
        if (!forceRefresh && this.dashboardsFolderIdCache !== undefined) {
            return this.dashboardsFolderIdCache;
        }

        const configuredId = resolveDashboardsFolderId(this.appConfigService);
        if (configuredId && (await this.folderExists(configuredId))) {
            this.dashboardsFolderIdCache = configuredId;
            return configuredId;
        }

        if (DEFAULT_DASHBOARDS_FOLDER_ID && (await this.folderExists(DEFAULT_DASHBOARDS_FOLDER_ID))) {
            this.dashboardsFolderIdCache = DEFAULT_DASHBOARDS_FOLDER_ID;
            return DEFAULT_DASHBOARDS_FOLDER_ID;
        }

        const byPath = await this.tryResolveFolderByPath(DEFAULT_DASHBOARDS_FOLDER_PATH);
        this.dashboardsFolderIdCache = byPath;
        return byPath;
    }

    private async folderExists(folderId: string): Promise<boolean> {
        try {
            const doc = await firstValueFrom(this.documentService.getDocumentById(folderId));
            return !!doc?.sys_id;
        } catch {
            return false;
        }
    }

    private async tryResolveFolderByPath(path: string): Promise<string | null> {
        try {
            const doc = await firstValueFrom(this.documentService.getDocumentByPath(path));
            return doc?.sys_id ?? null;
        } catch {
            return null;
        }
    }

    private async fetchFolderDocuments(
        folderId: string
    ): Promise<{ documents: Document[]; totalCount: number }> {
        const children = await firstValueFrom(
            this.documentService.getAllChildren(folderId, {
                limit: 200,
                offset: 0,
                sort: ['sys_title asc'],
            })
        );

        return {
            documents: children.documents,
            totalCount: children.totalCount,
        };
    }

    private mapLayoutDocumentRefs(documents: Document[]): DashboardLayoutDocumentRef[] {
        return documents
            .filter((doc) => !doc.sys_isFolderish && isLayoutDocumentCandidate(doc))
            .map((doc) => ({
                id: doc.sys_id ?? '',
                title: doc.sys_title ?? doc.sys_name ?? DEFAULT_LAYOUT_FILE_NAME,
                modifiedAt: doc.sys_modified ?? null,
            }))
            .filter((doc) => !!doc.id);
    }

    private pickLatestLayoutDocument(
        documents: DashboardLayoutDocumentRef[]
    ): DashboardLayoutDocumentRef | null {
        if (!documents.length) {
            return null;
        }

        return [...documents].sort((left, right) => {
            const leftTime = Date.parse(left.modifiedAt ?? '');
            const rightTime = Date.parse(right.modifiedAt ?? '');
            const leftValid = Number.isFinite(leftTime);
            const rightValid = Number.isFinite(rightTime);
            if (leftValid && rightValid) {
                return rightTime - leftTime;
            }
            if (rightValid) {
                return 1;
            }
            if (leftValid) {
                return -1;
            }
            return 0;
        })[0];
    }

    private async uploadLayoutBlob(layout: DashboardLayoutState, fileName = DEFAULT_LAYOUT_FILE_NAME): Promise<string> {
        const blob = serializeLayoutDocumentBlob(layout);
        const payload = await blob.text();
        const normalizedName = normalizeLayoutFileName(fileName);
        const response = await this.uploadApi.upload(
            undefined,
            undefined,
            undefined,
            undefined,
            normalizedName,
            undefined,
            'application/json',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const uploadId = response?.data?.id;
        if (!uploadId) {
            throw new Error('dashboard-layout-upload-failed');
        }

        return uploadId;
    }
}

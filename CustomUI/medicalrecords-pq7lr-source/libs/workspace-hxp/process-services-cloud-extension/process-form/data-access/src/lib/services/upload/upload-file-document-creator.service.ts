/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DocumentApi, Document } from '@hylandsoftware/hxcs-js-client';
import { DOCUMENT_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { JwtHelperService } from '@alfresco/adf-core';
import { WORKSPACE_HXP } from '@hxp/workspace-hxp/feature-flag';
import {
    SharedUploadMiddlewareService,
    UploadSuccessData,
    PendingDocument,
    PendingDocumentCleanupService,
} from '@hxp/shared-hxp/services';

@Injectable({
    providedIn: 'root',
})
export class UploadFileDocumentCreatorService extends SharedUploadMiddlewareService {
    private readonly documentApi: DocumentApi = inject(DOCUMENT_API_TOKEN);
    private readonly router = inject(Router, { optional: true });
    private readonly featuresService: IFeaturesService = inject(FeaturesServiceToken);
    private readonly jwtHelperService: JwtHelperService = inject(JwtHelperService);
    private readonly cleanupService = inject(PendingDocumentCleanupService);

    override async onUploadFile(uploadFile: UploadSuccessData | null): Promise<PendingDocument | Document | null> {
        if (!uploadFile) {
            return null;
        }

        if (this.isPublicFormRoute()) {
            return this.createDocumentImmediately(uploadFile);
        }

        const isPendingDocumentEnabled = await this.isPendingDocumentEnabled();
        const currentUserId = this.getCurrentUserId().trim();

        if (isPendingDocumentEnabled && currentUserId) {
            return this.createPendingDocument(uploadFile, currentUserId);
        }

        return this.createDocumentImmediately(uploadFile);
    }

    private isPublicFormRoute(): boolean {
        const currentRoute = this.router?.url ?? '';
        return currentRoute === '/public' || currentRoute.startsWith('/public/');
    }

    private async isPendingDocumentEnabled(): Promise<boolean> {
        try {
            const flagValue = await firstValueFrom(
                this.featuresService.isOn$(WORKSPACE_HXP.FORMS_DEFERRED_DOC_CREATION),
                { defaultValue: false }
            );
            return flagValue === true;
        } catch {
            return false;
        }
    }

    private getCurrentUserId(): string {
        return this.jwtHelperService.getValueFromLocalIdToken<string>('sub') ?? '';
    }

    private buildRestrictiveAcl(currentUserId: string): Array<{ user: { id: string }; permission: string; granted: boolean }> {
        return [
            {
                user: { id: '__Everyone__' },
                permission: 'Everything',
                granted: false,
            },
            {
                user: { id: currentUserId },
                permission: 'Everything',
                granted: true,
            },
        ];
    }

    private async createPendingDocument(uploadFile: UploadSuccessData, currentUserId: string): Promise<PendingDocument> {
        const { uploadedFile, uploadFileOptions } = uploadFile;
        const restrictiveAcl = this.buildRestrictiveAcl(currentUserId);

        const createResponse = await this.documentApi.createDocumentUnderParentById(
            uploadFileOptions.parentId ?? '',
            undefined,
            {
                sys_name: uploadedFile.fileName,
                sys_parentId: uploadFileOptions.parentId,
                sys_primaryType: uploadFileOptions.contentType ?? 'SysFile',
                sys_title: uploadedFile.fileName,
                sysfile_blob: { uploadId: uploadedFile.id },
                sys_acl: restrictiveAcl,
            }
        );

        const createdDocument = createResponse.data;

        const pending: PendingDocument = {
            document: createdDocument,
            originalPermissions: uploadFileOptions.permissions ?? [],
            pendingBy: currentUserId,
            persisted: false,
        };

        this.cleanupService.track(pending);
        return pending;
    }

    private async createDocumentImmediately(uploadFile: UploadSuccessData): Promise<Document> {
        const { uploadedFile, uploadFileOptions } = uploadFile;

        const response = await this.documentApi.createDocumentUnderParentById(
            uploadFileOptions.parentId ?? '',
            undefined,
            {
                sys_name: uploadedFile.fileName,
                sys_parentId: uploadFileOptions.parentId,
                sys_primaryType: uploadFileOptions.contentType ?? 'SysFile',
                sys_title: uploadedFile.fileName,
                sysfile_blob: { uploadId: uploadedFile.id },
                ...(uploadFileOptions.permissions ? { sys_acl: uploadFileOptions.permissions } : {}),
            }
        );

        return response.data;
    }
}

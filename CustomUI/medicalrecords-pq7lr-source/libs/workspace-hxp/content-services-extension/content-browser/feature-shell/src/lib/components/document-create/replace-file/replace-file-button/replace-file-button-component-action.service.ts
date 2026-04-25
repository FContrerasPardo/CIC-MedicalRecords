/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { switchMap } from 'rxjs';
import { Document } from '@hylandsoftware/hxcs-js-client';
import {
    HxpNotificationService,
    ActionContext,
    DocumentActionService,
    DocumentPermissions,
    hasPermission,
    isFile,
    isVersion,
} from '@alfresco/adf-hx-content-services/services';
import { FileModel } from '@hxp/shared-hxp/services';
import {
    UploadContentModel,
    UploadManagerService,
} from '@hxp/workspace-hxp/content-services-extension/shared/upload/feature-shell';
import { UpdateDocumentBlobActionStrategy } from './update-document-blob-action-strategy';

@Injectable({
    providedIn: 'root',
})
export class ReplaceFileButtonComponentActionService implements DocumentActionService {
    private readonly notificationService = inject(HxpNotificationService);
    private readonly uploadManagerService = inject(UploadManagerService);
    private readonly updateDocumentBlobActionStrategy = inject(UpdateDocumentBlobActionStrategy);

    readonly acceptedFilesTypes: string = '*';

    isAvailable(context: ActionContext): boolean {
        if (context.documents.length !== 1) {
            return false;
        }

        const document = context.documents[0];
        return document && isFile(document) && hasPermission(document, DocumentPermissions.WRITE) && !isVersion(document);
    }

    execute(context: ActionContext): void {
        const document = context.documents[0];
        this.triggerFileSelection((event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                const file = target.files[0];
                const fileModel: FileModel = new FileModel(file, {
                    parentId: document.sys_id,
                    path: ((file as any).webkitRelativePath || '').replace(/\/[^/]*$/, ''),
                });
                this.replaceFile(fileModel, document);
            }
        });
    }

    private triggerFileSelection(selectionCallback: (event: Event) => void): void {
        const input = globalThis.document.createElement('input');
        input.type = 'file';
        input.accept = this.acceptedFilesTypes;
        input.style.display = 'none';

        input.addEventListener('change', selectionCallback);

        globalThis.document.body.append(input);
        input.click();
        input.remove();
    }

    private replaceFile(fileModel: FileModel, document: Document): void {
        const uploadModel: UploadContentModel = this.uploadManagerService.createUploadModel(fileModel, this.updateDocumentBlobActionStrategy, {
            document,
        });
        this.uploadManagerService.addToQueue(uploadModel);

        this.uploadManagerService
            .initiateUpload(uploadModel)
            .pipe(switchMap(() => this.uploadManagerService.upload(uploadModel)))
            .subscribe({
                next: () => this.notificationService.showSuccess('REPLACE_FILE.SUCCESS'),
                error: () => this.notificationService.showError('REPLACE_FILE.ERROR'),
            });

        this.uploadManagerService.uploadFilesInTheQueue();
    }
}

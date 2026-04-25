/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Document, UploadApi } from '@hylandsoftware/hxcs-js-client';
import { BehaviorSubject, firstValueFrom, forkJoin, from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SharedUploadMiddlewareService, UploadSuccessData, PendingDocument } from '@hxp/shared-hxp/services';
import { UploadFileDocumentCreatorService } from '@alfresco-dbp/workspace-hxp/process-services-cloud-extension/process-form/data-access';
import { UPLOAD_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_HXP } from '@hxp/workspace-hxp/feature-flag';

export interface FlushResult {
    document: Document | PendingDocument | null;
    failedFileName?: string;
}

@Injectable()
export class DeferredUploadMiddlewareService extends SharedUploadMiddlewareService {
    private readonly documentCreator = inject(UploadFileDocumentCreatorService);
    private readonly uploadApi: UploadApi = inject(UPLOAD_API_TOKEN);
    private readonly featuresService: IFeaturesService = inject(FeaturesServiceToken);
    private readonly pendingQueue: UploadSuccessData[] = [];
    private readonly queueSubject = new BehaviorSubject<UploadSuccessData[]>([]);

    readonly queue$ = this.queueSubject.asObservable();
    readonly hasPendingUploads$ = this.queue$.pipe(map((queue) => queue.length > 0));

    get pendingCount(): number {
        return this.pendingQueue.length;
    }

    override async onUploadFile(uploadFile: UploadSuccessData | null): Promise<Document | PendingDocument | null> {
        if (!uploadFile) {
            return null;
        }

        const isDeferralEnabled = await this.isDeferralEnabled();
        if (!isDeferralEnabled) {
            return this.documentCreator.onUploadFile(uploadFile);
        }

        this.pendingQueue.push(uploadFile);
        this.queueSubject.next([...this.pendingQueue]);
        return null;
    }

    flush(): Observable<FlushResult[]> {
        const queued = this.drainQueue();

        if (queued.length === 0) {
            return of([]);
        }

        return forkJoin(queued.map((upload) => this.createDocumentFromUpload(upload)));
    }

    clear(): void {
        this.drainQueue();
    }

    discardUploads(): Observable<void> {
        const queued = this.drainQueue();
        const uploadIds = queued.map((upload) => upload.uploadedFile?.id).filter((id): id is string => !!id);

        if (uploadIds.length === 0) {
            return of(undefined);
        }

        return forkJoin(uploadIds.map((id) => this.deleteUploadSafely(id))).pipe(map(() => undefined));
    }

    private createDocumentFromUpload(upload: UploadSuccessData): Observable<FlushResult> {
        return from(this.documentCreator.onUploadFile(upload)).pipe(
            map((document) => ({ document })),
            catchError(() => of({ document: null, failedFileName: upload.uploadedFile?.fileName ?? undefined }))
        );
    }

    private deleteUploadSafely(uploadId: string): Observable<void> {
        return from(this.uploadApi.deleteUpload(uploadId)).pipe(
            map(() => void 0),
            catchError(() => of(void 0))
        );
    }

    private drainQueue(): UploadSuccessData[] {
        const queued = [...this.pendingQueue];
        this.pendingQueue.length = 0;
        this.queueSubject.next([]);
        return queued;
    }

    private async isDeferralEnabled(): Promise<boolean> {
        try {
            const flagValue = await firstValueFrom(this.featuresService.isOn$(WORKSPACE_HXP.FORMS_DEFERRED_DOC_CREATION), { defaultValue: false });
            return flagValue === true;
        } catch {
            return false;
        }
    }
}

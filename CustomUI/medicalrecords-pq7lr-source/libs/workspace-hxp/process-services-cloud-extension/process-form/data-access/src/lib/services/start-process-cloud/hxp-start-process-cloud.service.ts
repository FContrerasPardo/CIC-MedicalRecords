/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable, Injector } from '@angular/core';
import { Observable, from } from 'rxjs';
import { finalize, switchMap, take } from 'rxjs/operators';
import { StartProcessCloudService, ProcessInstanceCloud } from '@alfresco/adf-process-services-cloud';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_HXP } from '@hxp/workspace-hxp/feature-flag';
import {
    PendingDocumentCleanupService,
    PendingDocumentProcessorService,
    PENDING_DOCUMENT_SERVICE,
} from '@hxp/shared-hxp/services';

@Injectable()
export class HxpStartProcessCloudService extends StartProcessCloudService {
    private readonly pendingDocumentProcessor = inject(PendingDocumentProcessorService);
    private readonly cleanupService = inject(PendingDocumentCleanupService);
    private readonly injector = inject(Injector);
    private readonly featuresService = inject<IFeaturesService>(FeaturesServiceToken);

    override startProcessWithForm(appName: string, formId: string, version: number, payload: any): Observable<ProcessInstanceCloud> {
        if (!payload?.values) {
            return super.startProcessWithForm(appName, formId, version, payload);
        }

        return this.featuresService.isOn$(WORKSPACE_HXP.FORMS_DEFERRED_DOC_CREATION).pipe(
            take(1),
            switchMap((isEnabled) => {
                // This is not the normal injection pattern but the PENDING_DOCUMENT_SERVICE is not injectable in the constructor.
                // It's only available at runtime when processes are open or starting. We can remove this after the feature flag is removed and code is refactored.
                const documentOps = this.injector.get(PENDING_DOCUMENT_SERVICE, null, { optional: true });

                if (!isEnabled || !documentOps) {
                    return super.startProcessWithForm(appName, formId, version, payload);
                }

                this.cleanupService.markPersistedInFormValues(payload.values);
                return from(this.pendingDocumentProcessor.processPendingDocuments(payload.values, documentOps)).pipe(
                    switchMap((processedValues) => {
                        const processedPayload = { ...payload, values: processedValues };
                        return super.startProcessWithForm(appName, formId, version, processedPayload);
                    }),
                    finalize(() => this.cleanupService.clearTracking())
                );
            })
        );
    }
}

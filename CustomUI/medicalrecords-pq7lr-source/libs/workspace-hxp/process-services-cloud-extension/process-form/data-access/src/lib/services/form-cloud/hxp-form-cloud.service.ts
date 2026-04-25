/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable, Injector } from '@angular/core';
import { Observable, from } from 'rxjs';
import { finalize, switchMap, take } from 'rxjs/operators';
import { FormCloudService, TaskDetailsCloudModel } from '@alfresco/adf-process-services-cloud';
import { FormValues } from '@alfresco/adf-core';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_HXP } from '@hxp/workspace-hxp/feature-flag';
import {
    PendingDocumentCleanupService,
    PendingDocumentProcessorService,
    PENDING_DOCUMENT_SERVICE,
} from '@hxp/shared-hxp/services';

@Injectable()
export class HxpFormCloudService extends FormCloudService {
    private readonly pendingDocumentProcessor = inject(PendingDocumentProcessorService);
    private readonly cleanupService = inject(PendingDocumentCleanupService);
    private readonly featuresService = inject<IFeaturesService>(FeaturesServiceToken);
    private readonly injector = inject(Injector);

    override saveTaskForm(
        appName: string,
        taskId: string,
        processInstanceId: string,
        formId: string,
        formValues: FormValues
    ): Observable<TaskDetailsCloudModel> {
        return this.featuresService.isOn$(WORKSPACE_HXP.FORMS_DEFERRED_DOC_CREATION).pipe(
            take(1),
            switchMap((isEnabled) => {
                if (isEnabled) {
                    this.cleanupService.markPersistedInFormValues(formValues);
                }
                return super.saveTaskForm(appName, taskId, processInstanceId, formId, formValues);
            })
        );
    }

    override completeTaskForm(
        appName: string,
        taskId: string,
        processInstanceId: string,
        formId: string,
        formValues: FormValues,
        outcome: string,
        version: number
    ): Observable<TaskDetailsCloudModel> {
        return this.featuresService.isOn$(WORKSPACE_HXP.FORMS_DEFERRED_DOC_CREATION).pipe(
            take(1),
            switchMap((isEnabled) => {
                // This is not the normal injection pattern but the PENDING_DOCUMENT_SERVICE is not injectable in the constructor.
                // It's only available at runtime when processes are open or starting. We can remove this after the feature flag is removed and code is refactored.
                const documentOps = this.injector.get(PENDING_DOCUMENT_SERVICE);

                if (!isEnabled || !documentOps) {
                    return super.completeTaskForm(appName, taskId, processInstanceId, formId, formValues, outcome, version);
                }

                this.cleanupService.markPersistedInFormValues(formValues);
                return from(this.pendingDocumentProcessor.processPendingDocuments(formValues, documentOps)).pipe(
                    switchMap((processedValues) =>
                        super.completeTaskForm(appName, taskId, processInstanceId, formId, processedValues as FormValues, outcome, version)
                    ),
                    finalize(() => this.cleanupService.clearTracking())
                );
            })
        );
    }
}

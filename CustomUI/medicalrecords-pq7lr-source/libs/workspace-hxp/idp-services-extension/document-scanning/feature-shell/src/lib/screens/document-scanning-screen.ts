/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { IDP_DOCUMENT_SCANNING_SERVICES_PROVIDER } from '../services/idp-services.module';
import { ScanningViewComponent } from '../components/scanning-view/scanning-view.component';
import {
    StartProcessScreenCloud,
    StartProcessScreenDefaultButtons,
} from '@alfresco/adf-process-services-cloud/lib/screen/components/screen-cloud/start-process-event-screen/start-process-screen.model';
import { TaskVariableCloud } from '@alfresco/adf-process-services-cloud';
import { SCANNING_SESSION_CONTEXT, ScanningSession, ScanningSessionContext } from '../services/scanning-session.service';

@Component({
    template: '<hyland-idp-scanning-view />',
    styleUrls: ['./document-scanning-screen.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        ...IDP_DOCUMENT_SCANNING_SERVICES_PROVIDER,
        ScanningSession,
        {
            provide: SCANNING_SESSION_CONTEXT,
            useFactory: () => inject(DocumentScanningScreenComponent).scanningSessionContext,
        },
    ],
    imports: [ScanningViewComponent],
})
export class DocumentScanningScreenComponent implements StartProcessScreenCloud {
    readonly appName = input<string>('');
    readonly processDefinitionId = input<string>('');
    readonly resolvedValues = input<TaskVariableCloud[]>();
    readonly defaultStartProcessButtonsConfigurationChange = output<StartProcessScreenDefaultButtons>();
    readonly startProcessPayloadChanged = output<unknown>();

    readonly scanningSessionContext = computed<ScanningSessionContext | undefined>(() => {
        const values = this.resolvedValues();
        const targetFolder = values?.find((value) => value.name === 'targetFolder')?.value;
        if (typeof targetFolder !== 'string') {
            throw new Error('targetFolder variable not provided');
        }
        return {
            appName: this.appName(),
            processDefinitionId: this.processDefinitionId(),
            targetFolder,
        };
    });
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppConfigService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { inject, Injectable } from '@angular/core';
import { from, Observable, of, tap } from 'rxjs';
import { TASK_FORM_TYPE } from '../../../constants/constants';

/**
 * Manages the linking of child processes to their parent process instances.
 *
 * This service handles a timing issue in the process creation flow:
 * 1. When a start process event has an attached form, child processes can be created immediately upon form update (please check modeling form rules)
 * 2. At this point, the parent (root) process instance does not yet exist
 * 3. Child process IDs are temporarily stored as "orphaned" processes
 * 4. Once the parent process is created, these IDs are retrieved and linked to establish the parent-child relationship
 */
@Injectable({
    providedIn: 'root',
})
export class OrphanedLinkedProcessesService {
    private readonly adfHttpClient = inject(AdfHttpClient);
    private readonly appConfigService = inject(AppConfigService);

    private orphanedProcessesIds: Set<string> = new Set();

    addOrphanedProcessId(processId: string): void {
        this.orphanedProcessesIds.add(processId);
    }

    linkOrphanedProcessesToParent(rootProcessId: string): Observable<void> {
        if (this.orphanedProcessesIds.size === 0) {
            return of(null);
        }

        const contextRoot = this.appConfigService.get('bpmHost', '');
        const appName = this.appConfigService.get<{ name: 'string' }[]>('alfresco-deployed-apps')?.[0]?.name;
        const url = `${contextRoot}/${appName}/query/v1/process-instances/${rootProcessId}/link`;

        return from(
            this.adfHttpClient.post(url, {
                bodyParam: {
                    processInstanceIds: [...this.orphanedProcessesIds],
                    linkProcessInstanceType: TASK_FORM_TYPE,
                },
            })
        ).pipe(
            tap(() => {
                this.clearOrphanedProcessesIds();
            })
        );
    }

    clearOrphanedProcessesIds(): void {
        this.orphanedProcessesIds.clear();
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TaskCloudService } from '@alfresco/adf-process-services-cloud';
import { IdentityUserModel, IdentityUserService } from '@alfresco-dbp/shared/identity';

@Injectable()
export class TaskAssignmentService extends IdentityUserService {
    applicationName: string;
    taskId = '';
    contextRoot = '';

    private readonly taskCloudService = inject(TaskCloudService);

    setApplicationName(appName: string) {
        this.applicationName = appName;
    }

    setTaskId(taskId: string) {
        this.taskId = taskId;
    }

    getClientIdByApplicationName(): Observable<string> {
        return of(null);
    }

    search(search?: string): Observable<any[]> {
        return this.taskCloudService
            .getCandidateUsers(this.applicationName, this.taskId)
            .pipe(map((candidates: string[]) => this.transformFilteredCandidates(candidates, search)));
    }

    public transformFilteredCandidates(candidates: string[], search: string): IdentityUserModel[] {
        return candidates
            .filter((candidate: string) => candidate?.toLowerCase().includes(search.toLowerCase()))
            .map((username) => {
                return { username };
            });
    }
}

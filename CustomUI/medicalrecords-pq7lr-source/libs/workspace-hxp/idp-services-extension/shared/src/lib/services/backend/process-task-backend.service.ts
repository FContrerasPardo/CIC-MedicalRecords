/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { BaseCloudService, FormCloudService, TaskCloudService, TaskVariableCloud } from '@alfresco/adf-process-services-cloud';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, take, throwError } from 'rxjs';
import { IdpConfiguration } from '../../models/contracts/idp-configuration';
import { IdpConfigurationResponse } from '../../models/api-models/api-idp-configuration';
import { IdentityUserService } from '@alfresco/adf-core';
import { TaskAssignmentContext } from '../../models/task/task-assignment-context';

@Injectable({ providedIn: 'root' })
export class ProcessTaskBackendService extends BaseCloudService {
    private readonly formCloudService = inject(FormCloudService);
    private readonly taskCloudService = inject(TaskCloudService);
    private readonly identityUserService = inject(IdentityUserService);
    private readonly destroyRef = inject(DestroyRef);

    getTaskInputData$<T>(appName: string, taskId: string): Observable<T> {
        return this.formCloudService.getTaskVariables(appName, taskId).pipe(
            takeUntilDestroyed(this.destroyRef),
            map((taskVariables) => {
                return this.prepareJsonFromTaskVariables<T>(taskVariables);
            })
        );
    }

    getIdpConfiguration$(appName: string): Observable<IdpConfiguration> {
        const url = this.buildUrl(appName, 'configurations/idp');
        return this.get<IdpConfigurationResponse>(url).pipe(
            takeUntilDestroyed(this.destroyRef),
            map((response) => response.configuration)
        );
    }

    getTaskAssignmentContext$(appName: string, taskId: string, populateClaimProperties?: boolean): Observable<TaskAssignmentContext> {
        if (!appName || !taskId) {
            const message = `${appName ? 'Task Id' : 'App Name'} is empty`;
            console.error(`Get Task Assignment Context: ${message}`);
            return throwError(() => new Error(message));
        }

        return this.taskCloudService.getTaskById(appName, taskId).pipe(
            takeUntilDestroyed(this.destroyRef),
            take(1),
            map((task) => {
                const result: TaskAssignmentContext = {
                    assignee: task.assignee,
                    candidateGroups: task.candidateGroups,
                    candidateUsers: task.candidateUsers,
                };
                if (populateClaimProperties) {
                    result.canClaimTask = this.taskCloudService.canClaimTask(task);
                    result.canUnclaimTask = this.taskCloudService.canUnclaimTask(task);
                }
                return result;
            })
        );
    }

    claimTask$(appName: string, taskId: string): Observable<boolean> {
        if (!appName || !taskId) {
            const message = `${appName ? 'Task Id' : 'App Name'} is empty`;
            console.error(`Claim Task: ${message}`);
            return throwError(() => new Error(message));
        }

        const currentUser = this.identityUserService.getCurrentUserInfo();
        if (!currentUser?.username) {
            const message = 'Current User username is empty';
            console.error(`Claim Task: ${message}`);
            return throwError(() => new Error(message));
        }

        return this.taskCloudService.claimTask(appName, taskId, currentUser.username).pipe(
            takeUntilDestroyed(this.destroyRef),
            take(1),
            map(() => true)
        );
    }

    unclaimTask$(appName: string, taskId: string): Observable<boolean> {
        if (!appName || !taskId) {
            const message = `${appName ? 'Task Id' : 'App Name'} is empty`;
            console.error(`Unclaim Task: ${message}`);
            return throwError(() => new Error(message));
        }

        return this.taskCloudService.unclaimTask(appName, taskId).pipe(
            takeUntilDestroyed(this.destroyRef),
            take(1),
            map(() => true)
        );
    }

    completeTask$(appName: string, taskId: string, data: Record<string, any>): Observable<boolean> {
        const url = this.buildUrl(appName, `tasks/${taskId}/complete`);
        const payload = {
            taskId,
            variables: data,
            payloadType: 'CompleteTaskPayload',
        };
        return this.post(url, payload).pipe(
            takeUntilDestroyed(this.destroyRef),
            map(() => true),
            catchError(() => of(false))
        );
    }

    saveTaskData$(appName: string, taskId: string, data: Record<string, any>): Observable<boolean> {
        const url = this.buildUrl(appName, `tasks/${taskId}/save`);
        const payload = {
            taskId,
            variables: data,
            payloadType: 'SaveTaskPayload',
        };
        return this.post(url, payload).pipe(
            takeUntilDestroyed(this.destroyRef),
            map(() => true),
            catchError(() => of(false))
        );
    }

    private buildUrl(appName: string, path: string, controller: 'rb' | 'query' = 'rb'): string {
        return this.trimSlashes(this.getBasePath(appName)) + `/${controller}/v1/` + this.trimSlashes(path);
    }

    private trimSlashes(input: string): string {
        return input.replaceAll(/^\/+|\/+$/g, '');
    }

    private prepareJsonFromTaskVariables<T>(taskVariables: TaskVariableCloud[]): T {
        const result: Record<string, any> = {};
        for (const taskVariable of taskVariables) {
            result[this.convertStringToCamelCase(taskVariable.name)] = this.toCamelCase(taskVariable.value);
        }
        return result as unknown as T;
    }

    private toCamelCase<T>(input: T): T {
        if (!input) {
            return input;
        }

        if (Array.isArray(input)) {
            return input.map((item) => this.toCamelCase(item)) as unknown as T;
        } else if (typeof input === 'object') {
            const result: Record<string, any> = {};
            for (const key of Object.keys(input)) {
                const camelKey = this.convertStringToCamelCase(key);
                result[camelKey] = this.toCamelCase((input as Record<string, any>)[key]);
            }
            return result as unknown as T;
        }

        return input;
    }

    private convertStringToCamelCase(input: string): string {
        return input.charAt(0).toLowerCase() + input.slice(1);
    }
}

/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { throwError, Observable } from 'rxjs';
import {
    BaseCloudService,
    DisplayModeService,
    FilterParamsModel,
    FormCloudDisplayMode,
    StartProcessCloudService,
    TaskFilterCloudModel,
    TaskFilterCloudService,
    TaskVariableCloud,
} from '@alfresco/adf-process-services-cloud';
import {
    TaskRedirectionConfig,
    TaskRedirectionConstants,
    TaskRedirectionMode,
    TaskVariablesEntry,
    TaskVariablesModel,
    TaskVariablesQueryParams,
} from '../models/task-redirection.model';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskDetailsCloudExtComponent } from '../features/task-details/components/task-details-cloud-ext/task-details-cloud-ext.component';
import { navigateToFilter, navigateToTasks } from '../store/actions/process-management-filter.actions';
import { selectApplicationName, selectProcessManagementFilter } from '../store/selectors/extension.selectors';
import { DOCUMENT, Location } from '@angular/common';
import { map, mergeMap, take, withLatestFrom } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class TaskRedirectionService extends BaseCloudService {
    public static readonly REDIRECTION_QUERY_PARAMETER = 'redirect';

    private document = inject(DOCUMENT);
    window: Window = this.document.defaultView;
    private readonly store = inject(Store<any>);
    private readonly location = inject(Location);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly taskFilterCloudService = inject(TaskFilterCloudService);
    private readonly startProcessCloudService = inject(StartProcessCloudService);

    redirectForStartProcess(appName: string, processDefinitionName: string, redirectionQueryParameter: string, selectedOutcomeId?: string): void {
        this.startProcessCloudService
            .getProcessDefinitions(appName)
            .pipe(
                take(1),
                map((processDefinitions) => processDefinitions.find((processDefinition) => processDefinition.name === processDefinitionName)),
                mergeMap((processDefinition) =>
                    this.startProcessCloudService.getStartEventConstants(appName, processDefinition.id).pipe(
                        take(1),
                        withLatestFrom(this.store.select(selectProcessManagementFilter)),
                        map(([constants, cloudFilter]) => {
                            const { redirectionMode, redirectionParameter } = this.getRedirectionConfigFromConstants(constants, selectedOutcomeId);
                            return { redirectionMode, redirectionParameter, cloudFilter };
                        })
                    )
                )
            )
            .subscribe(({ redirectionMode, redirectionParameter, cloudFilter }) => {
                // eslint-disable-next-line rxjs/no-nested-subscribe
                this.redirect(appName, redirectionMode, redirectionParameter, redirectionQueryParameter, cloudFilter);
            });
    }

    redirectForTask(taskId: string, selectedOutcomeId?: string): void {
        this.store
            .select(selectApplicationName)
            .pipe(
                take(1),
                mergeMap((appName) => {
                    return this.route.queryParams.pipe(
                        take(1),
                        mergeMap((routerParams) => {
                            return this.getTaskVariables(appName, taskId).pipe(
                                take(1),
                                withLatestFrom(this.store.select(selectProcessManagementFilter)),
                                map(([taskVariables, cloudFilter]) => {
                                    const { redirectionMode, redirectionParameter } = this.getRedirectionConfigFromVariables(
                                        taskVariables,
                                        selectedOutcomeId
                                    );
                                    const redirectionQueryParameter = routerParams[TaskRedirectionService.REDIRECTION_QUERY_PARAMETER];
                                    return { appName, redirectionMode, redirectionParameter, redirectionQueryParameter, cloudFilter };
                                })
                            );
                        })
                    );
                })
            )
            .subscribe(({ appName, redirectionMode, redirectionParameter, redirectionQueryParameter, cloudFilter }) => {
                // eslint-disable-next-line rxjs/no-nested-subscribe
                this.redirect(appName, redirectionMode, redirectionParameter, redirectionQueryParameter, cloudFilter);
            });
    }

    private getTaskVariables(appName: string, taskId: string, queryParams?: TaskVariablesQueryParams): Observable<TaskVariablesModel> {
        if ((appName || appName === '') && taskId) {
            const url = `${this.getBasePath(appName)}/query/v1/tasks/${taskId}/variables`;

            return this.get<TaskVariablesModel>(url, queryParams);
        } else {
            return throwError('AppName/TaskId not configured');
        }
    }

    private getRedirectionConfig<T>(
        findByName: (name: string) => T | undefined,
        getValue: (entry: T | undefined) => any,
        outcomePrefix: string,
        defaultMode: TaskRedirectionMode
    ): TaskRedirectionConfig {
        let redirectionMode: T | undefined;
        let redirectionParameter: T | undefined;
        let outcomeSpecificRedirectionModeFound = false;

        if (outcomePrefix) {
            redirectionMode = findByName(outcomePrefix + TaskRedirectionConstants.REDIRECTION_MODE);
            if (redirectionMode) {
                outcomeSpecificRedirectionModeFound = true;
                redirectionParameter = findByName(outcomePrefix + TaskRedirectionConstants.REDIRECTION_PARAMETER);
            }
        }

        if (!outcomeSpecificRedirectionModeFound) {
            redirectionMode = findByName(TaskRedirectionConstants.REDIRECTION_MODE);
            redirectionParameter = findByName(TaskRedirectionConstants.REDIRECTION_PARAMETER);
        }

        return {
            redirectionMode: (getValue(redirectionMode) as TaskRedirectionMode) || defaultMode,
            redirectionParameter: getValue(redirectionParameter),
        };
    }

    private getRedirectionConfigFromConstants(constants: TaskVariableCloud[], outcomePrefix = ''): TaskRedirectionConfig {
        return this.getRedirectionConfig(
            (name: string) => constants.find((entry) => entry.name === name),
            (entry: TaskVariableCloud | undefined) => entry?.value,
            outcomePrefix,
            TaskRedirectionMode.BACK
        );
    }

    private getRedirectionConfigFromVariables(variables: TaskVariablesModel, outcomePrefix = ''): TaskRedirectionConfig {
        const entries = variables.list.entries;
        return this.getRedirectionConfig(
            (name: string) => entries.find((entry) => entry.entry.name === name),
            (entry: TaskVariablesEntry | undefined) => entry?.entry.value,
            outcomePrefix,
            TaskRedirectionMode.WORKSPACE
        );
    }

    private redirect(
        appName: string,
        redirectionMode: TaskRedirectionMode,
        redirectionParameter: string,
        redirectionQueryParameter: string,
        cloudFilter: FilterParamsModel
    ): void {
        DisplayModeService.changeDisplayMode({ displayMode: FormCloudDisplayMode.inline });
        switch (redirectionMode) {
            case TaskRedirectionMode.BACK: {
                this.location.back();
                break;
            }
            case TaskRedirectionMode.MESSAGE: {
                this.redirectToMessage(appName, cloudFilter, redirectionParameter);
                break;
            }
            case TaskRedirectionMode.QUERY: {
                this.redirectToQuery(redirectionParameter, redirectionQueryParameter, appName, cloudFilter);
                break;
            }
            case TaskRedirectionMode.URL: {
                this.redirectToURL(redirectionParameter, appName, cloudFilter);
                break;
            }
            case TaskRedirectionMode.WORKSPACE: {
                this.redirectToWorkspace(appName, cloudFilter);
                break;
            }
            default: {
                this.redirectToWorkspace(appName, cloudFilter);
            }
        }
    }

    private redirectToWorkspace(appName: string, cloudFilter: FilterParamsModel): void {
        if (cloudFilter) {
            this.navigateToSelectedFilter(cloudFilter.id);
        } else {
            this.navigateToCompleteTask(appName);
        }
    }

    private redirectToMessage(appName: string, cloudFilter: FilterParamsModel, message: string) {
        if (message) {
            void this.router.navigate(['/display-message'], { state: { message } });
        } else {
            this.redirectToWorkspace(appName, cloudFilter);
        }
    }

    private redirectToQuery(redirectionParameter: string, redirectionQueryParameter: string, appName: string, cloudFilter: FilterParamsModel) {
        if (redirectionParameter) {
            const regex = new RegExp(redirectionParameter, 'g');
            if (regex.test(redirectionQueryParameter)) {
                this.window.location.href = redirectionQueryParameter;
            } else {
                this.redirectToWorkspace(appName, cloudFilter);
            }
        } else {
            this.redirectToWorkspace(appName, cloudFilter);
        }
    }

    private redirectToURL(redirectionParameter: string, appName: string, cloudFilter: FilterParamsModel) {
        if (redirectionParameter) {
            this.window.location.href = redirectionParameter;
        } else {
            this.redirectToWorkspace(appName, cloudFilter);
        }
    }

    private navigateToCompleteTask(appName: string) {
        this.taskFilterCloudService.getTaskListFilters(appName).subscribe((filters: TaskFilterCloudModel[]) => {
            const completedTaskFilter = filters.find((key: TaskFilterCloudModel) => key.key === TaskDetailsCloudExtComponent.COMPLETED_TASK);
            this.store.dispatch(
                navigateToTasks({
                    filterId: completedTaskFilter.id,
                })
            );
        });
    }

    private navigateToSelectedFilter(filterId: string) {
        this.store.dispatch(
            navigateToFilter({
                filterId: filterId,
            })
        );
    }
}

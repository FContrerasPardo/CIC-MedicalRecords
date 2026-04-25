/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { processCreationSuccess } from '../actions/process-instance-cloud.action';
import { switchMap, tap, take, mergeMap, catchError } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectRecentProcessDefinitionKeys } from '../selectors/process-definitions.selector';
import { setRecentProcessDefinitions } from '../actions/process-definition.actions';
import { DisplayModeService, FormCloudDisplayMode, PROCESS_LISTS_PREFERENCES_SERVICE_TOKEN } from '@alfresco/adf-process-services-cloud';
import { selectApplicationName } from '../selectors/extension.selectors';
import { NotificationService } from '@alfresco/adf-core';
import { OrphanedLinkedProcessesService } from '@alfresco-dbp/shared/form-rules';

@Injectable()
export class ProcessInstanceEffect {
    private readonly actions$ = inject(Actions);
    private readonly store = inject(Store);
    private readonly notificationService = inject(NotificationService);
    private readonly cloudPreferenceService = inject(PROCESS_LISTS_PREFERENCES_SERVICE_TOKEN);
    private readonly orphanedLinkedProcessesService = inject(OrphanedLinkedProcessesService);

    processCreationSuccess$ = createEffect(() =>
        this.actions$.pipe(
            ofType(processCreationSuccess),
            // eslint-disable-next-line rxjs/no-unsafe-switchmap
            switchMap(({ processDefinitionKey }) => {
                return combineLatest([this.store.select(selectRecentProcessDefinitionKeys), this.store.select(selectApplicationName)]).pipe(
                    take(1),
                    switchMap(([currentRecentDefinitions, applicationName]) => {
                        const recentDefinitions = this.getRecentProcessDefinitionsKeys(processDefinitionKey, currentRecentDefinitions);
                        return of<[string[], string]>([recentDefinitions, applicationName]);
                    })
                );
            }),
            tap<[string[], string]>(([definitionKeys, applicationName]) => {
                this.cloudPreferenceService.updatePreference(applicationName, 'recent-process-definition-ids', definitionKeys);
                DisplayModeService.changeDisplayMode({ displayMode: FormCloudDisplayMode.inline });
            }),
            // eslint-disable-next-line rxjs/no-unsafe-switchmap
            switchMap(([definitionKeys]) => of(setRecentProcessDefinitions({ definitionKeys })))
        )
    );

    linkOrphanedProcessesWithRootProcess$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(processCreationSuccess),
                mergeMap(({ processId }) => {
                    return this.orphanedLinkedProcessesService.linkOrphanedProcessesToParent(processId).pipe(
                        catchError(() => {
                            this.notificationService.showError('PROCESS_CLOUD_EXTENSION.SNACKBAR.LINKED_PROCESS_ERROR');
                            return of(undefined);
                        })
                    );
                })
            ),
        { dispatch: false }
    );

    showProcessCreationSuccessMessage$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(processCreationSuccess),
                // eslint-disable-next-line rxjs/no-unsafe-switchmap
                switchMap(({ processName }) =>
                    of(this.notificationService.showInfo('PROCESS_CLOUD_EXTENSION.SNACKBAR.PROCESS-CREATED', undefined, { processName }))
                )
            ),
        { dispatch: false }
    );

    private getRecentProcessDefinitionsKeys(newRecentDefinitionKey: string, currentRecentProcessDefinitions: string[]): string[] {
        const recentList = [...currentRecentProcessDefinitions];

        const newRecentDefinitionIndex = recentList.indexOf(newRecentDefinitionKey);
        const isNewRecentDefinitionAlreadyOnList = newRecentDefinitionIndex > -1;

        if (isNewRecentDefinitionAlreadyOnList) {
            recentList.splice(newRecentDefinitionIndex, 1);
        } else if (recentList.length >= 3) {
            recentList.pop();
        }

        recentList.unshift(newRecentDefinitionKey);

        return recentList;
    }
}

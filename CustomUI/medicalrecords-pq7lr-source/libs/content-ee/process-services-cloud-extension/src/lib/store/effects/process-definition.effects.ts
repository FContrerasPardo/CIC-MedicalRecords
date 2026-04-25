/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, withLatestFrom, catchError, mergeMap } from 'rxjs/operators';
import { PROCESS_LISTS_PREFERENCES_SERVICE_TOKEN, ProcessDefinitionCloud, StartProcessCloudService } from '@alfresco/adf-process-services-cloud';
import {
    loadRecentProcessDefinitions,
    loadProcessDefinitions,
    loadProcessDefinitionsSuccess,
    loadProcessDefinitionsFailure,
    setRecentProcessDefinitions,
    loadUserStartableProcessDefinitionKeysSuccess,
} from '../actions/process-definition.actions';
import { Store } from '@ngrx/store';
import { selectApplicationName } from '../selectors/extension.selectors';
import { of, forkJoin, Observable } from 'rxjs';

@Injectable()
export class ProcessDefinitionEffects {
    private readonly actions$ = inject(Actions);
    private readonly store = inject(Store);
    private readonly startProcessCloudService = inject(StartProcessCloudService);
    private readonly cloudPreferenceService = inject(PROCESS_LISTS_PREFERENCES_SERVICE_TOKEN);

    loadProcessDefinitions$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(loadProcessDefinitions),
                withLatestFrom(this.store.select(selectApplicationName)),
                // eslint-disable-next-line rxjs/no-unsafe-switchmap
                switchMap(([, application]) => {
                    const getAllProcessDefinitions = this.getAllProcessDefinitions(application);
                    const getProcessDefinitionsStartableByUser = this.getUserStartableProcessDefinitions(application);

                    return forkJoin([getAllProcessDefinitions, getProcessDefinitionsStartableByUser]);
                }),
                mergeMap(([definitions, userStartableDefinitions]) => {
                    const filteredDefinitions = this.filterTriggerableByServiceProcesses(definitions);

                    return of(
                        loadProcessDefinitionsSuccess({ definitions: filteredDefinitions }),
                        loadUserStartableProcessDefinitionKeysSuccess({
                            userStartableProcessDefinitionKeys: userStartableDefinitions.map((definition) => definition.key),
                        })
                    );
                }),
                catchError((error, caught) => {
                    this.store.dispatch(loadProcessDefinitionsFailure({ error: error.message }));
                    return caught;
                })
            ),
        { dispatch: true }
    );

    loadRecentProcessDefinitions$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(loadRecentProcessDefinitions),
                withLatestFrom(this.store.select(selectApplicationName)),
                // eslint-disable-next-line rxjs/no-unsafe-switchmap
                switchMap(([, application]) =>
                    this.cloudPreferenceService.getPreferences(application).pipe(
                        map((preferences: { list: { entries: { entry: { key: string; value: any } }[] } }) => {
                            const pref = preferences?.list?.entries?.find((preference) => preference.entry.key === 'recent-process-definition-ids');

                            const definitionKeys = pref?.entry?.value ? JSON.parse(pref?.entry?.value) : [];

                            return setRecentProcessDefinitions({ definitionKeys });
                        }),
                        catchError(() => of(setRecentProcessDefinitions({ definitionKeys: [] })))
                    )
                )
            ),
        { dispatch: true }
    );

    private getAllProcessDefinitions(application: string): Observable<ProcessDefinitionCloud[]> {
        return this.startProcessCloudService.getProcessDefinitions(application, {
            include: 'variables,noUserStartableProcesses,constant-values',
        });
    }

    private getUserStartableProcessDefinitions(application: string): Observable<ProcessDefinitionCloud[]> {
        return this.startProcessCloudService.getProcessDefinitions(application, {
            include: 'variables',
        });
    }

    private filterTriggerableByServiceProcesses(definitions: ProcessDefinitionCloud[]): ProcessDefinitionCloud[] {
        return definitions.filter((definition) => {
            const triggerableByService = definition.constantValues?.triggerableByService;
            return triggerableByService !== 'true';
        });
    }
}

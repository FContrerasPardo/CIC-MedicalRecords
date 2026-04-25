/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { ProcessDefinitionEffects } from './process-definition.effects';
import { cold, hot } from 'jasmine-marbles';
import { loadProcessDefinitions, loadProcessDefinitionsFailure, loadRecentProcessDefinitions } from '../actions/process-definition.actions';
import { PROCESS_LISTS_PREFERENCES_SERVICE_TOKEN, StartProcessCloudService } from '@alfresco/adf-process-services-cloud';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { selectApplicationName } from '../selectors/extension.selectors';
import { selectProcessDefinitionEntities } from '../selectors/process-definitions.selector';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

describe('ProcessDefinitionEffects', () => {
    let actions$: Observable<any>;
    let effects: ProcessDefinitionEffects;
    let startProcessCloudService: StartProcessCloudService;
    let preferencesService: any;
    let store: MockStore;

    /* cspell:disable */
    const processDefinitionMock = {
        appName: 'mock-appName',
        appVersion: 1,
        formKey: 'form-bf715c98-a607-4d63-b52d-700e939429aa',
        id: 'Process_66AFnDFHM:1:58b02889-9422-11ea-9f59-52b2b97fcb55',
        key: 'Process_66AFnDFHM',
        name: 'process1',
        category: 'fakeCategory',
        description: 'fakeDescription',
        serviceFullName: 'service',
        serviceName: 'sn',
        serviceType: 'bundle',
        serviceVersion: '',
        version: 1,
        loaded: true,
    };

    const processDefinitionWithServiceTrigger = {
        ...processDefinitionMock,
        id: 'fake_process_service',
        key: 'fake_process_service',
        name: 'serviceProcess',
        constantValues: {
            unauthorizedStart: 'false',
            triggerableByService: 'true',
        },
    };

    const processDefinitionWithoutServiceTrigger = {
        ...processDefinitionMock,
        id: 'fake_process_user',
        key: 'fake_process_user',
        name: 'userProcess',
        constantValues: {
            unauthorizedStart: 'false',
            triggerableByService: 'false',
        },
    };
    /* cspell:enable */

    const initializeEffects = (): void => {
        effects = TestBed.inject(ProcessDefinitionEffects);
        startProcessCloudService = TestBed.inject(StartProcessCloudService);
        store = TestBed.inject(MockStore);
    };

    beforeEach(() => {
        preferencesService = jasmine.createSpyObj('preferencesService', ['getPreferences']);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                ProcessDefinitionEffects,
                provideMockActions(() => actions$),
                {
                    provide: PROCESS_LISTS_PREFERENCES_SERVICE_TOKEN,
                    useValue: preferencesService,
                },
                provideMockStore({
                    initialState: {},
                    selectors: [
                        {
                            selector: selectProcessDefinitionEntities,
                            value: [processDefinitionMock],
                        },
                        {
                            selector: selectApplicationName,
                            value: 'mock-appName',
                        },
                    ],
                }),
            ],
        });
    });

    describe('loadProcessDefinitions', () => {
        it('should dispatch success actions after parallel calls complete', () => {
            initializeEffects();
            spyOn(startProcessCloudService, 'getProcessDefinitions').and.returnValue(of([processDefinitionMock]));
            actions$ = hot('-a-', { a: loadProcessDefinitions() });

            const expected$ = hot('-(bc)-', {
                b: {
                    type: '[ProcessDefinition] Load ProcessDefinitions Success',
                    definitions: [processDefinitionMock],
                },
                c: {
                    type: '[ProcessDefinition] Load User Startable Process Definition Keys Success',
                    userStartableProcessDefinitionKeys: [processDefinitionMock.key],
                },
            });
            expect(effects.loadProcessDefinitions$).toBeObservable(expected$);
        });

        it('should display only processes that can be started by user', async () => {
            initializeEffects();
            const allProcesses = [processDefinitionWithServiceTrigger, processDefinitionWithoutServiceTrigger, processDefinitionMock];
            spyOn(startProcessCloudService, 'getProcessDefinitions').and.returnValues(of(allProcesses), of([processDefinitionMock]));
            actions$ = of(loadProcessDefinitions());

            const result = await firstValueFrom(effects.loadProcessDefinitions$);

            expect(startProcessCloudService.getProcessDefinitions).toHaveBeenCalledWith('mock-appName', {
                include: 'variables,noUserStartableProcesses,constant-values',
            });
            expect(startProcessCloudService.getProcessDefinitions).toHaveBeenCalledWith('mock-appName', {
                include: 'variables',
            });
            expect(startProcessCloudService.getProcessDefinitions).toHaveBeenCalledTimes(2);

            expect(result['definitions'].length).toBe(2);
            expect(result['definitions']).toContain(processDefinitionWithoutServiceTrigger);
            expect(result['definitions']).toContain(processDefinitionMock);
            expect(result['definitions']).not.toContain(processDefinitionWithServiceTrigger);
        });

        it('should dispatch error via store and complete the effect stream on getProcessDefinitions error', () => {
            initializeEffects();
            actions$ = hot('-a|', { a: loadProcessDefinitions() });

            const response = cold('-#|)', {}, new Error('error'));
            startProcessCloudService.getProcessDefinitions = () => response;

            const dispatchSpy = spyOn(store, 'dispatch');

            const expected = cold('--|');

            expect(effects.loadProcessDefinitions$).toBeObservable(expected);
            expect(dispatchSpy).toHaveBeenCalledWith(loadProcessDefinitionsFailure({ error: 'error' }));
        });
    });

    describe('loadRecentProcessDefinitions', () => {
        it('should dispatch setRecentProcessDefinitions action on loadRecentProcessDefinitions action', () => {
            initializeEffects();
            preferencesService.getPreferences.and.returnValue(
                of({ list: { entries: [{ entry: { key: 'recent-process-definition-ids', value: '["a","b","c"]' } }] } })
            );
            actions$ = hot('-a-', { a: loadRecentProcessDefinitions() });

            const expected$ = hot('-b-', {
                b: {
                    type: '[ProcessDefinition] setRecentProcessDefinitions',
                    definitionKeys: ['a', 'b', 'c'],
                },
            });
            expect(effects.loadRecentProcessDefinitions$).toBeObservable(expected$);
        });

        it('should call the get preferences service with the right appName', async () => {
            initializeEffects();
            preferencesService.getPreferences.and.returnValue(
                of({ list: { entries: [{ entry: { key: 'recent-process-definition-ids', value: '["a","b","c"]' } }] } })
            );

            actions$ = of({
                type: '[ProcessDefinition] Load Recent Process Definitions',
                name: 'Load Recent Process Definition',
            });

            await firstValueFrom(effects.loadRecentProcessDefinitions$);
            expect(preferencesService.getPreferences).toHaveBeenCalledWith('mock-appName');
        });

        it('should return empty array when the preferences is empty array', () => {
            initializeEffects();
            preferencesService.getPreferences.and.returnValue(of({ list: { entries: '[]' } }));
            actions$ = hot('a', { a: loadRecentProcessDefinitions() });

            const expected$ = cold('b', {
                b: {
                    type: '[ProcessDefinition] setRecentProcessDefinitions',
                    definitionKeys: [],
                },
            });
            expect(effects.loadRecentProcessDefinitions$).toBeObservable(expected$);
        });

        it('should return empty array when the preferences is not present', () => {
            initializeEffects();
            preferencesService.getPreferences.and.returnValue(of({ list: { entries: undefined } }));
            actions$ = hot('a', { a: loadRecentProcessDefinitions() });

            const expected$ = cold('b', {
                b: {
                    type: '[ProcessDefinition] setRecentProcessDefinitions',
                    definitionKeys: [],
                },
            });
            expect(effects.loadRecentProcessDefinitions$).toBeObservable(expected$);
        });
    });
});

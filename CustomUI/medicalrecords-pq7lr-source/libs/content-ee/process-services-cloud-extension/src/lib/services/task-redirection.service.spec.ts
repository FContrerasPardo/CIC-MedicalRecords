/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TaskRedirectionService } from './task-redirection.service';
import { provideMockStore } from '@ngrx/store/testing';
import { selectApplicationName, selectProcessManagementFilter } from '../store/selectors/extension.selectors';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import {
    DisplayModeService,
    FormCloudDisplayMode,
    StartProcessCloudService,
    TaskFilterCloudService,
    TaskVariableCloud,
} from '@alfresco/adf-process-services-cloud';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { Location } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TaskRedirectionConstants, TaskRedirectionMode } from '../models/task-redirection.model';
import { Store } from '@ngrx/store';
import { navigateToFilter } from '../store/actions/process-management-filter.actions';

describe('TaskRedirectionService', () => {
    let service: TaskRedirectionService;
    let location: Location;
    let router: Router;
    let store: Store;

    const constantsSubject$: Subject<TaskVariableCloud[]> = new BehaviorSubject([]);
    const constants$: Observable<TaskVariableCloud[]> = constantsSubject$.asObservable();
    let variables: TaskVariableCloud[] = [];
    let displaySpy;

    const appName = 'mock-app-name';
    const taskId = 'mock-task-id';
    const processDefinitionName = 'mock-process-definition-name';
    const redirectionQueryParameter = 'mock-redirection-query-parameter';

    const filter = {
        name: 'MOCK_PROCESS_NAME_1',
        id: '1',
        key: 'all-mock-process',
        icon: 'adjust',
        appName: 'mock-appName',
        sort: 'startDate',
        status: 'RUNNING',
        order: 'DESC',
        index: 2,
        processName: 'process-name',
        processInstanceId: 'processInstanceId',
        initiator: 'mockuser',
        processDefinitionId: 'processDefinitionId',
        processDefinitionKey: 'processDefinitionKey',
        lastModified: null,
        lastModifiedTo: null,
        lastModifiedFrom: null,
    };

    const mockWindow = {
        location: {
            _href: '',
            set href(url: string) {
                this._href = url;
            },
            get href() {
                return this._href;
            },
        },
    } as unknown as Window;

    beforeEach(() => {
        variables = [];
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                TaskRedirectionService,
                provideMockStore({
                    initialState: {
                        extension: {
                            selectedFilter: filter,
                        },
                    },
                    selectors: [
                        { selector: selectApplicationName, value: appName },
                        {
                            selector: selectProcessManagementFilter,
                            value: filter,
                        },
                    ],
                }),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        queryParams: of({ [TaskRedirectionService.REDIRECTION_QUERY_PARAMETER]: redirectionQueryParameter }),
                    },
                },
                {
                    provide: Router,
                    useValue: {
                        navigate: () => {},
                    },
                },
                {
                    provide: StartProcessCloudService,
                    useValue: {
                        getStartEventConstants: () => constants$,
                        getProcessDefinitions: () =>
                            of([
                                {
                                    id: 'mock-process-definition-id',
                                    appName,
                                    name: processDefinitionName,
                                },
                            ]),
                    },
                },
                {
                    provide: AdfHttpClient,
                    useValue: {
                        request: () => {
                            return new Promise((resolve) => resolve({ list: { entries: variables.map((variable) => ({ entry: variable })) } }));
                        },
                    },
                },
                {
                    provide: TaskFilterCloudService,
                    useValue: {
                        getTaskListFilters: () => of([filter]),
                    },
                },
            ],
        });
        service = TestBed.inject(TaskRedirectionService);
        location = TestBed.inject(Location);
        router = TestBed.inject(Router);
        store = TestBed.inject(Store);
        service.window = mockWindow;
        displaySpy = spyOn(DisplayModeService, 'changeDisplayMode');
    });

    describe('start event redirection', () => {
        it('should default redirection should call to location back', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            constantsSubject$.next([]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
            tick(1);

            expect(spy).toHaveBeenCalled();
            expect(displaySpy).toHaveBeenCalledWith({ displayMode: FormCloudDisplayMode.inline });
        }));

        it('should back redirection call to location back', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            constantsSubject$.next([new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.BACK })]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
            tick(1);

            expect(spy).toHaveBeenCalled();
        }));

        describe('message redirection', () => {
            let spy: jasmine.Spy;
            let spyStore: jasmine.Spy;

            beforeEach(() => {
                spy = spyOn(router, 'navigate');
                spyStore = spyOn(store, 'dispatch');
            });

            it('should redirect to workspace when no message is set', fakeAsync(() => {
                constantsSubject$.next([
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                ]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
                tick(1);

                expect(spy).not.toHaveBeenCalled();
                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
                expect(displaySpy).toHaveBeenCalledWith({ displayMode: FormCloudDisplayMode.inline });
            }));

            it('should redirect to display message page when message is set', fakeAsync(() => {
                const message = 'mock-message';
                constantsSubject$.next([
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: message }),
                ]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
                tick(1);

                expect(spy).toHaveBeenCalledWith(['/display-message'], { state: { message } });
                expect(spyStore).not.toHaveBeenCalled();
            }));

            it('should use default redirection mode and parameter when entry for selectedOutcomeId not exists', fakeAsync(() => {
                const message = 'mock-message';
                const selectedOutcomeId = 'custom_outcome_id';
                constantsSubject$.next([
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: message }),
                    new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: 'false message' }),
                ]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, selectedOutcomeId);
                tick(1);

                expect(spy).toHaveBeenCalledWith(['/display-message'], { state: { message } });
                expect(spyStore).not.toHaveBeenCalled();
            }));
        });

        describe('query redirection', () => {
            let spy: jasmine.Spy;
            let spyStore: jasmine.Spy;

            beforeEach(() => {
                spy = spyOnProperty(mockWindow.location, 'href', 'set');
                spyStore = spyOn(store, 'dispatch');
            });

            it('should redirect to workspace when no pattern is set', fakeAsync(() => {
                constantsSubject$.next([
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY }),
                ]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
                tick(1);

                expect(spy).not.toHaveBeenCalled();
                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
                expect(displaySpy).toHaveBeenCalledWith({ displayMode: FormCloudDisplayMode.inline });
            }));

            it('should redirect to workspace when pattern is set but does not match', fakeAsync(() => {
                constantsSubject$.next([
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: 'notMatch' }),
                ]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
                tick(1);

                expect(spy).not.toHaveBeenCalled();
                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
            }));

            it('should redirect to page page when pattern is set and matches', fakeAsync(() => {
                constantsSubject$.next([
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: redirectionQueryParameter }),
                ]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
                tick(1);

                expect(spy).toHaveBeenCalledWith(redirectionQueryParameter);
                expect(spyStore).not.toHaveBeenCalled();
            }));
        });

        describe('url redirection', () => {
            let spy: jasmine.Spy;
            let spyStore: jasmine.Spy;

            beforeEach(() => {
                spy = spyOnProperty(mockWindow.location, 'href', 'set');
                spyStore = spyOn(store, 'dispatch');
            });

            it('should redirect to workspace when no url is set', fakeAsync(() => {
                constantsSubject$.next([new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.URL })]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
                tick(1);

                expect(spy).not.toHaveBeenCalled();
                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
            }));

            it('should redirect to page page when url is set', fakeAsync(() => {
                constantsSubject$.next([
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.URL }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: redirectionQueryParameter }),
                ]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
                tick(1);

                expect(spy).toHaveBeenCalledWith(redirectionQueryParameter);
                expect(spyStore).not.toHaveBeenCalled();
            }));
        });

        describe('workspace redirection', () => {
            let spyStore: jasmine.Spy;

            beforeEach(() => {
                spyStore = spyOn(store, 'dispatch');
            });

            it('should redirect to workspace when no url is set', fakeAsync(() => {
                constantsSubject$.next([
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE }),
                ]);

                service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter);
                tick(1);

                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
            }));
        });
    });

    describe('start event redirection with selectedOutcomeId', () => {
        const selectedOutcomeId = 'custom_outcome_id';

        it('should use selectedOutcomeId as prefix for redirection constants', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            constantsSubject$.next([
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.BACK }),
            ]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalled();
        }));

        it('should fall back to default mode when selectedOutcomeId constants are not found', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            constantsSubject$.next([
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE }),
            ]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, selectedOutcomeId);
            tick(1);

            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should use outcome-specific URL redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const outcomeSpecificUrl = 'https://outcome-specific-url.com';
            const spy = spyOnProperty(mockWindow.location, 'href', 'set');
            constantsSubject$.next([
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.URL }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: outcomeSpecificUrl }),
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE }),
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: 'default-url' }),
            ]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalledWith(outcomeSpecificUrl);
        }));

        it('should use outcome-specific MESSAGE redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const outcomeSpecificMessage = 'Outcome specific message';
            const spy = spyOn(router, 'navigate');
            constantsSubject$.next([
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: outcomeSpecificMessage }),
            ]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalledWith(['/display-message'], { state: { message: outcomeSpecificMessage } });
        }));

        it('should use outcome-specific QUERY redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const outcomeSpecificPattern = 'mock-redirection';
            const spy = spyOnProperty(mockWindow.location, 'href', 'set');
            constantsSubject$.next([
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: outcomeSpecificPattern }),
            ]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalledWith(redirectionQueryParameter);
        }));

        it('should use outcome-specific WORKSPACE redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            constantsSubject$.next([
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE }),
            ]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, selectedOutcomeId);
            tick(1);

            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should prefer outcome-specific constants over default constants', fakeAsync(() => {
            const outcomeSpecificMessage = 'Outcome message';
            const defaultMessage = 'Default message';
            const spy = spyOn(router, 'navigate');
            constantsSubject$.next([
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE }),
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: defaultMessage }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: outcomeSpecificMessage }),
            ]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalledWith(['/display-message'], { state: { message: outcomeSpecificMessage } });
        }));

        it('should handle empty selectedOutcomeId parameter correctly', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            constantsSubject$.next([new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.BACK })]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, '');
            tick(1);

            expect(spy).toHaveBeenCalled();
        }));

        it('should handle undefined selectedOutcomeId parameter correctly', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            constantsSubject$.next([new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.BACK })]);

            service.redirectForStartProcess(appName, processDefinitionName, redirectionQueryParameter, undefined);
            tick(1);

            expect(spy).toHaveBeenCalled();
        }));
    });

    describe('completed task redirection', () => {
        it('should default redirection should do workspace navigation', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            variables = [];

            service.redirectForTask(taskId);
            tick(1);

            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should back redirection call to location back', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.BACK })];

            service.redirectForTask(taskId);
            tick(1);

            expect(spy).toHaveBeenCalled();
        }));

        it('should use default mode and parameter when no outcome prefix provided in variables', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            const selectedOutcomeId = 'custom_outcome_id';
            variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.BACK })];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalled();
        }));

        describe('message redirection', () => {
            let spy: jasmine.Spy;
            let spyStore: jasmine.Spy;

            beforeEach(() => {
                spy = spyOn(router, 'navigate');
                spyStore = spyOn(store, 'dispatch');
            });

            it('should redirect to workspace when no message is set', fakeAsync(() => {
                variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE })];

                service.redirectForTask(taskId);
                tick(1);

                expect(spy).not.toHaveBeenCalled();
                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
            }));

            it('should redirect to display message page when message is set', fakeAsync(() => {
                const message = 'mock-message';
                variables = [
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: message }),
                ];

                service.redirectForTask(taskId);
                tick(1);

                expect(spy).toHaveBeenCalledWith(['/display-message'], { state: { message } });
                expect(spyStore).not.toHaveBeenCalled();
            }));
        });

        describe('query redirection', () => {
            let spy: jasmine.Spy;
            let spyStore: jasmine.Spy;

            beforeEach(() => {
                spy = spyOnProperty(mockWindow.location, 'href', 'set');
                spyStore = spyOn(store, 'dispatch');
            });

            it('should redirect to workspace when no pattern is set', fakeAsync(() => {
                variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY })];

                service.redirectForTask(taskId);
                tick(1);

                expect(spy).not.toHaveBeenCalled();
                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
            }));

            it('should redirect to workspace when pattern is set but does not match', fakeAsync(() => {
                variables = [
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: 'notMatch' }),
                ];

                service.redirectForTask(taskId);
                tick(1);

                expect(spy).not.toHaveBeenCalled();
                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
            }));

            it('should redirect to page page when pattern is set and matches', fakeAsync(() => {
                variables = [
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: redirectionQueryParameter }),
                ];

                service.redirectForTask(taskId);
                tick(1);

                expect(spy).toHaveBeenCalledWith(redirectionQueryParameter);
                expect(spyStore).not.toHaveBeenCalled();
            }));
        });

        describe('url redirection', () => {
            let spy: jasmine.Spy;
            let spyStore: jasmine.Spy;

            beforeEach(() => {
                spy = spyOnProperty(mockWindow.location, 'href', 'set');
                spyStore = spyOn(store, 'dispatch');
            });

            it('should redirect to workspace when no url is set', fakeAsync(() => {
                variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.URL })];

                service.redirectForTask(taskId);
                tick(1);

                expect(spy).not.toHaveBeenCalled();
                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
            }));

            it('should redirect to page page when url is set', fakeAsync(() => {
                variables = [
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.URL }),
                    new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: redirectionQueryParameter }),
                ];

                service.redirectForTask(taskId);
                tick(1);

                expect(spy).toHaveBeenCalledWith(redirectionQueryParameter);
                expect(spyStore).not.toHaveBeenCalled();
            }));
        });

        describe('workspace redirection', () => {
            let spyStore: jasmine.Spy;

            beforeEach(() => {
                spyStore = spyOn(store, 'dispatch');
            });

            it('should redirect to workspace when no url is set', fakeAsync(() => {
                variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE })];

                service.redirectForTask(taskId);
                tick(1);

                expect(spyStore).toHaveBeenCalledWith(
                    navigateToFilter({
                        filterId: filter.id,
                    })
                );
            }));
        });
    });

    describe('completed task redirection with selectedOutcomeId', () => {
        const selectedOutcomeId = 'custom_outcome_id';

        it('should use selectedOutcomeId as prefix for redirection variables', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.BACK }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalled();
        }));

        it('should fall back to default mode when selectedOutcomeId variables are not found', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE })];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should use outcome-specific URL redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const outcomeSpecificUrl = 'https://reject-outcome-url.com';
            const spy = spyOnProperty(mockWindow.location, 'href', 'set');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.URL }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: outcomeSpecificUrl }),
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE }),
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: 'default-url' }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalledWith(outcomeSpecificUrl);
        }));

        it('should use outcome-specific MESSAGE redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const outcomeSpecificMessage = 'Task rejected successfully';
            const spy = spyOn(router, 'navigate');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: outcomeSpecificMessage }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalledWith(['/display-message'], { state: { message: outcomeSpecificMessage } });
        }));

        it('should use outcome-specific QUERY redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const outcomeSpecificPattern = 'mock-redirection';
            const spy = spyOnProperty(mockWindow.location, 'href', 'set');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: outcomeSpecificPattern }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalledWith(redirectionQueryParameter);
        }));

        it('should use outcome-specific WORKSPACE redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should use outcome-specific BACK redirection when selectedOutcomeId is provided', fakeAsync(() => {
            const spy = spyOn(location, 'back');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.BACK }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalled();
        }));

        it('should prefer outcome-specific variables over default variables', fakeAsync(() => {
            const outcomeSpecificMessage = 'Reject outcome message';
            const defaultMessage = 'Default message';
            const spy = spyOn(router, 'navigate');
            variables = [
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE }),
                new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_PARAMETER, value: defaultMessage }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: outcomeSpecificMessage }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).toHaveBeenCalledWith(['/display-message'], { state: { message: outcomeSpecificMessage } });
        }));

        it('should handle empty selectedOutcomeId parameter correctly', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE })];

            service.redirectForTask(taskId, '');
            tick(1);

            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should handle undefined selectedOutcomeId parameter correctly', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            variables = [new TaskVariableCloud({ name: TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.WORKSPACE })];

            service.redirectForTask(taskId, undefined);
            tick(1);

            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should handle query redirection with outcome-specific pattern that does not match', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            const spy = spyOnProperty(mockWindow.location, 'href', 'set');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.QUERY }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: 'noMatch' }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).not.toHaveBeenCalled();
            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should handle message redirection with outcome-specific empty message parameter', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            const spy = spyOn(router, 'navigate');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.MESSAGE }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: '' }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).not.toHaveBeenCalled();
            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));

        it('should handle url redirection with outcome-specific empty url parameter', fakeAsync(() => {
            const spyStore = spyOn(store, 'dispatch');
            const spy = spyOnProperty(mockWindow.location, 'href', 'set');
            variables = [
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_MODE, value: TaskRedirectionMode.URL }),
                new TaskVariableCloud({ name: selectedOutcomeId + TaskRedirectionConstants.REDIRECTION_PARAMETER, value: '' }),
            ];

            service.redirectForTask(taskId, selectedOutcomeId);
            tick(1);

            expect(spy).not.toHaveBeenCalled();
            expect(spyStore).toHaveBeenCalledWith(
                navigateToFilter({
                    filterId: filter.id,
                })
            );
        }));
    });
});
